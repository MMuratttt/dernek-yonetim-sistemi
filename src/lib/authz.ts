// @ts-nocheck
import { prisma } from './prisma'

export type OrgRole = 'SUPERADMIN' | 'ADMIN'

export const ALL_ROLES: OrgRole[] = ['SUPERADMIN', 'ADMIN']
export const WRITE_ROLES: OrgRole[] = ['SUPERADMIN', 'ADMIN']
export const ADMIN_ROLES: OrgRole[] = ['SUPERADMIN', 'ADMIN']

export async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  const superMembership = await prisma.organizationMembership.findFirst({
    where: { userId, role: 'SUPERADMIN' },
    select: { id: true },
  })
  return Boolean(superMembership)
}

/**
 * Check if a user can create an organization.
 * Returns true if:
 * 1. The user is a SUPERADMIN, OR
 * 2. There are NO organizations in the system (first org setup)
 */
export async function canCreateOrg(userId: string): Promise<boolean> {
  if (!userId) return false

  // SUPERADMINs can always create orgs
  if (await isSuperAdmin(userId)) return true

  // Allow creating first org if no orgs exist
  const totalOrgs = await prisma.organization.count()
  return totalOrgs === 0
}

export async function getUserOrgRole(
  userId: string,
  orgSlug: string
): Promise<OrgRole | null> {
  // SUPERADMINs implicitly have access to all orgs
  const superMembership = await prisma.organizationMembership.findFirst({
    where: { userId, role: 'SUPERADMIN' },
  })
  if (superMembership) return 'SUPERADMIN'
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  })
  if (!org) return null
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  })
  return (membership?.role as OrgRole) ?? null
}

export function hasAnyRole(role: OrgRole | null, allowed: OrgRole[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}

export async function getUserRoleInfo(userId: string): Promise<{
  isSuperAdmin: boolean
  firstOrg: { slug: string; name: string } | null
}> {
  if (!userId) return { isSuperAdmin: false, firstOrg: null }

  const superMembership = await prisma.organizationMembership.findFirst({
    where: { userId, role: 'SUPERADMIN' },
    select: { id: true },
  })

  if (superMembership) {
    return { isSuperAdmin: true, firstOrg: null }
  }

  // Get first org for ADMIN role
  const adminMembership = await prisma.organizationMembership.findFirst({
    where: { userId, role: 'ADMIN' },
    include: { organization: { select: { slug: true, name: true } } },
  })

  return {
    isSuperAdmin: false,
    firstOrg: adminMembership?.organization || null,
  }
}

export async function ensureOrgAccessBySlug(
  userId: string,
  orgSlug: string,
  allowed: OrgRole[] = ALL_ROLES
) {
  // SUPERADMIN can access all orgs regardless of membership
  const isSuper = await prisma.organizationMembership.findFirst({
    where: { userId, role: 'SUPERADMIN' },
  })
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true, name: true },
  })
  if (!org)
    return {
      org: null as any,
      role: null as OrgRole | null,
      allowed: false,
      notFound: true,
    }
  if (isSuper)
    return {
      org,
      role: 'SUPERADMIN' as OrgRole,
      allowed: hasAnyRole('SUPERADMIN', allowed),
      notFound: false,
    }
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId: org.id } },
    select: { role: true },
  })
  const role = (membership?.role as OrgRole) ?? null
  return { org, role, allowed: hasAnyRole(role, allowed), notFound: false }
}
