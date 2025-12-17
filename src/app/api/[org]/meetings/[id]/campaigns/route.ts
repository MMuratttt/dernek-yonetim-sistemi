import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id: meetingId } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Validate meeting exists
    const meeting = await (prisma as any).meeting.findFirst({
      where: {
        id: meetingId,
        organizationId: access.org.id,
      },
    })
    if (!meeting) {
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      )
    }

    // Get SMS campaigns for this meeting
    const smsCampaigns = await prisma.smsCampaign.findMany({
      where: {
        meetingId,
        organizationId: access.org.id,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get Email campaigns for this meeting
    const emailCampaigns = await (prisma as any).emailCampaign.findMany({
      where: {
        meetingId,
        organizationId: access.org.id,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      smsCampaigns,
      emailCampaigns,
    })
  } catch (error: any) {
    console.error('Error fetching meeting campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', detail: error?.message },
      { status: 500 }
    )
  }
}
