'use client'

import { useState, useEffect } from 'react'
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
