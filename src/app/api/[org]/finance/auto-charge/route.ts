import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'

/**
 * Auto-charge endpoint for scheduled/periodic automatic debt charging
 * POST: Process automatic charges for active dues plans
 * This can be called by a cron job or manually by admins
 */
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
    const now = new Date()
    const results: any[] = []

    // Get all active dues plans for this organization
    const activePlans = await (prisma as any).duesPlan.findMany({
      where: {
        organizationId: access.org.id,
        isActive: true,
      },
      include: {
        periods: {
          where: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
    })

    // For each active plan with a current period
    for (const plan of activePlans) {
      if (plan.periods.length === 0) continue

      const period = plan.periods[0] // Current period

      // Get all active members
      const members = await (prisma as any).member.findMany({
        where: {
          organizationId: access.org.id,
          status: 'ACTIVE',
        },
        select: { id: true, firstName: true, lastName: true },
      })

      type MemberItem = { id: string; firstName: string; lastName: string }

      // Check which members already have charges for this period
      const existingCharges = await (prisma as any).financeTransaction.findMany(
        {
          where: {
            organizationId: access.org.id,
            type: 'CHARGE',
            planId: plan.id,
            periodId: period.id,
            memberId: { in: members.map((m: MemberItem) => m.id) },
          },
          select: { memberId: true },
        }
      )

      const chargedMemberIds = new Set(
        existingCharges.map((c: any) => c.memberId)
      )
      const toCharge = members.filter(
        (m: MemberItem) => !chargedMemberIds.has(m.id)
      )

      // Create charges for members without existing charges
      const created = []
      for (const member of toCharge) {
        const charge = await (prisma as any).financeTransaction.create({
          data: {
            organizationId: access.org.id,
            memberId: member.id,
            type: 'CHARGE',
            amount: plan.amount,
            currency: plan.currency,
            planId: plan.id,
            periodId: period.id,
            note: `Otomatik borçlandırma: ${plan.name} / ${period.name}`,
            txnDate: now,
          },
        })
        created.push(charge)
      }

      results.push({
        planId: plan.id,
        planName: plan.name,
        periodId: period.id,
        periodName: period.name,
        totalMembers: members.length,
        alreadyCharged: chargedMemberIds.size,
        newCharges: created.length,
        amount: Number(plan.amount),
        currency: plan.currency,
      })
    }

    return NextResponse.json({
      success: true,
      processedAt: now.toISOString(),
      plansProcessed: results.length,
      results,
    })
  } catch (e: any) {
    console.error('Auto-charge error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}

/**
 * GET: Show auto-charge status and next scheduled charges
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
    const now = new Date()

    // Get active plans with current periods
    const activePlans = await (prisma as any).duesPlan.findMany({
      where: {
        organizationId: access.org.id,
        isActive: true,
      },
      include: {
        periods: {
          where: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
    })

    // Get pending scheduled debits
    const pendingScheduled = await (prisma as any).scheduledDebit.findMany({
      where: {
        organizationId: access.org.id,
        status: 'PENDING',
      },
      include: {
        members: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    return NextResponse.json({
      activePlans: activePlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        amount: Number(p.amount),
        currency: p.currency,
        frequency: p.frequency,
        currentPeriod: p.periods[0]
          ? {
              id: p.periods[0].id,
              name: p.periods[0].name,
              startDate: p.periods[0].startDate,
              endDate: p.periods[0].endDate,
            }
          : null,
      })),
      pendingScheduled: pendingScheduled.map((s: any) => ({
        id: s.id,
        name: s.name,
        debitType: s.debitType,
        amount: Number(s.amount),
        currency: s.currency,
        memberCount: s.members.length,
        scheduledDate: s.scheduledDate,
      })),
    })
  } catch (e: any) {
    console.error('Auto-charge status error:', e)
    return NextResponse.json(
      { error: e.message || 'Server error' },
      { status: 500 }
    )
  }
}
