import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../../lib/authz'
import { prisma } from '../../../../../lib/prisma'

const Query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  campaignId: z.string().min(1).optional(),
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
    const campaignIdParam = searchParams.get('campaignId')

    const query = Query.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      campaignId:
        campaignIdParam && campaignIdParam.length > 0
          ? campaignIdParam
          : undefined,
    })

    if (!query.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: query.error.flatten() },
        { status: 400 }
      )
    }

    const { page, limit, campaignId } = query.data
    const skip = (page - 1) * limit

    if (campaignId) {
      const [messages, total] = await Promise.all([
        (prisma as any)['emailMessage'].findMany({
          where: { organizationId: access.org.id, campaignId },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        (prisma as any)['emailMessage'].count({
          where: { organizationId: access.org.id, campaignId },
        }),
      ])

      return NextResponse.json({
        messages,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      })
    }

    const [campaigns, total] = await Promise.all([
      (prisma as any)['emailCampaign'].findMany({
        where: { organizationId: access.org.id },
        include: {
          _count: { select: { messages: true } },
          meeting: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any)['emailCampaign'].count({
        where: { organizationId: access.org.id },
      }),
    ])

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('Error fetching EMAIL history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch EMAIL history', detail: error?.message },
      { status: 500 }
    )
  }
}
