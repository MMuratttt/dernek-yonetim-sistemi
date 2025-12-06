import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LinkButton } from '@/components/ui/link-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import FinanceClient from '@/app/[org]/finance/FinanceClient'
import { ensureOrgAccessBySlug } from '@/lib/authz'

export default async function FinancePage({ params }: any) {
  const { org } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getRole() {
    try {
      const access = await ensureOrgAccessBySlug(
        session.user?.id as string,
        org
      )
      if (!access.allowed) return null
      return access.role as 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'MEMBER'
    } catch {
      return null as any
    }
  }

  async function getInitial() {
    try {
      const [plansRes, periodsRes, txRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${org}/finance/plans`,
          { cache: 'no-store' }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${org}/finance/periods`,
          { cache: 'no-store' }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${org}/finance/transactions?take=20`,
          { cache: 'no-store' }
        ),
      ])
      const plans = plansRes.ok ? (await plansRes.json()).items : []
      const periods = periodsRes.ok ? (await periodsRes.json()).items : []
      const tx = txRes.ok ? (await txRes.json()).items : []
      return { plans, periods, tx }
    } catch {
      return { plans: [], periods: [], tx: [] }
    }
  }

  const [role, initial] = await Promise.all([getRole(), getInitial()])
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'

  return (
    <main>
      <Breadcrumbs items={[{ label: 'Finans', href: `/${org}/finance` }]} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Üyelik Aidat / Finans
        </h1>
        <LinkButton href={`/${org}/members`} size="sm" variant="outline">
          Üyelere Dön
        </LinkButton>
      </div>
      <FinanceClient org={org} canWrite={canWrite} initial={initial} />
    </main>
  )
}
