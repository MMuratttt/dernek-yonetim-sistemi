'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2 } from 'lucide-react'

interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

interface Props {
  org: string
  memberId: string
}

export const MemberNotes: React.FC<Props> = ({ org, memberId }) => {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [initial, setInitial] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadNotes() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${org}/members/${memberId}/notes`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
      }
    } finally {
      setLoading(false)
      setInitial(false)
    }
  }

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, org])

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/${org}/members/${memberId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setNotes((prev) => [data.note, ...prev])
        setNewNote('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (deletingId) return

    setDeletingId(noteId)
    try {
      const res = await fetch(
        `/api/${org}/members/${memberId}/notes?noteId=${noteId}`,
        {
          method: 'DELETE',
        }
      )
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="text-sm">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="mb-4">
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Yeni not ekle..."
            className="flex-1 min-h-[60px] p-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={submitting}
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !newNote.trim()}
          >
            {submitting ? 'Ekleniyor...' : 'Not Ekle'}
          </Button>
        </div>
      </form>

      {/* Notes List */}
      {initial && loading && (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {!initial && notes.length === 0 && (
        <div className="text-muted-foreground text-center py-4">
          Henüz not eklenmemiş.
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(note.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={deletingId === note.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MemberNotes
