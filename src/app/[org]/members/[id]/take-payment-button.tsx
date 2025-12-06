'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Props {
  org: string
  memberId: string
  refreshPath?: string
}

export const TakePaymentButton: React.FC<Props> = ({
  org,
  memberId,
  refreshPath,
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<
    'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'OTHER'
  >('CASH')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<
    Array<{ id: string; name: string; amount: string; isActive?: boolean }>
  >([])
  const [periods, setPeriods] = useState<
    Array<{ id: string; name: string; planId: string }>
  >([])
  const [planId, setPlanId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [reference, setReference] = useState('')
  const [isDonation, setIsDonation] = useState(false)
  const { add } = useToast()

  async function submit() {
    const val = parseFloat(amount.replace(',', '.'))
    if (isNaN(val) || val <= 0) {
      add({ variant: 'error', title: 'Tutar geçersiz' })
      return
    }
    if ((planId && !periodId) || (!planId && periodId)) {
      add({ variant: 'error', title: 'Plan ve dönem birlikte seçilmeli' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/${org}/finance/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          type: 'PAYMENT',
          amount: val,
          currency: 'TRY',
          paymentMethod: method,
          note: note || undefined,
          planId: planId || undefined,
          periodId: periodId || undefined,
          receiptNo: receiptNo || undefined,
          reference: (isDonation ? 'BAGIS ' : '') + (reference || ''),
        }),
      })
      if (res.ok) {
        add({ variant: 'success', title: 'Ödeme kaydedildi' })
        setOpen(false)
        setAmount('')
        setNote('')
        setPlanId('')
        setPeriodId('')
        setReceiptNo('')
        setReference('')
        setIsDonation(false)
        if (refreshPath) router.refresh()
      } else {
        const data = await res.json().catch(() => null)
        add({
          variant: 'error',
          title: 'Kayıt başarısız',
          description: data?.error,
        })
      }
    } catch (e: any) {
      add({ variant: 'error', title: 'Sunucu hatası', description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  // Fetch plans when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      try {
        const pRes = await fetch(`/api/${org}/finance/plans?take=100`, {
          cache: 'no-store',
        })
        if (pRes.ok) {
          const data = await pRes.json()
          if (!cancelled) setPlans(data.items || [])
        }
      } catch {}
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, org])

  // Fetch periods when plan changes
  useEffect(() => {
    if (!open || !planId) {
      setPeriods([])
      setPeriodId('')
      return
    }
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/${org}/finance/periods?planId=${planId}`, {
          cache: 'no-store',
        })
        if (r.ok) {
          const data = await r.json()
          if (!cancelled) setPeriods(data.items || [])
        }
      } catch {}
    }
    load()
    return () => {
      cancelled = true
    }
  }, [planId, open, org])

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Borç Ödemesi Al
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded border bg-card shadow-lg">
            <div className="border-b px-4 py-2 font-medium flex items-center justify-between">
              <span>Ödeme Al</span>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Kapat
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1 text-foreground">
                  Tutar (TRY)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded border px-3 py-2 bg-background text-foreground"
                  placeholder="0,00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-foreground">
                    Plan
                  </label>
                  <select
                    className="w-full rounded border px-3 py-2 bg-background text-foreground"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    <option value="">(Seçim yok)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-foreground">
                    Dönem
                  </label>
                  <select
                    className="w-full rounded border px-3 py-2 bg-background text-foreground"
                    value={periodId}
                    onChange={(e) => setPeriodId(e.target.value)}
                    disabled={!planId || periods.length === 0}
                  >
                    <option value="">
                      {planId
                        ? periods.length
                          ? '(Seçiniz)'
                          : 'Dönem yok'
                        : 'Önce plan seçin'}
                    </option>
                    {periods.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-foreground">
                  Ödeme Yöntemi
                </label>
                <select
                  className="w-full rounded border px-3 py-2 bg-background text-foreground"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                >
                  <option value="CASH">Nakit</option>
                  <option value="BANK_TRANSFER">Havale/EFT</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="OTHER">Diğer</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-foreground">
                    Makbuz No
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 bg-background text-foreground"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-foreground">
                    Referans
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 bg-background text-foreground"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="örn: BAGIS"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isDonation"
                  type="checkbox"
                  checked={isDonation}
                  onChange={(e) => setIsDonation(e.target.checked)}
                />
                <label htmlFor="isDonation" className="text-xs text-foreground">
                  Bağış olarak işaretle
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-foreground">
                  Not
                </label>
                <textarea
                  className="w-full rounded border px-3 py-2 bg-background text-foreground"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opsiyonel açıklama"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={submit}
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TakePaymentButton
