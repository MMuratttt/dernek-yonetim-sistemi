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

  // Load balances on mount
  useEffect(() => {
    refreshBalances()
  }, [org])

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
      <Card className="p-4">
        <h2 className="mb-2 font-medium">Plan Oluştur</h2>
        {canWrite ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              await createPlan(form)
            }}
            className="grid grid-cols-6 gap-2"
          >
            <Input name="name" placeholder="Plan adı" className="col-span-2" />
            <Input
              name="amount"
              type="number"
              step="0.01"
              placeholder="Tutar"
            />
            <Input name="currency" defaultValue="TRY" placeholder="TRY" />
            <Select name="frequency" defaultValue="MONTHLY">
              <option value="MONTHLY">Aylık</option>
              <option value="QUARTERLY">3 Aylık</option>
              <option value="YEARLY">Yıllık</option>
              <option value="ONE_TIME">Tek Sefer</option>
            </Select>
            <Input
              name="description"
              placeholder="Açıklama (opsiyonel)"
              className="col-span-6"
            />
            <div className="col-span-6">
              <Button type="submit" size="sm">
                Ekle
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Yalnızca görüntüleme</p>
        )}
        <Separator className="my-3" />
        <ul className="text-sm">
          {plans.map((p) => (
            <li key={p.id}>
              {p.name} — {p.amount} {p.currency} ({p.frequency})
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-medium">Dönem Oluştur</h2>
        {canWrite ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              await createPeriod(form)
            }}
            className="grid grid-cols-6 gap-2"
          >
            <select className="col-span-2" name="planId">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input name="pname" placeholder="Dönem adı (ör. 2025/01)" />
            <Input name="startDate" type="date" />
            <Input name="endDate" type="date" />
            <Input name="dueDate" type="date" />
            <div className="col-span-6">
              <Button type="submit" size="sm">
                Ekle
              </Button>
            </div>
          </form>
        ) : null}
        <Separator className="my-3" />
        <ul className="text-sm">
          {periods.map((p) => (
            <li key={p.id}>
              {p.name} — {new Date(p.startDate).toLocaleDateString()} /{' '}
              {new Date(p.endDate).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-medium">Ödeme Kaydet</h2>
        {canWrite ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              await createPayment(form)
            }}
            className="grid grid-cols-6 gap-2"
          >
            <Input name="memberId" placeholder="Üye ID (opsiyonel)" />
            <select className="col-span-2" name="payPlanId">
              <option value="">Plan yok</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className="col-span-2" name="payPeriodId">
              <option value="">Dönem yok</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input
              name="payAmount"
              type="number"
              step="0.01"
              placeholder="Tutar"
            />
            <Input name="payCurrency" defaultValue="TRY" />
            <select name="paymentMethod" defaultValue="CASH">
              <option value="CASH">Nakit</option>
              <option value="BANK_TRANSFER">Havale/EFT</option>
              <option value="CREDIT_CARD">Kredi Kartı</option>
              <option value="OTHER">Diğer</option>
            </select>
            <Input name="receiptNo" placeholder="Makbuz No (opsiyonel)" />
            <Input
              name="note"
              placeholder="Not (opsiyonel)"
              className="col-span-3"
            />
            <div className="col-span-6">
              <Button type="submit" size="sm">
                Kaydet
              </Button>
            </div>
          </form>
        ) : null}
        <Separator className="my-3" />
        <ul className="text-sm">
          {tx.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="grow">
                {new Date(t.txnDate).toLocaleString()} — {t.type} — {t.amount}{' '}
                {t.currency} {t.receiptNo ? `(Makbuz: ${t.receiptNo})` : ''}
              </span>
              {t.type === 'PAYMENT' && (
                <a
                  href={`/api/${org}/finance/receipt?id=${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm border px-2 py-1 text-xs hover:bg-accent"
                >
                  Makbuz
                </a>
              )}
            </li>
          ))}
        </ul>
      </Card>

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
                          <div className="font-medium text-gray-900">
                            {b.name ?? b.memberId}
                          </div>
                          {b.name && (
                            <div className="text-xs text-gray-500">
                              ID: {b.memberId}
                            </div>
                          )}
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

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-red-700">
              Borçlu Üyeler
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {balances.filter((b: any) => Number(b.balance) > 0).length} üye
              borçlu durumda
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshBalances()}
            >
              🔄 Yenile
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const debtors = balances.filter(
                  (b: any) => Number(b.balance) > 0
                )
                const rows = [
                  [
                    'MemberId',
                    'Name',
                    'Charges',
                    'Payments',
                    'Refunds',
                    'Adjustments',
                    'Balance',
                  ],
                  ...debtors.map((d: any) => [
                    d.memberId,
                    d.name ?? '',
                    String(d.charges ?? 0),
                    String(d.payments ?? 0),
                    String(d.refunds ?? 0),
                    String(d.adjustments ?? 0),
                    String(d.balance ?? 0),
                  ]),
                ]
                const csv = rows
                  .map((r) =>
                    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
                  )
                  .join('\n')
                const blob = new Blob([csv], {
                  type: 'text/csv;charset=utf-8;',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `borclu-uyeler-${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
            >
              📊 CSV Dışa Aktar
            </Button>
          </div>
        </div>

        {balances.filter((b: any) => Number(b.balance) > 0).length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-lg font-medium text-gray-700">
              Harika! Hiç borçlu üye yok.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Tüm üyeler ödemelerini tamamlamış.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Toplam Borç:{' '}
                    {balances
                      .filter((b: any) => Number(b.balance) > 0)
                      .reduce(
                        (sum: number, b: any) => sum + Number(b.balance),
                        0
                      )
                      .toFixed(2)}{' '}
                    ₺
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Borçlu üye sayısı:{' '}
                    {balances.filter((b: any) => Number(b.balance) > 0).length}
                  </p>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-red-200 bg-red-50">
                  <th className="py-3 px-4 text-left font-semibold text-red-900">
                    Sıra
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-red-900">
                    Üye Adı
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-red-900">
                    Toplam Borç
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-red-900">
                    Ödenen
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-red-900">
                    Kalan Borç
                  </th>
                  <th className="py-3 px-4 text-center font-semibold text-red-900">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances
                  .filter((b: any) => Number(b.balance) > 0)
                  .sort(
                    (a: any, b: any) => Number(b.balance) - Number(a.balance)
                  )
                  .map((b: any, idx: number) => {
                    const balance = Number(b.balance)
                    const charges = Number(b.charges)
                    const payments = Number(b.payments)
                    const paymentPercentage =
                      charges > 0 ? (payments / charges) * 100 : 0

                    return (
                      <tr
                        key={b.memberId}
                        className="border-b border-red-100 transition-colors hover:bg-red-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {b.name ?? b.memberId}
                          </div>
                          {b.name && (
                            <div className="text-xs text-gray-500">
                              ID: {b.memberId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sm text-gray-700">
                          {charges.toFixed(2)} ₺
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono text-sm text-green-600">
                            {payments.toFixed(2)} ₺
                          </div>
                          <div className="text-xs text-gray-500">
                            %{paymentPercentage.toFixed(0)} ödendi
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-base text-red-700">
                          {balance.toFixed(2)} ₺
                        </td>
                        <td className="py-3 px-4 text-center">
                          {balance > 1000 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                              🔴 Yüksek Borç
                            </span>
                          ) : balance > 500 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white">
                              🟠 Orta Borç
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white">
                              🟡 Düşük Borç
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

      {showBulkDebitModal && (
        <BulkDebitModal
          org={org}
          onClose={() => setShowBulkDebitModal(false)}
          onSuccess={() => {
            refreshBalances()
            // Refresh transactions if needed
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
