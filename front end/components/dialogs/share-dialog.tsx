'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EXPIRY_OPTIONS = [
  { label: 'No time limit', value: 'none' },
  { label: '1 hour', value: '1' },
  { label: '6 hours', value: '6' },
  { label: '12 hours', value: '12' },
  { label: '24 hours (1 day)', value: '24' },
  { label: '3 days', value: '72' },
  { label: '7 days', value: '168' },
]

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName?: string
  onShare: (target: string, role: 'viewer' | 'editor', options?: { skipUncached?: boolean; expiresInHours?: number | null }) => Promise<void>
  progressLabel?: string
  progressPercent?: number
}

export function ShareDialog({
  open,
  onOpenChange,
  itemName,
  onShare,
  progressLabel,
  progressPercent = 0,
}: ShareDialogProps) {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer')
  const [skipUncached, setSkipUncached] = useState(true)
  const [expiryHours, setExpiryHours] = useState('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (!username.trim()) {
      setError('Username or wallet address is required')
      return
    }

    const expiresInHours = expiryHours && expiryHours !== 'none' ? Number(expiryHours) : null

    try {
      setLoading(true)
      setError('')
      await onShare(username.trim(), role, { skipUncached, expiresInHours })
      onOpenChange(false)
      setUsername('')
      setRole('viewer')
      setExpiryHours('none')
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Failed to share file')
    } finally {
      setLoading(false)
    }
  }

  const selectedExpiry = EXPIRY_OPTIONS.find((o) => o.value === expiryHours)
  const hasExpiry = Boolean(expiryHours) && expiryHours !== 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Share {itemName ? 'Item' : 'Drive'}</DialogTitle>
          <DialogDescription>
            {itemName
              ? `Grant access to "${itemName}" to another user or wallet address.`
              : 'Grant access to your whole drive (all your files) to another user or wallet address.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="share-username">User or Wallet Address</Label>
            <Input
              id="share-username"
              placeholder="Enter username or 0x..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="share-role">Role</Label>
            <Select value={role} onValueChange={(v: string) => setRole(v as 'viewer' | 'editor')}>
              <SelectTrigger id="share-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Picker */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="share-expiry">Auto-delete after</Label>
            <Select value={expiryHours} onValueChange={setExpiryHours}>
              <SelectTrigger id="share-expiry">
                <SelectValue placeholder="No time limit" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || '__none'} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Warning Banner */}
          {hasExpiry && (
            <div className="col-span-4 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <span className="mt-0.5 text-base leading-none">⚠️</span>
              <span>
                <strong>File will be permanently deleted</strong> after{' '}
                <strong>{selectedExpiry?.label}</strong>. The file and all its shares will be removed from the system. This cannot be undone.
              </span>
            </div>
          )}

          <div className="rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipUncached}
                onChange={(e) => setSkipUncached(e.target.checked)}
                className="h-4 w-4"
              />
              Skip uncached files (avoid MetaMask decrypt prompts)
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Shares only files whose keys are already cached locally.
            </p>
          </div>
          {error && (
            <div className="text-sm text-destructive font-medium text-center">{error}</div>
          )}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="animate-pulse">{progressLabel || 'Sharing securely...'}</span>
                <span>{Math.max(0, Math.min(100, Math.round(progressPercent)))}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(6, Math.min(100, progressPercent))}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={loading || !username.trim()}
            variant={hasExpiry ? 'destructive' : 'default'}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Sharing...
              </span>
            ) : hasExpiry ? 'Share & Schedule Delete' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
