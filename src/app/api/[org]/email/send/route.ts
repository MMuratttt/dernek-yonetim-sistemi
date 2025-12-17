import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '../../../../../lib/auth'
import { ensureOrgAccessBySlug, WRITE_ROLES } from '../../../../../lib/authz'
import { prisma } from '../../../../../lib/prisma'
import { sendMail } from '../../../../../lib/mail'

const Body = z.object({
  subject: z.string().min(1).max(500),
  message: z.string().min(1),
  memberIds: z.array(z.string().min(1)),
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

    const { subject, message, memberIds } = parsed.data

    if (!memberIds.length)
      return NextResponse.json(
        { error: 'En az bir üye gerekli' },
        { status: 400 }
      )

    // Fetch members with email addresses
    const members = await prisma.member.findMany({
      where: {
        id: { in: memberIds },
        organizationId: access.org.id,
        email: { not: null },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    if (!members.length) {
      return NextResponse.json(
        { error: 'Hiçbir üyede e-posta adresi bulunamadı' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Send emails to all members
    for (const member of members) {
      if (!member.email) continue

      try {
        // Personalize message with member name
        const personalizedMessage = message
          .replace(/\{ad\}/g, member.firstName || '')
          .replace(/\{soyad\}/g, member.lastName || '')
          .replace(
            /\{tam_ad\}/g,
            `${member.firstName || ''} ${member.lastName || ''}`.trim()
          )

        await sendMail({
          to: member.email,
          subject,
          text: personalizedMessage,
          html: personalizedMessage.replace(/\n/g, '<br>'),
        })

        results.push({
          memberId: member.id,
          email: member.email,
          success: true,
        })

        // TODO: Add email history logging if EmailHistory model is added to schema
        console.log(`Email sent to ${member.email} - Subject: ${subject}`)
      } catch (error: any) {
        console.error(`Failed to send email to ${member.email}:`, error)
        errors.push({
          memberId: member.id,
          email: member.email,
          error: error.message,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        sent: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    )
  } catch (e: any) {
    console.error(e)
    return NextResponse.json(
      { error: 'Server error', detail: e?.message },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
