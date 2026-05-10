'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { decryptBlobWithWallet } from '@/lib/file-crypto'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

export default function SharedDrivesPage() {
  const { account } = useWeb3()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [drives, setDrives] = useState<any[]>([])
  const [activeDriveId, setActiveDriveId] = useState<string>('')
  const [files, setFiles] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  const fetchDrives = async () => {
    try {
      const [drivesRes, meRes] = await Promise.all([api.get('/api/drives/me'), api.get('/me')])
      const meId = Number(meRes?.data?.id || 0)
      const rows = (drivesRes.data || []).filter(
        (d: any) => !d.personal && Number(d.owner_id) !== meId
      )
      setDrives(rows)
      if (!activeDriveId && rows.length) {
        setActiveDriveId(String(rows[0].id))
      }
    } catch (err) {
      console.error('Failed to load shared drives', err)
    }
  }

  const fetchFiles = async (driveId: string) => {
    if (!driveId) return setFiles([])
    try {
      const res = await api.get(`/api/drives/${driveId}/files`)
      const mapped = (res.data || []).map((f: any) => ({
        id: f.id.toString(),
        name: f?.encryption?.originalName || f.filename,
        type: 'file',
        size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        modified: new Date().toLocaleDateString(),
        shared: true,
        cid: f.cid,
        txHash: f.tx_hash || null,
        isOnBlockchain: Boolean(f.tx_hash),
      }))
      setFiles(mapped)
    } catch (err) {
      console.error('Failed to load shared drive files', err)
      setFiles([])
    }
  }

  useEffect(() => {
    void fetchDrives()
  }, [])

  useEffect(() => {
    if (activeDriveId) void fetchFiles(activeDriveId)
  }, [activeDriveId])

  const filteredFiles = useMemo(
    () => sortFilesByTypeFromScratch(files.filter((f) => String(f.name || '').toLowerCase().includes(searchQuery.toLowerCase()))),
    [files, searchQuery]
  )

  const handleDownload = async (id: string) => {
    try {
      const file = filteredFiles.find((f) => String(f.id) === String(id))
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
      console.error('Download failed', err)
      alert('Failed to download file')
    }
  }

  return (
    <MainLayout title="Shared Drives" onSearch={setSearchQuery}>
      <BreadcrumbNav items={[{ label: 'Shared Drives' }]} />

      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Drive</div>
          <select
            value={activeDriveId}
            onChange={(e) => {
              setActiveDriveId(e.target.value)
              setSelectedFiles([])
            }}
            className="border border-input bg-background rounded-md px-3 py-2 text-sm min-w-[240px]"
          >
            {drives.map((drive) => (
              <option key={String(drive.id)} value={String(drive.id)}>
                {drive.name} [{String(drive.my_role || 'viewer')}]
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">{filteredFiles.length} items</div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="p-6">
        {view === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={(id, selected = !selectedFiles.includes(id)) =>
              setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))
            }
            onDownload={handleDownload}
            onView={(id) => {
              const file = filteredFiles.find((f) => f.id === id)
              setViewer({ open: true, fileId: id, fileName: file?.name })
            }}
          />
        ) : (
          <FileList
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={(id, selected) =>
              setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))
            }
            onDownload={handleDownload}
            onView={(id) => {
              const file = filteredFiles.find((f) => f.id === id)
              setViewer({ open: true, fileId: id, fileName: file?.name })
            }}
          />
        )}

        <div className="pt-4">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedFiles.length}
            onClick={() => {
              const f = filteredFiles.find((x) => x.id === selectedFiles[0])
              setComments({ open: true, fileId: selectedFiles[0], fileName: f?.name })
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Comments
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

