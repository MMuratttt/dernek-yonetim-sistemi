'use client'
import { useState } from 'react'
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

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Bakiyeler</h2>
          <Button size="sm" variant="outline" onClick={() => refreshBalances()}>
            Yenile
          </Button>
        </div>
        <ul className="text-sm">
          {balances.map((b) => (
            <li key={b.memberId}>
              {b.name ?? b.memberId}: bakiye {b.balance.toFixed(2)} (borç{' '}
              {b.charges.toFixed(2)} / ödeme {b.payments.toFixed(2)})
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Borçlu Üyeler</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshBalances()}
            >
              Yenile
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
              CSV Dışa Aktar
            </Button>
          </div>
        </div>
        <ul className="text-sm">
          {balances
            .filter((b: any) => Number(b.balance) > 0)
            .sort((a: any, b: any) => Number(b.balance) - Number(a.balance))
            .map((b: any) => (
              <li key={b.memberId}>
                {b.name ?? b.memberId}: bakiye {b.balance.toFixed(2)}
              </li>
            ))}
        </ul>
      </Card>

      {canWrite && (
        <Card className="p-4">
          <h2 className="mb-2 font-medium">Toplu Borçlandırma</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              await generateCharges(form)
            }}
            className="grid grid-cols-6 gap-2"
          >
            <select className="col-span-2" name="gplanId">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className="col-span-2" name="gperiodId">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input
              name="gamount"
              type="number"
              step="0.01"
              placeholder="Tutarı override (opsiyonel)"
            />
            <label className="col-span-6 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="gdryrun" /> Dry-run (sadece say)
            </label>
            <div className="col-span-6">
              <Button size="sm" type="submit">
                Borçlandır
              </Button>
            </div>
          </form>
        </Card>
      )}

      {canWrite && (
        <Card className="p-4">
          <h2 className="mb-2 font-medium">Toplu Borçlandırma (Yeni)</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Üyeleri seçerek toplu borçlandırma yapabilirsiniz
          </p>
          <Button onClick={() => setShowBulkDebitModal(true)} size="sm">
            Toplu Borçlandırma Aç
          </Button>
        </Card>
      )}

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
