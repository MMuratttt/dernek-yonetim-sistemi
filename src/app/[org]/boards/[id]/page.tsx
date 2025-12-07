import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LinkButton } from '@/components/ui/link-button'
import { BoardDetailClient } from '@/app/[org]/boards/[id]/BoardDetailClient'

async function getBoard(org: string, id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${org}/boards`,
    { cache: 'no-store' }
  )
  const data = res.ok ? await res.json() : { items: [] }
  const item = (data.items || []).find((x: any) => x.id === id)
  if (!item) return null
  const termsRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${org}/boards/terms?boardId=${id}`,
    { cache: 'no-store' }
  )
  const termsData = termsRes.ok ? await termsRes.json() : { items: [] }
  return { ...item, terms: termsData.items || [] }
}

export default async function BoardDetailPage(props: any) {
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
  const board = await getBoard(params.org, params.id)
  if (!board) {
    const { notFound } = await import('next/navigation')
    notFound()
  }
  const role = await getRole()
  const canWrite = role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'

  return (
    <main>
      <Breadcrumbs
        items={[
          { label: 'Kurullar', href: `/${params.org}/boards` },
          { label: board.name, href: `/${params.org}/boards/${board.id}` },
        ]}
      />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {board.name}
        </h1>
        <div className="flex items-center gap-2">
          <LinkButton
            href={`/${params.org}/boards`}
            size="sm"
            variant="outline"
          >
            Kurullara Dön
          </LinkButton>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded border bg-card p-3">
          <BoardDetailClient
            org={params.org}
            boardId={board.id}
            boardName={board.name}
            canWrite={canWrite}
          />
        </section>
        <section className="rounded border bg-card p-3">
          <h2 className="font-semibold mb-2">Kurul Hakkında</h2>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {board.description || 'Açıklama yok.'}
          </div>
        </section>
      </div>
    </main>
  )
}
