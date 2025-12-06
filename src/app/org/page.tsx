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
import { DeleteOrgButton } from '@/components/DeleteOrgButton'
import { redirect } from 'next/navigation'

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
    return { items, isSuperAdmin: Boolean(superadmin) }
  } catch {
    return { items: [], isSuperAdmin: false }
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

  const { items, isSuperAdmin } = await getOrgs(session.user.id)

  // If user is admin (not superadmin) and has exactly one org, redirect directly to it
  if (!isSuperAdmin && items.length === 1) {
    redirect(`/${items[0].slug}`)
  }

  const totalOrgs = items.length
  const totalMembers = items.reduce(
    (acc, o: any) => acc + (o._count?.members ?? 0),
    0
  )

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-none tracking-tight">
            Dernekler
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Yönettiğiniz dernekleri görüntüleyin ve yönetin
          </p>
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Toplam Dernek
            </div>
            <div className="text-3xl font-bold mt-2">{totalOrgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Toplam Üye
            </div>
            <div className="text-3xl font-bold mt-2">{totalMembers}</div>
          </CardContent>
        </Card>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-lg font-medium">Henüz dernek yok</p>
              <p className="text-sm mt-1">
                {isSuperAdmin
                  ? 'Başlamak için yeni bir dernek oluşturun'
                  : 'Bir süper yöneticinin sizi bir derneğe eklemesini bekleyin'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => (
            <Card
              key={o.id}
              className="group hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-0">
                <Link href={`/${o.slug}`} className="block p-6">
                  <div className="flex items-start gap-4">
                    {o.logoUrl ? (
                      <Image
                        src={o.logoUrl}
                        alt={o.name}
                        width={56}
                        height={56}
                        className="rounded-lg border bg-background object-contain flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                        {o.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        /{o.slug}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {o._count?.members ?? 0}
                          </span>
                          <span className="text-muted-foreground">üye</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
                {isSuperAdmin && (
                  <div className="border-t">
                    <DeleteOrgButton
                      slug={o.slug}
                      name={o.name}
                      memberCount={o._count?.members ?? 0}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
