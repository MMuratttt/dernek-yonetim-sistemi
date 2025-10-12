export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { LinkButton } from '@/components/ui/link-button'
import { revalidatePath } from 'next/cache'
import { authOptions } from '../../lib/auth'
import { getServerSession } from 'next-auth'
import { ListRow } from '@/components/ui/list-row'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton'

async function getOrgs(userId: string) {
  try {
    const superadmin = await prisma.organizationMembership.findFirst({
      where: { userId, role: 'SUPERADMIN' },
      select: { id: true },
    })
    const items = (await prisma.organization.findMany({
      where: superadmin ? {} : { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    })) as any[]
    return items
  } catch {
    return []
  }
}

export default async function OrgsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return (
      <main>
        <h1 className="text-2xl font-semibold mb-4">Dernekler</h1>
        <p>Devam etmek için lütfen giriş yapın.</p>
      </main>
    )
  }

  const items = await getOrgs(session.user.id)
  const totalOrgs = items.length
  const totalMembers = items.reduce(
    (acc, o: any) => acc + (o._count?.members ?? 0),
    0
  )
  const isSuperAdmin = await prisma.organizationMembership.findFirst({
    where: { userId: session.user.id, role: 'SUPERADMIN' },
    select: { id: true },
  })
  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Dernekler
        </h1>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Toplam Dernek</div>
            <div className="text-2xl font-semibold">{totalOrgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Toplam Üye</div>
            <div className="text-2xl font-semibold">{totalMembers}</div>
          </CardContent>
        </Card>
      </div>
      {items.length === 0 ? (
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          Henüz dernek yok. Eğer süper yöneticisiniz, sağ üstten "Yeni Dernek"
          ekleyin.
        </div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {items.map((o) => (
            <ListRow key={o.id} className="p-0 group">
              <div className="flex items-stretch">
                <Link
                  href={`/${o.slug}/members`}
                  className="flex-1 block p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {o.logoUrl ? (
                        <Image
                          src={o.logoUrl}
                          alt="logo"
                          width={32}
                          height={32}
                          className="rounded border bg-background object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded border bg-background" />
                      )}
                      <div>
                        <div className="font-medium">{o.name}</div>
                        <div className="text-sm text-muted-foreground">
                          /{o.slug}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Üye: {o._count?.members ?? 0}
                    </div>
                  </div>
                </Link>
                {/* Delete button only for superadmins (checked server-side) */}
                {isSuperAdmin ? (
                  <form
                    action={async () => {
                      'use server'
                      // Safety re-check
                      const isSuper =
                        await prisma.organizationMembership.findFirst({
                          where: {
                            userId: session.user.id,
                            role: 'SUPERADMIN',
                          },
                        })
                      if (!isSuper) return
                      await prisma.organization.delete({ where: { id: o.id } })
                      revalidatePath('/org')
                    }}
                  >
                    <ConfirmDeleteButton
                      className="px-3 text-xs text-destructive hover:text-destructive/80 hidden group-hover:inline-flex items-center"
                      confirmMessage={`${o.name} derneğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                      label="Sil"
                    />
                  </form>
                ) : null}
              </div>
            </ListRow>
          ))}
        </ul>
      )}
    </main>
  )
}
