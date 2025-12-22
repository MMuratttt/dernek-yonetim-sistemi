import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../../lib/authz'
import { generatePDFFromHTML } from '../../../../../lib/browser'

export const runtime = 'nodejs'

async function generateHazirunPDF(
  members: Array<{
    firstName: string
    lastName: string
    nationalId: string | null
    phone: string | null
  }>,
  orgName: string,
  presidentName: string | null
) {
  const rows = members
    .map(
      (m, i) =>
        `<tr><td>${i + 1}</td><td>${m.firstName} ${m.lastName}</td><td>${m.nationalId ?? ''}</td><td></td></tr>`
    ) // signature empty column
    .join('')

  const count = members.length
  const now = new Date()
  const today = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

  const html = `<!doctype html>
  <html><head><meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #444; padding: 8px; }
    th { background: #f0f0f0; font-weight: bold; }
    td:first-child { text-align: center; width: 40px; }
    td:nth-child(3) { width: 120px; }
    td:nth-child(4) { width: 100px; }
    .footer { margin-top: 30px; text-align: center; font-weight: bold; font-size: 12px; letter-spacing: 1px; }
    .signature { margin-top: 60px; text-align: right; padding-right: 50px; }
    .signature-content { display: inline-block; min-width: 220px; text-align: center; }
    .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 8px; }
  </style>
  </head><body>
    <h1>${orgName} Hazirun Listesi</h1>
    <table>
      <thead><tr><th>#</th><th>Ad Soyad</th><th>TC</th><th>İmza</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">//////////// İŞ BU HAZİRUN LİSTESİ ${count} KİŞİDEN OLUŞMAKTADIR ////////////</div>
    <div class="signature">
      <div class="signature-content">
        <div class="signature-line">
          ${presidentName || ''}<br/>
          Yönetim Kurulu Başkanı
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #666;">${today}</div>
      </div>
    </div>
  </body></html>`

  return generatePDFFromHTML(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '12mm', bottom: '20mm', left: '12mm' },
  })
}

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
  const take = Math.min(Number(url.searchParams.get('take') || '200'), 1000)
  const members = await prisma.member.findMany({
    where: { organizationId: access.org.id },
    orderBy: { lastName: 'asc' },
    take,
  })

  // Fetch current board president
  const currentTerm = await prisma.boardTerm.findFirst({
    where: {
      boardId: access.org.boardId,
      isActive: true,
    },
  })

  let presidentName: string | null = null
  if (currentTerm) {
    const president = await prisma.boardMember.findFirst({
      where: {
        termId: currentTerm.id,
        role: 'PRESIDENT',
      },
      include: {
        member: true,
      },
    })
    if (president) {
      presidentName = `${president.member.firstName} ${president.member.lastName}`
    }
  }

  const pdf = await generateHazirunPDF(members, access.org.name, presidentName)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="hazirun-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}

export async function POST(
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

  const body = await req.json()
  const { ids } = body as { ids?: string[] }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids gerekli' }, { status: 400 })
  }

  // Fetch only the selected members
  const members = await prisma.member.findMany({
    where: {
      organizationId: access.org.id,
      id: { in: ids },
    },
    orderBy: { lastName: 'asc' },
  })

  // Fetch current board president
  const currentTerm = await prisma.boardTerm.findFirst({
    where: {
      boardId: access.org.boardId,
      isActive: true,
    },
  })

  let presidentName: string | null = null
  if (currentTerm) {
    const president = await prisma.boardMember.findFirst({
      where: {
        termId: currentTerm.id,
        role: 'PRESIDENT',
      },
      include: {
        member: true,
      },
    })
    if (president) {
      presidentName = `${president.member.firstName} ${president.member.lastName}`
    }
  }

  const pdf = await generateHazirunPDF(members, access.org.name, presidentName)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="hazirun-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
