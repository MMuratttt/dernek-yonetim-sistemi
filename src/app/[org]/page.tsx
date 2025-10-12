import { ensureOrgAccessBySlug } from '../../lib/authz'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { redirect } from 'next/navigation'
import { logError, logInfo } from '@/lib/log'

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

    redirect(`/${org}/members`)
  } catch (err: any) {
    logError('org-home-fatal', { message: err?.message, stack: err?.stack })
    throw err
  }
}
