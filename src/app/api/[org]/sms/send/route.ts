import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '../../../../../lib/authz'
import { prisma } from '../../../../../lib/prisma'
import { sendBulkSms } from '../../../../../lib/sms/service'

const Body = z.object({
  message: z.string().min(1).max(612), // 4 concatenated SMS (~153*4)
  memberIds: z.array(z.string().min(1)).optional(),
  phones: z.array(z.string().min(6)).optional(),
  dryRun: z.boolean().optional(),
  campaignName: z.string().min(1).optional(),
  personalize: z.boolean().optional(),
})

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
    const body = await req.json()
    const parsed = Body.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const {
      message,
      memberIds = [],
      phones = [],
      dryRun,
      campaignName,
      personalize,
    } = parsed.data

    if (!memberIds.length && !phones.length)
      return NextResponse.json(
        { error: 'En az bir üye veya telefon numarası gerekli' },
        { status: 400 }
      )

    // Basic phone normalization (strip spaces, keep + and digits)
    const norm = (p: string) => p.replace(/[^+\d]/g, '')

    const memberPhones: string[] = []
    if (memberIds.length) {
      const mRows = await prisma.member.findMany({
        where: { id: { in: memberIds }, organizationId: access.org.id },
        select: { id: true, phone: true },
      })
      mRows.forEach((m) => m.phone && memberPhones.push(norm(m.phone)))
    }

    const directPhones = phones.map(norm)
    const result = await sendBulkSms({
      organizationId: access.org.id,
      memberIds,
      phones: directPhones,
      message,
      dryRun,
      campaignName,
      personalize,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json(
      { error: 'Server error', detail: e?.message },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
