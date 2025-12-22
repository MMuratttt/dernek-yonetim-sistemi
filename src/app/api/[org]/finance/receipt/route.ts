import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ensureOrgAccessBySlug } from '@/lib/authz'
import { generatePDFFromHTML } from '@/lib/browser'

export const runtime = 'nodejs'

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
  const id = url.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const txn = await (prisma as any).financeTransaction.findFirst({
    where: { id, organizationId: access.org.id },
  })
  if (!txn)
    return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const member = txn.memberId
    ? await (prisma as any).member.findUnique({ where: { id: txn.memberId } })
    : null
  const plan = txn.planId
    ? await (prisma as any).duesPlan.findUnique({ where: { id: txn.planId } })
    : null
  const period = txn.periodId
    ? await (prisma as any).duesPeriod.findUnique({
        where: { id: txn.periodId },
      })
    : null

  const html = `<!doctype html>
  <html><head><meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { font-size: 16px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px; }
  </style>
  </head><body>
    <h1>Makbuz</h1>
    <p>Dernek: ${access.org.name}</p>
    <p>Tarih: ${new Date(txn.txnDate).toLocaleDateString('tr-TR')}</p>
    <p>Üye: ${member ? member.firstName + ' ' + member.lastName : '-'}</p>
    <p>İşlem: ${txn.type} — ${txn.amount} ${txn.currency}</p>
    ${plan ? `<p>Plan/Dönem: ${plan.name}${period ? ' - ' + period.name : ''}</p>` : ''}
    ${txn.receiptNo ? `<p>Makbuz No: ${txn.receiptNo}</p>` : ''}
    ${txn.paymentMethod ? `<p>Ödeme Yöntemi: ${txn.paymentMethod}</p>` : ''}
    ${txn.reference ? `<p>Referans: ${txn.reference}</p>` : ''}
    ${txn.note ? `<p>Not: ${txn.note}</p>` : ''}
  </body></html>`

  const pdf = await generatePDFFromHTML(html, {
    format: 'A5',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="makbuz-${id}.pdf"`,
    },
  })
}
