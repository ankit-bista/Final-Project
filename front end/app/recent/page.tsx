'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { Button } from '@/components/ui/button'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Link2, MessageSquare } from 'lucide-react'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { PublicLanding } from '@/components/public-landing'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

export default function RecentPage() {
  const { isConnected, role } = useWeb3()
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [files, setFiles] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await api.get('/files')
        const mappedFiles = res.data.map((f: any) => ({
          id: f.id.toString(),
          name: f.filename,
          type: 'file',
          size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
          modified: new Date().toLocaleDateString(),
          shared: false,
          cid: f.cid,
          customHash: f.custom_hash,
          txHash: f.tx_hash || null,
          isOnBlockchain: Boolean(f.tx_hash),
        }))
        // `/files` already returns DESC by id; keep as-is
        setFiles(mappedFiles)
      } catch (err) {
        console.error('Failed to fetch files', err)
      }
    }
    if (isConnected) fetchFiles()
    else setFiles([])
  }, [isConnected])

  const filteredFiles = sortFilesByTypeFromScratch(
    files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelectFile = (id: string, selected: boolean = !selectedFiles.includes(id)) => {
    setSelectedFiles((prev) =>
      selected ? [...prev, id] : prev.filter((fid) => fid !== id)
    )
  }

  const handleDownloadClick = async (id: string) => {
    try {
      const res = await api.post(`/files/${id}/link`, { expiresInMinutes: 60 })
      window.open(res.data.url, '_blank')
    } catch (err) {
      console.error('Download failed', err)
      alert('Failed to get download link')
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

  const handleAnchorSelected = async () => {
    if (!selectedFiles.length) return
    const id = selectedFiles[0]
    try {
      const res = await api.post(`/files/${id}/anchor`)
      const txHash = res.data?.txHash
      alert(txHash ? `Anchored on blockchain.\nTx: ${txHash}` : 'Anchor submitted.')
      // refresh list to show txHash badge
      const refreshed = await api.get('/files')
      const mapped = refreshed.data.map((f: any) => ({
        id: f.id.toString(),
        name: f.filename,
        type: 'file',
        size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        modified: new Date().toLocaleDateString(),
        shared: false,
        cid: f.cid,
        customHash: f.custom_hash,
        txHash: f.tx_hash || null,
        isOnBlockchain: Boolean(f.tx_hash),
      }))
      setFiles(mapped)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to anchor file')
    }
  }

  if (!isConnected) return <PublicLanding />

  return (
    <MainLayout title="Recent Files" onSearch={setSearchQuery}>
      <BreadcrumbNav items={[{ label: 'Recent' }]} />
      
      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{filteredFiles.length} recent items</div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="p-6">
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
            onSelectFile={handleSelectFile}
            onDownload={handleDownloadClick}
            onView={handleViewClick}
          />
        )}

        <div className="pt-4 flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!selectedFiles.length} onClick={() => handleOpenComments(selectedFiles[0])}>
            <MessageSquare className="h-4 w-4" />
            Comments
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedFiles.length || role === 'commenter'}
            onClick={handleAnchorSelected}
          >
            <Link2 className="h-4 w-4" />
            Anchor Selected
          </Button>
        </div>
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
