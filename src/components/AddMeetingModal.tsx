'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import {
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  requiresInterval,
} from '@/lib/meetings'

interface AddMeetingModalProps {
  org: string
  onClose: () => void
  onSuccess: (meeting: any) => void
}

export default function AddMeetingModal({
  org,
  onClose,
  onSuccess,
}: AddMeetingModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>(MEETING_TYPES.OLAGANÜSTÜ_GENEL_KURUL)
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [intervalYears, setIntervalYears] = useState<number>(3)
  const [divanTutanagiFile, setDivanTutanagiFile] = useState<File | null>(null)
  const [hazirunListesiFile, setHazirunListesiFile] = useState<File | null>(
    null
  )
  const [faaliyetRaporuFile, setFaaliyetRaporuFile] = useState<File | null>(
    null
  )
  const [denetimKuruluRaporuFile, setDenetimKuruluRaporuFile] =
    useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showIntervalPrompt, setShowIntervalPrompt] = useState(false)
  const [isFirstOlaganMeeting, setIsFirstOlaganMeeting] = useState(false)

  // Check if this is the first OLAGAN_GENEL_KURUL when type changes
  useEffect(() => {
    if (type === MEETING_TYPES.OLAGAN_GENEL_KURUL) {
      checkFirstOlaganMeeting()
    } else {
      setShowIntervalPrompt(false)
      setIsFirstOlaganMeeting(false)
    }
  }, [type, org])

  async function checkFirstOlaganMeeting() {
    try {
      const res = await fetch(`/api/${org}/meetings?type=OLAGAN_GENEL_KURUL`)
      if (res.ok) {
        const data = await res.json()
        const hasExisting = data.items && data.items.length > 0
        setIsFirstOlaganMeeting(!hasExisting)
        setShowIntervalPrompt(!hasExisting)
      }
    } catch (e) {
      console.error('Error checking existing meetings:', e)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!title || !scheduledAt) {
        setError('Lütfen başlık ve tarih girin.')
        setLoading(false)
        return
      }

      // Create meeting
      const meetingData: any = {
        title,
        type,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location,
        description,
      }

      // Add interval if it's the first OLAGAN_GENEL_KURUL
      if (type === MEETING_TYPES.OLAGAN_GENEL_KURUL && isFirstOlaganMeeting) {
        meetingData.intervalYears = intervalYears
      }

      const res = await fetch(`/api/${org}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Toplantı oluşturulamadı')
        setLoading(false)
        return
      }

      const { item: newMeeting } = await res.json()

      // Upload documents if any
      await uploadDocuments(newMeeting.id)

      onSuccess(newMeeting)
    } catch (e: any) {
      console.error('Error creating meeting:', e)
      setError('Bir hata oluştu')
      setLoading(false)
    }
  }

  async function uploadDocuments(meetingId: string) {
    const documents = [
      { file: divanTutanagiFile, type: 'DIVAN_TUTANAGI' },
      { file: hazirunListesiFile, type: 'HAZIRUN_LISTESI' },
      { file: faaliyetRaporuFile, type: 'FAALIYET_RAPORU' },
      { file: denetimKuruluRaporuFile, type: 'DENETIM_KURULU_RAPORU' },
    ]

    for (const { file, type } of documents) {
      if (!file) continue

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', type)

      try {
        await fetch(`/api/${org}/meetings/${meetingId}/documents`, {
          method: 'POST',
          body: formData,
        })
      } catch (e) {
        console.error(`Error uploading ${type}:`, e)
      }
    }
  }

  function validateAndSetFile(
    file: File | null,
    setter: (file: File | null) => void
  ) {
    if (!file) {
      setter(null)
      return
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)) {
      setter(file)
      setError('')
    } else {
      setError(
        'Geçersiz dosya türü. Sadece PDF, Word ve Excel dosyaları kabul edilir.'
      )
      setter(null)
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) {
    const file = e.target.files?.[0] || null
    validateAndSetFile(file, setter)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Toplantı Ekle</DialogTitle>
          <DialogDescription>
            Toplantı bilgilerini girin ve belgeleri yükleyin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Toplantı Türü *</Label>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value={MEETING_TYPES.OLAGAN_GENEL_KURUL}>
                {MEETING_TYPE_LABELS.OLAGAN_GENEL_KURUL}
              </option>
              <option value={MEETING_TYPES.OLAGANÜSTÜ_GENEL_KURUL}>
                {MEETING_TYPE_LABELS.OLAGANÜSTÜ_GENEL_KURUL}
              </option>
            </Select>
            {type === MEETING_TYPES.OLAGAN_GENEL_KURUL &&
              !isFirstOlaganMeeting && (
                <p className="text-xs text-muted-foreground">
                  Not: Olağan Genel Kurul toplantısı belirlenen aralıkta bir kez
                  yapılabilir.
                </p>
              )}
          </div>

          {showIntervalPrompt && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <Label htmlFor="intervalYears">
                Olağan Genel Kurul Aralığı (Yıl) *
              </Label>
              <Select
                id="intervalYears"
                value={intervalYears.toString()}
                onChange={(e) => setIntervalYears(parseInt(e.target.value))}
              >
                <option value="2">2 Yıl</option>
                <option value="3">3 Yıl</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                İlk Olağan Genel Kurul toplantısı için aralık belirtmeniz
                gerekmektedir. Bu ayar gelecekteki toplantılar için de geçerli
                olacaktır.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Başlık *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: 2025 Olağan Genel Kurul"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Tarih ve Saat *</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Konum</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Dernek Merkezi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Toplantı hakkında ek bilgiler..."
              rows={3}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm">Toplantı Belgeleri</h3>

            <div className="space-y-2">
              <Label htmlFor="divanTutanagi">Genel Kurul Divan Tutanağı</Label>
              <Input
                id="divanTutanagi"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileChange(e, setDivanTutanagiFile)}
              />
              {divanTutanagiFile && (
                <p className="text-sm text-muted-foreground">
                  Seçilen: {divanTutanagiFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hazirunListesi">Hazirun Listesi</Label>
              <Input
                id="hazirunListesi"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileChange(e, setHazirunListesiFile)}
              />
              {hazirunListesiFile && (
                <p className="text-sm text-muted-foreground">
                  Seçilen: {hazirunListesiFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="faaliyetRaporu">Faaliyet Raporu</Label>
              <Input
                id="faaliyetRaporu"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileChange(e, setFaaliyetRaporuFile)}
              />
              {faaliyetRaporuFile && (
                <p className="text-sm text-muted-foreground">
                  Seçilen: {faaliyetRaporuFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="denetimKuruluRaporu">Denetim Kurulu Raporu</Label>
              <Input
                id="denetimKuruluRaporu"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) =>
                  handleFileChange(e, setDenetimKuruluRaporuFile)
                }
              />
              {denetimKuruluRaporuFile && (
                <p className="text-sm text-muted-foreground">
                  Seçilen: {denetimKuruluRaporuFile.name}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Oluşturuluyor...' : 'Toplantı Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
