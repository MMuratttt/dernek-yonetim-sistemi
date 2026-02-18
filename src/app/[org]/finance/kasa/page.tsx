import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LinkButton } from '@/components/ui/link-button'
import KasaClient from './KasaClient'
import { ensureOrgAccessBySlug } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export default async function KasaPage({ params }: any) {
  const { org } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getRole() {
    try {
      if (!session?.user?.id) return null
      const access = await ensureOrgAccessBySlug(session.user.id, org)
      if (!access.allowed) return null
      return access.role as 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'MEMBER'
    } catch {
      return null as any
    }
  }

  async function getInitialData() {
    try {
      if (!session?.user?.id) {
        return {
          balance: 0,
          cashBalance: 0,
          bankBalance: 0,
          transactions: [],
          income: 0,
          expense: 0,
        }
      }

      const access = await ensureOrgAccessBySlug(session.user.id, org)
      if (!access.allowed || !access.org) {
        return {
          balance: 0,
          cashBalance: 0,
          bankBalance: 0,
          transactions: [],
          income: 0,
          expense: 0,
        }
      }

      // Fetch all transactions for the organization directly from database
      // Exclude CHARGE as it represents debt assignment, not actual cash flow
      const allTransactions = await (prisma as any).financeTransaction.findMany(
        {
          where: {
            organizationId: access.org.id,
            type: { in: ['PAYMENT', 'ADJUSTMENT', 'REFUND'] },
          },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { txnDate: 'desc' },
          take: 100,
        }
      )

      let income = 0
      let expense = 0
      let cashIncome = 0
      let cashExpense = 0
      let bankIncome = 0
      let bankExpense = 0

      allTransactions.forEach((tx: any) => {
        const amount = Number(tx.amount)
        const isCash = tx.paymentMethod === 'CASH'
        const isBank = tx.paymentMethod === 'BANK_TRANSFER'

        if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
          income += amount
          if (isCash) cashIncome += amount
          else if (isBank) bankIncome += amount
        } else if (tx.type === 'ADJUSTMENT') {
          if (amount < 0) {
            expense += Math.abs(amount)
            if (isCash) cashExpense += Math.abs(amount)
            else if (isBank) bankExpense += Math.abs(amount)
          } else {
            income += amount
            if (isCash) cashIncome += amount
            else if (isBank) bankIncome += amount
          }
        }
      })

      const balance = income - expense
      const cashBalance = cashIncome - cashExpense
      const bankBalance = bankIncome - bankExpense

      // Map transactions to a simplified format for display
      const transactions = allTransactions.map((tx: any) => {
        let displayType = 'GELIR'

        if (tx.type === 'PAYMENT' || tx.type === 'REFUND') {
          displayType = 'GELIR'
        } else if (tx.type === 'ADJUSTMENT') {
          displayType = Number(tx.amount) >= 0 ? 'GELIR' : 'GIDER'
        }

        // Build description: show member name if available, otherwise use note or "Dernek Kasası"
        let description = tx.note || 'İşlem'
        if (tx.member) {
          const memberName = `${tx.member.firstName} ${tx.member.lastName}`
          description = tx.note ? `${memberName} - ${tx.note}` : memberName
        } else if (!tx.note) {
          description = 'Dernek Kasası'
        }

        return {
          id: tx.id,
          type: displayType,
          amount: Number(tx.amount),
          note: description,
          txnDate: tx.txnDate.toISOString(),
          receiptNo: tx.receiptNo,
          paymentMethod: tx.paymentMethod,
        }
      })

      return {
        balance,
        cashBalance,
        bankBalance,
        income,
        expense,
        transactions,
      }
    } catch (error) {
      console.error('Error fetching initial kasa data:', error)
      return {
        balance: 0,
        cashBalance: 0,
        bankBalance: 0,
        transactions: [],
        income: 0,
        expense: 0,
      }
    }
  }

  const role = await getRole()
  const canWrite = ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(role ?? '')
  const initial = await getInitialData()

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: org, href: `/${org}` },
          { label: 'Finans', href: `/${org}/finance` },
          { label: 'Kasa', href: `/${org}/finance/kasa` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kasa Yönetimi</h1>
        <LinkButton
          href={`/${org}/finance/kasa/rapor`}
          variant="outline"
          className="gap-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Gelir / Gider Raporu
        </LinkButton>
      </div>
      <KasaClient org={org} canWrite={canWrite} initial={initial} />
    </div>
  )
}
