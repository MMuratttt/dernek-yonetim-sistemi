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
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER'>(
    'BANK_TRANSFER'
  )
  const [note, setNote] = useState('Aidat')
  const [saving, setSaving] = useState(false)
  const [receiptNo, setReceiptNo] = useState('')
  const [isDonation, setIsDonation] = useState(false)
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const { add } = useToast()

  async function submit() {
    const val = parseFloat(amount.replace(',', '.'))
    if (isNaN(val) || val <= 0) {
      add({ variant: 'error', title: 'Tutar geçersiz' })
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
          note: note || 'Aidat',
          receiptNo: receiptNo || undefined,
          reference: isDonation ? 'BAGIS' : undefined,
          txnDate: txnDate
            ? (() => {
                const now = new Date()
                return new Date(
                  `${txnDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
                ).toISOString()
              })()
            : undefined,
        }),
      })
      if (res.ok) {
        add({ variant: 'success', title: 'Ödeme kaydedildi' })
        setOpen(false)
        setAmount('')
        setNote('Aidat')
        setReceiptNo('')
        setIsDonation(false)
        setTxnDate(new Date().toISOString().split('T')[0])
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

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Ödeme Al
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded border bg-card shadow-lg">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Ödeme Al
              </h2>
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
              <div>
                <label className="block text-xs font-medium mb-1 text-foreground">
                  Tarih
                </label>
                <input
                  type="date"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                  className="w-full rounded border px-3 py-2 bg-background text-foreground"
                  required
                />
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
                  <option value="BANK_TRANSFER">Havale/EFT</option>
                  <option value="CASH">Nakit</option>
                  <option value="OTHER">Diğer</option>
                </select>
              </div>
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
