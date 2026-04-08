'use client'

type OutgoingShare = {
  shareId?: number
  fileName?: string
  recipientUsername?: string
  recipientWallet?: string | null
  role?: string
}

export function OutgoingSharesPanel({ items }: { items: OutgoingShare[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-lg font-semibold">Files You Shared</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        See which files were shared to which users and their assigned role.
      </p>
      <div className="max-h-80 space-y-2 overflow-auto">
        {items.length ? (
          items.map((s, idx) => (
            <div key={s.shareId || idx} className="rounded border p-3 text-sm">
              <div className="font-medium">{s.fileName || 'File'}</div>
              <div className="text-muted-foreground">
                Shared to <span className="font-medium text-foreground">{s.recipientUsername || 'Unknown'}</span>
                {s.recipientWallet ? ` (${s.recipientWallet.slice(0, 6)}...${s.recipientWallet.slice(-4)})` : ''}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Role: <span className="font-medium text-foreground">{s.role || 'viewer'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No outgoing shares yet.</div>
        )}
      </div>
    </div>
  )
}
