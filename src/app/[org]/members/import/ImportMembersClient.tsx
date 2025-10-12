'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parse as parseCSV } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

type Row = Partial<{
  firstName: string
  lastName: string
  email: string
  phone: string
  nationalId: string
  status: 'ACTIVE' | 'PASSIVE' | 'LEFT'
  address: string
  occupation: string
  joinedAt: string | Date
}>

interface Result {
  created: number
  updated: number
  skipped: number
  errors: number
  details?: Array<{ index: number; reason: string }>
}

export default function ImportMembersClient({ org }: { org: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [result, setResult] = useState<null | Result>(null)
  const [previewRows, setPreviewRows] = useState<
    Array<Row & { __errors?: string[] }>
  >([])
  const [previewValidCount, setPreviewValidCount] = useState(0)
  const [previewInvalidCount, setPreviewInvalidCount] = useState(0)

  useEffect(() => {
    async function guard() {
      const s = await fetch('/api/auth/session')
        .then((r) => r.json())
        .catch(() => null)
      if (!s?.user) return router.replace('/auth/signin')
      const me = await fetch(`/api/${org}/me`)
        .then((r) => r.json())
        .catch(() => null)
      const role = me?.role as
        | 'SUPERADMIN'
        | 'ADMIN'
        | 'STAFF'
        | 'MEMBER'
        | undefined
      const canWrite =
        role === 'SUPERADMIN' || role === 'ADMIN' || role === 'STAFF'
      if (!canWrite) router.replace(`/${org}/members`)
    }
    guard()
  }, [router, org])

  function normalizeRec(r: any): Row {
    const sRaw = r.status || r.Durum || r.durum
    const s = String(sRaw ?? 'ACTIVE').toUpperCase()
    const status = (['ACTIVE', 'PASSIVE', 'LEFT'] as const).includes(s as any)
      ? (s as Row['status'])
      : undefined
    return {
      firstName: r.firstName || r.Ad || r.ad || r.name || '',
      lastName: r.lastName || r.Soyad || r.soyad || '',
      email: r.email || r['E-posta'] || r.e_posta || r.mail || undefined,
      phone: r.phone || r.Telefon || r.telefon || undefined,
      nationalId:
        r.nationalId || r.TC || r.tc || r.tc_kimlik || r['TC'] || undefined,
      status,
      address: r.address || r.Adres || r.adres || undefined,
      occupation: r.occupation || r.Meslek || r.meslek || undefined,
      joinedAt:
        r.joinedAt ||
        r['Kayıt Tarihi'] ||
        r.kayit_tarihi ||
        r.kayitTarihi ||
        undefined,
    }
  }

  function validateRow(r: Row): string[] {
    const errs: string[] = []
    if (!r.firstName) errs.push('firstName eksik')
    if (!r.lastName) errs.push('lastName eksik')
    if (
      r.status &&
      !(['ACTIVE', 'PASSIVE', 'LEFT'] as const).includes(r.status)
    )
      errs.push('status geçersiz')
    if (r.joinedAt) {
      const d = new Date(String(r.joinedAt))
      if (isNaN(d.getTime())) errs.push('joinedAt tarih değil')
    }
    return errs
  }

  async function buildPreviewFromFile() {
    const file = fileRef.current?.files?.[0]
    if (!file) return alert('Lütfen bir dosya seçin.')
    setPreviewRows([])
    setPreviewValidCount(0)
    setPreviewInvalidCount(0)
    try {
      let rows: any[] = []
      if (
        file.type.includes('csv') ||
        file.name.toLowerCase().endsWith('.csv')
      ) {
        const text = await file.text()
        rows = parseCSV(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as any[]
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
      } else {
        return alert('Desteklenmeyen dosya türü')
      }
      const normalized = rows.map(normalizeRec)
      const withErrors = normalized.map((r) => ({
        ...r,
        __errors: validateRow(r),
      }))
      const invalid = withErrors.filter(
        (r) => r.__errors && r.__errors.length > 0
      )
      setPreviewRows(withErrors.slice(0, 50))
      setPreviewValidCount(withErrors.length - invalid.length)
      setPreviewInvalidCount(invalid.length)
    } catch (e: any) {
      alert(e.message || 'Önizleme başarısız')
    }
  }

  async function submitCSVFile() {
    const file = fileRef.current?.files?.[0]
    if (!file) return alert('Lütfen bir dosya seçin.')
    setSubmitting(true)
    setUploadProgress(0)
    setResult(null)
    try {
      const isCSV =
        file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')
      if (isCSV) {
        const text = await file.text()
        await submitTextCSV(text)
      } else {
        await submitBinaryWithProgress(file)
      }
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  async function submitBinaryWithProgress(file: File) {
    setResult(null)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/${org}/members/import?${dryRun ? 'dryRun=1' : ''}`)
      xhr.responseType = 'json'
      xhr.setRequestHeader(
        'Content-Type',
        file.type ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setResult((xhr.response as any)?.results)
          resolve()
        } else {
          const err = (xhr.response as any)?.error || 'İçe aktarma hatası'
          alert(err)
          reject(new Error(err))
        }
      }
      xhr.onerror = () => reject(new Error('Ağ hatası'))
      xhr.send(file)
    })
  }

  async function submitTextCSV(text: string) {
    try {
      const res = await fetch(
        `/api/${org}/members/import?${dryRun ? 'dryRun=1' : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: text,
        }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'İçe aktarma hatası')
      setResult(data.results)
    } catch (e: any) {
      alert(e.message || 'İçe aktarma hatası')
    }
  }

  async function submitJSON() {
    let payload: any
    try {
      payload = JSON.parse(jsonText)
      if (!Array.isArray(payload)) throw new Error('JSON array bekleniyor')
    } catch (e: any) {
      return alert(e.message || 'Geçersiz JSON')
    }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(
        `/api/${org}/members/import?${dryRun ? 'dryRun=1' : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'İçe aktarma hatası')
      setResult(data.results)
    } catch (e: any) {
      alert(e.message || 'İçe aktarma hatası')
    } finally {
      setSubmitting(false)
    }
  }

  function downloadTemplateCSV() {
    const header = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'nationalId',
      'status',
      'address',
      'occupation',
      'joinedAt',
    ]
    const sampleRows = [
      [
        'Ahmet',
        'Yılmaz',
        'ahmet@example.com',
        '5551112233',
        '12345678901',
        'ACTIVE',
        'Adres 1',
        'Mühendis',
        '2024-01-15',
      ],
      [
        'Ayşe',
        'Demir',
        'ayse@example.com',
        '5552223344',
        '',
        'PASSIVE',
        'Adres 2',
        'Avukat',
        '2023-09-01',
      ],
    ]
    const csv = [header, ...sampleRows]
      .map((r) =>
        r.map((f) => '"' + String(f).replace(/"/g, '""') + '"').join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uyeler-sablon.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadTemplateXLSX() {
    const rows = [
      {
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        email: 'ahmet@example.com',
        phone: '5551112233',
        nationalId: '12345678901',
        status: 'ACTIVE',
        address: 'Adres 1',
        occupation: 'Mühendis',
        joinedAt: '2024-01-15',
      },
      {
        firstName: 'Ayşe',
        lastName: 'Demir',
        email: 'ayse@example.com',
        phone: '5552223344',
        nationalId: '',
        status: 'PASSIVE',
        address: 'Adres 2',
        occupation: 'Avukat',
        joinedAt: '2023-09-01',
      },
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Uyeler')
    const arrayBuffer = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
    }) as ArrayBuffer
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uyeler-sablon.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadErrorCSV() {
    if (!result?.details || result.details.length === 0) return
    const header = ['index', 'reason']
    const rows = result.details.map((d) => [d.index, d.reason])
    const csv = [header, ...rows]
      .map((r) =>
        r.map((f) => '"' + String(f).replace(/"/g, '""') + '"').join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="p-6 max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Üyeler', href: `/${org}/members` },
          { label: 'İçe Aktar' },
        ]}
      />
      <h1 className="text-2xl font-semibold">Üye İçe Aktar (CSV/JSON/XLSX)</h1>
      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-medium">Dosya yükleme</h2>
        <Input
          ref={fileRef as any}
          type="file"
          accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
          disabled={submitting}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={submitting}
            onClick={buildPreviewFromFile}
            variant="outline"
          >
            Önizleme
          </Button>
          <label className="ml-2 text-sm flex items-center gap-2">
            <Checkbox
              checked={dryRun}
              onChange={(e) =>
                setDryRun((e.target as HTMLInputElement).checked)
              }
            />
            <span>Dry-run (yalnızca deneme, veri yazılmaz)</span>
          </label>
          <Button disabled={submitting} onClick={submitCSVFile}>
            {submitting ? 'Yükleniyor…' : 'Yükle'}
          </Button>
          <Button
            type="button"
            onClick={() => router.push(`/${org}/members`)}
            variant="outline"
          >
            Geri
          </Button>
          <Button type="button" onClick={downloadTemplateCSV} variant="outline">
            Örnek CSV
          </Button>
          <Button
            type="button"
            onClick={downloadTemplateXLSX}
            variant="outline"
          >
            Örnek XLSX
          </Button>
          {submitting && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={14} /> Yükleniyor...
            </span>
          )}
        </div>
        {submitting && uploadProgress > 0 && (
          <div className="w-full h-2 bg-muted rounded">
            <div
              className="h-2 bg-primary rounded"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Başlıklar öneri:
          firstName,lastName,email,phone,nationalId,status,address,occupation,joinedAt
          (CSV veya Excel desteklenir)
        </p>
      </section>
      {previewRows.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 text-sm">
            Önizleme: ilk {previewRows.length} satır — Geçerli:{' '}
            {previewValidCount}, Hatalı: {previewInvalidCount}
          </div>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">firstName</th>
                  <th className="text-left p-2">lastName</th>
                  <th className="text-left p-2">email</th>
                  <th className="text-left p-2">phone</th>
                  <th className="text-left p-2">nationalId</th>
                  <th className="text-left p-2">status</th>
                  <th className="text-left p-2">joinedAt</th>
                  <th className="text-left p-2">Hatalar</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{r.firstName}</td>
                    <td className="p-2">{r.lastName}</td>
                    <td className="p-2">{r.email || ''}</td>
                    <td className="p-2">{r.phone || ''}</td>
                    <td className="p-2">{r.nationalId || ''}</td>
                    <td className="p-2">{r.status || ''}</td>
                    <td className="p-2">{String(r.joinedAt || '')}</td>
                    <td className="p-2 text-red-600">
                      {(r.__errors || []).join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">JSON ile gönder</h2>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='[{"firstName":"Ahmet","lastName":"Yılmaz","email":"a@ex.com"}]'
          className="w-full h-40 rounded-md border border-input bg-background p-2"
        />
        <div className="flex items-center gap-2">
          <label className="ml-2 text-sm flex items-center gap-2">
            <Checkbox
              checked={dryRun}
              onChange={(e) =>
                setDryRun((e.target as HTMLInputElement).checked)
              }
            />
            <span>Dry-run</span>
          </label>
          <Button disabled={submitting} onClick={submitJSON}>
            {submitting ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </div>
      </section>
      {result && (
        <div className="mt-8 border rounded p-4">
          <div className="font-medium mb-2">Özet</div>
          <ul className="text-sm">
            <li>Oluşturulan: {result.created}</li>
            <li>Güncellenen: {result.updated}</li>
            <li>Atlanan: {result.skipped}</li>
            <li>Hatalı: {result.errors}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const {
                  created = 0,
                  updated = 0,
                  skipped = 0,
                  errors = 0,
                } = result || ({} as any)
                const qs = new URLSearchParams({
                  imported: '1',
                  created: String(created),
                  updated: String(updated),
                  skipped: String(skipped),
                  errors: String(errors),
                })
                router.push(`/${org}/members?${qs.toString()}`)
              }}
            >
              Listeye dön ve banner göster
            </Button>
            {Array.isArray(result.details) && result.details.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={downloadErrorCSV}
              >
                Hata CSV indir
              </Button>
            )}
            {!dryRun && (
              <span className="text-xs text-neutral-600">Veriler yazıldı.</span>
            )}
            {dryRun && (
              <Button
                type="button"
                onClick={async () => {
                  const file = fileRef.current?.files?.[0]
                  if (file) {
                    setDryRun(false)
                    await submitCSVFile()
                    setDryRun(true)
                  } else if (jsonText.trim()) {
                    setDryRun(false)
                    await submitJSON()
                    setDryRun(true)
                  } else {
                    alert('Önce bir dosya seçin veya JSON girin.')
                  }
                }}
              >
                Gerçek yükleme yap
              </Button>
            )}
          </div>
          {Array.isArray(result.details) && result.details.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">
                Hata detayları ({result.details.length})
              </summary>
              <ul className="mt-2 max-h-64 overflow-auto text-xs list-disc pl-5">
                {result.details.slice(0, 500).map((d, idx) => (
                  <li key={idx}>
                    Satır {d.index}: {d.reason}
                  </li>
                ))}
                {result.details.length > 500 && (
                  <li className="italic">
                    ... {result.details.length - 500} daha fazla hata
                  </li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </main>
  )
}
