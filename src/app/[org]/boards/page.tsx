import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { BoardsClient } from '@/app/[org]/boards/BoardsClient'
import { LinkButton } from '@/components/ui/link-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default async function BoardsPage(props: any) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getRole() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/me`,
        { cache: 'no-store' }
      )
      if (!res.ok) return null as any
      const data = await res.json()
      return data.role as 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'MEMBER'
    } catch {
      return null as any
    }
  }

  async function getBoards() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/boards`,
        { cache: 'no-store' }
      )
      if (!res.ok) return [] as any[]
      const data = await res.json()
      return data.items as any[]
    } catch {
      return [] as any[]
    }
  }

  const [role, boards] = await Promise.all([getRole(), getBoards()])
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'

  return (
    <main>
      <Breadcrumbs
        items={[{ label: 'Kurullar', href: `/${params.org}/boards` }]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Kurullar
        </h1>
        <div className="flex items-center gap-2">
          <LinkButton
            href={`/${params.org}/members`}
            size="sm"
            variant="outline"
          >
            Üyelere Dön
          </LinkButton>
          <LinkButton
            href={`/${params.org}/groups`}
            size="sm"
            variant="outline"
          >
            Gruplara Dön
          </LinkButton>
        </div>
      </div>
      <BoardsClient
        org={params.org}
        canWrite={canWrite}
        initialItems={boards}
      />
    </main>
  )
}
