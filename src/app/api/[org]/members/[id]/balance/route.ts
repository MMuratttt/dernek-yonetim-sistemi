import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'

/**
 * Get balance for a specific member
 */
export async function GET(
  req: Request,
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

  try {
    // Verify member exists and belongs to org
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId: access.org.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
    }

    // Calculate balance for this member
    const transactions = await prisma.financeTransaction.findMany({
      where: {
        organizationId: access.org.id,
        memberId: id,
      },
      select: {
        type: true,
        amount: true,
      },
    })

    let charges = 0
    let payments = 0
    let refunds = 0
    let adjustments = 0

    for (const tx of transactions) {
      const amt = Number(tx.amount)
      switch (tx.type) {
        case 'CHARGE':
          charges += amt
          break
        case 'PAYMENT':
          payments += amt
          break
        case 'REFUND':
          refunds += amt
          break
        case 'ADJUSTMENT':
          adjustments += amt
          break
      }
    }

    const balance = charges - (payments + refunds) + adjustments

    // Get recent transactions
    const recentTx = await prisma.financeTransaction.findMany({
      where: {
        organizationId: access.org.id,
        memberId: id,
      },
      orderBy: {
        txnDate: 'desc',
      },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        txnDate: true,
        note: true,
        paymentMethod: true,
        receiptNo: true,
        plan: {
          select: {
            name: true,
          },
        },
        period: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      balance: {
        total: balance,
        charges,
        payments,
        refunds,
        adjustments,
      },
      recentTransactions: recentTx.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: tx.currency,
        date: tx.txnDate,
        note: tx.note,
        paymentMethod: tx.paymentMethod,
        receiptNo: tx.receiptNo,
        planName: tx.plan?.name,
        periodName: tx.period?.name,
      })),
    })
  } catch (e: any) {
    console.error('Member balance error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}
