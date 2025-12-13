import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'
import fs from 'fs/promises'
import path from 'path'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ org: string; id: string; docId: string }> }
) {
  const { org, id, docId } = await params
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
    // Verify meeting exists and belongs to org
    const meeting = await (prisma as any).meeting.findFirst({
      where: { id, organizationId: access.org.id },
    })
    if (!meeting)
      return NextResponse.json(
        { error: 'Toplantı bulunamadı' },
        { status: 404 }
      )

    // Get document
    const document = await (prisma as any).meetingDocument.findFirst({
      where: { id: docId, meetingId: id },
    })
    if (!document)
      return NextResponse.json({ error: 'Döküman bulunamadı' }, { status: 404 })

    // Delete file from filesystem
    try {
      const fullPath = path.join(process.cwd(), 'public', document.filePath)
      await fs.unlink(fullPath)
    } catch (e) {
      console.error('Error deleting file:', e)
      // Continue even if file deletion fails
    }

    // Delete document record
    await (prisma as any).meetingDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Document deletion error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
