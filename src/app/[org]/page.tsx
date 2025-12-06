import { ensureOrgAccessBySlug } from '../../lib/authz'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { redirect } from 'next/navigation'
import { logError, logInfo } from '@/lib/log'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ org?: string | string[] }>
}) {
  try {
    const p = await params
    const orgParam = p.org
    const org = Array.isArray(orgParam) ? orgParam[0] : (orgParam ?? '')
    if (!org) {
      logInfo('org-page-missing-slug')
      redirect('/org')
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      logInfo('org-page-no-session', { org })
      redirect('/auth/signin')
    }

    const access = await ensureOrgAccessBySlug(session.user!.id as string, org)
    if (access.notFound) return <div>Dernek bulunamadı.</div>
    if (!access.allowed)
      return <div className="p-6">Bu derneğe erişiminiz yok.</div>

    // Get statistics for the dashboard
    const [
      memberCount,
      groupCount,
      meetingCount,
      boardCount,
      templateCount,
      financeData,
    ] = await Promise.all([
      prisma.member.count({ where: { organizationId: access.org.id } }),
      prisma.group.count({ where: { organizationId: access.org.id } }),
      prisma.meeting.count({ where: { organizationId: access.org.id } }),
      prisma.board.count({ where: { organizationId: access.org.id } }),
      prisma.template.count({ where: { organizationId: access.org.id } }),
      prisma.financeTransaction.aggregate({
        where: { organizationId: access.org.id },
        _sum: { amount: true },
      }),
    ])

    const modules = [
      {
        href: `/${org}/members`,
        title: 'Üyeler',
        description: 'Üye yönetimi ve kayıtları',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
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
        ),
        stat: memberCount,
        statLabel: 'kayıtlı üye',
        color: 'from-blue-500/10 to-blue-500/5',
        iconColor: 'text-blue-500',
      },
      {
        href: `/${org}/groups`,
        title: 'Gruplar',
        description: 'Grup ve komisyon yönetimi',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        stat: groupCount,
        statLabel: 'grup',
        color: 'from-purple-500/10 to-purple-500/5',
        iconColor: 'text-purple-500',
      },
      {
        href: `/${org}/meetings`,
        title: 'Toplantılar',
        description: 'Toplantı planlaması ve yönetimi',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        stat: meetingCount,
        statLabel: 'toplantı',
        color: 'from-green-500/10 to-green-500/5',
        iconColor: 'text-green-500',
      },
      {
        href: `/${org}/boards`,
        title: 'Kurullar',
        description: 'Kurul yönetimi ve dönem takibi',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
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
        ),
        stat: boardCount,
        statLabel: 'kurul',
        color: 'from-orange-500/10 to-orange-500/5',
        iconColor: 'text-orange-500',
      },
      {
        href: `/${org}/templates`,
        title: 'Şablonlar',
        description: 'Belge şablonları yönetimi',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        stat: templateCount,
        statLabel: 'şablon',
        color: 'from-pink-500/10 to-pink-500/5',
        iconColor: 'text-pink-500',
      },
      {
        href: `/${org}/finance`,
        title: 'Finans',
        description: 'Aidat ve finansal yönetim',
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        ),
        stat: financeData._sum.amount
          ? `₺${(Number(financeData._sum.amount) / 100).toLocaleString('tr-TR')}`
          : '₺0',
        statLabel: 'toplam işlem',
        color: 'from-emerald-500/10 to-emerald-500/5',
        iconColor: 'text-emerald-500',
      },
    ]

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Hoş Geldiniz</h2>
          <p className="text-muted-foreground">
            {access.org.name} yönetim paneline hoş geldiniz
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {modules.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="group hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer min-h-[160px] flex items-center">
                <CardContent className="px-6 py-6 w-full">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg bg-gradient-to-br ${module.color} flex-shrink-0`}
                    >
                      <div className={module.iconColor}>{module.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {module.stat}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {module.statLabel}
                        </span>
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  } catch (err: any) {
    logError('org-home-fatal', { message: err?.message, stack: err?.stack })
    throw err
  }
}
