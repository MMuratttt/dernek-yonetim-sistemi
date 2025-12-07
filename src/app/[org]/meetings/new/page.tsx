'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { useToast } from '@/components/ui/toast'

export default function NewMeetingPage({ params: paramsPromise }: any) {
  const params = use(paramsPromise)
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [type, setType] = useState<
    'GENERAL_ASSEMBLY' | 'BOARD' | 'COMMISSION' | 'OTHER'
  >('OTHER')
  const [loading, setLoading] = useState(false)
  const { add } = useToast()

  async function create() {
    setLoading(true)
    try {
      const res = await fetch(`/api/${params.org}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scheduledAt, type }),
      })
      if (res.ok) {
        const { item } = await res.json()
        add({ variant: 'success', title: 'Toplantı oluşturuldu' })
        router.push(`/${params.org}/meetings/${item.id}?tab=agendas`)
        router.refresh()
      } else {
        const d = await res.json().catch(() => null)
        add({
          variant: 'error',
          title: 'Oluşturma hatası',
          description: d?.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl p-6">
      <Breadcrumbs
        items={[
          { label: 'Toplantılar', href: `/${params.org}/meetings` },
          { label: 'Yeni' },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-4">Yeni Toplantı</h1>
      <div className="space-y-3">
        <div>
          <div className="text-sm mb-1">Başlık</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Tarih/Zaman</div>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm mb-1">Tür</div>
          <Select
            value={type}
            onChange={(e) =>
              setType((e.target as HTMLSelectElement).value as any)
            }
            className="w-[220px]"
          >
            <option value="GENERAL_ASSEMBLY">Genel Kurul</option>
            <option value="BOARD">Kurul</option>
            <option value="COMMISSION">Komisyon</option>
            <option value="OTHER">Diğer</option>
          </Select>
        </div>
        <Button onClick={create} disabled={loading}>
          {loading ? 'Oluşturuluyor…' : 'Oluştur'}
        </Button>
      </div>
    </main>
  )
}
