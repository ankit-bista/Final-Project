'use client'

import { FileItem, formatBytes, formatDate } from '@/lib/mock-data'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Folder, File, Star, Share2, MoreVertical, Eye, Copy } from 'lucide-react'
import { BlockchainBadge, IPFSBadge } from '@/components/blockchain-badge'
import { FileContextMenu } from '@/components/file-context-menu'
import { cn } from '@/lib/utils'

interface FileListProps {
  files: FileItem[]
  selectedFiles?: string[]
  onSelectFile?: (id: string, selected: boolean) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onFolderOpen?: (file: FileItem) => void
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
  onDownload?: (id: string) => void
  onView?: (id: string) => void
}

export function FileList({
  files,
  selectedFiles = [],
  onSelectFile,
  onContextMenu,
  onFolderOpen,
  onDelete,
  onShare,
  onDownload,
  onView
}: FileListProps) {
  const copyTxHash = async (txHash?: string) => {
    if (!txHash) return
    try {
      await navigator.clipboard.writeText(txHash)
    } catch (err) {
      console.error('Failed to copy tx hash', err)
    }
  }

  const handleRowDoubleClick = (file: FileItem) => {
    if (file.type === 'folder' && onFolderOpen) {
      onFolderOpen(file)
    }
  }
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-4 py-3 text-left">
              <Checkbox
                checked={selectedFiles.length === files.length && files.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    files.forEach((file) => onSelectFile?.(file.id, true))
                  } else {
                    files.forEach((file) => onSelectFile?.(file.id, false))
                  }
                }}
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Blockchain</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Modified</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <FileContextMenu 
              key={file.id}
              onDelete={onDelete ? () => onDelete(file.id) : undefined}
              onShare={onShare ? () => onShare(file.id) : undefined}
              onDownload={onDownload ? () => onDownload(file.id) : undefined}
            >
              <tr
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors cursor-pointer',
                  selectedFiles.includes(file.id) && 'bg-primary/10',
                  file.type === 'folder' && 'hover:border-primary/40'
                )}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onContextMenu?.(e, file.id)
                }}
                onDoubleClick={() => handleRowDoubleClick(file)}
              >
              <td className="px-4 py-3">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={(checked) =>
                    onSelectFile?.(file.id, !!checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {file.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-foreground truncate">
                    {file.name}
                  </span>
                  {file.starred && (
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  )}
                  {file.shared && (
                    <Share2 className="w-4 h-4 text-secondary flex-shrink-0" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {file.type === 'folder' ? '—' : formatBytes(file.size || 0)}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <BlockchainBadge
                    isOnBlockchain={file.isOnBlockchain}
                    verified={file.verified}
                    size="sm"
                    showLabel={false}
                  />
                  {file.ipfsHash && (
                    <IPFSBadge
                      ipfsHash={file.ipfsHash}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                  {file.txHash && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        void copyTxHash(file.txHash)
                      }}
                      title="Copy transaction hash"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(file.modified)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView?.(file.id) }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
            </FileContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  )
}
