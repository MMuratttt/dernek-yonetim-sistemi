'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export default function KasaClient({
  org,
  canWrite,
  initial,
}: {
  org: string
  canWrite: boolean
  initial: any
}) {
  const [balance, setBalance] = useState(initial.balance || 0)
  const [income, setIncome] = useState(initial.income || 0)
  const [expense, setExpense] = useState(initial.expense || 0)
  const [transactions, setTransactions] = useState(initial.transactions || [])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transactionFilter, setTransactionFilter] = useState<
    'ALL' | 'GELIR' | 'GIDER'
  >('ALL')

  async function refreshData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/${org}/finance/kasa`)
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
        setIncome(data.income)
        setExpense(data.expense)
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const type = String(formData.get('type'))
    const amount = Number(formData.get('amount'))
    const description = String(formData.get('description'))
    const paymentMethod = String(formData.get('paymentMethod'))
    const receiptNo = formData.get('receiptNo')
      ? String(formData.get('receiptNo'))
      : undefined

    if (!type || type === '') {
      alert('Lütfen işlem tipini seçiniz')
      return
    }

    if (!amount || amount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz')
      return
    }

    if (!description || description.trim() === '') {
      alert('Lütfen açıklama giriniz')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/${org}/finance/kasa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount,
          note: description,
          paymentMethod,
          receiptNo,
        }),
      })

      if (res.ok) {
        const form = e.currentTarget
        if (form) {
          form.reset()
        }
        await refreshData()
        alert('İşlem başarıyla kaydedildi')
      } else {
        const error = await res.json()
        alert(`Hata: ${error.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      alert('İşlem eklenirken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Güncel Bakiye
              </p>
              <h2
                className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(balance)}
              </h2>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Toplam Gelir
              </p>
              <h2 className="text-3xl font-bold text-green-600">
                {formatCurrency(income)}
              </h2>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Toplam Gider
              </p>
              <h2 className="text-3xl font-bold text-red-600">
                {formatCurrency(expense)}
              </h2>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 13l-5 5m0 0l-5-5m5 5V6"
                />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Transaction Form */}
      {canWrite && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Yeni İşlem Ekle</h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  İşlem Tipi
                </label>
                <Select name="type" required>
                  <option value="">Seçiniz...</option>
                  <option value="GELIR">Gelir</option>
                  <option value="GIDER">Gider</option>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Tutar</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ödeme Yöntemi
                </label>
                <Select name="paymentMethod" required>
                  <option value="CASH">Nakit</option>
                  <option value="BANK_TRANSFER">Banka Transferi</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="OTHER">Diğer</option>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Fiş No (Opsiyonel)
                </label>
                <Input
                  name="receiptNo"
                  type="text"
                  placeholder="Fiş numarası"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Açıklama</label>
              <Input
                name="description"
                type="text"
                placeholder="İşlem açıklaması"
                required
              />
            </div>

            <Button type="submit" disabled={loading || submitting}>
              {submitting ? 'Ekleniyor...' : 'İşlem Ekle'}
            </Button>
          </form>
        </Card>
      )}

      {/* Transactions List */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">İşlem Geçmişi</h3>
          <div className="flex gap-2">
            <Select
              value={transactionFilter}
              onChange={(e) =>
                setTransactionFilter(
                  e.target.value as 'ALL' | 'GELIR' | 'GIDER'
                )
              }
              className="w-36"
            >
              <option value="ALL">Tümü</option>
              <option value="GELIR">Gelirler</option>
              <option value="GIDER">Giderler</option>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              {loading ? 'Yüklüyor...' : 'Yenile'}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {transactions.filter(
          (tx: any) =>
            transactionFilter === 'ALL' || tx.type === transactionFilter
        ).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {transactionFilter === 'ALL'
              ? 'Henüz işlem kaydı bulunmamaktadır.'
              : `${transactionFilter === 'GELIR' ? 'Gelir' : 'Gider'} kaydı bulunmamaktadır.`}
          </p>
        ) : (
          <div className="space-y-3">
            {transactions
              .filter(
                (tx: any) =>
                  transactionFilter === 'ALL' || tx.type === transactionFilter
              )
              .map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          tx.type === 'GELIR' || tx.type === 'PAYMENT'
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}
                      >
                        {tx.type === 'GELIR' || tx.type === 'PAYMENT' ? (
                          <svg
                            className="h-5 w-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 11l5-5m0 0l5 5m-5-5v12"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 13l-5 5m0 0l-5-5m5 5V6"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {tx.note || 'İsimsiz işlem'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.txnDate)}
                          {tx.receiptNo && ` • Fiş: ${tx.receiptNo}`}
                          {tx.paymentMethod &&
                            ` • ${getPaymentMethodLabel(tx.paymentMethod)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        tx.type === 'GELIR' || tx.type === 'PAYMENT'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'GELIR' || tx.type === 'PAYMENT' ? '+' : '-'}
                      {formatCurrency(Number(tx.amount))}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Nakit',
    BANK_TRANSFER: 'Banka Transferi',
    CREDIT_CARD: 'Kredi Kartı',
    OTHER: 'Diğer',
  }
  return labels[method] || method
}
