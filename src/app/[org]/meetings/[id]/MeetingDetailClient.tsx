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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getMeetingTypeLabel,
  getMeetingDocumentTypeLabel,
} from '@/lib/meetings'

export default function MeetingDetailClient({
  org,
  meetingId,
  initialMeeting,
}: {
  org: string
  meetingId: string
  initialMeeting?: any
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initialTab = (() => {
    const t = (searchParams?.get('tab') || '').toLowerCase()
    const allowed = ['overview', 'invites', 'documents', 'notes']
    return (allowed.includes(t) ? (t as any) : 'overview') as
      | 'overview'
      | 'invites'
      | 'documents'
      | 'notes'
  })()
  const [active, setActive] = useState<
    'overview' | 'invites' | 'documents' | 'notes'
  >(initialTab)
  const [loading, setLoading] = useState(false)
  const [meeting, setMeeting] = useState<any | null>(initialMeeting || null)
  const [documents, setDocuments] = useState<any[]>(
    initialMeeting?.documents || []
  )
  const [uploading, setUploading] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const [customDocumentName, setCustomDocumentName] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const { add } = useToast()

  const REQUIRED_DOCUMENT_TYPES = [
    'DIVAN_TUTANAGI',
    'HAZIRUN_LISTESI',
    'FAALIYET_RAPORU',
    'DENETIM_KURULU_RAPORU',
  ]

  // Calculate which document types are already uploaded
  const uploadedTypes = documents.map((doc) => doc.documentType).filter(Boolean)
  const missingTypes = REQUIRED_DOCUMENT_TYPES.filter(
    (type) => !uploadedTypes.includes(type)
  )
  const allDocumentsUploaded = missingTypes.length === 0

  async function loadMeeting() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/${org}/meetings/${encodeURIComponent(meetingId)}`,
        { cache: 'no-store' }
      )
      const data = res.ok ? await res.json() : null
      setMeeting(data?.item || null)
      setDocuments(data?.item?.documents || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialMeeting) {
      loadMeeting()
    }
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
    const newItem = {
      order: agendas.length,
      title: agendaTitle.trim(),
    }
    const res = await fetch(`/api/${org}/meetings/agendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId,
        items: [
          ...agendas.map((a) => ({ id: a.id, order: a.order, title: a.title })),
          newItem,
        ],
      }),
    })
    if (!res.ok) return add({ variant: 'error', title: 'Not eklenemedi' })
    setAgendaTitle('')
    await loadAgendas()
    add({ variant: 'success', title: 'Not eklendi' })
  }
  function deleteAgenda(id: string) {
    setNoteToDelete(id)
    setDeleteConfirmOpen(true)
  }
  async function confirmDeleteAgenda() {
    if (!noteToDelete) return
    const filteredItems = agendas
      .filter((a) => a.id !== noteToDelete)
      .map((a, idx) => ({
        id: a.id,
        order: idx,
        title: a.title,
      }))
    const res = await fetch(`/api/${org}/meetings/agendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, items: filteredItems }),
    })
    setDeleteConfirmOpen(false)
    setNoteToDelete(null)
    if (!res.ok) return add({ variant: 'error', title: 'Not silinemedi' })
    await loadAgendas()
    add({ variant: 'success', title: 'Not silindi' })
  }

  // Invites
  const [invites, setInvites] = useState<
    Array<{
      id: string
      memberId: string
      status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED'
    }>
  >([])
  // Communication campaigns linked to this meeting
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([])
  const [emailCampaigns, setEmailCampaigns] = useState<any[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)

  async function loadInvites() {
    const res = await fetch(
      `/api/${org}/meetings/invites?meetingId=${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    )
    const data = res.ok ? await res.json() : { items: [] }
    setInvites(data.items || [])
  }

  async function loadCampaigns() {
    setCampaignsLoading(true)
    try {
      const res = await fetch(`/api/${org}/meetings/${meetingId}/campaigns`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setSmsCampaigns(data.smsCampaigns || [])
        setEmailCampaigns(data.emailCampaigns || [])
      }
    } finally {
      setCampaignsLoading(false)
    }
  }

  function goToCommHistory() {
    router.push(`/${org}/sms`)
  }

  // Documents
  async function loadDocuments() {
    const res = await fetch(`/api/${org}/meetings/${meetingId}/documents`, {
      cache: 'no-store',
    })
    const data = res.ok ? await res.json() : { items: [] }
    setDocuments(data.items || [])
  }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  async function uploadDocument() {
    if (!selectedFile) {
      add({ variant: 'error', title: 'Lütfen dosya seçin' })
      return
    }

    if (!selectedDocumentType) {
      add({ variant: 'error', title: 'Lütfen belge türü seçin' })
      return
    }

    if (selectedDocumentType === 'OTHER' && !customDocumentName.trim()) {
      add({ variant: 'error', title: 'Lütfen belge adı girin' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('documentType', selectedDocumentType)
    if (selectedDocumentType === 'OTHER') {
      formData.append('customName', customDocumentName)
    }

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
    setSelectedDocumentType('')
    setCustomDocumentName('')
    setSelectedFile(null)
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
    if (active === 'notes') loadAgendas()
    if (active === 'invites') {
      loadInvites()
      loadCampaigns()
    }
    if (active === 'documents') loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Özet' },
      { id: 'invites', label: 'Davetiyeler' },
      { id: 'documents', label: 'Belgeler' },
      { id: 'notes', label: 'Notlar' },
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
                <span>{getMeetingTypeLabel(meeting.type)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[100px]">
                  Tarih:
                </span>
                <span>
                  {new Date(meeting.scheduledAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
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

      <TabPanel active={active === 'notes'}>
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={agendaTitle}
            onChange={(e) => setAgendaTitle(e.target.value)}
            placeholder="Not ekle"
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
                {a.order + 1}. {a.title}
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
            <li className="p-2 text-sm text-muted-foreground">Not yok.</li>
          )}
        </ul>
      </TabPanel>

      <TabPanel active={active === 'invites'}>
        <div className="mb-4 flex items-center gap-2">
          <Button onClick={goToCommHistory} variant="outline">
            İletişim Bağla
          </Button>
        </div>

        {/* Communication History Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Bağlı İletişimler</h3>

          {campaignsLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Spinner size={16} /> Yükleniyor…
            </div>
          ) : smsCampaigns.length === 0 && emailCampaigns.length === 0 ? (
            <div className="p-4 rounded border bg-muted/30 text-sm text-muted-foreground text-center">
              Bu toplantıya henüz iletişim bağlanmamış.
              <br />
              <span className="text-xs">
                İletişim Geçmişi sayfasından SMS veya E-posta kampanyalarını bu
                toplantıya bağlayabilirsiniz.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* SMS Campaigns */}
              {smsCampaigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    SMS
                  </h4>
                  <ul className="divide-y rounded border">
                    {smsCampaigns.map((c) => (
                      <li
                        key={c.id}
                        className="p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          router.push(
                            `/${org}/sms?campaignId=${c.id}&channel=SMS`
                          )
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{c.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              c.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            }`}
                          >
                            {c.status === 'COMPLETED' ? 'Tamamlandı' : c.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {c.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Alıcı: {c.totalRecipients}</span>
                          <span className="text-green-600">
                            Gönderilen: {c.sentCount}
                          </span>
                          <span className="text-red-600">
                            Başarısız: {c.failedCount}
                          </span>
                          <span>
                            {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Email Campaigns */}
              {emailCampaigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 8.5C3 7.67157 3.67157 7 4.5 7H19.5C20.3284 7 21 7.67157 21 8.5V15.5C21 16.3284 20.3284 17 19.5 17H4.5C3.67157 17 3 16.3284 3 15.5V8.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 8.5L12 13.5L3 8.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    E-posta
                  </h4>
                  <ul className="divide-y rounded border">
                    {emailCampaigns.map((c) => (
                      <li
                        key={c.id}
                        className="p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          router.push(
                            `/${org}/sms?campaignId=${c.id}&channel=EMAIL`
                          )
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{c.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              c.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            }`}
                          >
                            {c.status === 'COMPLETED' ? 'Tamamlandı' : c.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium mb-1">
                          Konu: {c.subject}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {c.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Alıcı: {c.totalRecipients}</span>
                          <span className="text-green-600">
                            Gönderilen: {c.sentCount}
                          </span>
                          <span className="text-red-600">
                            Başarısız: {c.failedCount}
                          </span>
                          <span>
                            {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </TabPanel>

      <TabPanel active={active === 'documents'}>
        <div className="mb-4 space-y-2">
          {!allDocumentsUploaded && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200 mb-3">
              Eksik gerekli belgeler:{' '}
              {missingTypes
                .map((t) => getMeetingDocumentTypeLabel(t))
                .join(', ')}
            </div>
          )}
          {allDocumentsUploaded && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200 mb-3">
              Tüm gerekli belgeler yüklenmiştir.
            </div>
          )}
          <Select
            value={selectedDocumentType}
            onChange={(e) => {
              setSelectedDocumentType(e.target.value)
              setCustomDocumentName('')
              setSelectedFile(null)
            }}
            disabled={uploading}
          >
            <option value="">Belge türü seçin</option>
            {missingTypes.map((type) => (
              <option key={type} value={type}>
                {getMeetingDocumentTypeLabel(type)}
              </option>
            ))}
            <option value="OTHER">Diğer</option>
          </Select>

          {selectedDocumentType === 'OTHER' && (
            <Input
              placeholder="Belge adı girin (örn: Mali Rapor)"
              value={customDocumentName}
              onChange={(e) => setCustomDocumentName(e.target.value)}
              disabled={uploading}
            />
          )}

          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              disabled={uploading || !selectedDocumentType}
              className="flex-1"
            />
            <Button
              onClick={uploadDocument}
              disabled={
                uploading ||
                !selectedDocumentType ||
                !selectedFile ||
                (selectedDocumentType === 'OTHER' && !customDocumentName.trim())
              }
            >
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </Button>
          </div>

          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Seçilen: {selectedFile.name}
            </div>
          )}

          {uploading && (
            <span className="text-sm text-muted-foreground">Yüklüyor...</span>
          )}

          <div className="text-xs text-muted-foreground">
            Kabul edilen dosya türleri: PDF, Word (.doc, .docx), Excel (.xls,
            .xlsx)
          </div>
        </div>
        <ul className="divide-y rounded border">
          {documents.map((doc) => (
            <li key={doc.id} className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {doc.documentType && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {doc.documentType === 'OTHER' && doc.customName
                        ? doc.customName
                        : getMeetingDocumentTypeLabel(doc.documentType)}
                    </span>
                  )}
                </div>
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

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notu silmek istiyor musunuz?</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Not kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setNoteToDelete(null)
              }}
            >
              İptal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAgenda}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
