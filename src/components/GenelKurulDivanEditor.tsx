'use client'

import { useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Plus, X, Download } from 'lucide-react'
import { downloadServerPdf } from '@/lib/serverPdf'
import { TurkishPDFGenerator } from '@/lib/pdfGenerator'

interface MemberOption {
  id: string
  name: string
}

interface GenelKurulData {
  meetingDate: string
  meetingTime: string
  meetingLocation: string
  totalMembers: number
  presentMembers: number
  divanBaskanId: string
  divanBaskanName: string
  katipUye1Id: string
  katipUye1Name: string
  katipUye2Id: string
  katipUye2Name: string
  openingText: string
  agendaItems: string[]
  yonetimAsil: string[]
  yonetimYedek: string[]
  denetimAsil: string[]
  denetimYedek: string[]
  closingText: string
}

interface Props {
  initialData?: Partial<GenelKurulData>
  orgName: string
  orgAddress?: string
  totalMemberCount?: number
  availableMembers?: MemberOption[]
}

export function GenelKurulDivanEditor({
  initialData,
  orgName,
  orgAddress = '',
  totalMemberCount = 0,
  availableMembers = [],
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null)

  // Generate current date in DD.MM.YYYY format
  const currentDate = useMemo(() => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}.${month}.${year}`
  }, [])

  // Generate current time in HH:MM format
  const currentTime = useMemo(() => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }, [])

  const [data, setData] = useState<GenelKurulData>({
    meetingDate: initialData?.meetingDate || currentDate,
    meetingTime: initialData?.meetingTime || currentTime,
    meetingLocation: initialData?.meetingLocation || orgAddress,
    totalMembers: initialData?.totalMembers ?? totalMemberCount,
    presentMembers: initialData?.presentMembers ?? totalMemberCount,
    divanBaskanId: initialData?.divanBaskanId || '',
    divanBaskanName: initialData?.divanBaskanName || '',
    katipUye1Id: initialData?.katipUye1Id || '',
    katipUye1Name: initialData?.katipUye1Name || '',
    katipUye2Id: initialData?.katipUye2Id || '',
    katipUye2Name: initialData?.katipUye2Name || '',
    openingText:
      initialData?.openingText ||
      'Yönetim Kurulu Başkanı tarafından açılmıştır. Açılışa müteakiben verilen önerge ile Divan Başkanlığına seçildiğim için teşekkür ederim.',
    agendaItems: initialData?.agendaItems || [
      'Açılış ve Yoklama',
      'Divanın Teşekkülü, Saygı Duruşu ve İstiklal Marşı',
      'Yönetim Kurulu Faaliyet Raporunun, Mali Raporun ve Denetim Kurulu Raporunun okunması müzakere ve ibrası',
      'Yeni Yönetim Kurulunun Seçimi (Gizli Oy, Açık Tasnif)',
      'Dilek, Temenniler ve Kapanış',
    ],
    yonetimAsil: initialData?.yonetimAsil || [],
    yonetimYedek: initialData?.yonetimYedek || [],
    denetimAsil: initialData?.denetimAsil || [],
    denetimYedek: initialData?.denetimYedek || [],
    closingText:
      initialData?.closingText ||
      'Gündemin son maddesi olan dilek ve temennilerde söz alan üyeler sonuçta yeni yönetim kuruluna başarılar diledikten sonra, toplantı aynı gün saat 14.45 de tarafımızca kapatılmıştır.',
  })

  // Helper to handle member selection from dropdown
  const handleMemberSelect = (
    field: 'divanBaskan' | 'katipUye1' | 'katipUye2',
    memberId: string
  ) => {
    const member = availableMembers.find((m) => m.id === memberId)
    if (field === 'divanBaskan') {
      setData((prev) => ({
        ...prev,
        divanBaskanId: memberId,
        divanBaskanName: member?.name || '',
      }))
    } else if (field === 'katipUye1') {
      setData((prev) => ({
        ...prev,
        katipUye1Id: memberId,
        katipUye1Name: member?.name || '',
      }))
    } else if (field === 'katipUye2') {
      setData((prev) => ({
        ...prev,
        katipUye2Id: memberId,
        katipUye2Name: member?.name || '',
      }))
    }
  }

  const updateField = (field: keyof GenelKurulData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const addArrayItem = (field: keyof GenelKurulData) => {
    const current = data[field] as string[]
    setData((prev) => ({ ...prev, [field]: [...current, ''] }))
  }

  const removeArrayItem = (field: keyof GenelKurulData, index: number) => {
    const current = data[field] as string[]
    setData((prev) => ({
      ...prev,
      [field]: current.filter((_, i) => i !== index),
    }))
  }

  const updateArrayItem = (
    field: keyof GenelKurulData,
    index: number,
    value: string
  ) => {
    const current = data[field] as string[]
    const updated = [...current]
    updated[index] = value
    setData((prev) => ({ ...prev, [field]: updated }))
  }

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return

    try {
      const pdfGen = new TurkishPDFGenerator()
      pdfGen.setElement(previewRef.current)
      await pdfGen.generatePDF(
        `genel-kurul-divan-tutanagi-${data.meetingDate}.pdf`
      )
    } catch (error) {
      console.error('PDF oluşturma hatası:', error)
      alert('PDF oluşturulurken bir hata oluştu.')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Toplantı Tarihi</Label>
              <Input
                type="text"
                value={data.meetingDate}
                onChange={(e) => updateField('meetingDate', e.target.value)}
                placeholder="14.12.2025"
              />
            </div>
            <div>
              <Label>Toplantı Saati</Label>
              <Input
                type="text"
                value={data.meetingTime}
                onChange={(e) => updateField('meetingTime', e.target.value)}
                placeholder="14:00"
              />
            </div>
          </div>

          <div>
            <Label>Toplantı Yeri</Label>
            <Textarea
              value={data.meetingLocation}
              onChange={(e) => updateField('meetingLocation', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Toplam Üye Sayısı</Label>
              <Input
                type="number"
                value={data.totalMembers}
                onChange={(e) =>
                  updateField('totalMembers', parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <Label>Katılan Üye Sayısı</Label>
              <Input
                type="number"
                value={data.presentMembers}
                onChange={(e) =>
                  updateField('presentMembers', parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Divan Üyeleri</h3>
          <div>
            <Label>Divan Başkanı</Label>
            <Select
              value={data.divanBaskanId}
              onChange={(e) =>
                handleMemberSelect('divanBaskan', e.target.value)
              }
            >
              <option value="">Üye seçiniz...</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Katip Üye 1</Label>
              <Select
                value={data.katipUye1Id}
                onChange={(e) =>
                  handleMemberSelect('katipUye1', e.target.value)
                }
              >
                <option value="">Üye seçiniz...</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Katip Üye 2</Label>
              <Select
                value={data.katipUye2Id}
                onChange={(e) =>
                  handleMemberSelect('katipUye2', e.target.value)
                }
              >
                <option value="">Üye seçiniz...</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Gündem Maddeleri</h3>
          {data.agendaItems.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  updateArrayItem('agendaItems', index, e.target.value)
                }
                placeholder={`${index + 1}. madde`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('agendaItems', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('agendaItems')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Gündem Maddesi Ekle
          </Button>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Yönetim Kurulu Asil Üyeleri</h3>
          {data.yonetimAsil.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={member}
                onChange={(e) =>
                  updateArrayItem('yonetimAsil', index, e.target.value)
                }
                placeholder={`${index + 1}. Üye`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('yonetimAsil', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('yonetimAsil')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Üye Ekle
          </Button>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Yönetim Kurulu Yedek Üyeleri</h3>
          {data.yonetimYedek.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={member}
                onChange={(e) =>
                  updateArrayItem('yonetimYedek', index, e.target.value)
                }
                placeholder={`${index + 1}. Yedek Üye`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('yonetimYedek', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('yonetimYedek')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yedek Üye Ekle
          </Button>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Denetim Kurulu Asil Üyeleri</h3>
          {data.denetimAsil.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={member}
                onChange={(e) =>
                  updateArrayItem('denetimAsil', index, e.target.value)
                }
                placeholder={`${index + 1}. Üye`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('denetimAsil', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('denetimAsil')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Üye Ekle
          </Button>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold">Denetim Kurulu Yedek Üyeleri</h3>
          {data.denetimYedek.map((member, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={member}
                onChange={(e) =>
                  updateArrayItem('denetimYedek', index, e.target.value)
                }
                placeholder={`${index + 1}. Yedek Üye`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeArrayItem('denetimYedek', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('denetimYedek')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yedek Üye Ekle
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Önizleme</h3>
            <Button
              size="sm"
              onClick={() =>
                downloadServerPdf(
                  `genel-kurul-divan-tutanagi-${data.meetingDate}.pdf`,
                  previewRef.current
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              PDF İndir
            </Button>
          </div>
          <div
            ref={previewRef}
            className="border rounded-lg px-16 py-8 bg-white dark:bg-gray-900 avoid-break print:border-0"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1">
                {orgName.toUpperCase()}
              </h2>
              <h3 className="text-lg font-semibold">
                GENEL KURUL DİVAN TUTANAĞI
              </h3>
            </div>

            <div className="space-y-4 text-base leading-relaxed">
              <p>
                {orgName}&apos;nin {data.meetingDate} Günü saat{' '}
                {data.meetingTime} {data.meetingLocation} adresinde yapılan
                olağan Genel Kurul toplantısında salt çoğunluğun olduğu
                anlaşılıp ({data.totalMembers} Üyeden {data.presentMembers} Üye
                bulundu) {data.openingText}
              </p>

              <div className="border-t pt-3">
                <p className="font-semibold mb-2">
                  Divan Başkanlığına: {data.divanBaskanName || '(Seçilmedi)'}
                </p>
                <p>
                  Katip Üyelikler ise: {data.katipUye1Name || '(Seçilmedi)'} ve{' '}
                  {data.katipUye2Name || '(Seçilmedi)'} Genel Kurulca oybirliği
                  ile seçildiler.
                </p>
              </div>

              <div className="border-t pt-3">
                {data.agendaItems.map((item, index) => (
                  <p key={index} className="font-semibold">
                    {index + 1}-{item}
                  </p>
                ))}
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-1">
                  YÖNETİM KURULU ASIL ÜYELİĞİNE :
                </p>
                <div className="ml-4 space-y-0.5">
                  {data.yonetimAsil.map((member, index) => (
                    <p key={index}>
                      {index + 1}- {member}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-1">
                  YÖNETİM KURULU YEDEK ÜYELİĞİNE :
                </p>
                <div className="ml-4 space-y-0.5">
                  {data.yonetimYedek.map((member, index) => (
                    <p key={index}>
                      {index + 1}- {member}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-1">
                  DENETLEME KURULU ASIL ÜYELİĞİNE :
                </p>
                <div className="ml-4 space-y-0.5">
                  {data.denetimAsil.map((member, index) => (
                    <p key={index}>
                      {index + 1}- {member}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold mb-1">
                  DENETLEME KURULU YEDEK ÜYELİĞİNE :
                </p>
                <div className="ml-4 space-y-0.5">
                  {data.denetimYedek.map((member, index) => (
                    <p key={index}>
                      {index + 1}- {member}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-xs">{data.closingText}</p>
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <p className="text-xs">
                      {data.katipUye1Name || '(Seçilmedi)'}
                    </p>
                    <p className="text-xs">Katip Üye</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs">
                      {data.divanBaskanName || '(Seçilmedi)'}
                    </p>
                    <p className="text-xs">Divan Başkanı</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
