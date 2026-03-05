import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'
import { Decimal } from '@prisma/client/runtime/library'

const CreateKasaTxn = z.object({
  type: z.enum(['GELIR', 'GIDER']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'OTHER']),
  receiptNo: z.string().optional().nullable(),
  note: z.string().min(1, 'Açıklama gereklidir'),
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

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get('pageSize') || '25'))
    )

    const whereClause = {
      organizationId: access.org.id,
      type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
    }

    // Lightweight query for balance computation — ALL records, no member include
    const balanceTxns = await (prisma as any).financeTransaction.findMany({
      where: whereClause,
      select: { amount: true, type: true, paymentMethod: true },
    })

    let income = 0
    let expense = 0
    let cashIncome = 0
    let cashExpense = 0
    let bankIncome = 0
    let bankExpense = 0

    balanceTxns.forEach((tx: any) => {
      const amount = Number(tx.amount)
      const isCash = tx.paymentMethod === 'CASH'
      const isBank = tx.paymentMethod === 'BANK_TRANSFER'

      if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
        income += amount
        if (isCash) cashIncome += amount
        else if (isBank) bankIncome += amount
      } else if (tx.type === 'ADJUSTMENT') {
        if (amount < 0) {
          expense += Math.abs(amount)
          if (isCash) cashExpense += Math.abs(amount)
          else if (isBank) bankExpense += Math.abs(amount)
        } else {
          income += amount
          if (isCash) cashIncome += amount
          else if (isBank) bankIncome += amount
        }
      }
    })

    const balance = income - expense
    const cashBalance = cashIncome - cashExpense
    const bankBalance = bankIncome - bankExpense

    // Paginated query for the transaction list
    const [totalCount, paginatedTransactions] = await Promise.all([
      (prisma as any).financeTransaction.count({ where: whereClause }),
      (prisma as any).financeTransaction.findMany({
        where: whereClause,
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { txnDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    const transactions = paginatedTransactions.map((tx: any) => {
      let displayType = 'GELIR'
      if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
        displayType = 'GELIR'
      } else if (tx.type === 'ADJUSTMENT') {
        displayType = Number(tx.amount) >= 0 ? 'GELIR' : 'GIDER'
      }

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
      cashBalance,
      bankBalance,
      income,
      expense,
      transactions,
      pagination: { page, pageSize, totalCount, totalPages },
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
        txnDate: data.txnDate ?? new Date(),
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

const UpdateKasaTxn = z.object({
  id: z.string(),
  type: z.enum(['GELIR', 'GIDER']),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'OTHER']),
  receiptNo: z.string().optional().nullable(),
  note: z.string().min(1, 'Açıklama gereklidir'),
  txnDate: z.coerce.date().optional(),
})

export async function PUT(
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
    const data = UpdateKasaTxn.parse(json)

    const existing = await (prisma as any).financeTransaction.findFirst({
      where: {
        id: data.id,
        organizationId: access.org.id,
        type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 })
    }

    const transactionType = data.type === 'GELIR' ? 'PAYMENT' : 'ADJUSTMENT'
    const amount = data.type === 'GIDER' ? -Math.abs(data.amount) : data.amount

    const updated = await (prisma as any).financeTransaction.update({
      where: { id: data.id },
      data: {
        type: transactionType,
        amount: new Decimal(amount),
        paymentMethod: data.paymentMethod,
        receiptNo: data.receiptNo || null,
        note: data.note,
        ...(data.txnDate ? { txnDate: data.txnDate } : {}),
      },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    console.error('Error updating kasa transaction:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz veri', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'İşlem güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'İşlem ID gereklidir' },
        { status: 400 }
      )
    }

    const existing = await (prisma as any).financeTransaction.findFirst({
      where: {
        id,
        organizationId: access.org.id,
        type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 })
    }

    await (prisma as any).financeTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting kasa transaction:', error)
    return NextResponse.json(
      { error: 'İşlem silinirken hata oluştu' },
      { status: 500 }
    )
  }
}
