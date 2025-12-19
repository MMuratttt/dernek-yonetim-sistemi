'use client'

import { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import { downloadServerPdf } from '@/lib/serverPdf'
import { TurkishPDFGenerator } from '@/lib/pdfGenerator'

interface FormEditorProps {
  orgName: string
  orgAddress: string | null
  chairmanName: string | null
}

export default function FormEditor({
  orgName,
  orgAddress,
  chairmanName,
}: FormEditorProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    tcNo: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    signatureDate: new Date().toLocaleDateString('tr-TR'),
    decisionDate: '',
    decisionNo: '',
    accepted: false,
    rejected: false,
  })

  const previewRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCheckboxChange = (field: 'accepted' | 'rejected') => {
    setFormData((prev) => ({
      ...prev,
      accepted: field === 'accepted' ? !prev.accepted : false,
      rejected: field === 'rejected' ? !prev.rejected : false,
    }))
  }

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return

    try {
      const pdfGen = new TurkishPDFGenerator()
      pdfGen.setElement(previewRef.current)
      await pdfGen.generatePDF(
        `uyelik-basvuru-formu-${formData.fullName || 'bos'}.pdf`
      )
    } catch (error) {
      console.error('PDF oluşturma hatası:', error)
      alert('PDF oluşturulurken bir hata oluştu.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Form Bilgileri</CardTitle>
          <CardDescription>Bilgileri girerek formu doldurun</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Adı Soyadı</label>
            <Input
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Adınızı ve soyadınızı girin"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              T.C. Kimlik No
            </label>
            <Input
              value={formData.tcNo}
              onChange={(e) => handleInputChange('tcNo', e.target.value)}
              placeholder="11 haneli TC kimlik numaranız"
              maxLength={11}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Doğum Tarihi
            </label>
            <Input
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Telefon (GSM)
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="05XX XXX XX XX"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">E-Posta</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Adres</label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Tam adresinizi girin"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">
              Yönetim Kurulu Kararı
            </h4>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.accepted}
                    onChange={() => handleCheckboxChange('accepted')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">KABUL EDİLDİ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rejected}
                    onChange={() => handleCheckboxChange('rejected')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">REDDEDİLDİ</span>
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Karar Tarihi
                </label>
                <Input
                  type="date"
                  value={formData.decisionDate}
                  onChange={(e) =>
                    handleInputChange('decisionDate', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Karar No
                </label>
                <Input
                  value={formData.decisionNo}
                  onChange={(e) =>
                    handleInputChange('decisionNo', e.target.value)
                  }
                  placeholder="Karar numarası"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={() =>
                downloadServerPdf(
                  `uyelik-basvuru-formu-${formData.fullName || 'bos'}.pdf`,
                  previewRef.current
                )
              }
              className="w-full"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF İndir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Önizleme</CardTitle>
            <CardDescription>Form bu şekilde indirilecek</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={previewRef}
              className="border rounded-lg px-12 py-6 bg-white print:border-0"
              style={{ color: '#000000' }}
            >
              <div className="text-center mb-4">
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: '#000000' }}
                >
                  {orgName}
                </h2>
                <h3
                  className="text-base font-semibold"
                  style={{ color: '#000000' }}
                >
                  ÜYELİK BAŞVURU FORMU
                </h3>
              </div>

              <div
                className="space-y-3 text-base leading-relaxed"
                style={{ color: '#000000' }}
              >
                <div
                  className="border-b pb-2"
                  style={{ borderColor: '#000000' }}
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: '#000000' }}
                  >
                    1. KİŞİSEL BİLGİLER
                  </h4>
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        Adı Soyadı:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.fullName}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        T.C. Kimlik No:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.tcNo}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        Doğum Tarihi:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.birthDate}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        Telefon (GSM):
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.phone}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        E-Posta:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.email}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span style={{ color: '#000000' }}>Adres:</span>
                      <div
                        className="min-h-[20px]"
                        style={{ color: '#000000' }}
                      >
                        {formData.address}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="border-b pb-2"
                  style={{ borderColor: '#000000' }}
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: '#000000' }}
                  >
                    2. BEYAN
                  </h4>
                  <p
                    className="text-xs leading-snug"
                    style={{ color: '#000000' }}
                  >
                    {orgName} derneğinin tüzüğünü okuduğum, kabul ettiğim ve bu
                    dernek amaçları doğrultusunda çalışmayı kabul ve taahhüt
                    ederim.
                  </p>
                </div>

                <div
                  className="border-b pb-2"
                  style={{ borderColor: '#000000' }}
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: '#000000' }}
                  >
                    3. BAŞVURU SAHİBİNİN
                  </h4>
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        Adı Soyadı:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.fullName}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        Tarih:
                      </span>
                      <span className="flex-1" style={{ color: '#000000' }}>
                        {formData.signatureDate}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32" style={{ color: '#000000' }}>
                        İmza:
                      </span>
                      <span
                        className="flex-1"
                        style={{ color: '#000000' }}
                      ></span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: '#000000' }}
                  >
                    4. YÖNETİM KURULU KARARI
                  </h4>
                  <div className="space-y-1">
                    <p className="text-xs" style={{ color: '#000000' }}>
                      Başvuru sahibinin üyeliği yönetim kurulu tarafından:
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 border flex items-center justify-center"
                          style={{ borderColor: '#000000', color: '#000000' }}
                        >
                          {formData.accepted && '✓'}
                        </span>
                        <span style={{ color: '#000000' }}>KABUL EDİLDİ</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 border flex items-center justify-center"
                          style={{ borderColor: '#000000', color: '#000000' }}
                        >
                          {formData.rejected && '✓'}
                        </span>
                        <span style={{ color: '#000000' }}>REDDEDİLDİ</span>
                      </label>
                    </div>
                    <div className="space-y-1 mt-4">
                      <div className="flex">
                        <span className="w-32" style={{ color: '#000000' }}>
                          Karar Tarihi:
                        </span>
                        <span className="flex-1" style={{ color: '#000000' }}>
                          {formData.decisionDate}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-32" style={{ color: '#000000' }}>
                          Karar No:
                        </span>
                        <span className="flex-1" style={{ color: '#000000' }}>
                          {formData.decisionNo}
                        </span>
                      </div>
                      <div className="space-y-1 mt-4">
                        <span className="text-xs" style={{ color: '#000000' }}>
                          Yönetim Kurulu Başkanı:
                        </span>
                        <div
                          className="font-medium"
                          style={{ color: '#000000' }}
                        >
                          {chairmanName || '______________________'}
                        </div>
                        <span className="text-xs" style={{ color: '#000000' }}>
                          (İmza)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
