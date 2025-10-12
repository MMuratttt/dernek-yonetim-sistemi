import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/org/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Yetki kontrolü
    const isSuper = await prisma.organizationMembership.findFirst({
      where: { userId: session.user.id, role: 'SUPERADMIN' },
      select: { id: true },
    })
    if (!isSuper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Üye var mı? (RESTRICT FK sebebiyle engelle)
    const memberCount = await prisma.member.count({
      where: { organizationId: id },
    })
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Önce derneğe bağlı üyeleri silin veya taşıyın.' },
        { status: 400 }
      )
    }

    await prisma.organization.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/org/:id failed', err)
    return NextResponse.json(
      { error: 'Silme sırasında hata oluştu', detail: err?.message },
      { status: 500 }
    )
  }
}
