import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { ensureOrgAccessBySlug } from '../../lib/authz'
import { OrgNav } from '@/components/OrgNav'
import { redirect } from 'next/navigation'
import { logError, logInfo } from '@/lib/log'

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ org?: string | string[] }>
}) {
  try {
    const p = await params
    const orgParam = p.org
    const org = Array.isArray(orgParam) ? orgParam[0] : (orgParam ?? '')

    if (!org) {
      logWarnOnce('missing-org-slug')
      redirect('/org')
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      logInfo('no-session-org-layout', { org })
      redirect('/auth/signin')
    }

    const access = await ensureOrgAccessBySlug(session.user!.id as string, org)
    if (access.notFound) return <div>Dernek bulunamadı.</div>
    if (!access.allowed)
      return <div className="p-6">Bu derneğe erişiminiz yok.</div>

    return (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {access.org.name}
          </h1>
        </div>
        <OrgNav org={org} />
        <div className="mt-6">{children}</div>
      </section>
    )
  } catch (err: any) {
    logError('org-layout-fatal', { message: err?.message, stack: err?.stack })
    throw err
  }
}

function logWarnOnce(key: string) {
  // naive singleton to avoid log spam during streaming
  const g = globalThis as any
  g.__WARNED ||= new Set()
  if (!g.__WARNED.has(key)) {
    g.__WARNED.add(key)
    // eslint-disable-next-line no-console
    console.warn('[WARN]', key)
  }
}
