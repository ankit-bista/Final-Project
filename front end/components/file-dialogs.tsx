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
            <Label htmlFor="share-username" className="text-right">User</Label>
            <Input
              id="share-username"
              placeholder="Username or 0x..."
              className="col-span-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="share-role" className="text-right">Role</Label>
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

// ─────────────────────────────────────────
// NewFolderDialog
// ─────────────────────────────────────────

interface NewFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolder: (folderName: string) => void
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
