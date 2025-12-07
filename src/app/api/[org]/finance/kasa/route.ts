import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'
import { Decimal } from '@prisma/client/runtime/library'

const CreateKasaTxn = z.object({
  type: z.enum(['GELIR', 'GIDER']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER']),
  receiptNo: z.string().optional().nullable(),
  note: z.string().min(1, 'Açıklama gereklidir'),
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

  try {
    // Fetch all transactions for the organization
    // Exclude CHARGE as it represents debt assignment, not actual cash flow
    const allTransactions = await (prisma as any).financeTransaction.findMany({
      where: {
        organizationId: access.org.id,
        type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
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
      orderBy: { txnDate: 'desc' },
      take: 100,
    })

    // Calculate balance, income, and expense
    let income = 0
    let expense = 0

    allTransactions.forEach((tx: any) => {
      const amount = Number(tx.amount)

      // PAYMENT and REFUND are income (Gelir)
      if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
        income += amount
      }
      // ADJUSTMENT can be expense (Gider) when negative or income when positive
      else if (tx.type === 'ADJUSTMENT') {
        if (amount < 0) {
          expense += Math.abs(amount)
        } else {
          income += amount
        }
      }
    })

    const balance = income - expense

    // Map transactions to a simplified format for display
    const transactions = allTransactions.map((tx: any) => {
      let displayType = 'GELIR'

      if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
        displayType = 'GELIR'
      } else if (tx.type === 'ADJUSTMENT') {
        displayType = Number(tx.amount) >= 0 ? 'GELIR' : 'GIDER'
      }

      // Build description: show member name if available, otherwise use note or "Dernek Kasası"
      let description = tx.note || 'İşlem'
      if (tx.member) {
        const memberName = `${tx.member.firstName} ${tx.member.lastName}`
        description = tx.note ? `${memberName} - ${tx.note}` : memberName
      } else if (!tx.note) {
        description = 'Dernek Kasası'
      }

      return {
        id: tx.id,
        type: displayType,
        amount: tx.amount,
        note: description,
        txnDate: tx.txnDate,
        receiptNo: tx.receiptNo,
        paymentMethod: tx.paymentMethod,
        memberId: tx.memberId,
        memberName: tx.member
          ? `${tx.member.firstName} ${tx.member.lastName}`
          : null,
      }
    })

    return NextResponse.json({
      balance,
      income,
      expense,
      transactions,
    })
  } catch (error) {
    console.error('Error fetching kasa data:', error)
    return NextResponse.json(
      { error: 'Veri alınırken hata oluştu' },
      { status: 500 }
    )
  }
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
    const data = CreateKasaTxn.parse(json)

    // Map GELIR/GIDER to the appropriate FinanceTransactionType
    // GELIR (Income) -> PAYMENT
    // GIDER (Expense) -> ADJUSTMENT with negative amount to reduce balance
    const transactionType = data.type === 'GELIR' ? 'PAYMENT' : 'ADJUSTMENT'
    const amount = data.type === 'GIDER' ? -Math.abs(data.amount) : data.amount

    const created = await (prisma as any).financeTransaction.create({
      data: {
        organizationId: access.org.id,
        type: transactionType,
        amount: new Decimal(amount),
        currency: 'TRY',
        paymentMethod: data.paymentMethod,
        receiptNo: data.receiptNo || null,
        note: data.note,
        txnDate: new Date(),
      },
    })

    return NextResponse.json({ success: true, item: created })
  } catch (error) {
    console.error('Error creating kasa transaction:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz veri', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'İşlem eklenirken hata oluştu' },
      { status: 500 }
    )
  }
}
