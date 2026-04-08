'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Download,
  Share2,
  Trash2,
  Edit3,
  Copy,
  Star,
} from 'lucide-react'
import { ReactNode } from 'react'

interface FileContextMenuProps {
  children: ReactNode
  onDownload?: () => void
  onShare?: () => void
  onRename?: () => void
  onDelete?: () => void
  onStar?: () => void
  onCopy?: () => void
  isStarred?: boolean
}

export function FileContextMenu({
  children,
  onDownload,
  onShare,
  onRename,
  onDelete,
  onStar,
  onCopy,
  isStarred = false,
}: FileContextMenuProps) {
  const hasActions = Boolean(onDownload || onShare || onRename || onDelete || onStar || onCopy)

  if (!hasActions) {
    // Avoid showing an empty context menu for viewers with limited permissions.
    return <>{children}</>
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onDownload && (
          <ContextMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            <span>Download</span>
          </ContextMenuItem>
        )}
        {onShare && (
          <ContextMenuItem onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share</span>
          </ContextMenuItem>
        )}
        {onStar && (
          <ContextMenuItem onClick={onStar}>
            <Star className={`mr-2 h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
            <span>{isStarred ? 'Remove from favorites' : 'Add to favorites'}</span>
          </ContextMenuItem>
        )}

        {(onRename || onCopy) && <ContextMenuSeparator />}

        {onRename && (
          <ContextMenuItem onClick={onRename}>
            <Edit3 className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </ContextMenuItem>
        )}
        {onCopy && (
          <ContextMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
          </ContextMenuItem>
        )}

        {onDelete && (
          <>
            {(onRename || onCopy) && <ContextMenuSeparator />}
            <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
