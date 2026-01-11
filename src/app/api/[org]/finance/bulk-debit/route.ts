import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'

const CreateBulkDebitSchema = z.object({
  memberIds: z.array(z.string()).min(1, 'At least one member must be selected'),
  debitType: z.enum(['AIDAT', 'TARIH_GIREREK']),
  amount: z.number().positive(),
  currency: z.string().default('TRY'),
  year: z.number().optional(),
  scheduledDate: z.string().optional(),
})

const ProcessBulkDebitSchema = z.object({
  id: z.string(),
})

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
    const body = await req.json()
    const data = CreateBulkDebitSchema.parse(body)

    // Validate members exist
    const members = await (prisma as any).member.findMany({
      where: {
        id: { in: data.memberIds },
        organizationId: access.org.id,
      },
      select: { id: true, firstName: true, lastName: true },
    })

    if (members.length !== data.memberIds.length) {
      return NextResponse.json(
        { error: 'Bazı üyeler bulunamadı' },
        { status: 400 }
      )
    }

    // Create scheduled debit
    const scheduledDebit = await (prisma as any).scheduledDebit.create({
      data: {
        organizationId: access.org.id,
        name: `Toplu borçlandırma - ${new Date().toLocaleDateString('tr-TR')}`,
        debitType: data.debitType,
        amount: data.amount,
        currency: data.currency,
        year: data.year,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        status: 'PENDING',
        createdBy: session.user.id,
        members: {
          create: members.map((m: any) => ({
            memberId: m.id,
            amount: data.amount,
            currency: data.currency,
            status: 'PENDING',
          })),
        },
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      scheduledDebit,
      message: `${members.length} üye için borçlandırma oluşturuldu`,
    })
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { error: 'Validation error', details: e.issues },
        { status: 400 }
      )
    console.error('Bulk debit error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}

export async function GET(
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
    const scheduledDebits = await (prisma as any).scheduledDebit.findMany({
      where: {
        organizationId: access.org.id,
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      items: scheduledDebits,
    })
  } catch (e: any) {
    console.error('Get bulk debits error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const body = await req.json()
    const data = ProcessBulkDebitSchema.parse(body)

    // Get scheduled debit
    const scheduledDebit = await (prisma as any).scheduledDebit.findFirst({
      where: {
        id: data.id,
        organizationId: access.org.id,
      },
      include: {
        members: true,
      },
    })

    if (!scheduledDebit) {
      return NextResponse.json(
        { error: 'Borçlandırma bulunamadı' },
        { status: 404 }
      )
    }

    if (scheduledDebit.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Bu borçlandırma zaten işlenmiş' },
        { status: 400 }
      )
    }

    // Process the debit by creating finance transactions
    // Using extended timeout for large batches (44+ members)
    await prisma.$transaction(
      async (tx) => {
        // Update scheduled debit status
        await (tx as any).scheduledDebit.update({
          where: { id: data.id },
          data: {
            status: 'PROCESSING',
          },
        })

        // Create finance transactions for each member
        for (const member of scheduledDebit.members) {
          await (tx as any).financeTransaction.create({
            data: {
              organizationId: access.org.id,
              memberId: member.memberId,
              type: 'CHARGE',
              amount: member.amount,
              currency: member.currency,
              note: `Toplu borçlandırma - ${scheduledDebit.debitType}${scheduledDebit.year ? ` (${scheduledDebit.year})` : ''}`,
              txnDate: scheduledDebit.scheduledDate || new Date(),
            },
          })

          await (tx as any).scheduledDebitMember.update({
            where: { id: member.id },
            data: { status: 'COMPLETED' },
          })
        }

        // Mark as completed
        await (tx as any).scheduledDebit.update({
          where: { id: data.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        })
      },
      {
        maxWait: 10000, // 10 seconds max wait to acquire the transaction
        timeout: 60000, // 60 seconds timeout for the transaction
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Borçlandırma başarıyla işlendi',
    })
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { error: 'Validation error', details: e.issues },
        { status: 400 }
      )
    console.error('Process bulk debit error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}
