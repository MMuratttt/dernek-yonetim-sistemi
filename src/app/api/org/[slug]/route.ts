// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// DELETE /api/org/[slug]
// Only SUPERADMIN can delete an organization.
export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getSession()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = params
  if (!slug)
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const isSuper = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
    select: { id: true },
  })
  if (!isSuper)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const org = await prisma.organization.findUnique({ where: { slug } })
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Member count guard (FK RESTRICT) – first ensure no members remain
    const memberCount = await prisma.member.count({
      where: { organizationId: org.id },
    })
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Önce derneğe bağlı üyeleri silin veya taşıyın.' },
        { status: 400 }
      )
    }

    await prisma.organization.delete({ where: { id: org.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Delete org failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
