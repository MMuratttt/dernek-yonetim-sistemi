'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function KasaClient({
  org,
  canWrite,
  initial,
  today,
}: {
  org: string
  canWrite: boolean
  initial: any
  today: string
}) {
  const [balance, setBalance] = useState(initial.balance || 0)
  const [cashBalance, setCashBalance] = useState(initial.cashBalance || 0)
  const [bankBalance, setBankBalance] = useState(initial.bankBalance || 0)
  const [income, setIncome] = useState(initial.income || 0)
  const [expense, setExpense] = useState(initial.expense || 0)
  const [transactions, setTransactions] = useState(initial.transactions || [])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transactionFilter, setTransactionFilter] = useState<
    'ALL' | 'GELIR' | 'GIDER'
  >('ALL')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [currentPage, setCurrentPage] = useState(initial.pagination?.page || 1)
  const [totalPages, setTotalPages] = useState(
    initial.pagination?.totalPages || 1
  )
  const [totalCount, setTotalCount] = useState(
    initial.pagination?.totalCount || 0
  )
  const pageSize = initial.pagination?.pageSize || 25

  function openEdit(tx: any) {
    setEditTarget({
      id: tx.id,
      type: tx.type,
      amount: Math.abs(Number(tx.amount)),
      paymentMethod: tx.paymentMethod || 'BANK_TRANSFER',
      receiptNo: tx.receiptNo || '',
      note: tx.note || '',
      txnDate: tx.txnDate
        ? new Date(tx.txnDate).toISOString().split('T')[0]
        : today,
    })
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setEditing(true)
    try {
      const res = await fetch(`/api/${org}/finance/kasa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          type: editTarget.type,
          amount: editTarget.amount,
          paymentMethod: editTarget.paymentMethod,
          receiptNo: editTarget.receiptNo || null,
          note: editTarget.note,
          txnDate: editTarget.txnDate,
        }),
      })
      if (res.ok) {
        setEditTarget(null)
        await refreshData()
      } else {
        const error = await res.json()
        alert(`Hata: ${error.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('İşlem güncellenirken hata oluştu')
    } finally {
      setEditing(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/${org}/finance/kasa?id=${deleteTarget.id}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setDeleteTarget(null)
        await refreshData()
      } else {
        const error = await res.json()
        alert(`Hata: ${error.error || 'Bilinmeyen hata'}`)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('İşlem silinirken hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  async function refreshData(page?: number) {
    const targetPage = page ?? currentPage
    setLoading(true)
    try {
      const res = await fetch(
        `/api/${org}/finance/kasa?page=${targetPage}&pageSize=${pageSize}`
      )
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
        setCashBalance(data.cashBalance || 0)
        setBankBalance(data.bankBalance || 0)
        setIncome(data.income)
        setExpense(data.expense)
        setTransactions(data.transactions)
        if (data.pagination) {
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.totalPages)
          setTotalCount(data.pagination.totalCount)
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || loading) return
    refreshData(page)
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const type = String(formData.get('type'))
    const amount = Number(formData.get('amount'))
    const description = String(formData.get('description'))
    const paymentMethod = String(formData.get('paymentMethod'))
    const receiptNo = formData.get('receiptNo')
      ? String(formData.get('receiptNo'))
      : undefined
    const txnDateStr = formData.get('txnDate')
      ? String(formData.get('txnDate'))
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

    if (!txnDateStr) {
      alert('Lütfen tarih seçiniz')
      return
    }

    const now = new Date()
    const txnDate = new Date(
      `${txnDateStr}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    ).toISOString()

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
          txnDate,
        }),
      })

      if (res.ok) {
        form.reset()
        await refreshData(1)
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
                suppressHydrationWarning
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
          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Nakit</p>
              <p
                className={`text-sm font-semibold ${cashBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                suppressHydrationWarning
              >
                {formatCurrency(cashBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Banka</p>
              <p
                className={`text-sm font-semibold ${bankBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                suppressHydrationWarning
              >
                {formatCurrency(bankBalance)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Toplam Gelir
              </p>
              <h2
                className="text-3xl font-bold text-green-600"
                suppressHydrationWarning
              >
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
              <h2
                className="text-3xl font-bold text-red-600"
                suppressHydrationWarning
              >
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
                <label className="mb-2 block text-sm font-medium">Tarih</label>
                <Input
                  name="txnDate"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ödeme Yöntemi
                </label>
                <Select
                  name="paymentMethod"
                  defaultValue="BANK_TRANSFER"
                  required
                >
                  <option value="BANK_TRANSFER">Banka Transferi</option>
                  <option value="CASH">Nakit</option>
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
                        <p
                          className="text-sm text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatDate(tx.txnDate)}
                          {tx.receiptNo && ` • Fiş: ${tx.receiptNo}`}
                          {tx.paymentMethod &&
                            ` • ${getPaymentMethodLabel(tx.paymentMethod)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          tx.type === 'GELIR' || tx.type === 'PAYMENT'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'GELIR' || tx.type === 'PAYMENT'
                          ? '+'
                          : '-'}
                        <span suppressHydrationWarning>
                          {formatCurrency(Math.abs(Number(tx.amount)))}
                        </span>
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(tx)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Düzenle"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tx)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Sil"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Toplam {totalCount} işlem
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage <= 1 || loading}
                >
                  {'«'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  {'‹ Önceki'}
                </Button>
                <span className="px-3 text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  {'Sonraki ›'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage >= totalPages || loading}
                >
                  {'»'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlemi Düzenle</DialogTitle>
            <DialogDescription>
              İşlem bilgilerini güncelleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    İşlem Tipi
                  </label>
                  <Select
                    value={editTarget.type}
                    onChange={(e) =>
                      setEditTarget({ ...editTarget, type: e.target.value })
                    }
                    required
                  >
                    <option value="GELIR">Gelir</option>
                    <option value="GIDER">Gider</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tutar
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTarget.amount}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        amount: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tarih
                  </label>
                  <Input
                    type="date"
                    value={editTarget.txnDate}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        txnDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Ödeme Yöntemi
                  </label>
                  <Select
                    value={editTarget.paymentMethod}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        paymentMethod: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="BANK_TRANSFER">Banka Transferi</option>
                    <option value="CASH">Nakit</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Fiş No (Opsiyonel)
                  </label>
                  <Input
                    type="text"
                    value={editTarget.receiptNo}
                    onChange={(e) =>
                      setEditTarget({
                        ...editTarget,
                        receiptNo: e.target.value,
                      })
                    }
                    placeholder="Fiş numarası"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Açıklama
                </label>
                <Input
                  type="text"
                  value={editTarget.note}
                  onChange={(e) =>
                    setEditTarget({ ...editTarget, note: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  disabled={editing}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={editing}>
                  {editing ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlemi Sil</DialogTitle>
            <DialogDescription>
              Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg border p-4">
              <p className="font-medium">
                {deleteTarget.note || 'İsimsiz işlem'}
              </p>
              <p
                className="text-sm text-muted-foreground"
                suppressHydrationWarning
              >
                {formatDate(deleteTarget.txnDate)}
              </p>
              <p
                className={`mt-1 text-lg font-bold ${
                  deleteTarget.type === 'GELIR' ||
                  deleteTarget.type === 'PAYMENT'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {deleteTarget.type === 'GELIR' ||
                deleteTarget.type === 'PAYMENT'
                  ? '+'
                  : '-'}
                <span suppressHydrationWarning>
                  {formatCurrency(Math.abs(Number(deleteTarget.amount)))}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
