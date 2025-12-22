import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { getSession } from '../../../../../../lib/auth'
import { ensureOrgAccessBySlug } from '../../../../../../lib/authz'
import { generatePDFFromHTML } from '../../../../../../lib/browser'
import Mustache from 'mustache'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ org: string; slug: string }> }
) {
  const { org, slug } = await params
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await ensureOrgAccessBySlug(session.user.id as string, org)
  if (access.notFound)
    return NextResponse.json({ error: 'Dernek bulunamadı' }, { status: 404 })
  if (!access.allowed)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tpl = await (prisma as any).template.findFirst({
    where: { organizationId: access.org.id, slug },
  })
  if (!tpl)
    return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 })

  let data: any = {}
  try {
    data = await req.json()
  } catch {}

  const html = Mustache.render(tpl.content, data)

  const pdf = await generatePDFFromHTML(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${slug}.pdf"`,
    },
  })
}
