'use client'

type CommentNotification = {
  commentId?: number
  fileName?: string
  commenterUsername?: string
  text?: string
}

export function CommentNotificationsPanel({ items }: { items: CommentNotification[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-lg font-semibold">Comment Notifications</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Recent comments from other users on files you own.
      </p>
      <div className="max-h-80 space-y-2 overflow-auto">
        {items.length ? (
          items.map((n, idx) => (
            <div key={n.commentId || idx} className="rounded border p-3 text-sm">
              <div className="font-medium">{n.fileName || 'File'}</div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{n.commenterUsername || 'Unknown'}</span> commented
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.text}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No new comments yet.</div>
        )}
      </div>
    </div>
  )
}
