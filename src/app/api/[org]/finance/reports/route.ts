import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'

/**
 * Financial Reports Endpoint
 * Provides comprehensive financial analytics and reports
 */
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

  try {
    const url = new URL(req.url)
    const reportType = url.searchParams.get('type') || 'overview'
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const dateFilter: any = {}
    if (startDate)
      dateFilter.txnDate = { ...dateFilter.txnDate, gte: new Date(startDate) }
    if (endDate)
      dateFilter.txnDate = { ...dateFilter.txnDate, lte: new Date(endDate) }

    switch (reportType) {
      case 'overview': {
        // Overall financial summary
        const summary = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            COUNT(DISTINCT "memberId") as total_members,
            SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) as total_charges,
            SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) as total_payments,
            SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END) as total_refunds,
            SUM(CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END) as total_adjustments,
            COUNT(*) as total_transactions
          FROM "FinanceTransaction"
          WHERE "organizationId" = $1
          ${startDate ? 'AND "txnDate" >= $2' : ''}
          ${endDate ? `AND "txnDate" <= $${startDate ? 3 : 2}` : ''}
        `,
          ...[
            access.org.id,
            ...(startDate ? [new Date(startDate)] : []),
            ...(endDate ? [new Date(endDate)] : []),
          ].filter(Boolean)
        )

        const row = summary[0]
        const charges = Number(row?.total_charges || 0)
        const payments = Number(row?.total_payments || 0)
        const refunds = Number(row?.total_refunds || 0)
        const adjustments = Number(row?.total_adjustments || 0)
        const balance = charges - (payments + refunds) + adjustments

        // Count debtors and creditors
        const balanceBreakdown = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            COUNT(*) FILTER (WHERE (
              SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) - 
              (SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) + 
               SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END)) + 
              SUM(CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END)
            ) > 0) as debtors,
            COUNT(*) FILTER (WHERE (
              SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) - 
              (SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) + 
               SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END)) + 
              SUM(CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END)
            ) < 0) as creditors,
            COUNT(*) FILTER (WHERE (
              SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) - 
              (SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) + 
               SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END)) + 
              SUM(CASE WHEN type = 'ADJUSTMENT' THEN amount ELSE 0 END)
            ) = 0) as balanced
          FROM (
            SELECT "memberId"
            FROM "FinanceTransaction"
            WHERE "organizationId" = $1
            ${startDate ? 'AND "txnDate" >= $2' : ''}
            ${endDate ? `AND "txnDate" <= $${startDate ? 3 : 2}` : ''}
            GROUP BY "memberId"
          ) grouped
        `,
          ...[
            access.org.id,
            ...(startDate ? [new Date(startDate)] : []),
            ...(endDate ? [new Date(endDate)] : []),
          ].filter(Boolean)
        )

        return NextResponse.json({
          overview: {
            totalMembers: Number(row?.total_members || 0),
            totalTransactions: Number(row?.total_transactions || 0),
            totalCharges: charges,
            totalPayments: payments,
            totalRefunds: refunds,
            totalAdjustments: adjustments,
            netBalance: balance,
            debtors: Number(balanceBreakdown[0]?.debtors || 0),
            creditors: Number(balanceBreakdown[0]?.creditors || 0),
            balanced: Number(balanceBreakdown[0]?.balanced || 0),
          },
        })
      }

      case 'monthly': {
        // Monthly breakdown
        const monthly = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            DATE_TRUNC('month', "txnDate") as month,
            SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) as charges,
            SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) as payments,
            COUNT(*) as transaction_count
          FROM "FinanceTransaction"
          WHERE "organizationId" = $1
          ${startDate ? 'AND "txnDate" >= $2' : ''}
          ${endDate ? `AND "txnDate" <= $${startDate ? 3 : 2}` : ''}
          GROUP BY DATE_TRUNC('month', "txnDate")
          ORDER BY month DESC
          LIMIT 12
        `,
          ...[
            access.org.id,
            ...(startDate ? [new Date(startDate)] : []),
            ...(endDate ? [new Date(endDate)] : []),
          ].filter(Boolean)
        )

        return NextResponse.json({
          monthly: monthly.map((m) => ({
            month: m.month,
            charges: Number(m.charges || 0),
            payments: Number(m.payments || 0),
            net: Number(m.charges || 0) - Number(m.payments || 0),
            transactionCount: Number(m.transaction_count || 0),
          })),
        })
      }

      case 'by-plan': {
        // Breakdown by dues plan
        const byPlan = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            p.id,
            p.name,
            SUM(CASE WHEN ft.type = 'CHARGE' THEN ft.amount ELSE 0 END) as total_charges,
            SUM(CASE WHEN ft.type = 'PAYMENT' THEN ft.amount ELSE 0 END) as total_payments,
            COUNT(DISTINCT ft."memberId") as member_count
          FROM "DuesPlan" p
          LEFT JOIN "FinanceTransaction" ft ON ft."planId" = p.id
          WHERE p."organizationId" = $1
          ${startDate ? 'AND ft."txnDate" >= $2' : ''}
          ${endDate ? `AND ft."txnDate" <= $${startDate ? 3 : 2}` : ''}
          GROUP BY p.id, p.name
          ORDER BY total_charges DESC
        `,
          ...[
            access.org.id,
            ...(startDate ? [new Date(startDate)] : []),
            ...(endDate ? [new Date(endDate)] : []),
          ].filter(Boolean)
        )

        return NextResponse.json({
          byPlan: byPlan.map((p) => ({
            planId: p.id,
            planName: p.name,
            totalCharges: Number(p.total_charges || 0),
            totalPayments: Number(p.total_payments || 0),
            balance:
              Number(p.total_charges || 0) - Number(p.total_payments || 0),
            memberCount: Number(p.member_count || 0),
          })),
        })
      }

      case 'payment-methods': {
        // Payment method breakdown
        const methods = await prisma.$queryRawUnsafe<any[]>(
          `
          SELECT
            "paymentMethod",
            COUNT(*) as count,
            SUM(amount) as total
          FROM "FinanceTransaction"
          WHERE "organizationId" = $1
            AND type = 'PAYMENT'
            ${startDate ? 'AND "txnDate" >= $2' : ''}
            ${endDate ? `AND "txnDate" <= $${startDate ? 3 : 2}` : ''}
          GROUP BY "paymentMethod"
          ORDER BY total DESC
        `,
          ...[
            access.org.id,
            ...(startDate ? [new Date(startDate)] : []),
            ...(endDate ? [new Date(endDate)] : []),
          ].filter(Boolean)
        )

        return NextResponse.json({
          paymentMethods: methods.map((m) => ({
            method: m.paymentMethod || 'UNSPECIFIED',
            count: Number(m.count || 0),
            total: Number(m.total || 0),
          })),
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }
  } catch (e: any) {
    console.error('Reports error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}
