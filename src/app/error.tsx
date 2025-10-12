'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // You can send to an error reporting service here
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="p-8 mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Beklenmeyen bir hata oluştu</h1>
      <p className="text-sm text-muted-foreground">
        Sunucu taraflı render sırasında bir hata meydana geldi. Geliştirme
        modunda ayrıntılı stack görebilirsiniz. Prod ortamında digest kodu ile
        logları eşleştirin.
      </p>
      {error.digest && (
        <p className="text-xs font-mono bg-muted rounded px-2 py-1">
          Digest: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Tekrar Dene
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded border px-3 py-1.5 text-sm"
        >
          Sayfayı Yenile
        </button>
      </div>
      <details className="text-xs whitespace-pre-wrap break-all">
        <summary>Hata Mesajı</summary>
        {error.message}
      </details>
    </div>
  )
}
