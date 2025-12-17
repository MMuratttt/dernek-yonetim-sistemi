'use client'

import React, { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SMS_TEMPLATES } from '@/lib/sms/templates'

interface Props {
  org: string
  memberIds: string[]
  onClose: () => void
  onSuccess?: () => void
}

// Bulk SMS Modal Component
export const BulkSmsModal: React.FC<Props> = ({
  org,
  memberIds,
  onClose,
  onSuccess,
}) => {
  const [message, setMessage] = useState('')
  const [personalize, setPersonalize] = useState(true)
  const [sending, setSending] = useState(false)
  const [membersWithoutPhone, setMembersWithoutPhone] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const { add } = useToast()

  // Check which selected members don't have phone numbers
  React.useEffect(() => {
    async function checkPhones() {
      try {
        // Fetch member details for the selected members only
        const promises = memberIds.map((id) =>
          fetch(`/api/${org}/members/${id}`).then((r) =>
            r.ok ? r.json() : null
          )
        )
        const results = await Promise.all(promises)
        console.log('Members fetched:', results)
        const withoutPhone = results
          .filter((m) => m && m.item && !m.item.phone)
          .map((m) => ({
            id: m.item.id,
            firstName: m.item.firstName || '',
            lastName: m.item.lastName || '',
          }))
        console.log('Members without phone:', withoutPhone)
        setMembersWithoutPhone(withoutPhone)
      } catch (e) {
        console.error('Error fetching members:', e)
      }
    }
    checkPhones()
  }, [org, memberIds])

  // Handle template selection
  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId)
    if (templateId) {
      const template = SMS_TEMPLATES.find((t) => t.id === templateId)
      if (template) {
        setMessage(template.content)
        setPersonalize(true)
      }
    }
  }

  async function send() {
    if (!message.trim()) {
      return add({
        variant: 'error',
        title: 'Mesaj boş',
        description: 'Lütfen mesajınızı yazın.',
      })
    }
    setSending(true)
    try {
      const res = await fetch(`/api/${org}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          memberIds,
          personalize,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        add({
          variant: 'success',
          title: 'SMS gönderildi',
          description: `${data.sent || memberIds.length} üyeye SMS gönderildi.`,
        })
        onSuccess?.()
        onClose()
      } else {
        add({
          variant: 'error',
          title: 'SMS gönderilemedi',
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
      <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-lg">Toplu SMS Gönder</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {memberIds.length} üye seçildi
          </p>
        </div>
        <div className="p-4 space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium mb-1">
              SMS Şablonu (Opsiyonel)
            </label>
            <select
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="">-- Şablon Seçin --</option>
              {SMS_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground mt-1">
                {
                  SMS_TEMPLATES.find((t) => t.id === selectedTemplate)
                    ?.description
                }
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Mesaj <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              rows={6}
              placeholder="Mesajınızı yazın..."
              value={message}
              maxLength={612}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>{message.length} / 612 karakter</span>
              <span>{Math.ceil(message.length / 153) || 1} SMS</span>
            </div>
          </div>

          {/* Personalization */}
          <div className="rounded border p-3 bg-muted/30">
            <div className="flex items-start gap-2">
              <Checkbox
                id="personalize"
                checked={personalize}
                onChange={(e) => setPersonalize(e.target.checked)}
              />
              <div className="flex-1">
                <label
                  htmlFor="personalize"
                  className="text-sm font-medium cursor-pointer"
                >
                  Mesajı kişiselleştir
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Mesajınızda{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">{`{{ad}}`}</code>
                  ,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">{`{{soyad}}`}</code>{' '}
                  veya{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">{`{{tam_ad}}`}</code>{' '}
                  kullanabilirsiniz.
                </p>
                {personalize && (
                  <div className="mt-2 p-2 bg-card rounded text-xs">
                    <strong>Örnek:</strong>
                    <p className="mt-1 text-muted-foreground">
                      &quot;Sayın {`{{tam_ad}}`}, genel kurul
                      toplantımız...&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning for members without phone */}
          {membersWithoutPhone.length > 0 && (
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
                    Telefon Numarası Olmayan Üyeler
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 mb-2">
                    Aşağıdaki üyelere SMS gönderilemeyecek:
                  </p>
                  <ul className="space-y-1 text-yellow-700 dark:text-yellow-400 list-none">
                    {membersWithoutPhone.map((member, index) => (
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

          {/* Warning */}
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
              <div className="text-xs">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  Dikkat
                </p>
                <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                  Bu işlem geri alınamaz.{' '}
                  {memberIds.length - membersWithoutPhone.length} üyeye SMS
                  gönderilecektir. Lütfen mesajınızı kontrol edin.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
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
              disabled={sending || !message.trim()}
            >
              {sending
                ? 'Gönderiliyor...'
                : `${memberIds.length - membersWithoutPhone.length} Üyeye Gönder`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
