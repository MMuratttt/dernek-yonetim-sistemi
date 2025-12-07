'use client'

import React from 'react'
import Mustache from 'mustache'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Input } from '@/components/ui/input'
import { TemplatePreviewModal } from '../../../../components/TemplatePreviewModal'
import { useRouter } from 'next/navigation'

export default function NewTemplatePage({ params: paramsPromise }: any) {
  const params = React.use(paramsPromise)
  const router = useRouter()
  const [name, setName] = React.useState('Örnek Şablon')
  const [description, setDescription] = React.useState('')
  const [content, setContent] = React.useState(`<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; }
  h1 { font-size: 18px; }
</style>
</head><body>
  <h1>{{title}}</h1>
  <p>Merhaba {{uye.firstName}} {{uye.lastName}}</p>
</body></html>`)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewHtml, setPreviewHtml] = React.useState('')

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/${params.org}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Kaydedilemedi')
      }
      const data = await res.json()
      router.push(`/${params.org}/templates/${data.item.slug}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function previewInModal() {
    const data = sampleData()
    const html = Mustache.render(content, data)
    setPreviewHtml(html)
    setPreviewOpen(true)
  }

  function sampleData() {
    const rows = Array.from({ length: 3 }).map((_, i) => ({
      no: i + 1,
      ad: i % 2 === 0 ? 'Ahmet' : 'Ayşe',
      soyad: i % 2 === 0 ? 'Yılmaz' : 'Demir',
      adsoyad: i % 2 === 0 ? 'Ahmet Yılmaz' : 'Ayşe Demir',
      nationalId: '12345678901',
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

  return (
    <div className="p-4 space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Şablonlar', href: `/${params.org}/templates` },
          { label: 'Yeni', href: `/${params.org}/templates/new` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Yeni Şablon</h1>
        <Button onClick={previewInModal} variant="outline" size="sm">
          Önizleme
        </Button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
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
      <div className="grid gap-3 md:grid-cols-[1fr_300px]">
        <label className="block">
          <div className="text-sm mb-1">
            HTML (Mustache değişkenleri desteklenir)
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border-input bg-background text-foreground rounded-md border px-2 py-1 w-full h-80 font-mono"
          />
        </label>
        <div className="text-xs p-3 rounded border bg-neutral-50">
          <div className="font-medium mb-1">Kullanılabilir Değişkenler</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <code>{'{{title}}'}</code>, <code>{'{{date}}'}</code>
            </li>
            <li>
              <code>{'{{org.name}}'}</code>, <code>{'{{org.slug}}'}</code>
            </li>
            <li>
              <code>{'{{#rows}} ... {{/rows}}'}</code> — <code>{'{{no}}'}</code>
              , <code>{'{{ad}}'}</code>, <code>{'{{soyad}}'}</code>,{' '}
              <code>{'{{adsoyad}}'}</code>, <code>{'{{nationalId}}'}</code>,{' '}
              <code>{'{{phone}}'}</code>, <code>{'{{email}}'}</code>
            </li>
            <li>
              <code>{'{{uye.firstName}}'}</code>,{' '}
              <code>{'{{uye.lastName}}'}</code>
            </li>
          </ul>
          <div className="mt-2 font-medium">Örnek Veri</div>
          <pre className="text-[11px] whitespace-pre-wrap">
            {JSON.stringify(sampleData(), null, 2)}
          </pre>
        </div>
      </div>
      <div className="flex gap-2">
        <Button disabled={saving} onClick={save}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
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
