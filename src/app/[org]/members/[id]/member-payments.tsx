'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Txn {
  id: string
  type: 'CHARGE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT'
  amount: string | number
  currency: string
  txnDate: string
  paymentMethod?: string | null
  planId?: string | null
  periodId?: string | null
  receiptNo?: string | null
  reference?: string | null
  note?: string | null
}

interface Props {
  org: string
  memberId: string
}

export const MemberPayments: React.FC<Props> = ({ org, memberId }) => {
  const [rows, setRows] = useState<Txn[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initial, setInitial] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  async function load(next?: boolean) {
    if (loading) return
    setLoading(true)
    try {
      const url = new URL(
        `/api/${org}/finance/transactions`,
        window.location.origin
      )
      url.searchParams.set('memberId', memberId)
      url.searchParams.set('take', '20')
      if (next && cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const newItems: Txn[] = data.items || []
        setRows((prev) => (next ? [...prev, ...newItems] : newItems))
        setCursor(data.nextCursor || null)
        setHasMore(!!data.nextCursor)
      }
    } finally {
      setLoading(false)
      setInitial(false)
    }
  }

  useEffect(() => {
    load(false) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, org])

  function fmtAmount(t: Txn) {
    const n = Number(t.amount)
    return (
      (t.type === 'CHARGE' || (t.type === 'ADJUSTMENT' && n > 0) ? '+' : '-') +
      Math.abs(n).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) +
      ' ' +
      t.currency
    )
  }

  return (
    <div className="text-sm">
      {initial && loading && (
        <div className="space-y-2">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      )}
      {!initial && rows.length === 0 && (
        <div className="text-muted-foreground">Kayıt yok.</div>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs md:text-[13px]">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-2 py-1 border">Tarih</th>
                <th className="px-2 py-1 border">Tür</th>
                <th className="px-2 py-1 border">Tutar</th>
                <th className="px-2 py-1 border">Yöntem</th>
                <th className="px-2 py-1 border">Plan</th>
                <th className="px-2 py-1 border">Dönem</th>
                <th className="px-2 py-1 border">Makbuz</th>
                <th className="px-2 py-1 border">Ref</th>
                <th className="px-2 py-1 border">Not</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-2 py-1 border whitespace-nowrap">
                    {new Date(r.txnDate).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-2 py-1 border">{r.type}</td>
                  <td
                    className={`px-2 py-1 border font-mono ${String(r.type).startsWith('PAYMENT') || r.type === 'REFUND' ? 'text-red-600' : 'text-emerald-700'}`}
                  >
                    {fmtAmount(r)}
                  </td>
                  <td className="px-2 py-1 border">{r.paymentMethod || '-'}</td>
                  <td className="px-2 py-1 border">{r.planId ? '•' : '-'}</td>
                  <td className="px-2 py-1 border">{r.periodId ? '•' : '-'}</td>
                  <td className="px-2 py-1 border">{r.receiptNo || '-'}</td>
                  <td className="px-2 py-1 border">{r.reference || '-'}</td>
                  <td
                    className="px-2 py-1 border truncate max-w-[120px]"
                    title={r.note || ''}
                  >
                    {r.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => load(true)}
          >
            {loading ? 'Yükleniyor...' : 'Daha Fazla'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default MemberPayments
