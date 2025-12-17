'use client'

import React, { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { EMAIL_TEMPLATES } from '@/lib/email/templates'

interface Props {
  org: string
  memberIds: string[]
  onClose: () => void
  onSuccess?: () => void
}

// Bulk Email Modal Component
export const BulkEmailModal: React.FC<Props> = ({
  org,
  memberIds,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [membersWithoutEmail, setMembersWithoutEmail] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const { add } = useToast()

  // Check which selected members don't have email addresses
  React.useEffect(() => {
    async function checkEmails() {
      try {
        // Fetch member details for the selected members only
        const promises = memberIds.map((id) =>
          fetch(`/api/${org}/members/${id}`).then((r) =>
            r.ok ? r.json() : null
          )
        )
        const results = await Promise.all(promises)
        const withoutEmail = results
          .filter((m) => m && m.item && !m.item.email)
          .map((m) => ({
            id: m.item.id,
            firstName: m.item.firstName || '',
            lastName: m.item.lastName || '',
          }))
        setMembersWithoutEmail(withoutEmail)
      } catch (e) {
        console.error('Error fetching members:', e)
      }
    }
    checkEmails()
  }, [org, memberIds])

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
    if (!subject.trim()) {
      return add({
        variant: 'error',
        title: 'Konu boş',
        description: 'Lütfen e-posta konusunu yazın.',
      })
    }
    if (!message.trim()) {
      return add({
        variant: 'error',
        title: 'Mesaj boş',
        description: 'Lütfen mesajınızı yazın.',
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
          memberIds,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        add({
          variant: 'success',
          title: 'E-posta gönderildi',
          description: `${data.sent || 0} üyeye e-posta başarıyla gönderildi.`,
        })
        onSuccess?.()
        onClose()
      } else {
        add({
          variant: 'error',
          title: 'E-posta gönderilemedi',
          description: data?.error || data?.detail,
        })
      }
    } catch (e: any) {
      add({ variant: 'error', title: 'Ağ hatası', description: e?.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b px-4 py-3 sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Toplu E-posta Gönder</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {memberIds.length} üye seçildi
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
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

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Konu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              placeholder="E-posta konusu"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Mesaj <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              rows={10}
              placeholder="E-posta mesajınızı buraya yazın..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 İpucu: Mesajınızda {'{ad}'}, {'{soyad}'} veya {'{tam_ad}'}{' '}
              kullanarak kişiselleştirme yapabilirsiniz.
            </p>
          </div>

          {/* Personalization Example */}
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-xs">
              <p className="font-medium mb-2">Kişiselleştirme Örneği:</p>
              <div className="bg-card rounded p-2">
                <p className="text-muted-foreground">
                  &quot;Sayın {'{tam_ad}'}, derneğimizin toplantısına davet
                  ediliyorsunuz...&quot;
                </p>
              </div>
              <p className="text-muted-foreground mt-2">
                Her üyeye gönderilirken {'{tam_ad}'} otomatik olarak üyenin adı
                ve soyadı ile değiştirilir.
              </p>
            </div>
          </div>

          {/* Warning for members without email */}
          {membersWithoutEmail.length > 0 && (
            <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-xs flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    E-posta Adresi Olmayan Üyeler
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 mb-2">
                    Aşağıdaki üyelere e-posta gönderilemeyecek:
                  </p>
                  <ul className="space-y-1 text-yellow-700 dark:text-yellow-400 list-none max-h-32 overflow-y-auto">
                    {membersWithoutEmail.map((member, index) => (
                      <li key={member.id || `member-${index}`}>
                        •{' '}
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.id || `Üye ${index + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info Warning */}
          <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  Bilgi
                </p>
                <p className="text-blue-700 dark:text-blue-400 mt-1">
                  Bu işlem geri alınamaz.{' '}
                  {memberIds.length - membersWithoutEmail.length} üyeye e-posta
                  gönderilecektir. Lütfen konu ve mesajınızı kontrol edin.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card pb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={sending}
            >
              İptal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={send}
              disabled={
                sending ||
                !subject.trim() ||
                !message.trim() ||
                memberIds.length - membersWithoutEmail.length === 0
              }
            >
              {sending
                ? 'Gönderiliyor...'
                : `${memberIds.length - membersWithoutEmail.length} Üyeye Gönder`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
