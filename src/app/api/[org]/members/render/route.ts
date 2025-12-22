import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../../lib/prisma'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../../lib/authz'
import { generatePDFFromHTML } from '../../../../../lib/browser'

export const runtime = 'nodejs'

const BodySchema = z.object({
  templateSlug: z.string().min(2),
  ids: z.array(z.string()).optional(),
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'PASSIVE', 'LEFT']).optional(),
  tags: z.array(z.string()).optional(),
  tagsMode: z.enum(['and', 'or']).optional(),
  groups: z.array(z.string()).optional(),
  groupsMode: z.enum(['and', 'or']).optional(),
  title: z.string().optional(),
  format: z.enum(['pdf', 'docx']).optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const { org } = (await params) as { org: string }
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Validation', details: e?.issues ?? undefined },
      { status: 400 }
    )
  }

  const tpl = await (prisma as any).template.findFirst({
    where: { organizationId: access.org.id, slug: body.templateSlug },
  })
  if (!tpl)
    return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 })

  // Build member query
  let members: Array<{
    id: string
    firstName: string
    lastName: string
    nationalId: string | null
    phone: string | null
    email: string | null
  }>
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    members = await prisma.member.findMany({
      where: { organizationId: access.org.id, id: { in: body.ids } },
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        phone: true,
        email: true,
      },
    })
  } else {
    const where: any = { organizationId: access.org.id }
    const q = (body.q ?? '').trim()
    const status = body.status
    const tagIds = (body.tags ?? []).map((t) => t.trim()).filter(Boolean)
    const groupIds = (body.groups ?? []).map((t) => t.trim()).filter(Boolean)
    const tagsMode = (body.tagsMode ?? 'or') as 'and' | 'or'
    const groupsMode = (body.groupsMode ?? 'or') as 'and' | 'or'
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { nationalId: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status
    if (tagIds.length > 0) {
      if (tagsMode === 'and') {
        const andC = tagIds.map((id) => ({ tags: { some: { tagId: id } } }))
        if (Array.isArray(where.AND)) where.AND.push(...andC)
        else if (where.AND) where.AND = [where.AND, ...andC]
        else where.AND = andC
      } else {
        where.tags =
          tagIds.length === 1
            ? { some: { tagId: tagIds[0] } }
            : { some: { tagId: { in: tagIds } } }
      }
    }
    if (groupIds.length > 0) {
      if (groupsMode === 'and') {
        const andC = groupIds.map((id) => ({
          groups: { some: { groupId: id } },
        }))
        if (Array.isArray(where.AND)) where.AND.push(...andC)
        else if (where.AND) where.AND = [where.AND, ...andC]
        else where.AND = andC
      } else {
        where.groups =
          groupIds.length === 1
            ? { some: { groupId: groupIds[0] } }
            : { some: { groupId: { in: groupIds } } }
      }
    }
    members = await prisma.member.findMany({
      where,
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        phone: true,
        email: true,
      },
      take: 2000,
    })
  }

  const rows = members.map((m, i) => ({
    no: i + 1,
    ad: m.firstName,
    soyad: m.lastName,
    adsoyad: `${m.firstName} ${m.lastName}`,
    nationalId: m.nationalId ?? '',
    phone: m.phone ?? '',
    email: m.email ?? '',
  }))

  const data = {
    title: body.title ?? 'Hazirun Listesi',
    org: { name: access.org.name, slug: access.org.slug },
    date: new Date().toISOString().slice(0, 10),
    rows,
  }

  if ((body.format ?? 'pdf') === 'docx') {
    const docx = await import('docx')
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
    } = docx as any
    const header = new Paragraph({
      children: [
        new TextRun({
          text: `${data.title} — ${data.org.name}`,
          bold: true,
          size: 28,
        }),
      ],
    })
    const meta = new Paragraph({
      children: [new TextRun({ text: `Tarih: ${data.date}`, size: 22 })],
    })
    const tableRows = [
      new TableRow({
        children: ['#', 'Ad Soyad', 'TC', 'Telefon'].map(
          (t) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(t), bold: true })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (r: any) =>
          new TableRow({
            children: [r.no, r.adsoyad, r.nationalId, r.phone].map(
              (v) =>
                new TableCell({ children: [new Paragraph(String(v ?? ''))] })
            ),
          })
      ),
    ]
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    })
    const doc = new Document({
      sections: [
        { properties: {}, children: [header, meta, new Paragraph(' '), table] },
      ],
    })
    const ab = await Packer.toBuffer(doc)
    return new NextResponse(new Uint8Array(ab), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${tpl.slug}-${data.date}.docx"`,
      },
    })
  } else {
    const { default: Mustache } = await import('mustache')
    const html = Mustache.render(tpl.content, data)
    const pdf = await generatePDFFromHTML(html, {
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    })
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tpl.slug}-${data.date}.pdf"`,
      },
    })
  }
}
