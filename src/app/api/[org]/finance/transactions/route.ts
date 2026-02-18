import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'

const CreateTxn = z.object({
  memberId: z.string().optional(),
  type: z.enum(['CHARGE', 'PAYMENT', 'REFUND', 'ADJUSTMENT']),
  amount: z.number(),
  currency: z.string().min(3).max(3).default('TRY'),
  planId: z.string().optional(),
  periodId: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'OTHER']).optional(),
  receiptNo: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
  txnDate: z.coerce.date().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  const { org } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const memberId = url.searchParams.get('memberId') || undefined
  const take =
    Math.min(Math.max(Number(url.searchParams.get('take') || '50'), 1), 200) + 1
  const cursor = url.searchParams.get('cursor') || undefined
  const items = await (prisma as any).financeTransaction.findMany({
    where: { organizationId: access.org.id, ...(memberId ? { memberId } : {}) },
    orderBy: { txnDate: 'desc' },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take,
  })
  const hasMore = items.length === take
  const sliced = hasMore ? items.slice(0, take - 1) : items
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null
  return NextResponse.json({ items: sliced, nextCursor })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  const { org } = await params
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
    const data = CreateTxn.parse(json)

    if ((data.planId && !data.periodId) || (data.periodId && !data.planId)) {
      return NextResponse.json(
        { error: 'Plan ve dönem birlikte belirtilmelidir' },
        { status: 400 }
      )
    }

    if (data.planId) {
      const plan = await (prisma as any).duesPlan.findFirst({
        where: { id: data.planId, organizationId: access.org.id },
      })
      if (!plan)
        return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 })
      const period = await (prisma as any).duesPeriod.findFirst({
        where: { id: data.periodId, planId: data.planId },
      })
      if (!period)
        return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })
    }

    const created = await (prisma as any).financeTransaction.create({
      data: {
        organizationId: access.org.id,
        memberId: data.memberId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        planId: data.planId,
        periodId: data.periodId,
        paymentMethod: data.paymentMethod,
        receiptNo: data.receiptNo,
        reference: data.reference,
        note: data.note,
        txnDate: data.txnDate ?? undefined,
      },
    })
    return NextResponse.json({ item: created }, { status: 201 })
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
