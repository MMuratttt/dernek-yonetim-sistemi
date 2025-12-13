'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import AddMeetingModal from '@/components/AddMeetingModal'
import { getMeetingTypeLabel, getMeetingStatusLabel } from '@/lib/meetings'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function MeetingsClient({
  org,
  canWrite,
  initialItems,
}: {
  org: string
  canWrite: boolean
  initialItems: any[]
}) {
  const [items, setItems] = useState(initialItems)
  const [showAddModal, setShowAddModal] = useState(false)

  async function handleMeetingCreated(newMeeting: any) {
    setItems([newMeeting, ...items])
    setShowAddModal(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Toplantılar</h2>
        {canWrite && (
          <Button onClick={() => setShowAddModal(true)} size="lg">
            + Toplantı Ekle
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Henüz toplantı eklenmemiş.
          {canWrite && (
            <div className="mt-4">
              <Button onClick={() => setShowAddModal(true)}>
                İlk Toplantıyı Ekle
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">{meeting.title}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {getMeetingTypeLabel(meeting.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(meeting.scheduledAt).toLocaleString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{meeting.location || '-'}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {getMeetingStatusLabel(meeting.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/${org}/meetings/${meeting.id}`}>
                      <Button variant="ghost" size="sm">
                        Detay
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {showAddModal && (
        <AddMeetingModal
          org={org}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMeetingCreated}
        />
      )}
    </div>
  )
}
