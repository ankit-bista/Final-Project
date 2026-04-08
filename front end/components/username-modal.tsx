'use client'

import { useState } from 'react'
import { useWeb3 } from '@/context/web3-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCheck } from 'lucide-react'

interface UsernameModalProps {
  /** If true, show the modal regardless of the needsUsername state */
  forceVisible?: boolean
  /** Called when the modal should close (used when forceVisible is set) */
  onClose?: () => void
}

export function UsernameModal({ forceVisible = false, onClose }: UsernameModalProps) {
  const { needsUsername, saveUsername } = useWeb3()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Show if forced open OR if the user hasn't set a username yet
  if (!forceVisible && !needsUsername) return null

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Username must be 3–20 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers, and underscores allowed')
      return
    }

    setLoading(true)
    setError('')
    try {
      await saveUsername(trimmed)
      onClose?.() // close if opened manually from header
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
      onClick={(e) => { if (e.target === e.currentTarget && forceVisible) onClose?.() }}
    >
      <div className="bg-background rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {forceVisible ? 'Change Username' : 'Welcome!'}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {forceVisible
            ? 'Pick a new username. Others use this to share files with you.'
            : 'Choose a username. Other users will use this to share files with you.'}
        </p>

        <div className="space-y-3">
          <Input
            placeholder="e.g. ankit_99"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="text-center text-base"
            maxLength={20}
            autoFocus
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <p className="text-xs text-muted-foreground">
            3–20 characters · letters, numbers, underscores only
          </p>
          <div className="flex gap-2">
            {forceVisible && (
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              className="flex-1 bg-primary hover:opacity-90"
              onClick={handleSubmit}
              disabled={loading || value.trim().length < 3}
            >
              {loading ? 'Saving...' : 'Set Username'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
