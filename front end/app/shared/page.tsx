'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { MessageSquare } from 'lucide-react'
import { decryptBlobWithWallet } from '@/lib/file-crypto'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

export default function SharedPage() {
  const { isConnected, account } = useWeb3()
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [files, setFiles] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  const fetchShared = async () => {
    try {
      const res = await api.get('/shared-with-me')
      const mappedFiles = res.data.map((f: any) => ({
        id: f.id.toString(),
        name: f.filename,
        type: 'file',
        size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        modified: new Date().toLocaleDateString(),
        shared: true,
        cid: f.cid,
        customHash: f.custom_hash,
        txHash: f.tx_hash || null,
        isOnBlockchain: Boolean(f.tx_hash),
        ownerName: f.owner_name,
        shareRole: f.role as 'viewer' | 'editor',
      }))
      setFiles(mappedFiles)
    } catch (err) {
      console.error('Failed to fetch shared files:', err)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchShared()
    } else {
      setFiles([])
    }
  }, [isConnected])

  const filteredFiles = sortFilesByTypeFromScratch(
    files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelectFile = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    )
  }

  const handleDownloadClick = async (id: string) => {
    try {
      const file = files.find((f) => String(f.id) === String(id))
      const [contentRes, cryptoRes] = await Promise.all([
        api.get(`/files/${id}/content`, { responseType: 'blob' }),
        api.get(`/files/${id}/crypto`),
      ])
      const crypto = cryptoRes.data || {}
      let outBlob: Blob = contentRes.data as Blob
      let outName = file?.name || `file-${id}`
      if (crypto?.isEncrypted) {
        if (!account) throw new Error('Connect wallet first')
        const decrypted = await decryptBlobWithWallet(account, contentRes.data as Blob, crypto.encryptedKey, crypto.iv, file?.cid)
        outBlob = new Blob([decrypted], { type: crypto.originalMimeType || 'application/octet-stream' })
        outName = crypto.originalName || outName
      }
      const url = URL.createObjectURL(outBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = outName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to get download link');
    }
  }
  const handleViewClick = async (id: string) => {
    const file = files.find((f) => f.id === id)
    setViewer({ open: true, fileId: id, fileName: file?.name })
  }
  const handleOpenComments = (id: string) => {
    const file = files.find((f) => f.id === id)
    setComments({ open: true, fileId: id, fileName: file?.name })
  }

  return (
    <MainLayout title="Shared With Me" onSearch={setSearchQuery}>
      <BreadcrumbNav items={[{ label: 'Shared With Me' }]} />
      
      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">Single file shares from other users</div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">{filteredFiles.length} shared items</div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="p-6">
        {filteredFiles.length > 0 ? (
          <>
            {view === 'grid' ? (
              <FileGrid
                files={filteredFiles}
                selectedFiles={selectedFiles}
                onSelectFile={handleSelectFile}
                onDownload={handleDownloadClick}
                onView={handleViewClick}
              />
            ) : (
              <FileList
                files={filteredFiles}
                selectedFiles={selectedFiles}
                onSelectFile={(id, selected) =>
                  setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))
                }
                onDownload={handleDownloadClick}
                onView={handleViewClick}
              />
            )}
            <div className="pt-4">
              <Button variant="outline" className="gap-2" disabled={!selectedFiles.length} onClick={() => handleOpenComments(selectedFiles[0])}>
                <MessageSquare className="h-4 w-4" />
                Comments
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <p className="text-muted-foreground mb-2">No shared files yet</p>
            <p className="text-sm text-muted-foreground">Files shared with you will appear here</p>
          </div>
        )}
      </div>
      <FileViewerModal
        open={viewer.open}
        onOpenChange={(open) => setViewer((p) => ({ ...p, open }))}
        fileId={viewer.fileId}
        fileName={viewer.fileName}
        viewUrl={viewer.url}
      />
      <FileCommentsPanel
        open={comments.open}
        onOpenChange={(open) => setComments((p) => ({ ...p, open }))}
        fileId={comments.fileId}
        fileName={comments.fileName}
      />
    </MainLayout>
  )
}
