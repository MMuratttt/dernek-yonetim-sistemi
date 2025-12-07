import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import MeetingDetailClient from './MeetingDetailClient'

export default async function MeetingDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ org: string; id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/signin')
  }

  async function getMeeting() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/${params.org}/meetings?status=&type=`,
        { cache: 'no-store' }
      )
      if (!res.ok) return null as any
      const data = await res.json()
      const m = (data.items as any[]).find((x) => x.id === params.id)
      return m ?? null
    } catch {
      return null as any
    }
  }

  const meeting = await getMeeting()
  if (!meeting) return <div className="p-6">Toplantı bulunamadı.</div>

  return (
    <main>
      <Breadcrumbs
        items={[
          { label: 'Toplantılar', href: `/${params.org}/meetings` },
          { label: meeting.title },
        ]}
      />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {meeting.title}
        </h1>
        <div className="text-sm text-muted-foreground">
          {new Date(meeting.scheduledAt).toLocaleString()} • {meeting.type} •{' '}
          {meeting.status}
        </div>
      </div>
      <MeetingDetailClient org={params.org} meetingId={params.id} />
    </main>
  )
}
