'use client'

import { useEffect } from 'react'

export default function OrgSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[OrgSegmentError]', error)
  }, [error])
  return (
    <div className="space-y-4 p-6 border rounded-md">
      <h2 className="text-lg font-semibold">
        Bu dernek sayfası yüklenirken hata oluştu
      </h2>
      {error.digest && (
        <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
          Digest: {error.digest}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Hata mesajı: {error.message}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Tekrar Dene
        </button>
        <button
          onClick={() => (window.location.href = '/org')}
          className="inline-flex items-center rounded border px-3 py-1.5 text-xs"
        >
          Dernek Listesi
        </button>
      </div>
    </div>
  )
}
