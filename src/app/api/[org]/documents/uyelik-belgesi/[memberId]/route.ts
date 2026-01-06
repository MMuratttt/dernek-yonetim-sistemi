import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../../../lib/authz'
import { generatePDFFromHTML } from '../../../../../../lib/browser'

export const runtime = 'nodejs'

async function generateMembershipCertificatePDF(
  org: { name: string; address: string | null },
  member: {
    firstName: string
    lastName: string
    nationalId: string | null
    registeredAt: Date | null
    joinedAt: Date
  },
  president: { firstName: string; lastName: string } | null
) {
  const registrationDate = member.registeredAt || member.joinedAt
  const formattedDate = new Date(registrationDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: A4;
        margin: 40mm 20mm;
      }
      body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
        border-bottom: 2px solid #333;
        padding-bottom: 20px;
      }
      .header h1 {
        font-size: 18pt;
        font-weight: bold;
        margin: 0 0 10px 0;
        text-transform: uppercase;
      }
      .header h2 {
        font-size: 16pt;
        font-weight: bold;
        margin: 0;
        color: #444;
      }
      .content {
        margin: 30px 0;
      }
      .intro {
        text-align: justify;
        margin-bottom: 30px;
      }
      .info-box {
        border: 2px solid #333;
        padding: 20px;
        margin: 20px 0;
        background-color: #f9f9f9;
      }
      .info-row {
        display: flex;
        margin-bottom: 15px;
        border-bottom: 1px dotted #666;
        padding-bottom: 8px;
      }
      .info-label {
        font-weight: bold;
        width: 40%;
      }
      .info-value {
        width: 60%;
      }
      .signature-section {
        margin-top: 60px;
        text-align: right;
      }
      .signature-line {
        border-top: 1px solid #333;
        width: 200px;
        margin: 40px 0 10px auto;
      }
      .footer {
        text-align: center;
        font-size: 10pt;
        color: #666;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ccc;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${org.name}</h1>
      <h2>ÜYELİK BELGESİ</h2>
    </div>

    <div class="content">
      <p class="intro">
        Bu belge, aşağıda kimlik bilgileri yazılı kişinin derneğimize kayıtlı üye olduğunu 
        ve dernek tüzüğü gereği üyelik haklarından yararlandığını gösterir.
      </p>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Adı Soyadı:</span>
          <span class="info-value">${member.firstName} ${member.lastName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">T.C. Kimlik No:</span>
          <span class="info-value">${member.nationalId || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kayıt Tarihi:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Üyelik Durumu:</span>
          <span class="info-value">Aktif</span>
        </div>
      </div>

      <div class="signature-section">
        <p style="margin-bottom: 5px;">Belge Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        <div class="signature-line"></div>
        <p style="margin: 5px 0;"><strong>${president ? `${president.firstName} ${president.lastName}` : '________________'}</strong></p>
        <p style="margin: 0; font-size: 11pt;">Yönetim Kurulu Başkanı</p>
      </div>

      ${org.address ? `<div class="footer">${org.address}</div>` : ''}
    </div>
  </body>
  </html>`

  return generatePDFFromHTML(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ org: string; memberId: string }> }
) {
  const { org, memberId } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the member
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: access.org.id,
    },
    select: {
      firstName: true,
      lastName: true,
      nationalId: true,
      registeredAt: true,
      joinedAt: true,
    },
  })

  if (!member) {
    return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
  }

  // Fetch organization details
  const organization = await prisma.organization.findUnique({
    where: { id: access.org.id },
    select: {
      name: true,
      address: true,
    },
  })

  if (!organization) {
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  }

  // Fetch board president
  const presidentRecord = await prisma.boardMember.findFirst({
    where: {
      term: {
        board: {
          organizationId: access.org.id,
          type: 'EXECUTIVE',
        },
        isActive: true,
      },
      role: 'PRESIDENT',
    },
    include: {
      member: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const president = presidentRecord
    ? {
        firstName: presidentRecord.member.firstName,
        lastName: presidentRecord.member.lastName,
      }
    : null

  const pdf = await generateMembershipCertificatePDF(
    organization,
    member,
    president
  )
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="uyelik-belgesi-${member.firstName}-${member.lastName}-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
