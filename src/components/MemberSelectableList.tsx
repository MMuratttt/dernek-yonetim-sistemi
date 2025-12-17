'use client'

import React from 'react'
import Link from 'next/link'
import { useToast } from './ui/toast'
import { Button } from './ui/button'
import { LinkButton } from './ui/link-button'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { Select } from './ui/select'
import { Spinner } from './ui/spinner'
import { ListRow } from '@/components/ui/list-row'
import { BulkSmsModal } from './BulkSmsModal'
import { BulkEmailModal } from './BulkEmailModal'

type Tag = { id: string; name: string; color?: string | null }

type Member = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationalId: string | null
  status: 'ACTIVE' | 'PASSIVE' | 'LEFT'
  title: string | null
  tags?: Tag[]
  groups?: Array<{
    id: string
    name: string
    type: 'GROUP' | 'COMMISSION'
    color?: string | null
  }>
}

export function MemberSelectableList({
  items,
  org,
  canWrite = true,
  q,
  status,
  initialTemplateSlug,
}: {
  items: Member[]
  org: string
  canWrite?: boolean
  q?: string
  status?: string
  initialTemplateSlug?: string
}) {
  const [selected, setSelected] = React.useState<string[]>([])
  const [format, setFormat] = React.useState<'csv' | 'xlsx'>('csv')
  const [loadingExportSelected, setLoadingExportSelected] =
    React.useState(false)
  const [loadingPdfSelected, setLoadingPdfSelected] = React.useState(false)
  const [showBulkSmsModal, setShowBulkSmsModal] = React.useState(false)
  const [showBulkEmailModal, setShowBulkEmailModal] = React.useState(false)
  const allSelected = selected.length > 0 && selected.length === items.length
  const { add } = useToast()

  const [templates, setTemplates] = React.useState<
    Array<{ slug: string; name: string }>
  >([])
  const [templateSlug, setTemplateSlug] = React.useState<string>(
    initialTemplateSlug || ''
  )
  const [tplFormat, setTplFormat] = React.useState<'pdf' | 'docx'>('pdf')
  const [loadingCertificate, setLoadingCertificate] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    async function loadTpl() {
      try {
        const r = await fetch(`/api/${org}/templates`, { cache: 'no-store' })
        const d = await r.json().catch(() => ({ items: [] }))
        setTemplates(
          (d.items || []).map((x: any) => ({ slug: x.slug, name: x.name }))
        )
      } catch {}
    }
    loadTpl()
  }, [org])

  function toggleAll() {
    setSelected((prev) =>
      prev.length === items.length ? [] : items.map((i) => i.id)
    )
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function exportSelected() {
    if (selected.length === 0)
      return add({
        variant: 'error',
        title: 'Seçim yok',
        description: 'Lütfen en az bir üye seçin.',
      })
    setLoadingExportSelected(true)
    try {
      const res = await fetch(`/api/${org}/members/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        return add({
          variant: 'error',
          title: 'Dışa aktarım hatası',
          description: data?.error ?? undefined,
        })
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hazirun-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      add({ variant: 'success', title: 'Dosya indirildi' })
    } finally {
      setLoadingExportSelected(false)
    }
  }

  async function downloadHazirunPdf() {
    if (selected.length === 0)
      return add({
        variant: 'error',
        title: 'Seçim yok',
        description: 'Lütfen en az bir üye seçin.',
      })
    setLoadingPdfSelected(true)
    try {
      const res = await fetch(`/api/${org}/pdf/hazirun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      })
      if (!res.ok) return add({ variant: 'error', title: 'PDF hatası' })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hazirun-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      add({ variant: 'success', title: 'Hazirun PDF indirildi' })
    } finally {
      setLoadingPdfSelected(false)
    }
  }

  async function handleGenerateMembershipCertificate(memberId: string) {
    setLoadingCertificate(memberId)
    try {
      const res = await fetch(
        `/api/${org}/documents/uyelik-belgesi/${memberId}`,
        {
          method: 'GET',
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        return add({
          variant: 'error',
          title: 'Belge oluşturulamadı',
          description: data?.error ?? 'Bir hata oluştu',
        })
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `uyelik-belgesi-${memberId}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      add({ variant: 'success', title: 'Üyelik belgesi indirildi' })
    } catch (e: any) {
      add({
        variant: 'error',
        title: 'İndirme hatası',
        description: e.message,
      })
    } finally {
      setLoadingCertificate(null)
    }
  }

  return (
    <div>
      {/* Sticky Actions Bar - Fixed Height to Prevent Layout Shift */}
      <div className="sticky top-16 z-20 mb-4 rounded-lg border bg-card shadow-sm overflow-hidden">
        {/* Main Actions Bar */}
        <div className="p-3 space-y-3">
          {/* Row 1: Selection & Export */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={toggleAll}
                variant="outline"
                size="sm"
                className="h-9"
              >
                <span className="hidden sm:inline">
                  {allSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
                </span>
                <span className="sm:hidden">
                  {allSelected ? 'Bırak' : 'Seç'}
                </span>
              </Button>
              <div
                className={`
                flex items-center gap-2 transition-all duration-200
                ${selected.length > 0 ? 'opacity-100' : 'opacity-50'}
              `}
              >
                <span className="text-xs text-muted-foreground">
                  {items.length} üye
                </span>
                {selected.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <span className="text-xs font-semibold text-primary">
                      {selected.length} seçildi
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="hidden sm:block h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Dışa Aktar:
              </span>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="h-9 w-[110px]"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
              </Select>
              <Button
                type="button"
                onClick={exportSelected}
                loading={loadingExportSelected}
                size="sm"
                disabled={selected.length === 0}
                className="h-9"
              >
                İndir
              </Button>
            </div>

            <div className="hidden lg:block h-6 w-px bg-border" />

            <Button
              type="button"
              onClick={downloadHazirunPdf}
              loading={loadingPdfSelected}
              variant="outline"
              size="sm"
              disabled={selected.length === 0}
              className="h-9"
            >
              Hazirun PDF
            </Button>

            {canWrite && (
              <>
                <div className="hidden lg:block h-6 w-px bg-border" />
                <Button
                  type="button"
                  onClick={() => setShowBulkEmailModal(true)}
                  variant="outline"
                  size="sm"
                  disabled={selected.length === 0}
                  className="h-9"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Toplu E-posta
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowBulkSmsModal(true)}
                  variant="outline"
                  size="sm"
                  disabled={selected.length === 0}
                  className="h-9"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
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
                  Toplu SMS
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Email Modal */}
      {showBulkEmailModal && (
        <BulkEmailModal
          org={org}
          memberIds={selected}
          onClose={() => setShowBulkEmailModal(false)}
          onSuccess={() => setSelected([])}
        />
      )}

      {/* Bulk SMS Modal */}
      {showBulkSmsModal && (
        <BulkSmsModal
          org={org}
          memberIds={selected}
          onClose={() => setShowBulkSmsModal(false)}
          onSuccess={() => setSelected([])}
        />
      )}

      {/* Members List */}
      <div className="space-y-2">
        {items.map((m, idx) => (
          <div
            key={m.id}
            className={`
              rounded-lg border bg-card transition-all duration-200
              ${selected.includes(m.id) ? 'ring-2 ring-primary/50 border-primary/50 shadow-sm' : 'hover:border-primary/30 hover:shadow-sm'}
            `}
          >
            <div className="flex items-center gap-3 p-4">
              <Checkbox
                checked={selected.includes(m.id)}
                onChange={() => toggle(m.id)}
                className="mt-0.5"
              />

              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <Link
                    href={`/${org}/members/${m.id}`}
                    className="font-semibold text-base hover:text-primary transition-colors underline-offset-2 hover:underline"
                  >
                    {m.firstName} {m.lastName}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {m.email && (
                    <span className="flex items-center gap-1">
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
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {m.email}
                    </span>
                  )}
                  {m.phone && (
                    <span className="flex items-center gap-1">
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
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {m.phone}
                    </span>
                  )}
                  {!m.email && !m.phone && (
                    <span className="italic">İletişim bilgisi yok</span>
                  )}
                </div>
              </div>

              {m.title && m.title !== 'UYE' && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {m.title === 'BASKAN'
                    ? 'Yönetim Kurulu Başkanı'
                    : m.title === 'BASKAN_YARDIMCISI'
                      ? 'Yönetim Kurulu Başkan Yardımcısı'
                      : m.title === 'SEKRETER'
                        ? 'Sekreter'
                        : m.title === 'SAYMAN'
                          ? 'Sayman'
                          : m.title === 'YONETIM_KURULU_ASIL'
                            ? 'Yönetim Kurulu Üyesi (Asil)'
                            : m.title === 'DENETIM_KURULU_BASKANI'
                              ? 'Denetim Kurulu Başkanı'
                              : m.title === 'DENETIM_KURULU_ASIL'
                                ? 'Denetim Kurulu Üyesi (Asil)'
                                : m.title === 'YONETIM_KURULU_YEDEK'
                                  ? 'Yönetim Kurulu Üyesi (Yedek)'
                                  : m.title === 'DENETIM_KURULU_YEDEK'
                                    ? 'Denetim Kurulu Üyesi (Yedek)'
                                    : m.title}
                </Badge>
              )}

              <Badge
                variant={
                  m.status === 'ACTIVE'
                    ? 'default'
                    : m.status === 'LEFT'
                      ? 'destructive'
                      : 'outline'
                }
                className="shrink-0"
              >
                {m.status === 'ACTIVE'
                  ? 'Aktif'
                  : m.status === 'LEFT'
                    ? 'Ayrıldı'
                    : 'Pasif'}
              </Badge>

              <Button
                onClick={() => handleGenerateMembershipCertificate(m.id)}
                size="sm"
                variant="ghost"
                className="shrink-0"
                title="Üyelik Belgesi Oluştur"
                disabled={loadingCertificate === m.id}
              >
                {loadingCertificate === m.id ? (
                  <Spinner className="w-4 h-4" />
                ) : (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                <span className="ml-1.5">Üyelik Belgesi</span>
              </Button>

              {canWrite && (
                <LinkButton
                  href={`/${org}/members/${m.id}/edit`}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  Düzenle
                </LinkButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
