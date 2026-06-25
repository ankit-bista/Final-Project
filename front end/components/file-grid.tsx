'use client'

import { FileItem } from '@/lib/mock-data'
import { FileCard } from '@/components/file-card'
import { FileContextMenu } from '@/components/file-context-menu'

interface FileGridProps {
  files: FileItem[]
  selectedFiles?: string[]
  onSelectFile?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onFolderOpen?: (file: FileItem) => void
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
  onDownload?: (id: string) => void
}

export function FileGrid({
  files,
  selectedFiles = [],
  onSelectFile,
  onContextMenu,
  onFolderOpen,
  onDelete,
  onShare,
  onDownload,
}: FileGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <FileContextMenu 
          key={file.id}
          onDelete={onDelete ? () => onDelete(file.id) : undefined}
          onShare={onShare ? () => onShare(file.id) : undefined}
          onDownload={onDownload ? () => onDownload(file.id) : undefined}
        >
          <FileCard
            file={file}
            isSelected={selectedFiles.includes(file.id)}
            onSelect={onSelectFile}
            onContextMenu={onContextMenu}
            onFolderOpen={onFolderOpen}
            onDelete={onDelete}
            onShare={onShare}
            onDownload={onDownload}
          />
        </FileContextMenu>
      ))}
    </div>
  )
}

