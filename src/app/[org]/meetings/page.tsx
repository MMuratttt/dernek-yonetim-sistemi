import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LinkButton } from '@/components/ui/link-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import MeetingsClient from './MeetingsClient'

export default async function MeetingsPage({
  params: paramsPromise,
  searchParams,
}: {
  params: Promise<{ org: string }>
  searchParams: Promise<{
    q?: string
    type?: string
    status?: string
    from?: string
    to?: string
  }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getRole() {
    try {
      const { ensureOrgAccessBySlug } = await import('@/lib/authz')
      const access = await ensureOrgAccessBySlug(
        session.user.id as string,
        params.org
      )
      if (!access.allowed) return null as any
      return access.role as 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'MEMBER'
    } catch {
      return null as any
    }
  }

  async function getMeetings() {
    try {
      const sp = await searchParams
      const query = new URLSearchParams()
      if (sp.q) query.set('q', sp.q)
      if (sp.type) query.set('type', sp.type)
      if (sp.status) query.set('status', sp.status)
      if (sp.from) query.set('from', sp.from)
      if (sp.to) query.set('to', sp.to)
      const qs = query.toString()
      const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/meetings${qs ? `?${qs}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return [] as any
      const data = await res.json()
      return data.items as Array<any>
    } catch {
      return [] as any
    }
  }

  const [role, meetings] = await Promise.all([getRole(), getMeetings()])
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN'
  const sp = await searchParams

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Toplantılar
        </h1>
        <div className="flex gap-2">
          <LinkButton
            href={`/${params.org}/members`}
            size="sm"
            variant="outline"
          >
            Üyelere Dön
          </LinkButton>
          {canWrite && (
            <LinkButton href={`/${params.org}/meetings/new`} size="sm">
              Yeni Toplantı
            </LinkButton>
          )}
        </div>
      </div>
      <form
        className="mb-4 grid gap-2 sm:grid-cols-5"
        role="search"
        aria-label="Toplantı arama/filtre"
      >
        <Input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Başlık ara"
          className="sm:col-span-2"
        />
        <Select name="type" defaultValue={sp.type ?? ''}>
          <option value="">Tüm türler</option>
          <option value="GENERAL_ASSEMBLY">Genel Kurul</option>
          <option value="BOARD">Kurul</option>
          <option value="COMMISSION">Komisyon</option>
          <option value="OTHER">Diğer</option>
        </Select>
        <Select name="status" defaultValue={sp.status ?? ''}>
          <option value="">Tüm durumlar</option>
          <option value="PLANNED">Planlandı</option>
          <option value="COMPLETED">Tamamlandı</option>
          <option value="CANCELLED">İptal</option>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            name="from"
            defaultValue={sp.from ?? ''}
            title="Başlangıç"
            className="w-[150px]"
          />
          <Input
            type="date"
            name="to"
            defaultValue={sp.to ?? ''}
            title="Bitiş"
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-5">
          <Button type="submit" variant="outline">
            Filtrele
          </Button>
          <LinkButton
            href={`/${params.org}/meetings`}
            size="sm"
            variant="outline"
          >
            Sıfırla
          </LinkButton>
        </div>
      </form>
      <MeetingsClient
        org={params.org}
        canWrite={canWrite}
        initialItems={meetings}
      />
    </main>
  )
}
