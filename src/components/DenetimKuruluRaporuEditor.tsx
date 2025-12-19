'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Plus, X, Download } from 'lucide-react'
import { downloadServerPdf } from '@/lib/serverPdf'
import { TurkishPDFGenerator } from '@/lib/pdfGenerator'

interface MemberData {
  id: string
  name: string
}

interface DenetimKuruluData {
  reportDate: string
  reportTime: string
  startDate: string
  endDate: string
  chairman: MemberData | null
  members: MemberData[]
  giris: string
  defterInceleme: string[]
  gelirleriIncelenmesi: string[]
  giderleriIncelenmesi: string[]
  yillikMaliDurum: string[]
  sonucOneri: string[]
  closingText: string
}

interface Props {
  initialData?: Partial<DenetimKuruluData>
  orgName: string
  chairman: MemberData | null
  members: MemberData[]
  availableMembers: MemberData[]
}

// Helper to get current date in DD.MM.YYYY format
const getCurrentDate = () => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}.${month}.${year}`
}

// Helper to get current time in HH:MM format
const getCurrentTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function DenetimKuruluRaporuEditor({
  initialData,
  orgName,
  chairman,
  members,
  availableMembers,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null)
  const currentYear = new Date().getFullYear()
  const [data, setData] = useState<DenetimKuruluData>(() => ({
    reportDate: initialData?.reportDate || getCurrentDate(),
    reportTime: initialData?.reportTime || getCurrentTime(),
    startDate: initialData?.startDate || String(currentYear - 2),
    endDate: initialData?.endDate || String(currentYear),
    chairman: initialData?.chairman || chairman,
    members: initialData?.members || members,
    giris:
      initialData?.giris ||
      'Dernek tüzüğü gereği 3 yılda bir yapılan genel kurul toplantısı öncesinde Denetim Kurulu olarak; {{dönemBaşı}}–{{dönemSonu}} yıllarındaki faaliyetler, defterler, gelir-gider belgeleri, banka hareketleri ve mali tablolar incelenmiştir.',
    defterInceleme: initialData?.defterInceleme || [
      'Karar defteri, gelir–gider defteri ve diğer resmi defterlerin düzenli şekilde kaydedildiği,',
      'Tüm gelir ve gider belgelerinin sıra numarası, imzalı, asılı ve mevzuata uygun olduğu,',
      'Banka hesap hareketleri ile dernek kayıtlarının uyumlu olduğu tespit edilmiştir.',
    ],
    gelirleriIncelenmesi: initialData?.gelirleriIncelenmesi || [
      'Aidat gelirleri düzenli olarak tahsil edilmiş ve kayıtlara işlenmiştir.',
      'Bağış ve yardım gelirleri usulüne uygun şekilde kaydedilmiştir.',
      'Tüm gelir kalemleri belgelendirilmiş ve arşivlenmiştir.',
    ],
    giderleriIncelenmesi: initialData?.giderleriIncelenmesi || [
      'Giderler dernek amaçlarına uygun şekilde yapılmıştır.',
      'Tüm harcamalar fatura ve makbuz ile belgelendirilmiştir.',
      'Yönetim giderleri bütçe sınırları içinde tutulmuştur.',
    ],
    yillikMaliDurum: initialData?.yillikMaliDurum || [
      'Sonuç ve Öneriler',
      'Denetim Kurulu üye imzaları',
    ],
    sonucOneri: initialData?.sonucOneri || [
      'Yönetim Kurulu, dernek amaç ve tüzüğüne uygun hareket etmiştir.',
      'Mali tablolar düzenli tutulmuş ve herhangi bir usulsüzlük tespit edilmemiştir.',
      'Genel Kurul tarafından ibra edilmesi tavsiye edilir.',
    ],
    closingText:
      initialData?.closingText ||
      "Derneğimizin mali işlemleri ve idari faaliyetleri denetlenerek, Genel Kurul'un bilgisine sunulmak üzere işbu rapor hazırlanmıştır.",
  }))

  const updateField = (field: keyof DenetimKuruluData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const addArrayItem = (field: keyof DenetimKuruluData) => {
    const current = data[field] as string[]
    setData((prev) => ({ ...prev, [field]: [...current, ''] }))
  }

  const removeArrayItem = (field: keyof DenetimKuruluData, index: number) => {
    const current = data[field] as string[]
    setData((prev) => ({
      ...prev,
      [field]: current.filter((_, i) => i !== index),
    }))
  }

  const updateArrayItem = (
    field: keyof DenetimKuruluData,
    index: number,
    value: string
  ) => {
    const current = data[field] as string[]
    const updated = [...current]
    updated[index] = value
    setData((prev) => ({ ...prev, [field]: updated }))
  }

  // Helper function to replace placeholders with actual values
  // Supports both Turkish (new) and English (legacy) placeholder names
  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{dönemBaşı\}\}/g, data.startDate)
      .replace(/\{\{dönemSonu\}\}/g, data.endDate)
      .replace(/\{\{startDate\}\}/g, data.startDate)
      .replace(/\{\{endDate\}\}/g, data.endDate)
  }

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return

    try {
      const pdfGen = new TurkishPDFGenerator()
      pdfGen.setElement(previewRef.current)
      await pdfGen.generatePDF(
        `denetim-kurulu-raporu-${data.startDate}-${data.endDate}.pdf`
      )
    } catch (error) {
      console.error('PDF oluşturma hatası:', error)
      alert('PDF oluşturulurken bir hata oluştu.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Rapor Tarihi</Label>
              <Input
                type="text"
                value={data.reportDate}
                onChange={(e) => updateField('reportDate', e.target.value)}
                placeholder="14.12.2025"
              />
            </div>
            <div>
              <Label>Saat</Label>
              <Input
                type="text"
                value={data.reportTime}
                onChange={(e) => updateField('reportTime', e.target.value)}
                placeholder="14:00"
              />
            </div>
            <div>
              <Label>Dönem Başlangıç Yılı</Label>
              <Input
                type="number"
                value={data.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                placeholder={String(currentYear - 2)}
              />
            </div>
            <div>
              <Label>Dönem Bitiş Yılı</Label>
              <Input
                type="number"
                value={data.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
                placeholder={String(currentYear)}
              />
            </div>
          </div>

          <div>
            <Label>Denetim Kurulu Başkanı</Label>
            <Select
              value={data.chairman?.id || ''}
              onChange={(e) => {
                const selectedMember = availableMembers.find(
                  (m) => m.id === e.target.value
                )
                updateField('chairman', selectedMember || null)
              }}
            >
              <option value="">Başkan seçiniz...</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Denetim Kurulu Üyeleri</Label>
            {data.members.map((member, index) => (
              <div key={member.id} className="flex gap-2 mb-2 items-center">
                <div className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm">
                  {member.name}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setData((prev) => ({
                      ...prev,
                      members: prev.members.filter((_, i) => i !== index),
                    }))
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Select
                value=""
                onChange={(e) => {
                  const selectedMember = availableMembers.find(
                    (m) => m.id === e.target.value
                  )
                  if (
                    selectedMember &&
                    !data.members.some((m) => m.id === selectedMember.id)
                  ) {
                    setData((prev) => ({
                      ...prev,
                      members: [...prev.members, selectedMember],
                    }))
                  }
                }}
                className="flex-1"
              >
                <option value="">Üye seçiniz...</option>
                {availableMembers
                  .filter(
                    (m) =>
                      !data.members.some((dm) => dm.id === m.id) &&
                      m.id !== data.chairman?.id
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Üye eklemek için listeden seçin
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">1. Giriş</h3>
          <div>
            <Textarea
              value={data.giris}
              onChange={(e) => updateField('giris', e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Kullanılabilir yer tutucular: {'{{dönemBaşı}}'}, {'{{dönemSonu}}'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">2. Defter ve Belgelerin İncelenmesi</h3>
          {data.defterInceleme.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={item}
                onChange={(e) =>
                  updateArrayItem('defterInceleme', index, e.target.value)
                }
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('defterInceleme', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('defterInceleme')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Madde Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">3. Gelirlerin İncelenmesi</h3>
          {data.gelirleriIncelenmesi.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={item}
                onChange={(e) =>
                  updateArrayItem('gelirleriIncelenmesi', index, e.target.value)
                }
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('gelirleriIncelenmesi', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('gelirleriIncelenmesi')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Madde Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">4. Giderlerin İncelenmesi</h3>
          {data.giderleriIncelenmesi.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={item}
                onChange={(e) =>
                  updateArrayItem('giderleriIncelenmesi', index, e.target.value)
                }
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('giderleriIncelenmesi', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('giderleriIncelenmesi')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Madde Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">5. Sonuç ve Öneriler</h3>
          {data.sonucOneri.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                value={item}
                onChange={(e) =>
                  updateArrayItem('sonucOneri', index, e.target.value)
                }
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('sonucOneri', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('sonucOneri')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Madde Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Kapanış Metni</Label>
            <Textarea
              value={data.closingText}
              onChange={(e) => updateField('closingText', e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Kullanılabilir yer tutucular: {'{{dönemBaşı}}'}, {'{{dönemSonu}}'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Önizleme</h3>
            <Button
              onClick={() =>
                downloadServerPdf(
                  `denetim-kurulu-raporu-${data.startDate}-${data.endDate}.pdf`,
                  previewRef.current
                )
              }
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF İndir
            </Button>
          </div>
          <div
            ref={previewRef}
            className="border rounded-lg px-16 py-8 bg-white dark:bg-gray-900 print:border-0"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1">{orgName}</h2>
              <h3 className="text-lg font-semibold">DENETİM KURULU RAPORU</h3>
              <p className="text-sm text-muted-foreground mt-2">
                (Tarih: {data.reportDate} - Saat {data.reportTime})
              </p>
            </div>

            <div className="space-y-4 text-base leading-relaxed">
              <div>
                <p className="font-semibold">
                  Kapsanan Dönem: {data.startDate} – {data.endDate} (
                  {(parseInt(data.endDate) || 0) -
                    (parseInt(data.startDate) || 0)}{' '}
                  Yıllık Faaliyet ve Mali Dönem)
                </p>
                <p className="mt-2">
                  Denetim Kurulu Başkanı: {data.chairman?.name || 'Seçilmedi'}
                </p>
                <p className="mt-1">
                  Denetim Kurulu Üyeleri:{' '}
                  {data.members.map((m) => m.name).join(', ') || 'Seçilmedi'}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">1. Giriş</h4>
                <p className="text-xs leading-relaxed">
                  {replacePlaceholders(data.giris)}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  2. Defter ve Belgelerin İncelenmesi
                </h4>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {data.defterInceleme.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  3. Gelirlerin İncelenmesi
                </h4>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {data.gelirleriIncelenmesi.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  4. Giderlerin İncelenmesi
                </h4>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {data.giderleriIncelenmesi.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">5. Sonuç ve Öneriler</h4>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {data.sonucOneri.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-xs leading-relaxed mb-4">
                  {replacePlaceholders(data.closingText)}
                </p>
                <div className="text-right mt-6">
                  <p className="text-xs mb-1">Saygılarımızla,</p>
                  <p className="font-semibold">
                    {data.chairman?.name || 'Seçilmedi'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Denetim Kurulu Başkanı
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tarih: {data.reportDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
