'use client'

import { useState } from 'react'

export function ConfirmDeleteButton({
  label = 'Sil',
  confirmMessage,
  className,
}: {
  label?: string
  confirmMessage: string
  className?: string
}) {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (pending) return
        if (!confirm(confirmMessage)) {
          e.preventDefault()
          return
        }
        setPending(true)
      }}
    >
      {pending ? 'Siliniyor…' : label}
    </button>
  )
}
