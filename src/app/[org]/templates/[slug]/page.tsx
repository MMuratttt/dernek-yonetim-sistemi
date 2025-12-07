'use client'

import React from 'react'
import Mustache from 'mustache'
import { TemplatePreviewModal } from '../../../../components/TemplatePreviewModal'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default function EditTemplatePage({ params: paramsPromise }: any) {
  const params = React.use(paramsPromise)
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [content, setContent] = React.useState('')
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewHtml, setPreviewHtml] = React.useState('')

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/${params.org}/templates/${params.slug}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Şablon yüklenemedi')
        const data = await res.json()
        setName(data.item.name)
        setDescription(data.item.description || '')
        setContent(data.item.content)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.org, params.slug])

  async function save() {
    setError(null)
    try {
      const res = await fetch(`/api/${params.org}/templates/${params.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Kaydedilemedi')
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function previewPdf() {
    setError(null)
    try {
      const res = await fetch(
        `/api/${params.org}/templates/${params.slug}/render`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Önizleme',
            uye: { firstName: 'Ahmet', lastName: 'Yılmaz' },
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'PDF oluşturulamadı')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${params.slug}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    }
  }

  function previewInModal() {
    const data = sampleData()
    const html = Mustache.render(content, data)
    setPreviewHtml(html)
    setPreviewOpen(true)
  }

  function sampleData() {
    const rows = Array.from({ length: 5 }).map((_, i) => ({
      no: i + 1,
      ad: i % 2 === 0 ? 'Ahmet' : 'Ayşe',
      soyad: i % 2 === 0 ? 'Yılmaz' : 'Demir',
      adsoyad: i % 2 === 0 ? 'Ahmet Yılmaz' : 'Ayşe Demir',
      nationalId: i % 2 === 0 ? '12345678901' : '09876543210',
      phone: '5551112233',
      email: 'user@example.com',
    }))
    return {
      title: 'Önizleme',
      date: new Date().toISOString().slice(0, 10),
      org: { name: 'Örnek Dernek', slug: 'ornek-dernek' },
      uye: { firstName: 'Mehmet', lastName: 'Kaya' },
      rows,
    }
  }

  if (loading)
    return (
      <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Yükleniyor…
      </div>
    )
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="p-4 space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Şablonlar', href: `/${params.org}/templates` },
          { label: params.slug },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Şablon Düzenle</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={previewInModal}
            variant="outline"
            size="sm"
            title="HTML önizleme"
          >
            Önizleme
          </Button>
          <Button onClick={previewPdf} variant="outline" size="sm">
            PDF İndir
          </Button>
        </div>
      </div>
      <div className="text-xs p-3 rounded border bg-neutral-50 grid gap-3 md:grid-cols-[1fr_300px]">
        <div>
          <div className="font-medium mb-1">
            Kullanılabilir Değişkenler (Mustache)
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <code>{'{{title}}'}</code> — Belge başlığı
            </li>
            <li>
              <code>{'{{date}}'}</code> — YYYY-MM-DD
            </li>
            <li>
              <code>{'{{org.name}}'}</code>, <code>{'{{org.slug}}'}</code> —
              Dernek bilgileri
            </li>
            <li>
              <code>{'{{#rows}} ... {{/rows}}'}</code> blok tekrarı; satır
              alanları:
              <ul className="list-disc pl-5">
                <li>
                  <code>{'{{no}}'}</code>, <code>{'{{ad}}'}</code>,{' '}
                  <code>{'{{soyad}}'}</code>, <code>{'{{adsoyad}}'}</code>
                </li>
                <li>
                  <code>{'{{nationalId}}'}</code>, <code>{'{{phone}}'}</code>,{' '}
                  <code>{'{{email}}'}</code>
                </li>
              </ul>
            </li>
          </ul>
        </div>
        <div className="border rounded p-2 bg-white/50">
          <div className="font-medium mb-1">Örnek Veri</div>
          <pre className="text-[11px] whitespace-pre-wrap">
            {JSON.stringify(sampleData(), null, 2)}
          </pre>
        </div>
      </div>
      <label className="block">
        <div className="text-sm mb-1">Ad</div>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <div className="text-sm mb-1">Açıklama</div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block">
        <div className="text-sm mb-1">HTML (Mustache)</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border-input bg-background text-foreground rounded-md border px-2 py-1 w-full h-96 font-mono"
        />
      </label>
      <div className="flex gap-2">
        <Button onClick={save}>Kaydet</Button>
        <Button
          onClick={() => router.push(`/${params.org}/templates`)}
          variant="outline"
        >
          Geri
        </Button>
      </div>
      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
      />
    </div>
  )
}
