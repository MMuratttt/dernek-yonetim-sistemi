// @ts-nocheck
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma } from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'
import { isSuperAdmin } from '../../../lib/authz'
import { normalizePhoneNumber } from '../../../lib/utils'
import { uploadFile } from '../../../lib/storage'

// Regex pattern for website validation (with or without protocol)
const websitePattern =
  /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+\/?.*$/

const CreateOrg = z.object({
  name: z.string().min(3),
  responsibleFirstName: z.string().min(2),
  responsibleLastName: z.string().min(2),
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
  password: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().min(6).optional()
  ),
  website: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().regex(websitePattern).optional()
  ),
})

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const superadmin = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
  })
  const items = await prisma.organization.findMany({
    where: superadmin
      ? {}
      : { memberships: { some: { userId: session.user.id } } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only SUPERADMIN can create organizations in this phase
  const canCreate = await isSuperAdmin(session.user.id)
  if (!canCreate)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const form = await req.formData()

    // Extract form fields
    const formData = {
      name: form.get('name') as string,
      responsibleFirstName: form.get('responsibleFirstName') as string,
      responsibleLastName: form.get('responsibleLastName') as string,
      description: form.get('description') as string | undefined,
      address: form.get('address') as string | undefined,
      phone: form.get('phone') as string | undefined,
      email: form.get('email') as string | undefined,
      password: form.get('password') as string | undefined,
      website: form.get('website') as string | undefined,
    }

    const data = CreateOrg.parse(formData)

    // Handle logo upload if provided
    let logoUrl: string | undefined = undefined
    const logoFile = form.get('logo') as File | null
    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploaded = await uploadFile(
        buffer,
        logoFile.type || 'application/octet-stream',
        { prefix: 'orgs/logos' }
      )
      logoUrl = uploaded.url
    }

    // Auto-generate slug from name
    const slugify = (str: string) => {
      return str
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    let slug = slugify(data.name)
    let counter = 1

    // Check for slug uniqueness and add counter if needed
    while (true) {
      const exists = await prisma.organization.findUnique({
        where: { slug },
      })
      if (!exists) break
      slug = `${slugify(data.name)}-${counter}`
      counter++
    }

    const created = await prisma.organization.create({
      data: {
        name: data.name,
        slug: slug,
        description: data.description,
        address: data.address,
        phone: normalizePhoneNumber(data.phone),
        email: data.email,
        website: data.website,
        logoUrl: logoUrl,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'SUPERADMIN',
          },
        },
      },
      select: { id: true, name: true, slug: true },
    })

    // Update user's firstName and lastName
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.responsibleFirstName,
        lastName: data.responsibleLastName,
        name: `${data.responsibleFirstName} ${data.responsibleLastName}`,
      },
    })

    // If email and password provided, create new admin user for the organization
    if (data.email && data.password) {
      const passwordHash = await bcrypt.hash(data.password, 10)

      // Check if user with this email already exists
      let adminUser = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (!adminUser) {
        // Create new user
        adminUser = await prisma.user.create({
          data: {
            email: data.email,
            firstName: data.responsibleFirstName,
            lastName: data.responsibleLastName,
            name: `${data.responsibleFirstName} ${data.responsibleLastName}`,
            passwordHash: passwordHash,
          },
        })
      } else {
        // Update existing user's password and name
        adminUser = await prisma.user.update({
          where: { email: data.email },
          data: {
            firstName: data.responsibleFirstName,
            lastName: data.responsibleLastName,
            name: `${data.responsibleFirstName} ${data.responsibleLastName}`,
            passwordHash: passwordHash,
          },
        })
      }

      // Create admin membership for the new organization
      await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId: {
            userId: adminUser.id,
            organizationId: created.id,
          },
        },
        update: {
          role: 'ADMIN',
        },
        create: {
          userId: adminUser.id,
          organizationId: created.id,
          role: 'ADMIN',
        },
      })
    }

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        { error: 'Validation', details: e.issues },
        { status: 400 }
      )
    }
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
