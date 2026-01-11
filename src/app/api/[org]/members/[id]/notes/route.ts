import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '../../../../../../lib/authz'

const CreateNote = z.object({
  content: z.string().min(1, 'Not içeriği gereklidir'),
})

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

  // Verify member belongs to this organization
  const member = await prisma.member.findFirst({
    where: { id, organizationId: access.org.id },
    select: { id: true },
  })
  if (!member)
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })

  const notes = await prisma.memberNote.findMany({
    where: { memberId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ notes })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
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

  // Verify member belongs to this organization
  const member = await prisma.member.findFirst({
    where: { id, organizationId: access.org.id },
    select: { id: true },
  })
  if (!member)
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })

  try {
    const json = await req.json()
    const data = CreateNote.parse(json)

    const note = await prisma.memberNote.create({
      data: {
        memberId: id,
        content: data.content,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { error: 'Validation', details: e.issues },
        { status: 400 }
      )
    console.error('CreateNoteError', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ org: string; id: string }> }
) {
  const { org, id } = await params
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

  // Verify member belongs to this organization
  const member = await prisma.member.findFirst({
    where: { id, organizationId: access.org.id },
    select: { id: true },
  })
  if (!member)
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })

  try {
    const { searchParams } = new URL(req.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json({ error: 'noteId gereklidir' }, { status: 400 })
    }

    // Verify note belongs to this member
    const note = await prisma.memberNote.findFirst({
      where: { id: noteId, memberId: id },
    })
    if (!note)
      return NextResponse.json({ error: 'Not bulunamadı' }, { status: 404 })

    await prisma.memberNote.delete({ where: { id: noteId } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DeleteNoteError', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
