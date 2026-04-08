'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderPlus } from 'lucide-react'

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
          <DialogDescription>
            Add a folder to organize your files faster.
          </DialogDescription>
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
