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

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName?: string
  onShare: (target: string, role: 'viewer' | 'editor', options?: { skipUncached?: boolean }) => Promise<void>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (!username.trim()) {
      setError('Username or wallet address is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      await onShare(username.trim(), role, { skipUncached })
      onOpenChange(false)
      setUsername('')
      setRole('viewer')
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Failed to share file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Drive</DialogTitle>
          <DialogDescription>
            Grant access to your whole drive (all your files) to another user or wallet address.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              User
            </Label>
            <Input
              id="username"
              placeholder="Username or 0x..."
              className="col-span-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <div className="text-sm text-destructive font-medium text-center">
              {error}
            </div>
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
          <Button onClick={handleShare} disabled={loading || !username.trim()}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Sharing...
              </span>
            ) : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
