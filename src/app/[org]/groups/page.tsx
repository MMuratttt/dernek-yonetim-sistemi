import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { GroupsClient } from '@/app/[org]/groups/GroupsClient'
import { LinkButton } from '@/components/ui/link-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default async function GroupsPage(props: any) {
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

  async function getGroups() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/groups`,
        { cache: 'no-store' }
      )
      if (!res.ok)
        return [] as Array<{
          id: string
          name: string
          type: 'GROUP' | 'COMMISSION'
          color?: string | null
          description?: string | null
        }>
      const data = await res.json()
      return data.items as Array<{
        id: string
        name: string
        type: 'GROUP' | 'COMMISSION'
        color?: string | null
        description?: string | null
      }>
    } catch {
      return [] as Array<{
        id: string
        name: string
        type: 'GROUP' | 'COMMISSION'
        color?: string | null
        description?: string | null
      }>
    }
  }

  const [role, groups] = await Promise.all([getRole(), getGroups()])
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'

  return (
    <main>
      <Breadcrumbs
        items={[{ label: 'Gruplar', href: `/${params.org}/groups` }]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Gruplar & Komisyonlar
        </h1>
        <LinkButton href={`/${params.org}/members`} size="sm" variant="outline">
          Üyelere Dön
        </LinkButton>
      </div>
      <GroupsClient
        org={params.org}
        canWrite={canWrite}
        initialItems={groups}
      />
    </main>
  )
}
