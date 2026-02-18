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

  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate ve endDate parametreleri zorunludur' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const allTransactions = await (prisma as any).financeTransaction.findMany({
      where: {
        organizationId: access.org.id,
        type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
        txnDate: { gte: start, lte: end },
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { txnDate: 'asc' },
    })

    let totalIncome = 0
    let totalExpense = 0

    const incomeTransactions: any[] = []
    const expenseTransactions: any[] = []

    const monthlyBreakdown: Record<
      string,
      { month: string; income: number; expense: number }
    > = {}

    const paymentMethodTotals: Record<
      string,
      { income: number; expense: number; count: number }
    > = {}

    allTransactions.forEach((tx: any) => {
      const amount = Number(tx.amount)
      const isIncome =
        tx.type === 'PAYMENT' ||
        tx.type === 'REFUND' ||
        (tx.type === 'ADJUSTMENT' && amount >= 0)
      const absAmount = Math.abs(amount)

      let description = tx.note || 'İşlem'
      if (tx.member) {
        const memberName = `${tx.member.firstName} ${tx.member.lastName}`
        description = tx.note ? `${memberName} - ${tx.note}` : memberName
      } else if (!tx.note) {
        description = 'Dernek Kasası'
      }

      const mapped = {
        id: tx.id,
        type: isIncome ? 'GELIR' : 'GIDER',
        amount: absAmount,
        note: description,
        txnDate: tx.txnDate.toISOString(),
        receiptNo: tx.receiptNo,
        paymentMethod: tx.paymentMethod,
        memberName: tx.member
          ? `${tx.member.firstName} ${tx.member.lastName}`
          : null,
      }

      if (isIncome) {
        totalIncome += absAmount
        incomeTransactions.push(mapped)
      } else {
        totalExpense += absAmount
        expenseTransactions.push(mapped)
      }

      // Monthly breakdown
      const monthKey = tx.txnDate.toISOString().slice(0, 7)
      if (!monthlyBreakdown[monthKey]) {
        const d = new Date(tx.txnDate)
        const monthName = d.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
        })
        monthlyBreakdown[monthKey] = { month: monthName, income: 0, expense: 0 }
      }
      if (isIncome) {
        monthlyBreakdown[monthKey].income += absAmount
      } else {
        monthlyBreakdown[monthKey].expense += absAmount
      }

      // Payment method breakdown
      const method = tx.paymentMethod || 'UNSPECIFIED'
      if (!paymentMethodTotals[method]) {
        paymentMethodTotals[method] = { income: 0, expense: 0, count: 0 }
      }
      paymentMethodTotals[method].count += 1
      if (isIncome) {
        paymentMethodTotals[method].income += absAmount
      } else {
        paymentMethodTotals[method].expense += absAmount
      }
    })

    return NextResponse.json({
      organizationName: access.org.name,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        totalTransactions: allTransactions.length,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
      },
      incomeTransactions,
      expenseTransactions,
      monthlyBreakdown: Object.entries(monthlyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v),
      paymentMethodBreakdown: Object.entries(paymentMethodTotals).map(
        ([method, data]) => ({
          method,
          ...data,
        })
      ),
    })
  } catch (error) {
    console.error('Error generating kasa report:', error)
    return NextResponse.json(
      { error: 'Rapor oluşturulurken hata oluştu' },
      { status: 500 }
    )
  }
}
