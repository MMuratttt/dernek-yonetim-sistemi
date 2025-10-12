'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { useGlobalLoading } from './GlobalLoadingProvider'

export function DeleteOrgButton({
  slug,
  name,
  memberCount,
}: {
  slug: string
  name: string
  memberCount: number
}) {
  const [pendingUi, startTrans] = useTransition()
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { add } = useToast()
  const { start: startGlobal, stop: stopGlobal } = useGlobalLoading()

  async function handleClick() {
    if (loading || pendingUi) return
    const warnMembers = memberCount > 0
    const confirmMsg = warnMembers
      ? `${name} derneğini silmek üzeresiniz. Bu derneğe bağlı ${memberCount} üye var. ÖNCE bu üyeleri silmeden (veya taşımanız gerek). Yine de devam etmek istiyor musunuz?`
      : `${name} derneğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    if (!confirm(confirmMsg)) return
    setLoading(true)
    startGlobal()
    try {
      const res = await fetch(`/api/org/${slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        add({
          variant: 'error',
          title: 'Silme başarısız',
          description: data.error || 'İşlem sırasında hata oluştu.',
        })
        return
      }
      // Listeyi yenile
      add({
        variant: 'success',
        title: 'Dernek silindi',
        description: `${name} başarıyla silindi.`,
      })
      startTrans(() => router.refresh())
    } finally {
      setLoading(false)
      stopGlobal()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 text-xs text-destructive hover:text-destructive/80 hidden group-hover:inline-flex items-center"
      aria-disabled={loading || pendingUi}
    >
      {loading || pendingUi ? 'Siliniyor…' : 'Sil'}
    </button>
  )
}
