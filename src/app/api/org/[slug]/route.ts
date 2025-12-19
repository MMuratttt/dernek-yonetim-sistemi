// @ts-nocheck
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { uploadFile } from '@/lib/storage'
import { normalizePhoneNumber } from '@/lib/utils'

// Regex pattern for website validation (with or without protocol)
const websitePattern =
  /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\/?.*$/

const UpdateOrg = z.object({
  name: z.string().min(3).optional(),
  description: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().optional()
  ),
  address: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().optional()
  ),
  phone: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().optional()
  ),
  email: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().email().optional()
  ),
  website: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().regex(websitePattern).optional()
  ),
})

// GET /api/org/[slug]
// Returns organization details for authorized users
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = params
  if (!slug)
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  // Check if user is SUPERADMIN (can access all orgs)
  const isSuper = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
    select: { id: true },
  })

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If not SUPERADMIN, check if user has membership to this org
  if (!isSuper) {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: org.id,
        },
      },
    })
    if (!membership)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ item: org })
}

// PATCH /api/org/[slug]
// Updates organization details. Only SUPERADMIN or ADMIN can update.
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = params
  if (!slug)
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if user is SUPERADMIN
  const isSuper = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
    select: { id: true },
  })

  // If not SUPERADMIN, check if user is ADMIN of this org
  if (!isSuper) {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: org.id,
        },
      },
      select: { role: true },
    })
    if (!membership || membership.role !== 'ADMIN')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const form = await req.formData()

    // Extract form fields
    const formData = {
      name: (form.get('name') as string) || undefined,
      description: (form.get('description') as string) || undefined,
      address: (form.get('address') as string) || undefined,
      phone: (form.get('phone') as string) || undefined,
      email: (form.get('email') as string) || undefined,
      website: (form.get('website') as string) || undefined,
    }

    const data = UpdateOrg.parse(formData)

    // Handle logo upload if provided
    let logoUrl: string | undefined = undefined
    const logoFile = form.get('logo') as File | null
    const removeLogo = form.get('removeLogo') === 'true'

    if (removeLogo) {
      logoUrl = null as any // Set to null to remove logo
    } else if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploaded = await uploadFile(
        buffer,
        logoFile.type || 'application/octet-stream',
        { prefix: 'orgs/logos' }
      )
      logoUrl = uploaded.url
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined)
      updateData.description = data.description
    if (data.address !== undefined) updateData.address = data.address
    if (data.phone !== undefined)
      updateData.phone = normalizePhoneNumber(data.phone)
    if (data.email !== undefined) updateData.email = data.email
    if (data.website !== undefined) updateData.website = data.website
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ item: updated })
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        { error: 'Validation', details: e.issues },
        { status: 400 }
      )
    }
    console.error('Update org failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/org/[slug]
// Only SUPERADMIN can delete an organization.
export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = params
  if (!slug)
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const isSuper = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
    select: { id: true },
  })
  if (!isSuper)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const org = await prisma.organization.findUnique({ where: { slug } })
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Member count guard (FK RESTRICT) – first ensure no members remain
    const memberCount = await prisma.member.count({
      where: { organizationId: org.id },
    })
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Önce derneğe bağlı üyeleri silin veya taşıyın.' },
        { status: 400 }
      )
    }

    await prisma.organization.delete({ where: { id: org.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Delete org failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
