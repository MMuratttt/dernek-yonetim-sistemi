import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'

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

  // Sum charges - payments + adjustments/refunds per member
  // charge = positive; payment = negative;
  // adjustment: positive increases balance, negative decreases

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT
      "memberId",
      SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) as total_charges,
      SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) as total_payments,
      SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
      SUM(CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END) as total_adjustments
    FROM "FinanceTransaction"
    WHERE "organizationId" = $1 AND "memberId" IS NOT NULL ${memberId ? 'AND "memberId" = $2' : ''}
    GROUP BY "memberId"
  `,
    ...(memberId ? [access.org.id, memberId] : [access.org.id])
  )

  // join names
  const memberIds = rows.map((r: any) => r.memberId).filter(Boolean)
  const nameMap = new Map<string, { firstName: string; lastName: string }>()
  if (memberIds.length) {
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, organizationId: access.org.id },
      select: { id: true, firstName: true, lastName: true },
    })
    for (const m of members)
      nameMap.set(m.id, { firstName: m.firstName, lastName: m.lastName })
  }

  const items = rows.map((r) => {
    const charges = Number(r.total_charges || 0)
    const payments = Number(r.total_payments || 0)
    const refunds = Number(r.total_refunds || 0)
    const adjustments = Number(r.total_adjustments || 0)
    const balance = charges - (payments + refunds) + adjustments
    const nm = r.memberId ? nameMap.get(r.memberId) : undefined
    return {
      memberId: r.memberId,
      name: nm ? `${nm.firstName} ${nm.lastName}` : undefined,
      charges,
      payments,
      refunds,
      adjustments,
      balance,
    }
  })

  return NextResponse.json({ items })
}
