'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

type Channel = 'SMS' | 'EMAIL'

interface MeetingOption {
  id: string
  title: string
  scheduledAt: string
}

interface Campaign {
  id: string
  name: string
  message: string
  subject?: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  meetingId: string | null
  meeting: MeetingOption | null
  _count: {
    messages: number
  }
}

interface SmsMessageShape {
  id: string
  phone: string
  content: string
  status: string
  error: string | null
  createdAt: string
  sentAt: string | null
  member: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
  } | null
}

interface EmailMessageShape {
  id: string
  email: string
  subject: string
  content: string
  status: string
  error: string | null
  createdAt: string
  sentAt: string | null
  member: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  } | null
}

interface Props {
  org: string
  channel?: Channel
  onChannelChange?: (c: Channel) => void
  initialCampaignId?: string
}

export function CommHistoryList({
  org,
  channel: controlledChannel,
  onChannelChange,
  initialCampaignId,
}: Props) {
  const [internalChannel, setInternalChannel] = useState<Channel>('SMS')
  const channel = controlledChannel ?? internalChannel
  const setChannel = onChannelChange ?? setInternalChannel
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  )
  const [smsMessages, setSmsMessages] = useState<SmsMessageShape[]>([])
  const [emailMessages, setEmailMessages] = useState<EmailMessageShape[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [messagesPage, setMessagesPage] = useState(1)
  const [messagesTotal, setMessagesTotal] = useState(0)
  const [meetings, setMeetings] = useState<MeetingOption[]>([])
  const [assigningCampaignId, setAssigningCampaignId] = useState<string | null>(
    null
  )
  const [pendingCampaignId, setPendingCampaignId] = useState<
    string | undefined
  >(initialCampaignId)
  const { add } = useToast()
  const router = useRouter()

  const limit = 20

  useEffect(() => {
    fetchMeetings()
  }, [org])

  useEffect(() => {
    fetchCampaigns()
    // Reset selection when switching channel
    setSelectedCampaign(null)
    setMessagesPage(1)
    setSmsMessages([])
    setEmailMessages([])
  }, [page, channel])

  async function fetchMeetings() {
    try {
      const res = await fetch(`/api/${org}/meetings`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.items || [])
      }
    } catch (e) {
      console.error('Error fetching meetings:', e)
    }
  }

  async function assignMeeting(campaignId: string, meetingId: string | null) {
    setAssigningCampaignId(campaignId)
    try {
      const res = await fetch(`/api/${org}/campaigns/${campaignId}/meeting`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, channel }),
      })
      if (res.ok) {
        add({
          variant: 'success',
          title: meetingId
            ? 'Toplantıya atandı'
            : 'Toplantı bağlantısı kaldırıldı',
        })
        // Refresh campaigns to get updated meeting info
        await fetchCampaigns()
      } else {
        const data = await res.json()
        add({
          variant: 'error',
          title: 'Hata',
          description: data.error || 'Atama yapılamadı',
        })
      }
    } catch (e) {
      console.error(e)
      add({ variant: 'error', title: 'Hata', description: 'Ağ hatası' })
    } finally {
      setAssigningCampaignId(null)
    }
  }

  useEffect(() => {
    if (selectedCampaign) {
      fetchMessages()
    }
  }, [selectedCampaign, messagesPage, channel])

  // Auto-select campaign if pendingCampaignId is set and campaigns are loaded
  useEffect(() => {
    if (pendingCampaignId && campaigns.length > 0 && !selectedCampaign) {
      const campaign = campaigns.find((c) => c.id === pendingCampaignId)
      if (campaign) {
        setSelectedCampaign(campaign)
        setPendingCampaignId(undefined)
      }
    }
  }, [campaigns, pendingCampaignId, selectedCampaign])

  async function fetchCampaigns() {
    setLoading(true)
    try {
      const url =
        channel === 'SMS'
          ? `/api/${org}/sms/history?page=${page}&limit=${limit}`
          : `/api/${org}/email/history?page=${page}&limit=${limit}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setTotal(data.pagination?.total || 0)
      } else {
        add({
          variant: 'error',
          title: 'Hata',
          description:
            channel === 'SMS'
              ? 'SMS geçmişi yüklenemedi'
              : 'E-posta geçmişi yüklenemedi',
        })
      }
    } catch (e) {
      console.error(e)
      add({ variant: 'error', title: 'Hata', description: 'Ağ hatası' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages() {
    if (!selectedCampaign) return
    setMessagesLoading(true)
    try {
      const base = channel === 'SMS' ? 'sms' : 'email'
      const res = await fetch(
        `/api/${org}/${base}/history?page=${messagesPage}&limit=${limit}&campaignId=${selectedCampaign.id}`
      )
      if (res.ok) {
        const data = await res.json()
        if (channel === 'SMS') {
          setSmsMessages(data.messages || [])
        } else {
          setEmailMessages(data.messages || [])
        }
        setMessagesTotal(data.pagination?.total || 0)
      } else {
        add({
          variant: 'error',
          title: 'Hata',
          description: 'Mesajlar yüklenemedi',
        })
      }
    } catch (e) {
      console.error(e)
      add({ variant: 'error', title: 'Hata', description: 'Ağ hatası' })
    } finally {
      setMessagesLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const classes: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      SENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      COMPLETED:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      PENDING:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      SENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    }
    const labels: Record<string, string> = {
      DRAFT: 'Taslak',
      SENDING: 'Gönderiliyor',
      COMPLETED: 'Tamamlandı',
      FAILED: 'Başarısız',
      PENDING: 'Bekliyor',
      SENT: 'Gönderildi',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status] || classes.DRAFT}`}
      >
        {labels[status] || status}
      </span>
    )
  }

  function formatDate(date: string | null) {
    if (!date) return '-'
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    )
  }

  if (selectedCampaign) {
    return (
      <div className="space-y-4">
        {/* Header with back and channel toggle */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCampaign(null)
                    setSmsMessages([])
                    setEmailMessages([])
                    setMessagesPage(1)
                  }}
                >
                  ← Geri
                </Button>
                <h2 className="text-xl font-semibold">
                  {selectedCampaign.name}
                </h2>
                {getStatusBadge(selectedCampaign.status)}
              </div>
              {selectedCampaign.subject && (
                <p className="text-sm text-muted-foreground mb-1">
                  Konu: {selectedCampaign.subject}
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-3">
                {selectedCampaign.message}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Toplam Alıcı</div>
                  <div className="font-medium">
                    {selectedCampaign.totalRecipients}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gönderilen</div>
                  <div className="font-medium text-green-600">
                    {selectedCampaign.sentCount}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Başarısız</div>
                  <div className="font-medium text-red-600">
                    {selectedCampaign.failedCount}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Oluşturulma</div>
                  <div className="font-medium">
                    {formatDate(selectedCampaign.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            {/* Channel is controlled by parent shell (icons above) */}
          </div>
        </div>

        {/* Messages Table */}
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Alıcı
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    {channel === 'SMS' ? 'Telefon' : 'E-posta'}
                  </th>
                  {channel === 'EMAIL' && (
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Konu
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Gönderilme
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Hata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {messagesLoading ? (
                  <tr>
                    <td
                      colSpan={channel === 'EMAIL' ? 6 : 5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Yükleniyor...
                    </td>
                  </tr>
                ) : (channel === 'SMS' ? smsMessages : emailMessages).length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={channel === 'EMAIL' ? 6 : 5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Mesaj bulunamadı
                    </td>
                  </tr>
                ) : channel === 'SMS' ? (
                  smsMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        {msg.member
                          ? `${msg.member.firstName} ${msg.member.lastName}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {msg.phone}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(msg.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(msg.sentAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {msg.error ? (
                          <span
                            className="text-xs text-red-600"
                            title={msg.error}
                          >
                            {msg.error.substring(0, 30)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  emailMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        {msg.member
                          ? `${msg.member.firstName} ${msg.member.lastName}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {msg.email}
                      </td>
                      <td className="px-4 py-3 text-sm">{msg.subject}</td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(msg.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(msg.sentAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {msg.error ? (
                          <span
                            className="text-xs text-red-600"
                            title={msg.error}
                          >
                            {msg.error.substring(0, 30)}...
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Messages Pagination */}
          {messagesTotal > limit && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {messagesTotal} mesajdan {(messagesPage - 1) * limit + 1}-
                {Math.min(messagesPage * limit, messagesTotal)} arası
                gösteriliyor
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessagesPage((p) => Math.max(1, p - 1))}
                  disabled={messagesPage === 1}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMessagesPage((p) =>
                      Math.min(Math.ceil(messagesTotal / limit), p + 1)
                    )
                  }
                  disabled={messagesPage >= Math.ceil(messagesTotal / limit)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Channel is controlled by parent shell (icons above) */}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">
            Henüz {channel === 'SMS' ? 'SMS' : 'e-posta'} gönderilmemiş
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Üyeler sayfasından toplu {channel === 'SMS' ? 'SMS' : 'e-posta'}{' '}
            göndererek başlayın
          </p>
          <Button onClick={() => router.push(`/${org}/members`)}>
            Üyeler Sayfasına Git
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Mesaj İçeriği
                  </th>
                  {channel === 'EMAIL' && (
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Konu
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Alıcı
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Gönderilen
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Başarısız
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Toplantı
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="text-sm font-light line-clamp-2">
                        {campaign.message}
                      </div>
                    </td>
                    {channel === 'EMAIL' && (
                      <td className="px-4 py-3 text-sm">{campaign.subject}</td>
                    )}
                    <td className="px-4 py-3">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {campaign.totalRecipients}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">
                      {campaign.sentCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {campaign.failedCount}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(campaign.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="text-sm border rounded px-2 py-1 bg-background min-w-[150px]"
                        value={campaign.meetingId || ''}
                        disabled={assigningCampaignId === campaign.id}
                        onChange={(e) => {
                          const value = e.target.value || null
                          assignMeeting(campaign.id, value)
                        }}
                      >
                        <option value="">Toplantı seçin...</option>
                        {meetings.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} (
                            {new Date(m.scheduledAt).toLocaleDateString(
                              'tr-TR'
                            )}
                            )
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign)
                          setMessagesPage(1)
                        }}
                      >
                        Detay
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {total} kampanyadan {(page - 1) * limit + 1}-
                {Math.min(page * limit, total)} arası gösteriliyor
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(Math.ceil(total / limit), p + 1))
                  }
                  disabled={page >= Math.ceil(total / limit)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
