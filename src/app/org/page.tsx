export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { authOptions } from '../../lib/auth'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
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

    // Allow creating first org if there are no organizations at all
    const totalOrgsCount = await prisma.organization.count()
    const canCreateOrg = Boolean(superadmin) || totalOrgsCount === 0

    return { items, isSuperAdmin: Boolean(superadmin), canCreateOrg }
  } catch {
    return { items: [], isSuperAdmin: false, canCreateOrg: false }
  }
}

export default async function OrgsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Giriş Gerekli</h1>
            <p className="text-muted-foreground mb-6">
              Dernekleri görüntülemek için lütfen giriş yapın.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Giriş Yap
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { items, isSuperAdmin, canCreateOrg } = await getOrgs(session.user.id)

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
    <main className="min-h-screen">
      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-amber-600/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Dernekler
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md">
            Yönettiğiniz tüm dernekleri tek bir yerden görüntüleyin ve yönetin.
          </p>
        </div>

        {/* Stats Section */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="p-6 pt-8">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                  <span className="text-sm font-medium text-white/80">
                    Toplam Dernek
                  </span>
                </div>
                <div className="text-4xl font-bold">{totalOrgs}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-6 pt-8">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                  </div>
                  <span className="text-sm font-medium text-white/80">
                    Toplam Üye
                  </span>
                </div>
                <div className="text-4xl font-bold">{totalMembers}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-6 pt-8">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Ortalama Üye
                  </span>
                </div>
                <div className="text-4xl font-bold">
                  {totalOrgs > 0 ? Math.round(totalMembers / totalOrgs) : 0}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Dernek Listesi</h2>
          <span className="text-sm text-muted-foreground">
            {totalOrgs} dernek
          </span>
        </div>

        {/* Orgs Grid or Empty State */}
        {items.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/50 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Henüz dernek yok</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {canCreateOrg
                  ? 'Başlamak için yeni bir dernek oluşturun ve üyelerinizi yönetmeye başlayın.'
                  : 'Bir süper yöneticinin sizi bir derneğe eklemesini bekleyin.'}
              </p>
              {canCreateOrg && (
                <Link
                  href="/org/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  İlk Derneği Oluştur
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((o, index) => (
              <Card
                key={o.id}
                className="group hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <Link href={`/${o.slug}`} className="block p-6">
                    <div className="flex items-start gap-4">
                      {o.logoUrl ? (
                        <Image
                          src={o.logoUrl}
                          alt={o.name}
                          width={64}
                          height={64}
                          className="rounded-2xl border-2 border-border bg-background object-contain flex-shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center flex-shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7 text-amber-600 dark:text-amber-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {o.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 font-mono">
                          /{o.slug}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
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
                      <div className="flex items-center self-center">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-950 transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
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
                    </div>
                  </Link>
                  {isSuperAdmin && (
                    <div className="border-t bg-muted/30">
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

            {/* Add New Org Card */}
            {canCreateOrg && (
              <Link href="/org/new" className="block">
                <Card className="h-full border-dashed border-2 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all duration-300 group cursor-pointer">
                  <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px]">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-amber-600 dark:text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Yeni Dernek Ekle
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Yeni bir dernek oluşturun
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
