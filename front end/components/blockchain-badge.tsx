'use client'

import { CheckCircle2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlockchainBadgeProps {
  isOnBlockchain?: boolean
  verified?: boolean
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function BlockchainBadge({
  isOnBlockchain = false,
  verified = false,
  size = 'md',
  showLabel = true,
}: BlockchainBadgeProps) {
  if (!isOnBlockchain) {
    return null
  }

  if (verified) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/15 text-secondary',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm'
        )}
      >
        <CheckCircle2 className={cn('flex-shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
        {showLabel && <span>On Blockchain</span>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm'
      )}
    >
      <Shield className={cn('flex-shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {showLabel && <span>Processing</span>}
    </div>
  )
}

interface IPFSBadgeProps {
  ipfsHash?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function IPFSBadge({ ipfsHash, size = 'md', showLabel = true }: IPFSBadgeProps) {
  if (!ipfsHash) return null

  const truncatedHash = ipfsHash.slice(0, 8) + '...' + ipfsHash.slice(-6)

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm'
      )}
      title={`IPFS Hash: ${ipfsHash}`}
    >
      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
      {showLabel && <span className="font-mono">{truncatedHash}</span>}
    </div>
  )
}

interface OwnerBadgeProps {
  ownerAddress?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function OwnerBadge({ ownerAddress, size = 'md', showLabel = true }: OwnerBadgeProps) {
  if (!ownerAddress) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm'
      )}
      title={`Owner: ${ownerAddress}`}
    >
      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
      {showLabel && <span className="font-mono">{ownerAddress}</span>}
    </div>
  )
}
