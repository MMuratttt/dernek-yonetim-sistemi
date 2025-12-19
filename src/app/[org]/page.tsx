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

    // Get user's firstName for greeting
    const user = await prisma.user.findUnique({
      where: { id: session.user!.id as string },
      select: { firstName: true },
    })

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
        color: 'from-blue-500/10 to-blue-500/5',
        iconColor: 'text-blue-500',
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
        color: 'from-orange-500/10 to-orange-500/5',
        iconColor: 'text-orange-500',
      },
      {
        href: `/${org}/templates`,
        title: 'Dökümanlar',
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
        color: 'from-emerald-500/10 to-emerald-500/5',
        iconColor: 'text-emerald-500',
      },
      {
        href: `/${org}/sms`,
        title: 'İletişim Geçmişi',
        description: 'SMS ve e-posta geçmişi ve raporlar',
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        ),
        color: 'from-purple-500/10 to-purple-500/5',
        iconColor: 'text-purple-500',
      },
      {
        href: `/${org}/settings`,
        title: 'Ayarlar',
        description: 'Dernek ayarları ve yapılandırma',
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
        color: 'from-slate-500/10 to-slate-500/5',
        iconColor: 'text-slate-500',
      },
    ]

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-xl p-8 border">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {user?.firstName ? `Merhaba ${user.firstName},` : 'Merhaba,'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {access.org.name} yönetim paneline hoş geldiniz
          </p>
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground/90">
            Modüller
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link key={module.href} href={module.href}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/20 h-full">
                  <CardContent className="p-6 pt-8 flex items-center">
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`p-4 rounded-xl bg-gradient-to-br ${module.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                        >
                          <div className={module.iconColor}>{module.icon}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                            {module.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {module.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium mr-2">
                          Görüntüle
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
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
      </div>
    )
  } catch (err: any) {
    logError('org-home-fatal', { message: err?.message, stack: err?.stack })
    throw err
  }
}
