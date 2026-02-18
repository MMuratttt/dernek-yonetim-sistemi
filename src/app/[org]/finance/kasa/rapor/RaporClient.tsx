'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface Transaction {
  id: string
  type: 'GELIR' | 'GIDER'
  amount: number
  note: string
  txnDate: string
  receiptNo: string | null
  paymentMethod: string | null
  memberName: string | null
}

interface ReportData {
  organizationName: string
  startDate: string
  endDate: string
  summary: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    totalTransactions: number
    incomeCount: number
    expenseCount: number
  }
  incomeTransactions: Transaction[]
  expenseTransactions: Transaction[]
  monthlyBreakdown: { month: string; income: number; expense: number }[]
  paymentMethodBreakdown: {
    method: string
    income: number
    expense: number
    count: number
  }[]
  currentBalance?: number
  currentCashBalance?: number
  currentBankBalance?: number
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  BANK_TRANSFER: 'Banka Transferi',
  CREDIT_CARD: 'Kredi Kartı',
  OTHER: 'Diğer',
  UNSPECIFIED: 'Belirtilmemiş',
}

export default function RaporClient({
  org,
  orgName,
}: {
  org: string
  orgName: string
}) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState('')

  async function generateReport() {
    if (!startDate || !endDate) {
      setError('Lütfen başlangıç ve bitiş tarihlerini seçiniz.')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const [reportRes, kasaRes] = await Promise.all([
        fetch(
          `/api/${org}/finance/kasa/report?startDate=${startDate}&endDate=${endDate}`
        ),
        fetch(`/api/${org}/finance/kasa`),
      ])
      if (reportRes.ok) {
        const data = await reportRes.json()
        if (kasaRes.ok) {
          const kasaData = await kasaRes.json()
          data.currentBalance = kasaData.balance ?? 0
          data.currentCashBalance = kasaData.cashBalance ?? 0
          data.currentBankBalance = kasaData.bankBalance ?? 0
        }
        setReport(data)
      } else {
        const err = await reportRes.json()
        setError(err.error || 'Rapor oluşturulurken hata oluştu.')
      }
    } catch {
      setError('Rapor oluşturulurken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function fmt(amount: number) {
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
    })
  }

  function formatShortDate(date: string) {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  function toLocalDateString(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function setQuickRange(
    range: 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'
  ) {
    const now = new Date()
    let start: Date
    let end: Date

    switch (range) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31)
        break
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1)
        end = new Date(now.getFullYear() - 1, 11, 31)
        break
    }

    setStartDate(toLocalDateString(start))
    setEndDate(toLocalDateString(end))
  }

  function computeRunningTotals(
    breakdown: { month: string; income: number; expense: number }[]
  ) {
    let cumulative = 0
    return breakdown.map((m) => {
      cumulative += m.income - m.expense
      return { ...m, cumulative }
    })
  }

  return (
    <div>
      {/* Controls - hidden when printing */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gelir / Gider Raporu</h1>
          {report && (
            <Button onClick={handlePrint} className="gap-2">
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
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Yazdır
            </Button>
          )}
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Tarih Aralığı Seçimi</h3>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickRange('thisMonth')}
            >
              Bu Ay
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickRange('lastMonth')}
            >
              Geçen Ay
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickRange('thisYear')}
            >
              Bu Yıl
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickRange('lastYear')}
            >
              Geçen Yıl
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Başlangıç Tarihi
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Bitiş Tarihi
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Rapor Oluşturuluyor...' : 'Rapor Oluştur'}
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      </div>

      {/* ============ SCREEN VERSION ============ */}
      {report && (
        <div className="mt-6 print:hidden space-y-6">
          <h2 className="text-xl font-semibold">
            {formatDate(report.startDate)} - {formatDate(report.endDate)}
          </h2>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Güncel Bakiye</p>
              <p
                className={`text-2xl font-bold ${(report.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {fmt(report.currentBalance ?? 0)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nakit</p>
                  <p
                    className={`text-sm font-semibold ${(report.currentCashBalance ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {fmt(report.currentCashBalance ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Banka</p>
                  <p
                    className={`text-sm font-semibold ${(report.currentBankBalance ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                  >
                    {fmt(report.currentBankBalance ?? 0)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Seçili Dönem Gelir
              </p>
              <p className="text-2xl font-bold text-green-600">
                {fmt(report.summary.totalIncome)}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.summary.incomeCount} işlem
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Seçili Dönem Gider
              </p>
              <p className="text-2xl font-bold text-red-600">
                {fmt(report.summary.totalExpense)}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.summary.expenseCount} işlem
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Net Bakiye</p>
              <p
                className={`text-2xl font-bold ${report.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {fmt(report.summary.netBalance)}
              </p>
              <p className="text-xs text-muted-foreground">seçili dönem</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Seçili Dönem Toplam İşlem
              </p>
              <p className="text-2xl font-bold">
                {report.summary.totalTransactions}
              </p>
            </Card>
          </div>

          {/* Monthly Breakdown - Screen */}
          {report.monthlyBreakdown.length > 1 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Aylık Dağılım</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="pb-2 text-left">Ay</th>
                    <th className="pb-2 text-right">Gelir</th>
                    <th className="pb-2 text-right">Gider</th>
                    <th className="pb-2 text-right">Net</th>
                    <th className="pb-2 text-right">Kümülatif Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {computeRunningTotals(report.monthlyBreakdown).map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{m.month}</td>
                      <td className="py-2 text-right text-green-600 font-mono">
                        {fmt(m.income)}
                      </td>
                      <td className="py-2 text-right text-red-600 font-mono">
                        {fmt(m.expense)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono font-semibold ${m.income - m.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {fmt(m.income - m.expense)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono font-bold ${m.cumulative >= 0 ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {fmt(m.cumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="pt-2">Toplam</td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.totalIncome)}
                    </td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.totalExpense)}
                    </td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.netBalance)}
                    </td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}

          {/* Payment Method - Screen */}
          {report.paymentMethodBreakdown.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Ödeme Yöntemine Göre Dağılım
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="pb-2 text-left">Ödeme Yöntemi</th>
                    <th className="pb-2 text-right">Adet</th>
                    <th className="pb-2 text-right">Gelir</th>
                    <th className="pb-2 text-right">Gider</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paymentMethodBreakdown.map((pm, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">
                        {PAYMENT_METHOD_LABELS[pm.method] || pm.method}
                      </td>
                      <td className="py-2 text-right">{pm.count}</td>
                      <td className="py-2 text-right text-green-600 font-mono">
                        {fmt(pm.income)}
                      </td>
                      <td className="py-2 text-right text-red-600 font-mono">
                        {fmt(pm.expense)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Income Table - Screen */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Gelir Detayları</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {report.incomeTransactions.length} adet gelir kaydı
            </p>
            {report.incomeTransactions.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                Bu tarih aralığında gelir kaydı bulunmamaktadır.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">Tarih</th>
                    <th className="pb-2 text-left">Açıklama</th>
                    <th className="pb-2 text-left">Ödeme</th>
                    <th className="pb-2 text-left">Fiş No</th>
                    <th className="pb-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.incomeTransactions.map((tx, i) => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 whitespace-nowrap">
                        {formatShortDate(tx.txnDate)}
                      </td>
                      <td className="py-2">{tx.note}</td>
                      <td className="py-2">
                        {tx.paymentMethod
                          ? PAYMENT_METHOD_LABELS[tx.paymentMethod] ||
                            tx.paymentMethod
                          : '-'}
                      </td>
                      <td className="py-2">{tx.receiptNo || '-'}</td>
                      <td className="py-2 text-right font-mono font-semibold text-green-600">
                        {fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={5} className="pt-2">
                      Seçili Dönem Gelir
                    </td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>

          {/* Expense Table - Screen */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Gider Detayları</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {report.expenseTransactions.length} adet gider kaydı
            </p>
            {report.expenseTransactions.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                Bu tarih aralığında gider kaydı bulunmamaktadır.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">Tarih</th>
                    <th className="pb-2 text-left">Açıklama</th>
                    <th className="pb-2 text-left">Ödeme</th>
                    <th className="pb-2 text-left">Fiş No</th>
                    <th className="pb-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseTransactions.map((tx, i) => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 whitespace-nowrap">
                        {formatShortDate(tx.txnDate)}
                      </td>
                      <td className="py-2">{tx.note}</td>
                      <td className="py-2">
                        {tx.paymentMethod
                          ? PAYMENT_METHOD_LABELS[tx.paymentMethod] ||
                            tx.paymentMethod
                          : '-'}
                      </td>
                      <td className="py-2">{tx.receiptNo || '-'}</td>
                      <td className="py-2 text-right font-mono font-semibold text-red-600">
                        {fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={5} className="pt-2">
                      Seçili Dönem Gider
                    </td>
                    <td className="pt-2 text-right font-mono">
                      {fmt(report.summary.totalExpense)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>

          {/* Summary - Screen */}
          <Card className="p-6 bg-gradient-to-br from-gray-50 to-slate-50">
            <h3 className="text-lg font-semibold mb-4">Genel Özet</h3>
            <Separator className="mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dönem Gelir:</span>
                <span className="text-lg font-bold text-green-600 font-mono">
                  {fmt(report.summary.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dönem Gider:</span>
                <span className="text-lg font-bold text-red-600 font-mono">
                  {fmt(report.summary.totalExpense)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Dönem Net Bakiye:</span>
                <span
                  className={`text-2xl font-bold font-mono ${report.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {fmt(report.summary.netBalance)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nakit Bakiye:</span>
                <span
                  className={`text-lg font-bold font-mono ${(report.currentCashBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {fmt(report.currentCashBalance ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banka Bakiye:</span>
                <span
                  className={`text-lg font-bold font-mono ${(report.currentBankBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {fmt(report.currentBankBalance ?? 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Güncel Bakiye:</span>
                <span
                  className={`text-2xl font-bold font-mono ${(report.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {fmt(report.currentBalance ?? 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ============ PRINT VERSION ============ */}
      {report && (
        <div className="hidden print:block print-report">
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid #000',
              paddingBottom: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {report.organizationName}
            </div>
            <div
              style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}
            >
              Gelir / Gider Raporu
            </div>
            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              {formatDate(report.startDate)} &mdash;{' '}
              {formatDate(report.endDate)}
            </div>
            <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>
              Rapor Tarihi:{' '}
              {new Date().toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Summary Table */}
          <div className="report-section">
            <table style={{ marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      fontWeight: 600,
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    Nakit Bakiye
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    {fmt(report.currentCashBalance ?? 0)}
                  </td>
                  <td
                    style={{
                      fontWeight: 600,
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    Banka Bakiye
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    {fmt(report.currentBankBalance ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: 700,
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '1px solid #000',
                      fontSize: '11px',
                    }}
                  >
                    Güncel Bakiye
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '1px solid #000',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    {fmt(report.currentBalance ?? 0)}
                  </td>
                  <td
                    style={{
                      fontWeight: 600,
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '1px solid #000',
                    }}
                  >
                    Seçili Dönem Toplam İşlem
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      width: '25%',
                      padding: '4px 8px',
                      borderBottom: '1px solid #000',
                    }}
                  >
                    {report.summary.totalTransactions} adet
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    Seçili Dönem Gelir
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    {fmt(report.summary.totalIncome)}
                  </td>
                  <td
                    style={{
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    Seçili Dönem Gider
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    {fmt(report.summary.totalExpense)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    Dönem Net Bakiye
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderBottom: '0.5px solid #ccc',
                    }}
                  >
                    {fmt(report.summary.netBalance)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monthly Breakdown */}
          {report.monthlyBreakdown.length > 1 && (
            <div className="report-section">
              <h3>Aylık Dağılım</h3>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Ay</th>
                    <th style={{ textAlign: 'right' }}>Gelir</th>
                    <th style={{ textAlign: 'right' }}>Gider</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                    <th style={{ textAlign: 'right' }}>Kümülatif Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {computeRunningTotals(report.monthlyBreakdown).map((m, i) => (
                    <tr key={i}>
                      <td>{m.month}</td>
                      <td
                        style={{ textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {fmt(m.income)}
                      </td>
                      <td
                        style={{ textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {fmt(m.expense)}
                      </td>
                      <td
                        style={{ textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {fmt(m.income - m.expense)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(m.cumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Toplam</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.totalIncome)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.totalExpense)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.netBalance)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Payment Method Breakdown */}
          {report.paymentMethodBreakdown.length > 0 && (
            <div className="report-section">
              <h3>Ödeme Yöntemine Göre Dağılım</h3>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Ödeme Yöntemi</th>
                    <th style={{ textAlign: 'right' }}>Adet</th>
                    <th style={{ textAlign: 'right' }}>Gelir</th>
                    <th style={{ textAlign: 'right' }}>Gider</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paymentMethodBreakdown.map((pm, i) => (
                    <tr key={i}>
                      <td>{PAYMENT_METHOD_LABELS[pm.method] || pm.method}</td>
                      <td style={{ textAlign: 'right' }}>{pm.count}</td>
                      <td
                        style={{ textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {fmt(pm.income)}
                      </td>
                      <td
                        style={{ textAlign: 'right', fontFamily: 'monospace' }}
                      >
                        {fmt(pm.expense)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Income Transactions */}
          <div className="report-section">
            <h3>Gelir Detayları ({report.incomeTransactions.length} adet)</h3>
            {report.incomeTransactions.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: '9px',
                }}
              >
                Bu tarih aralığında gelir kaydı bulunmamaktadır.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '24px' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Tarih</th>
                    <th style={{ textAlign: 'left' }}>Açıklama</th>
                    <th style={{ textAlign: 'left' }}>Ödeme</th>
                    <th style={{ textAlign: 'left' }}>Fiş No</th>
                    <th style={{ textAlign: 'right' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.incomeTransactions.map((tx, i) => (
                    <tr key={tx.id}>
                      <td>{i + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatShortDate(tx.txnDate)}
                      </td>
                      <td>{tx.note}</td>
                      <td>
                        {tx.paymentMethod
                          ? PAYMENT_METHOD_LABELS[tx.paymentMethod] ||
                            tx.paymentMethod
                          : '-'}
                      </td>
                      <td>{tx.receiptNo || '-'}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Seçili Dönem Gelir</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Expense Transactions */}
          <div className="report-section">
            <h3>Gider Detayları ({report.expenseTransactions.length} adet)</h3>
            {report.expenseTransactions.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: '9px',
                }}
              >
                Bu tarih aralığında gider kaydı bulunmamaktadır.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '24px' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Tarih</th>
                    <th style={{ textAlign: 'left' }}>Açıklama</th>
                    <th style={{ textAlign: 'left' }}>Ödeme</th>
                    <th style={{ textAlign: 'left' }}>Fiş No</th>
                    <th style={{ textAlign: 'right' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseTransactions.map((tx, i) => (
                    <tr key={tx.id}>
                      <td>{i + 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatShortDate(tx.txnDate)}
                      </td>
                      <td>{tx.note}</td>
                      <td>
                        {tx.paymentMethod
                          ? PAYMENT_METHOD_LABELS[tx.paymentMethod] ||
                            tx.paymentMethod
                          : '-'}
                      </td>
                      <td>{tx.receiptNo || '-'}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Seçili Dönem Gider</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(report.summary.totalExpense)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Final Summary */}
          <div
            style={{
              marginTop: '16px',
              borderTop: '2px solid #000',
              paddingTop: '8px',
            }}
          >
            <table>
              <tbody>
                <tr>
                  <td style={{ width: '70%', padding: '3px 6px' }}>
                    Seçili Dönem Gelir
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '3px 6px',
                    }}
                  >
                    {fmt(report.summary.totalIncome)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 6px' }}>Seçili Dönem Gider</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '3px 6px',
                    }}
                  >
                    {fmt(report.summary.totalExpense)}
                  </td>
                </tr>
                <tr
                  style={{
                    borderTop: '1.5px solid #000',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                >
                  <td style={{ padding: '4px 6px' }}>DÖNEM NET BAKİYE</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '4px 6px',
                    }}
                  >
                    {fmt(report.summary.netBalance)}
                  </td>
                </tr>
                <tr
                  style={{
                    borderTop: '1px solid #999',
                  }}
                >
                  <td style={{ padding: '3px 6px' }}>Nakit Bakiye</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '3px 6px',
                    }}
                  >
                    {fmt(report.currentCashBalance ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 6px' }}>Banka Bakiye</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '3px 6px',
                    }}
                  >
                    {fmt(report.currentBankBalance ?? 0)}
                  </td>
                </tr>
                <tr
                  style={{
                    fontWeight: 700,
                    fontSize: '12px',
                    borderTop: '2px solid #000',
                  }}
                >
                  <td style={{ padding: '6px 6px' }}>GÜNCEL BAKİYE</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      padding: '6px 6px',
                    }}
                  >
                    {fmt(report.currentBalance ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
