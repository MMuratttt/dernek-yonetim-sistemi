'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabPanel } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ListRow } from '@/components/ui/list-row'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'

export default function MeetingDetailClient({
  org,
  meetingId,
}: {
  org: string
  meetingId: string
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initialTab = (() => {
    const t = (searchParams?.get('tab') || '').toLowerCase()
    const allowed = [
      'overview',
      'agendas',
      'invites',
      'attendance',
      'minutes',
      'documents',
    ]
    return (allowed.includes(t) ? (t as any) : 'overview') as
      | 'overview'
      | 'agendas'
      | 'invites'
      | 'attendance'
      | 'minutes'
      | 'documents'
  })()
  const [active, setActive] = useState<
    'overview' | 'agendas' | 'invites' | 'attendance' | 'minutes' | 'documents'
  >(initialTab)
  const [loading, setLoading] = useState(false)
  const [meeting, setMeeting] = useState<any | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const { add } = useToast()

  async function loadMeeting() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/${org}/meetings/${encodeURIComponent(meetingId)}`,
        { cache: 'no-store' }
      )
      const data = res.ok ? await res.json() : null
      setMeeting(data?.item || null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMeeting()
  }, [org, meetingId])

  // Agendas
  const [agendas, setAgendas] = useState<
    Array<{ id: string; title: string; order: number }>
  >([])
  const [agendaTitle, setAgendaTitle] = useState('')
  async function loadAgendas() {
    const res = await fetch(
      `/api/${org}/meetings/agendas?meetingId=${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    )
    const data = res.ok ? await res.json() : { items: [] }
    setAgendas(
      (data.items || []).sort(
        (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
      )
    )
  }
  async function addAgenda() {
    if (!agendaTitle.trim()) return
    const res = await fetch(`/api/${org}/meetings/agendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, title: agendaTitle }),
    })
    if (!res.ok) return add({ variant: 'error', title: 'Gündem eklenemedi' })
    setAgendaTitle('')
    await loadAgendas()
    add({ variant: 'success', title: 'Gündem eklendi' })
  }
  async function deleteAgenda(id: string) {
    if (!confirm('Gündemi silmek istiyor musunuz?')) return
    const res = await fetch(
      `/api/${org}/meetings/agendas?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) return add({ variant: 'error', title: 'Gündem silinemedi' })
    await loadAgendas()
    add({ variant: 'success', title: 'Gündem silindi' })
  }

  // Invites
  const [invites, setInvites] = useState<
    Array<{
      id: string
      memberId: string
      status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED'
    }>
  >([])
  async function loadInvites() {
    const res = await fetch(
      `/api/${org}/meetings/invites?meetingId=${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    )
    const data = res.ok ? await res.json() : { items: [] }
    setInvites(data.items || [])
  }
  async function sendInvites() {
    const res = await fetch(`/api/${org}/meetings/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    })
    if (!res.ok)
      return add({ variant: 'error', title: 'Davetiye gönderilemedi' })
    add({ variant: 'success', title: 'Davetiye kuyruğa alındı' })
    await loadInvites()
  }

  // Attendance
  const [attFilter, setAttFilter] = useState<'all' | 'present' | 'absent'>(
    'all'
  )
  const [attendance, setAttendance] = useState<
    Array<{
      id: string
      member: { id: string; firstName: string; lastName: string }
      present: boolean
    }>
  >([])
  async function loadAttendance() {
    const res = await fetch(
      `/api/${org}/meetings/attendance?meetingId=${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    )
    const data = res.ok ? await res.json() : { items: [] }
    setAttendance(data.items || [])
  }
  async function togglePresent(id: string, present: boolean) {
    const res = await fetch(`/api/${org}/meetings/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, present }),
    })
    if (!res.ok)
      return add({ variant: 'error', title: 'Yoklama güncellenemedi' })
    setAttendance((prev) =>
      prev.map((a) => (a.id === id ? { ...a, present } : a))
    )
    add({
      variant: 'success',
      title: present ? 'Katıldı işaretlendi' : 'Katılmadı işaretlendi',
    })
  }

  // Minutes/Decisions for meeting
  const [minutes, setMinutes] = useState<
    Array<{ id: string; title: string; content: string; createdAt: string }>
  >([])
  const [minTitle, setMinTitle] = useState('')
  const [minContent, setMinContent] = useState('')
  async function loadMinutes() {
    const res = await fetch(
      `/api/${org}/meetings/minutes?meetingId=${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    )
    const data = res.ok ? await res.json() : { items: [] }
    setMinutes(data.items || [])
  }
  async function addMinute() {
    if (!minTitle.trim() || !minContent.trim()) return
    const res = await fetch(`/api/${org}/meetings/minutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, title: minTitle, content: minContent }),
    })
    if (!res.ok) return add({ variant: 'error', title: 'Tutanak eklenemedi' })
    setMinTitle('')
    setMinContent('')
    await loadMinutes()
    add({ variant: 'success', title: 'Tutanak eklendi' })
  }
  async function deleteMinute(id: string) {
    if (!confirm('Tutanak silinsin mi?')) return
    const res = await fetch(
      `/api/${org}/meetings/minutes?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) return add({ variant: 'error', title: 'Tutanak silinemedi' })
    await loadMinutes()
    add({ variant: 'success', title: 'Tutanak silindi' })
  }

  // Documents
  async function loadDocuments() {
    const res = await fetch(`/api/${org}/meetings/${meetingId}/documents`, {
      cache: 'no-store',
    })
    const data = res.ok ? await res.json() : { items: [] }
    setDocuments(data.items || [])
  }
  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/${org}/meetings/${meetingId}/documents`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      add({ variant: 'error', title: data.error || 'Dosya yüklenemedi' })
      setUploading(false)
      return
    }

    add({ variant: 'success', title: 'Dosya yüklendi' })
    await loadDocuments()
    setUploading(false)
    e.target.value = '' // Reset file input
  }
  async function deleteDocument(docId: string) {
    if (!confirm('Belgeyi silmek istiyor musunuz?')) return

    const res = await fetch(
      `/api/${org}/meetings/${meetingId}/documents/${docId}`,
      {
        method: 'DELETE',
      }
    )

    if (!res.ok) {
      add({ variant: 'error', title: 'Belge silinemedi' })
      return
    }

    add({ variant: 'success', title: 'Belge silindi' })
    await loadDocuments()
  }

  useEffect(() => {
    if (active === 'agendas') loadAgendas()
    if (active === 'invites') loadInvites()
    if (active === 'attendance') loadAttendance()
    if (active === 'minutes') loadMinutes()
    if (active === 'documents') loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Özet' },
      { id: 'agendas', label: 'Gündem' },
      { id: 'invites', label: 'Davetiyeler' },
      { id: 'attendance', label: 'Yoklama' },
      { id: 'minutes', label: 'Tutanaklar' },
      { id: 'documents', label: 'Belgeler' },
    ],
    []
  )

  function setTabAndUrl(tab: typeof active) {
    setActive(tab)
    try {
      const sp = new URLSearchParams(searchParams || undefined)
      sp.set('tab', tab)
      router.replace(`${pathname}?${sp.toString()}`)
    } catch {}
  }

  return (
    <div className="rounded border bg-card p-3">
      <Tabs
        tabs={tabs}
        value={active}
        onChange={(t) => setTabAndUrl(t as any)}
      />
      <TabPanel active={active === 'overview'}>
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Spinner size={16} /> Yükleniyor…
          </div>
        ) : meeting ? (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">
                  Başlık:
                </span>
                <strong>{meeting.title}</strong>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">
                  Tür:
                </span>
                <span>{meeting.type}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">
                  Tarih & Saat:
                </span>
                <span>
                  {new Date(meeting.scheduledAt).toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {meeting.location && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[100px]">
                    Konum:
                  </span>
                  <span>{meeting.location}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">
                  Durum:
                </span>
                <span>{meeting.status}</span>
              </div>
              {meeting.intervalYears && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[100px]">
                    Aralık:
                  </span>
                  <span>{meeting.intervalYears} yıl</span>
                </div>
              )}
              {meeting.description && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[100px]">
                    Açıklama:
                  </span>
                  <span className="whitespace-pre-wrap">
                    {meeting.description}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">İstatistikler</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded border bg-muted/30">
                  <div className="text-muted-foreground">Gündem</div>
                  <div className="text-lg font-semibold">
                    {meeting.agendas?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded border bg-muted/30">
                  <div className="text-muted-foreground">Davetiye</div>
                  <div className="text-lg font-semibold">
                    {meeting.invites?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded border bg-muted/30">
                  <div className="text-muted-foreground">Katılım</div>
                  <div className="text-lg font-semibold">
                    {meeting.attendance?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded border bg-muted/30">
                  <div className="text-muted-foreground">Belgeler</div>
                  <div className="text-lg font-semibold">
                    {meeting.documents?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Kayıt bulunamadı.</div>
        )}
      </TabPanel>

      <TabPanel active={active === 'agendas'}>
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={agendaTitle}
            onChange={(e) => setAgendaTitle(e.target.value)}
            placeholder="Gündem maddesi"
            className="flex-1"
          />
          <Button onClick={addAgenda}>Ekle</Button>
        </div>
        <ul className="divide-y rounded border">
          {agendas.map((a) => (
            <li
              key={a.id}
              className="p-2 flex items-center justify-between text-sm"
            >
              <div>
                {a.order}. {a.title}
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteAgenda(a.id)}
              >
                Sil
              </Button>
            </li>
          ))}
          {agendas.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground">
              Gündem maddesi yok.
            </li>
          )}
        </ul>
      </TabPanel>

      <TabPanel active={active === 'invites'}>
        <div className="mb-2 flex items-center gap-2">
          <Button onClick={sendInvites} variant="outline">
            Davetiyeleri Gönder
          </Button>
        </div>
        <ul className="divide-y rounded border">
          {invites.map((i) => (
            <li
              key={i.id}
              className="p-2 text-sm flex items-center justify-between"
            >
              <div>Üye: {i.memberId}</div>
              <div className="text-xs text-muted-foreground">
                Durum: {i.status}
              </div>
            </li>
          ))}
          {invites.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground">
              Henüz davetiye yok.
            </li>
          )}
        </ul>
      </TabPanel>

      <TabPanel active={active === 'attendance'}>
        <div className="mb-2 flex items-center gap-2">
          <Select
            value={attFilter}
            onChange={(e) =>
              setAttFilter((e.target as HTMLSelectElement).value as any)
            }
            className="h-8 w-[200px]"
          >
            <option value="all">Tümü</option>
            <option value="present">Katılanlar</option>
            <option value="absent">Katılmayanlar</option>
          </Select>
        </div>
        <ul className="divide-y rounded border">
          {attendance
            .filter(
              (a) =>
                attFilter === 'all' ||
                (attFilter === 'present' ? a.present : !a.present)
            )
            .map((a) => (
              <li key={a.id} className="p-2 text-sm flex items-center gap-2">
                <div className="flex-1">
                  {a.member.firstName} {a.member.lastName}
                </div>
                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={a.present}
                    onChange={(e) =>
                      togglePresent(a.id, e.currentTarget.checked)
                    }
                  />
                  Katıldı
                </label>
              </li>
            ))}
          {attendance.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground">
              Henüz yoklama yok.
            </li>
          )}
        </ul>
      </TabPanel>

      <TabPanel active={active === 'minutes'}>
        <div className="space-y-2 mb-2 rounded border p-2">
          <Input
            value={minTitle}
            onChange={(e) => setMinTitle(e.target.value)}
            placeholder="Başlık"
          />
          <textarea
            value={minContent}
            onChange={(e) => setMinContent(e.target.value)}
            placeholder="İçerik"
            className="w-full h-28 rounded border px-2 py-1"
          />
          <Button onClick={addMinute}>Ekle</Button>
        </div>
        <ul className="divide-y rounded border">
          {minutes.map((m) => (
            <li key={m.id} className="p-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                {m.content}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMinute(m.id)}
                >
                  Sil
                </Button>
              </div>
            </li>
          ))}
          {minutes.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground">
              Henüz tutanak yok.
            </li>
          )}
        </ul>
      </TabPanel>

      <TabPanel active={active === 'documents'}>
        <div className="mb-4 flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={uploadDocument}
            disabled={uploading}
            className="flex-1"
          />
          {uploading && (
            <span className="text-sm text-muted-foreground">Yükleniyor...</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Kabul edilen dosya türleri: PDF, Word (.doc, .docx), Excel (.xls,
          .xlsx)
        </div>
        <ul className="divide-y rounded border">
          {documents.map((doc) => (
            <li key={doc.id} className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{doc.fileName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(doc.fileSize / 1024).toFixed(2)} KB • Yüklenme:{' '}
                  {new Date(doc.uploadedAt).toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/${doc.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  İndir
                </a>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteDocument(doc.id)}
                >
                  Sil
                </Button>
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground text-center">
              Henüz belge eklenmemiş. Yukarıdaki alandan belge
              yükleyebilirsiniz.
            </li>
          )}
        </ul>
      </TabPanel>
    </div>
  )
}
