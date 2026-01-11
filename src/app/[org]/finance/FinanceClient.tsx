'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import BulkDebitModal from '@/components/BulkDebitModal'

export default function FinanceClient({
  org,
  canWrite,
  initial,
}: {
  org: string
  canWrite: boolean
  initial: any
}) {
  const [plans, setPlans] = useState(initial.plans as any[])
  const [periods, setPeriods] = useState(initial.periods as any[])
  const [tx, setTx] = useState(initial.tx as any[])
  const [balances, setBalances] = useState<any[]>([])
  const [showBulkDebitModal, setShowBulkDebitModal] = useState(false)
  const [reports, setReports] = useState<any>(null)
  const [bulkDebits, setBulkDebits] = useState<any[]>([])
  const [isProcessingBulkDebit, setIsProcessingBulkDebit] = useState<
    string | null
  >(null)

  // Load balances on mount
  useEffect(() => {
    refreshBalances()
    loadReports()
    loadBulkDebits()
  }, [org])

  async function loadReports() {
    const res = await fetch(`/api/${org}/finance/reports?type=overview`)
    if (res.ok) {
      const data = await res.json()
      setReports(data)
    }
  }

  async function loadBulkDebits() {
    const res = await fetch(`/api/${org}/finance/bulk-debit`)
    if (res.ok) {
      const data = await res.json()
      setBulkDebits(data.items || [])
    }
  }

  async function processBulkDebit(id: string) {
    if (
      !confirm(
        'Bu toplu borçlandırmayı işlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
      )
    ) {
      return
    }
    setIsProcessingBulkDebit(id)
    try {
      const res = await fetch(`/api/${org}/finance/bulk-debit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        alert('Borçlandırma başarıyla işlendi!')
        await Promise.all([loadBulkDebits(), refreshBalances(), loadReports()])
      } else {
        const err = await res.json()
        alert('Hata: ' + (err.error || 'Bilinmeyen hata'))
      }
    } finally {
      setIsProcessingBulkDebit(null)
    }
  }

  async function createPlan(form: FormData) {
    const body = {
      name: String(form.get('name') || ''),
      amount: Number(form.get('amount') || 0),
      currency: String(form.get('currency') || 'TRY'),
      frequency: String(form.get('frequency') || 'MONTHLY'),
      description: String(form.get('description') || ''),
    }
    const res = await fetch(`/api/${org}/finance/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setPlans((p) => [data.item, ...p])
    }
  }

  async function createPeriod(form: FormData) {
    const body = {
      planId: String(form.get('planId') || ''),
      name: String(form.get('pname') || ''),
      startDate: String(form.get('startDate') || ''),
      endDate: String(form.get('endDate') || ''),
      dueDate: String(form.get('dueDate') || ''),
    }
    const res = await fetch(`/api/${org}/finance/periods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setPeriods((p) => [data.item, ...p])
    }
  }

  async function createPayment(form: FormData) {
    const body = {
      memberId: String(form.get('memberId') || '') || undefined,
      type: 'PAYMENT',
      amount: Number(form.get('payAmount') || 0),
      currency: String(form.get('payCurrency') || 'TRY'),
      planId: String(form.get('payPlanId') || '') || undefined,
      periodId: String(form.get('payPeriodId') || '') || undefined,
      paymentMethod: String(form.get('paymentMethod') || 'CASH'),
      receiptNo: String(form.get('receiptNo') || '') || undefined,
      note: String(form.get('note') || '') || undefined,
    }
    const res = await fetch(`/api/${org}/finance/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setTx((p) => [data.item, ...p])
    }
  }

  async function refreshBalances(memberId?: string) {
    const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : ''
    const res = await fetch(`/api/${org}/finance/balances${q}`)
    if (res.ok) {
      const data = await res.json()
      setBalances(data.items)
    }
  }

  async function generateCharges(form: FormData) {
    const body = {
      planId: String(form.get('gplanId') || ''),
      periodId: String(form.get('gperiodId') || ''),
      amountOverride: Number(form.get('gamount') || '') || undefined,
      dryRun: String(form.get('gdryrun') || '') === 'on',
    }
    const res = await fetch(`/api/${org}/finance/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      if (!data.dryRun) await refreshBalances()
      alert(
        `Seçilen: ${data.totalSelected}, zaten borçlu: ${data.alreadyCharged}, oluşturulacak/oluşturuldu: ${data.willCreate ?? data.createdCount}`
      )
    }
  }

  return (
    <div className="grid gap-6">
      {/* Financial Overview Report */}
      {reports?.overview && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">
            📊 Finansal Özet
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Toplam İşlem</div>
              <div className="text-2xl font-bold text-gray-900">
                {reports.overview.totalTransactions}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Toplam Borç</div>
              <div className="text-2xl font-bold text-red-600">
                {reports.overview.totalCharges.toFixed(2)} ₺
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Toplam Ödeme</div>
              <div className="text-2xl font-bold text-green-600">
                {reports.overview.totalPayments.toFixed(2)} ₺
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Net Bakiye</div>
              <div
                className={`text-2xl font-bold ${
                  reports.overview.netBalance > 0
                    ? 'text-red-600'
                    : reports.overview.netBalance < 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                }`}
              >
                {reports.overview.netBalance.toFixed(2)} ₺
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Borçlu Üye</div>
              <div className="text-lg font-semibold text-red-600">
                {reports.overview.debtors}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Dengede</div>
              <div className="text-lg font-semibold text-gray-600">
                {reports.overview.balanced}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Fazla Ödeme</div>
              <div className="text-lg font-semibold text-green-600">
                {reports.overview.creditors}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 font-medium">Toplu Borçlandırma</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Üyeleri seçerek toplu borçlandırma yapabilirsiniz
        </p>
        <Button
          onClick={() => setShowBulkDebitModal(true)}
          size="sm"
          disabled={!canWrite}
        >
          Toplu Borçlandırma Aç
        </Button>
        {!canWrite && (
          <p className="mt-2 text-xs text-muted-foreground">
            Yalnızca yöneticiler kullanabilir
          </p>
        )}
      </Card>

      {/* Pending Bulk Debits */}
      {bulkDebits.filter((bd: any) => bd.status === 'PENDING').length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-amber-900">
              ⚡ Bekleyen Toplu Borçlandırmalar
            </h2>
            <Button
              onClick={loadBulkDebits}
              size="sm"
              variant="outline"
              className="border-amber-300"
            >
              🔄 Yenile
            </Button>
          </div>
          <div className="space-y-3">
            {bulkDebits
              .filter((bd: any) => bd.status === 'PENDING')
              .map((bd: any) => (
                <div
                  key={bd.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-amber-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {bd.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                          {bd.status === 'PENDING' ? 'BEKLEMEDE' : bd.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Tip:</span>{' '}
                          <span className="font-medium">
                            {bd.debitType === 'AIDAT' ? 'Aidat' : 'Tarihli'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tutar:</span>{' '}
                          <span className="font-medium">
                            {Number(bd.amount).toFixed(2)} {bd.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Üye Sayısı:</span>{' '}
                          <span className="font-medium">
                            {bd.members?.length || 0}
                          </span>
                        </div>
                        {bd.year && (
                          <div>
                            <span className="text-gray-600">Yıl:</span>{' '}
                            <span className="font-medium">{bd.year}</span>
                          </div>
                        )}
                        {bd.scheduledDate && (
                          <div>
                            <span className="text-gray-600">
                              Planlanan Tarih:
                            </span>{' '}
                            <span className="font-medium">
                              {new Date(bd.scheduledDate).toLocaleDateString(
                                'tr-TR'
                              )}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Oluşturma:</span>{' '}
                          <span className="font-medium">
                            {new Date(bd.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                      {bd.members && bd.members.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-600 mb-1">
                            Seçilen üyeler:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bd.members.slice(0, 10).map((m: any) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                              >
                                {m.member?.firstName} {m.member?.lastName}
                              </span>
                            ))}
                            {bd.members.length > 10 && (
                              <span className="text-xs text-gray-500">
                                +{bd.members.length - 10} daha...
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      {canWrite && (
                        <Button
                          onClick={() => processBulkDebit(bd.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isProcessingBulkDebit === bd.id}
                        >
                          {isProcessingBulkDebit === bd.id
                            ? '⏳ İşleniyor...'
                            : '✓ Şimdi Çalıştır'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>💡 Not:</strong> Yukarıdaki bekleyen borçlandırmaları
              "Şimdi Çalıştır" butonuna tıklayarak işlemeniz gerekiyor. Bu işlem
              seçilen tüm üyelere borç kaydı oluşturacaktır.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bakiyeler</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tüm üyelerin finansal durumu ({balances.length} üye)
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refreshBalances()}>
            🔄 Yenile
          </Button>
        </div>

        {balances.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Henüz bakiye bilgisi bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="pb-3 text-left font-semibold text-gray-700">
                    Üye
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-700">
                    Borç
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-700">
                    Ödeme
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-700">
                    Bakiye
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-700">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances
                  .sort(
                    (a: any, b: any) => Number(b.balance) - Number(a.balance)
                  )
                  .map((b, idx) => {
                    const balance = Number(b.balance)
                    const isDebtor = balance > 0
                    const isCreditor = balance < 0

                    return (
                      <tr
                        key={b.memberId}
                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/${org}/members/${b.memberId}`}
                            className="block hover:underline"
                          >
                            <div className="font-medium text-gray-900">
                              {b.name ?? b.memberId}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 text-right font-mono text-sm text-red-600">
                          {b.charges.toFixed(2)} ₺
                        </td>
                        <td className="py-3 text-right font-mono text-sm text-green-600">
                          {b.payments.toFixed(2)} ₺
                        </td>
                        <td
                          className={`py-3 text-right font-mono font-semibold text-base ${
                            isDebtor
                              ? 'text-red-700'
                              : isCreditor
                                ? 'text-green-700'
                                : 'text-gray-700'
                          }`}
                        >
                          {balance.toFixed(2)} ₺
                        </td>
                        <td className="py-3 text-right">
                          {isDebtor ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                              💳 Borçlu
                            </span>
                          ) : isCreditor ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                              ✅ Fazla Ödeme
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              ⚖️ Dengede
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showBulkDebitModal && (
        <BulkDebitModal
          org={org}
          onClose={() => setShowBulkDebitModal(false)}
          onSuccess={() => {
            loadBulkDebits()
            refreshBalances()
            loadReports()
            setShowBulkDebitModal(false)
          }}
        />
      )}
    </div>
  )
}
