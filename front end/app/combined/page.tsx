'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { UploadZone } from '@/components/upload-zone'
import { DeleteDialog } from '@/components/file-dialogs'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Button } from '@/components/ui/button'
import { MessageSquare, Trash2, Upload } from 'lucide-react'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/error-message'
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
  const [meId, setMeId] = useState<number>(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteData, setDeleteData] = useState<{ open: boolean; fileId?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  const fetchDrives = async () => {
    try {
      const [drivesRes, meRes] = await Promise.all([api.get('/api/drives/me'), api.get('/me')])
      const meId = Number(meRes?.data?.id || 0)
      setMeId(meId)
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
      const [filesRes, membersRes] = await Promise.all([
        api.get(`/api/drives/${driveId}/files`),
        api.get(`/api/drives/${driveId}/members`),
      ])
      const memberNameByUserId = new Map<number, string>(
        (membersRes.data || []).map((m: any) => [Number(m.userId), String(m.username || `User ${m.userId}`)])
      )
      const mapped = (filesRes.data || []).map((f: any) => ({
        id: f.id.toString(),
        name: f?.encryption?.originalName || f.filename,
        type: 'file',
        size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        modified: new Date().toLocaleDateString(),
        shared: true,
        cid: f.cid,
        uploadedBy: Number(f.uploaded_by || 0),
        uploadedByName: memberNameByUserId.get(Number(f.uploaded_by || 0)) || `User ${String(f.uploaded_by || '')}`,
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
  const activeDrive = useMemo(
    () => drives.find((d) => String(d.id) === String(activeDriveId)) || null,
    [drives, activeDriveId]
  )
  const activeRole = String(activeDrive?.my_role || 'viewer')
  const canUploadToActiveDrive = activeRole === 'admin' || activeRole === 'editor'
  const selectedFile = filteredFiles.find((f) => String(f.id) === String(selectedFiles[0]))
  const canDeleteSelected =
    Boolean(selectedFile) &&
    (activeRole === 'admin' || (activeRole === 'editor' && Number(selectedFile?.uploadedBy || 0) === Number(meId)))

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
        const bytes = decrypted instanceof Uint8Array ? decrypted : new Uint8Array(decrypted)
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        outBlob = new Blob([buffer], { type: crypto.originalMimeType || 'application/octet-stream' })
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

  const handleDeleteFile = async () => {
    if (!deleteData.fileId) return
    try {
      await api.post(`/delete/${deleteData.fileId}`)
      setSelectedFiles((prev) => prev.filter((x) => x !== deleteData.fileId))
      await fetchFiles(activeDriveId)
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Failed to delete file'))
    } finally {
      setDeleteData({ open: false })
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
          <Button
            variant="outline"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setUploadOpen(true)}
            disabled={!activeDriveId || !canUploadToActiveDrive}
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            disabled={!selectedFiles.length || !canDeleteSelected}
            onClick={() => setDeleteData({ open: true, fileId: selectedFiles[0] })}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
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
            onDelete={(id) => setDeleteData({ open: true, fileId: id })}
          />
        ) : (
          <FileList
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={(id, selected) =>
              setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))
            }
            onDownload={handleDownload}
            onDelete={(id) => setDeleteData({ open: true, fileId: id })}
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

      <DeleteDialog
        open={deleteData.open}
        onOpenChange={(open) => setDeleteData((prev) => ({ ...prev, open }))}
        itemName={deleteData.fileId ? files.find((f) => f.id === deleteData.fileId)?.name || 'File' : 'File'}
        onConfirm={handleDeleteFile}
      />
      <UploadZone
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={() => {
          setUploadOpen(false)
          void fetchFiles(activeDriveId)
        }}
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

