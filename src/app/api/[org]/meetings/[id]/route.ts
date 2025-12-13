import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await (prisma as any).meeting.findFirst({
    where: { id, organizationId: access.org.id },
    include: {
      agendas: { orderBy: { order: 'asc' } },
      invites: true,
      attendance: true,
      proxies: true,
      minutes: true,
      decisions: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  })
  if (!item)
    return NextResponse.json({ error: 'Toplantı bulunamadı' }, { status: 404 })
  return NextResponse.json({ item })
}
