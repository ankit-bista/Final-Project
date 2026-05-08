'use client'

import { FileItem } from '@/lib/mock-data'
import { formatBytes, formatDate } from '@/lib/mock-data'
import { Folder, File, Star, Share2, MoreVertical, Download, Trash2, Eye, Zap, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlockchainBadge, IPFSBadge } from '@/components/blockchain-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface FileCardProps {
  file: FileItem
  isSelected?: boolean
  onSelect?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onFolderOpen?: (file: FileItem) => void
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
  onDownload?: (id: string) => void
  onView?: (id: string) => void
}

export function FileCard({
  file,
  isSelected = false,
  onSelect,
  onContextMenu,
  onFolderOpen,
  onDelete,
  onShare,
  onDownload,
  onView,
}: FileCardProps) {
  const isFolder = file.type === 'folder'

  const handleDoubleClick = () => {
    if (isFolder && onFolderOpen) {
      onFolderOpen(file)
    }
  }

  // View on IPFS gateway
  const handleViewIPFS = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onView) {
      onView(file.id)
    } else if (file.cid) {
      window.open(`https://ipfs.io/ipfs/${file.cid}`, '_blank')
    } else if (file.ipfsHash) {
      window.open(`https://ipfs.io/ipfs/${file.ipfsHash}`, '_blank')
    } else {
      onView?.(file.id)
    }
  }

  const handleCopyTxHash = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!file.txHash) return
    try {
      await navigator.clipboard.writeText(file.txHash)
    } catch (err) {
      console.error('Failed to copy tx hash', err)
    }
  }

  return (
    <div
      className={cn(
        'group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all cursor-pointer',
        isSelected && 'bg-primary/10 border-primary/30',
        isFolder && 'hover:border-primary/40'
      )}
      onClick={() => onSelect?.(file.id)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e, file.id)
      }}
    >
      {/* Header with icon and menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {isFolder ? (
            <Folder className="w-10 h-10 text-primary mb-2" />
          ) : (
            <File className="w-10 h-10 text-gray-400 mb-2" />
          )}
        </div>

        {/* Action dropdown — replaces the non-functional MoreVertical */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleViewIPFS}>
              <Eye className="mr-2 h-4 w-4 text-primary" />
              View on IPFS
            </DropdownMenuItem>
            {(file.cid || file.ipfsHash) && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  const hash = file.cid || file.ipfsHash
                  window.open(`https://etherscan.io/search?q=${hash}`, '_blank')
                }}
              >
                <Zap className="mr-2 h-4 w-4 text-accent" />
                View on Blockchain
              </DropdownMenuItem>
            )}
            {file.txHash && (
              <DropdownMenuItem onClick={handleCopyTxHash}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Tx Hash
              </DropdownMenuItem>
            )}
            {(onDownload || onShare || onDelete) && <DropdownMenuSeparator />}
            {onDownload && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(file.id) }}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(file.id) }}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                {(onDownload || onShare) && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(file.id) }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File name */}
      <h3 className="font-medium text-foreground truncate mb-1 text-sm">{file.name}</h3>

      {/* Meta */}
      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        <p>{file.modified ? new Date(file.modified).toLocaleDateString() : ''}</p>
        {!isFolder && file.size && <p>{typeof file.size === 'number' ? formatBytes(file.size) : file.size}</p>}
      </div>

      {/* Footer badges */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {file.shared && (
            <div className="flex items-center gap-1">
              <Share2 className="w-3 h-3 text-secondary" />
              <span className="text-xs text-secondary">Shared</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <BlockchainBadge isOnBlockchain={file.isOnBlockchain} verified={file.verified} size="sm" showLabel />
          {file.ipfsHash && <IPFSBadge ipfsHash={file.ipfsHash} size="sm" showLabel />}
        </div>
      </div>
    </div>
  )
}
