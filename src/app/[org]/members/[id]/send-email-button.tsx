'use client'

import React, { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { EMAIL_TEMPLATES } from '@/lib/email/templates'

interface Props {
  org: string
  memberId: string
  email?: string | null
  memberName: string
}

export const SendEmailButton: React.FC<Props> = ({
  org,
  memberId,
  email,
  memberName,
}) => {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [sending, setSending] = useState(false)
  const { add } = useToast()

  const disabled = !email

  // Handle template selection
  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId)
    if (templateId) {
      const template = EMAIL_TEMPLATES.find((t) => t.id === templateId)
      if (template) {
        setSubject(template.subject)
        setMessage(template.content)
      }
    }
  }

  async function send() {
    if (!subject.trim() || !message.trim()) {
      return add({
        variant: 'error',
        title: 'Eksik bilgi',
        description: 'Lütfen konu ve mesajı doldurun.',
      })
    }

    setSending(true)
    try {
      const res = await fetch(`/api/${org}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          memberIds: [memberId],
        }),
      })

      if (res.ok) {
        add({
          variant: 'success',
          title: 'E-posta gönderildi',
          description: `${memberName} adlı üyeye e-posta başarıyla gönderildi.`,
        })
        setOpen(false)
        setSubject('')
        setMessage('')
        setSelectedTemplate('')
      } else {
        const data = await res.json().catch(() => null)
        add({
          variant: 'error',
          title: 'E-posta gönderilemedi',
          description: data?.error || 'Bir hata oluştu',
        })
      }
    } catch (e: any) {
      add({
        variant: 'error',
        title: 'Ağ hatası',
        description: e?.message || 'Bir hata oluştu',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? 'Bu üyeye ait e-posta adresi yok' : 'E-posta gönder'}
      >
        E-posta Gönder
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded border bg-card shadow-lg">
            <div className="border-b px-4 py-3 font-medium flex items-center justify-between">
              <span>E-posta Gönder - {memberName}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {!email && (
                <p className="text-sm text-red-600">
                  Bu üyeye ait e-posta adresi yok.
                </p>
              )}
              {email && (
                <div className="text-sm text-muted-foreground">
                  Alıcı: <span className="font-medium">{email}</span>
                </div>
              )}

              {/* Template Selector */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  E-posta Şablonu (Opsiyonel)
                </label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm bg-background"
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">-- Şablon Seçin --</option>
                  {EMAIL_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {
                      EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)
                        ?.description
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Konu<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded border px-3 py-2 text-sm bg-background"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E-posta konusu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Mesaj<span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm bg-background min-h-[200px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="E-posta mesajınızı buraya yazın..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 İpucu: Mesajınızda {'{ad}'}, {'{soyad}'} veya {'{tam_ad}'}{' '}
                  kullanarak kişiselleştirme yapabilirsiniz.
                </p>
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                İptal
              </Button>
              <Button onClick={send} disabled={sending || !email}>
                {sending ? 'Gönderiliyor...' : 'Gönder'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
