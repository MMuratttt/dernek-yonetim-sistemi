'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ListRow } from '@/components/ui/list-row'

type Member = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
}

type BulkDebitModalProps = {
  org: string
  onClose: () => void
  onSuccess: () => void
}

export default function BulkDebitModal({
  org,
  onClose,
  onSuccess,
}: BulkDebitModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [debitType, setDebitType] = useState<'AIDAT' | 'TARIH_GIREREK'>('AIDAT')
  const [year, setYear] = useState(new Date().getFullYear())
  const [scheduledDate, setScheduledDate] = useState('')
  const [amount, setAmount] = useState(12000)

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch(`/api/${org}/members?status=ACTIVE&limit=500`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.items || [])
        }
      } catch (e) {
        console.error('Failed to load members:', e)
      } finally {
        setLoading(false)
      }
    }
    loadMembers()
  }, [org])

  const allSelected = selected.length > 0 && selected.length === members.length

  function toggleAll() {
    setSelected((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id)
    )
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      alert('Lütfen en az bir üye seçin')
      return
    }

    setSubmitting(true)
    try {
      const body: any = {
        memberIds: selected,
        debitType,
        amount,
        currency: 'TRY',
      }

      if (debitType === 'AIDAT') {
        body.year = year
      } else if (debitType === 'TARIH_GIREREK' && scheduledDate) {
        body.scheduledDate = scheduledDate
      }

      const res = await fetch(`/api/${org}/finance/bulk-debit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Borçlandırma başarıyla oluşturuldu')
        onSuccess()
        onClose()
      } else {
        const error = await res.json()
        alert(error.error || 'Bir hata oluştu')
      }
    } catch (e) {
      console.error('Submit error:', e)
      alert('Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-6xl">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Toplu Borçlandırma</h2>
            <Button onClick={onClose} variant="outline" size="sm">
              ✕ Kapat
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Members List */}
            <div className="md:col-span-2">
              <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">Üyeler</h3>
                  <div className="flex items-center gap-2">
                    <Button onClick={toggleAll} size="sm" variant="outline">
                      {allSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selected.length} / {members.length} kayıt
                    </span>
                  </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto rounded border bg-card">
                  {loading ? (
                    <div className="p-8 text-center">Yükleniyor...</div>
                  ) : members.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Üye bulunamadı
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="sticky top-0 bg-card border-b">
                        <tr className="text-left text-sm">
                          <th className="p-2 w-12">#</th>
                          <th className="p-2">Ad Soyad</th>
                          <th className="p-2">Cep</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} className="border-b hover:bg-accent">
                            <td className="p-2">
                              <Checkbox
                                checked={selected.includes(m.id)}
                                onChange={() => toggle(m.id)}
                              />
                            </td>
                            <td
                              className="p-2 cursor-pointer"
                              onClick={() => toggle(m.id)}
                            >
                              {m.firstName} {m.lastName}
                            </td>
                            <td
                              className="p-2 text-sm text-muted-foreground cursor-pointer"
                              onClick={() => toggle(m.id)}
                            >
                              {m.phone || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* Selected Members Section */}
              <Card className="mt-4 p-4">
                <h3 className="mb-2 font-medium">Seçilenler</h3>
                <div className="text-sm text-muted-foreground">
                  {selected.length === 0
                    ? 'Tabloda herhangi bir veri mevcut değil'
                    : `${selected.length} üye seçildi`}
                </div>
              </Card>
            </div>

            {/* Right: Form */}
            <div>
              <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                <h3 className="mb-4 font-medium">Borçlandırma Bilgileri</h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Borçlandırma Şekli
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="debitType"
                          value="AIDAT"
                          checked={debitType === 'AIDAT'}
                          onChange={(e) => setDebitType(e.target.value as any)}
                        />
                        <span className="text-sm">
                          Yıllık (Seçilen yılın ilk gününe göre)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="debitType"
                          value="TARIH_GIREREK"
                          checked={debitType === 'TARIH_GIREREK'}
                          onChange={(e) => setDebitType(e.target.value as any)}
                        />
                        <span className="text-sm">Tarih Girerek</span>
                      </label>
                    </div>
                  </div>

                  {debitType === 'AIDAT' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Yıl
                      </label>
                      <Select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const y = new Date().getFullYear() - 2 + i
                          return (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          )
                        })}
                      </Select>
                    </div>
                  )}

                  {debitType === 'TARIH_GIREREK' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Tarih Girerek
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Borç Tipi
                    </label>
                    <Select defaultValue="AIDAT">
                      <option value="AIDAT">Aidat</option>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tutar
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      step="0.01"
                    />
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || selected.length === 0}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? 'İşleniyor...' : '✓ Borçlandır'}
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="w-full"
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
