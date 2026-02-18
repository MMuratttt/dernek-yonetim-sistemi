import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ensureOrgAccessBySlug } from '@/lib/authz'
import RaporClient from './RaporClient'

export default async function KasaRaporPage({ params }: any) {
  const { org } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  let orgName = org
  try {
    if (session?.user?.id) {
      const access = await ensureOrgAccessBySlug(session.user.id, org)
      if (access.allowed && access.org) {
        orgName = access.org.name
      }
    }
  } catch {}

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { label: org, href: `/${org}` },
            { label: 'Finans', href: `/${org}/finance` },
            { label: 'Kasa', href: `/${org}/finance/kasa` },
            { label: 'Rapor', href: `/${org}/finance/kasa/rapor` },
          ]}
        />
      </div>
      <RaporClient org={org} orgName={orgName} />
    </div>
  )
}
