'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'

interface CommentRow {
  id: number
  username: string
  comment_text: string
  created_at: string
}

interface FileCommentsPanelProps {
  fileId?: string
  fileName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FileCommentsPanel({ fileId, fileName, open, onOpenChange }: FileCommentsPanelProps) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!fileId) return
    const res = await api.get(`/files/${fileId}/comments`)
    setComments(res.data || [])
  }

  useEffect(() => {
    if (open && fileId) void load()
  }, [open, fileId])

  const post = async () => {
    if (!fileId || !text.trim()) return
    setLoading(true)
    try {
      await api.post(`/files/${fileId}/comments`, { text })
      setText('')
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comments: {fileName || 'File'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment..." rows={3} />
          <Button onClick={post} disabled={loading || !text.trim()}>
            {loading ? 'Posting...' : 'Post Comment'}
          </Button>
          <div className="max-h-72 space-y-2 overflow-auto border rounded p-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded border p-2">
                <div className="text-xs text-muted-foreground">{c.username} - {new Date(c.created_at).toLocaleString()}</div>
                <div className="text-sm">{c.comment_text}</div>
              </div>
            ))}
            {!comments.length && <div className="text-sm text-muted-foreground">No comments yet.</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

