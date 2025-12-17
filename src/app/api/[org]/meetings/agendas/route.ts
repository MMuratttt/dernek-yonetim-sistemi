import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'

const UpsertAgenda = z.object({
  meetingId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string().optional(),
      order: z.number().int().min(0),
      title: z.string().min(1),
      description: z.string().optional(),
    })
  ),
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

  const url = new URL(req.url)
  const meetingId = url.searchParams.get('meetingId') || ''
  if (!meetingId)
    return NextResponse.json({ error: 'meetingId gerekli' }, { status: 400 })

  const meeting = await (prisma as any).meeting.findFirst({
    where: { id: meetingId, organizationId: access.org.id },
    include: { agendas: { orderBy: { order: 'asc' } } },
  })
  if (!meeting)
    return NextResponse.json({ error: 'Toplantı bulunamadı' }, { status: 404 })
  return NextResponse.json({ items: meeting.agendas })
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
    const data = UpsertAgenda.parse(json)
    const meeting = await (prisma as any).meeting.findFirst({
      where: { id: data.meetingId, organizationId: access.org.id },
    })
    if (!meeting)
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      )

    // Replace all agendas atomically
    await (prisma as any).$transaction([
      (prisma as any).meetingAgenda.deleteMany({
        where: { meetingId: meeting.id },
      }),
      (prisma as any).meetingAgenda.createMany({
        data: data.items.map((i) => ({
          meetingId: meeting.id,
          order: i.order,
          title: i.title,
          description: i.description,
        })),
      }),
    ])

    const items = await (prisma as any).meetingAgenda.findMany({
      where: { meetingId: meeting.id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ items })
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
