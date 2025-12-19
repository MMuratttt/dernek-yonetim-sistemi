'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  File,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [result, setResult] = useState<null | Result>(null)

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

  function handleFileSelect(file: File | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      alert('Sadece XLSX dosyaları desteklenmektedir.')
      return
    }
    setSelectedFile(file)
    setResult(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  async function submitXLSXFile() {
    if (!selectedFile) return alert('Lütfen bir dosya seçin.')
    setSubmitting(true)
    setUploadProgress(0)
    setResult(null)
    try {
      await submitBinaryWithProgress(selectedFile)
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  async function submitBinaryWithProgress(file: File) {
    setResult(null)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/${org}/members/import`)
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

  function downloadTemplateXLSX() {
    const rows = [
      {
        Ad: 'Ahmet',
        Soyad: 'Yılmaz',
        'E-posta': 'ahmet@example.com',
        Telefon: '5551112233',
        'TC Kimlik': '12345678901',
        Durum: 'AKTİF',
        Adres: 'Örnek Mahallesi, No: 1',
        Meslek: 'Mühendis',
        'Kayıt Tarihi': '2024-01-15',
      },
      {
        Ad: 'Ayşe',
        Soyad: 'Demir',
        'E-posta': 'ayse@example.com',
        Telefon: '5552223344',
        'TC Kimlik': '',
        Durum: 'PASİF',
        Adres: 'Örnek Sokak, No: 2',
        Meslek: 'Avukat',
        'Kayıt Tarihi': '2023-09-01',
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
    const header = ['Satır', 'Hata']
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
    a.download = `import-hatalar-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/${org}/members`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Üye İçe Aktar</CardTitle>
              <CardDescription>
                Excel dosyasından toplu üye ekleyin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Dropzone */}
          <div
            onClick={() => !submitting && fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={submitting}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <File className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground mb-1">
                  Dosya seçin veya sürükleyip bırakın
                </p>
                <p className="text-sm text-muted-foreground">
                  Sadece .xlsx formatı desteklenir
                </p>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {submitting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Spinner size={14} />
                  Yükleniyor...
                </span>
                <span>%{uploadProgress}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={submitting || !selectedFile}
              onClick={submitXLSXFile}
              className="flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 mr-2" />
              İçe Aktar
            </Button>
            <Button
              type="button"
              onClick={downloadTemplateXLSX}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Örnek Şablon
            </Button>
          </div>

          {/* Help Text */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Desteklenen sütunlar:</p>
            <p className="text-xs text-muted-foreground">
              Ad, Soyad, E-posta, Telefon, TC Kimlik, Durum
              (AKTİF/PASİF/AYRILDI), Adres, Meslek, Kayıt Tarihi
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Not:</strong> Ad ve Soyad zorunludur. Örnek şablonu
              indirerek doğru formatı görebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">İçe Aktarma Sonucu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {result.created}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  Oluşturulan
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {result.updated}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Güncellenen
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {result.skipped}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Atlanan
                </div>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {result.errors}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Hatalı
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
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
                Üye Listesine Dön
              </Button>
              {Array.isArray(result.details) && result.details.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadErrorCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Hata Raporu İndir
                </Button>
              )}
            </div>

            {/* Error Details */}
            {Array.isArray(result.details) && result.details.length > 0 && (
              <details className="mt-4 rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Hata Detayları ({result.details.length} adet)
                </summary>
                <ul className="mt-3 max-h-48 overflow-auto text-sm space-y-1">
                  {result.details.slice(0, 100).map((d, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Satır {d.index}:
                      </span>{' '}
                      {d.reason}
                    </li>
                  ))}
                  {result.details.length > 100 && (
                    <li className="italic text-muted-foreground pt-2">
                      ... ve {result.details.length - 100} daha fazla hata (CSV
                      olarak indirin)
                    </li>
                  )}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
