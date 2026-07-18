'use client'

// ============================================================
// file-dialogs.tsx
// Combines: delete-dialog, rename-dialog, share-dialog, new-folder-dialog
// ============================================================

import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { FolderPlus } from 'lucide-react'

// ─────────────────────────────────────────
// DeleteDialog
// ─────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemCount?: number
  onConfirm: () => void
}

export function DeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemCount,
  onConfirm,
}: DeleteDialogProps) {
  const isMultiple = itemCount && itemCount > 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {isMultiple ? 'Items' : 'Item'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple ? (
              <>Are you sure you want to delete {itemCount} items? This action cannot be undone.</>
            ) : (
              <>Are you sure you want to delete &quot;{itemName}&quot;? This action cannot be undone.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex justify-end gap-3 mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─────────────────────────────────────────
// RenameDialog
// ─────────────────────────────────────────

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (newName: string) => void
}

export function RenameDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
}: RenameDialogProps) {
  const [newName, setNewName] = useState(currentName)

  useEffect(() => {
    setNewName(currentName)
  }, [currentName, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName && newName !== currentName) {
      onRename(newName)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Item</DialogTitle>
          <DialogDescription>Enter the new name for this file or folder.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-name">Name</Label>
            <Input
              id="rename-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onFocus={(e) => { e.target.select() }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:opacity-90"
              disabled={!newName || newName === currentName}
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────
// ShareDialog
// ─────────────────────────────────────────

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
  const [expiryHours, setExpiryHours] = useState('')
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
          <DialogTitle>Share Drive</DialogTitle>
          <DialogDescription>
            Grant access to your whole drive (all your files) to another user or wallet address.
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

// ─────────────────────────────────────────
// NewFolderDialog
// ─────────────────────────────────────────

interface NewFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolder: (folderName: string) => void
}

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (values: {
    identifier: string
    role: 'admin' | 'editor' | 'viewer'
    quotaTransferMb: number
    driveQuotaLimitMb: number
  }) => Promise<void>
  currentDriveQuotaUsedMb?: number
  currentDriveQuotaLimitMb?: number
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  currentDriveQuotaUsedMb = 0,
  currentDriveQuotaLimitMb = 0,
}: InviteMemberDialogProps) {
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')
  const [quotaTransferMb, setQuotaTransferMb] = useState('0')
  const [driveQuotaLimitMb, setDriveQuotaLimitMb] = useState(String(Math.max(0, Math.round(currentDriveQuotaLimitMb))))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setIdentifier('')
    setRole('viewer')
    setQuotaTransferMb('0')
    setDriveQuotaLimitMb(String(Math.max(0, Math.round(currentDriveQuotaLimitMb))))
    setError('')
  }, [open, currentDriveQuotaLimitMb])

  const handleInvite = async () => {
    if (!identifier.trim()) {
      setError('Username or wallet is required')
      return
    }
    const quotaTransferValue = Math.max(0, Number(quotaTransferMb || 0))
    const driveQuotaValue = Math.max(0, Number(driveQuotaLimitMb || 0))
    try {
      setLoading(true)
      setError('')
      await onInvite({
        identifier: identifier.trim(),
        role,
        quotaTransferMb: quotaTransferValue,
        driveQuotaLimitMb: driveQuotaValue,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a user and configure role plus quota settings in one step.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invite-identifier" className="text-right">User</Label>
            <Input
              id="invite-identifier"
              placeholder="username or 0x..."
              className="col-span-3"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invite-role" className="text-right">Role</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invite-transfer" className="text-right">Quota to user (MB)</Label>
            <Input
              id="invite-transfer"
              type="number"
              min="0"
              className="col-span-3"
              value={quotaTransferMb}
              onChange={(e) => setQuotaTransferMb(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invite-drive-quota" className="text-right">Drive quota limit (MB)</Label>
            <Input
              id="invite-drive-quota"
              type="number"
              min="0"
              className="col-span-3"
              value={driveQuotaLimitMb}
              onChange={(e) => setDriveQuotaLimitMb(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Current drive usage: {Math.max(0, Math.round(currentDriveQuotaUsedMb))} MB /{' '}
            {Math.max(0, Math.round(currentDriveQuotaLimitMb))} MB
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || !identifier.trim()}>
            {loading ? 'Inviting...' : 'Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function NewFolderDialog({
  isOpen,
  onClose,
  onCreateFolder,
}: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateFolderName = (value: string): boolean => {
    if (!value.trim()) {
      setError('Folder name cannot be empty')
      return false
    }
    if (value.length > 100) {
      setError('Folder name must be less than 100 characters')
      return false
    }
    if (/[<>:"|?*]/.test(value)) {
      setError('Folder name contains invalid characters')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateFolderName(folderName)) return

    setIsLoading(true)
    try {
      onCreateFolder(folderName.trim())
      setFolderName('')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFolderName('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>Add a folder to organize your files faster.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="folderName" className="text-sm font-medium">
              Folder Name
            </label>
            <Input
              id="folderName"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value)
                setError('')
              }}
              disabled={isLoading}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !folderName.trim()}>
              {isLoading ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
