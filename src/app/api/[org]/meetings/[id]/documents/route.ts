import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '@/lib/authz'
import { saveUploadedFile } from '@/lib/storage'
import {
  isAllowedDocumentType,
  isValidDocumentSize,
  MAX_DOCUMENT_SIZE,
} from '@/lib/meetings'

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

  // Verify meeting exists and belongs to org
  const meeting = await (prisma as any).meeting.findFirst({
    where: { id, organizationId: access.org.id },
  })
  if (!meeting)
    return NextResponse.json({ error: 'Toplantı bulunamadı' }, { status: 404 })

  const documents = await (prisma as any).meetingDocument.findMany({
    where: { meetingId: id },
    orderBy: { uploadedAt: 'desc' },
  })
  return NextResponse.json({ items: documents })
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string

    if (!file)
      return NextResponse.json({ error: 'Dosya yüklenmedi' }, { status: 400 })

    if (!documentType)
      return NextResponse.json(
        { error: 'Belge türü belirtilmedi' },
        { status: 400 }
      )

    // Validate document type
    const validTypes = [
      'DIVAN_TUTANAGI',
      'HAZIRUN_LISTESI',
      'FAALIYET_RAPORU',
      'DENETIM_KURULU_RAPORU',
    ]
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: 'Geçersiz belge türü' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isAllowedDocumentType(file.type)) {
      return NextResponse.json(
        {
          error:
            'Geçersiz dosya türü. Sadece PDF, Word ve Excel dosyaları kabul edilir.',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (!isValidDocumentSize(file.size)) {
      return NextResponse.json(
        {
          error: `Dosya boyutu çok büyük. Maksimum ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB olabilir.`,
        },
        { status: 400 }
      )
    }

    // Save file
    const filePath = await saveUploadedFile(file, `meetings/${id}`)

    // Create document record
    const document = await (prisma as any).meetingDocument.create({
      data: {
        meetingId: id,
        documentType,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
      },
    })

    return NextResponse.json({ item: document }, { status: 201 })
  } catch (e: any) {
    console.error('Document upload error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
