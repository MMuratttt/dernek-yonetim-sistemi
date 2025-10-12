import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '../../../../../lib/authz'

const UpdateMember = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5, 'Telefon çok kısa').nullable().optional(),
  status: z.enum(['ACTIVE', 'PASSIVE', 'LEFT']).optional(),
  nationalId: z
    .string()
    .regex(/^\d{11}$/, 'TC Kimlik No 11 haneli olmalı')
    .nullable()
    .optional(),
  address: z.string().min(3, 'Adres çok kısa').nullable().optional(),
  occupation: z.string().min(2, 'Meslek çok kısa').nullable().optional(),
  joinedAt: z.preprocess((v) => {
    if (v === '' || v === undefined || v === null) return undefined
    if (typeof v === 'string' || v instanceof Date) {
      const d = new Date(v as any)
      return isNaN(d.getTime()) ? undefined : d
    }
    return undefined
  }, z.date().optional()),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const member = await prisma.member.findFirst({
    where: { id, organizationId: access.org.id },
  })
  if (!member)
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })

  // Aidat (dues) summary: CHARGE increases debt, PAYMENT decreases debt,
  // REFUND reduces paid amount, ADJUSTMENT may be +/-.
  // We'll compute totalCharges, totalPayments and donation (positive payments with type PAYMENT and planId null maybe?)
  // For simplicity: borc = sum(CHARGE.amount) - sum(ADJUSTMENT where amount < 0) (treat negative adjustment as reducing charge)
  // odenen = sum(PAYMENT.amount) + sum(ADJUSTMENT where amount > 0)
  // kalan = borc - odenen
  // bagis = sum of PAYMENT where reference = 'DONATION' OR (memberId set and planId null and type PAYMENT and amount > 0)
  // If domain rules differ this can be adjusted later.
  const txns = await prisma.financeTransaction.findMany({
    where: { organizationId: access.org.id, memberId: member.id },
    select: { type: true, amount: true, planId: true, reference: true },
  })
  let borc = 0
  let odenen = 0
  let bagis = 0
  for (const t of txns) {
    const amt = Number(t.amount)
    switch (t.type) {
      case 'CHARGE':
        borc += amt
        break
      case 'PAYMENT':
        odenen += amt
        // Heuristic for donation
        if (
          !t.planId &&
          (t.reference?.toLowerCase().includes('bagis') ||
            t.reference?.toLowerCase().includes('bağış') ||
            t.reference?.toLowerCase().includes('donation'))
        ) {
          bagis += amt
        }
        break
      case 'REFUND':
        // refund reduces paid amount
        odenen -= amt
        break
      case 'ADJUSTMENT':
        if (amt >= 0) odenen += amt
        else borc += Math.abs(amt)
        break
    }
  }
  const kalan = borc - odenen

  const dues = {
    borc, // total charges
    odenen, // total payments
    kalan, // remaining balance (negative means overpaid)
    bagis,
  }

  return NextResponse.json({ item: member, dues })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(
    session.user.id as string,
    org,
    WRITE_ROLES
  )
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const json = await req.json()
    const data = UpdateMember.parse(json)
    const updated = await prisma.member.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email === '' ? null : data.email,
        phone: data.phone === '' ? null : data.phone,
        status: data.status,
        nationalId: data.nationalId === '' ? null : (data.nationalId as any),
        address: data.address === '' ? null : (data.address as any),
        occupation: data.occupation === '' ? null : (data.occupation as any),
        joinedAt: data.joinedAt,
      },
      select: { id: true },
    })
    return NextResponse.json({ item: updated })
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { error: 'Validation', details: e.issues },
        { status: 400 }
      )
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(
    session.user.id as string,
    org,
    WRITE_ROLES
  )
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.member.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
