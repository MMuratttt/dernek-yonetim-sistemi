import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

const AssignMeetingSchema = z.object({
  meetingId: z.string().nullable(),
  channel: z.enum(['SMS', 'EMAIL']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id: campaignId } = await params
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
    const data = AssignMeetingSchema.parse(json)

    // Validate meeting exists and belongs to organization if meetingId is provided
    if (data.meetingId) {
      const meeting = await (prisma as any).meeting.findFirst({
        where: {
          id: data.meetingId,
          organizationId: access.org.id,
        },
      })
      if (!meeting) {
        return NextResponse.json(
          { error: 'Toplantı bulunamadı' },
          { status: 404 }
        )
      }
    }

    let updated
    if (data.channel === 'SMS') {
      // Validate campaign exists
      const campaign = await prisma.smsCampaign.findFirst({
        where: {
          id: campaignId,
          organizationId: access.org.id,
        },
      })
      if (!campaign) {
        return NextResponse.json(
          { error: 'Kampanya bulunamadı' },
          { status: 404 }
        )
      }

      updated = await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: { meetingId: data.meetingId },
      })
    } else {
      // EMAIL
      const campaign = await (prisma as any).emailCampaign.findFirst({
        where: {
          id: campaignId,
          organizationId: access.org.id,
        },
      })
      if (!campaign) {
        return NextResponse.json(
          { error: 'Kampanya bulunamadı' },
          { status: 404 }
        )
      }

      updated = await (prisma as any).emailCampaign.update({
        where: { id: campaignId },
        data: { meetingId: data.meetingId },
      })
    }

    return NextResponse.json({ item: updated })
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { error: 'Validation', details: e.issues },
        { status: 400 }
      )
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
