'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { UploadZone } from '@/components/upload-zone'
import { InviteMemberDialog, NewFolderDialog } from '@/components/file-dialogs'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Upload } from 'lucide-react'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { decryptBlobWithWallet } from '@/lib/file-crypto'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

export default function CollaborativeDrivePage() {
  const { account } = useWeb3()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [drives, setDrives] = useState<any[]>([])
  const [activeDriveId, setActiveDriveId] = useState<string>('')
  const [files, setFiles] = useState<any[]>([])
  const [folderRows, setFolderRows] = useState<any[]>([])
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null

  const fetchDrives = async () => {
    try {
      const [drivesRes, meRes] = await Promise.all([api.get('/api/drives/me'), api.get('/me')])
      const meId = Number(meRes?.data?.id || 0)
      const rows = (drivesRes.data || []).filter(
        (d: any) => !d.personal && Number(d.owner_id) === meId
      )
      setDrives(rows)
      if (!activeDriveId && rows.length) {
        setActiveDriveId(String(rows[0].id))
      }
    } catch (err) {
      console.error('Failed to load collaborative drives', err)
    }
  }

  const fetchDriveContents = async (driveId: string, folderId?: number | null) => {
    if (!driveId) {
      setFiles([])
      setFolderRows([])
      return
    }
    try {
      const [filesRes, foldersRes, membersRes] = await Promise.all([
        api.get(`/api/drives/${driveId}/files`, { params: { folderId: folderId == null ? '' : folderId } }),
        api.get(`/api/drives/${driveId}/folders`, { params: { parentFolderId: folderId == null ? '' : folderId } }),
        api.get(`/api/drives/${driveId}/members`),
      ])
      const memberNameByUserId = new Map<number, string>(
        (membersRes.data || []).map((m: any) => [Number(m.userId), String(m.username || `User ${m.userId}`)])
      )
      setFiles(
        (filesRes.data || []).map((f: any) => ({
          id: f.id.toString(),
          name: f?.encryption?.originalName || f.filename,
          type: 'file',
          size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
          modified: new Date().toLocaleDateString(),
          shared: false,
          cid: f.cid,
          uploadedBy: Number(f.uploaded_by || 0),
          uploadedByName: memberNameByUserId.get(Number(f.uploaded_by || 0)) || `User ${String(f.uploaded_by || '')}`,
          txHash: f.tx_hash || null,
          isOnBlockchain: Boolean(f.tx_hash),
        }))
      )
      setFolderRows(
        (foldersRes.data || []).map((folder: any) => ({
          id: `folder-${folder.id}`,
          folderId: Number(folder.id),
          name: folder.name,
          type: 'folder',
          size: '--',
          modified: new Date(folder.created_at || Date.now()).toLocaleDateString(),
          shared: false,
          isOnBlockchain: false,
        }))
      )
    } catch (err) {
      console.error('Failed to load collaborative drive contents', err)
      setFiles([])
      setFolderRows([])
    }
  }

  useEffect(() => {
    void fetchDrives()
  }, [])

  useEffect(() => {
    if (activeDriveId) void fetchDriveContents(activeDriveId, currentFolderId)
  }, [activeDriveId, currentFolderId])

  const allRows = useMemo(() => [...folderRows, ...files], [folderRows, files])
  const filteredFiles = useMemo(
    () => sortFilesByTypeFromScratch(allRows.filter((f) => String(f.name || '').toLowerCase().includes(searchQuery.toLowerCase()))),
    [allRows, searchQuery]
  )

  const breadcrumbItems = [
    { label: drives.find((d) => String(d.id) === String(activeDriveId))?.name || 'Collaborative Drive', onClick: () => setFolderPath([]) },
    ...folderPath.map((f, idx) => ({ label: f.name, onClick: () => setFolderPath(folderPath.slice(0, idx + 1)) })),
  ]

  const handleDownload = async (id: string) => {
    if (id.startsWith('folder-')) return
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

  const handleCreateDrive = async () => {
    const name = window.prompt('Enter collaborative drive name')
    if (!name?.trim()) return
    try {
      const res = await api.post('/api/drives', { name: name.trim(), quotaLimitBytes: 0 })
      await fetchDrives()
      if (res?.data?.id) {
        setActiveDriveId(String(res.data.id))
        setFolderPath([])
      }
    } catch (err) {
      console.error('Failed to create drive', err)
      alert('Failed to create drive')
    }
  }

  const handleInvite = async (values: {
    identifier: string
    role: 'admin' | 'editor' | 'viewer'
    quotaTransferMb: number
    driveQuotaLimitMb: number
  }) => {
    if (!activeDriveId) return
    await api.post(`/api/drives/${activeDriveId}/invite`, {
      identifier: values.identifier,
      role: values.role,
      quotaTransferMb: values.quotaTransferMb,
    })
    const active = drives.find((d: any) => String(d.id) === String(activeDriveId))
    const currentLimitMb = Number(active?.quota_limit_bytes || 0) / 1024 / 1024
    if (Math.round(values.driveQuotaLimitMb) !== Math.round(currentLimitMb)) {
      await api.post(`/api/drives/${activeDriveId}/quota`, {
        quotaLimitBytes: Math.max(0, Number(values.driveQuotaLimitMb || 0)) * 1024 * 1024,
      })
    }
    await fetchDrives()
    await fetchDriveContents(activeDriveId, currentFolderId)
    alert('User invited successfully')
  }

  const handleCreateFolder = async (folderName: string) => {
    if (!activeDriveId) return
    await api.post(`/api/drives/${activeDriveId}/folders`, {
      name: folderName,
      parentFolderId: currentFolderId,
    })
    await fetchDriveContents(activeDriveId, currentFolderId)
  }

  return (
    <MainLayout title="Collaborative Drive" onSearch={setSearchQuery}>
      <BreadcrumbNav items={breadcrumbItems} />

      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <select
            value={activeDriveId}
            onChange={(e) => {
              setActiveDriveId(e.target.value)
              setFolderPath([])
              setSelectedFiles([])
            }}
            className="border border-input bg-background rounded-md px-3 py-2 text-sm min-w-[240px]"
          >
            {drives.map((drive) => (
              <option key={String(drive.id)} value={String(drive.id)}>
                {drive.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setNewFolderOpen(true)} className="gap-2" disabled={!activeDriveId}>
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
          <Button variant="outline" onClick={handleCreateDrive}>New Drive</Button>
          <Button variant="outline" onClick={() => setInviteOpen(true)} disabled={!activeDriveId}>Invite</Button>
          <Button variant="outline" className="gap-2" onClick={() => setUploadOpen(true)} disabled={!activeDriveId}>
            <Upload className="w-4 h-4" />
            Upload
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
            onFolderOpen={(folder: any) => {
              if (folder?.type === 'folder' && Number.isFinite(folder.folderId)) {
                setFolderPath((prev) => [...prev, { id: Number(folder.folderId), name: folder.name }])
                setSelectedFiles([])
              }
            }}
            onDownload={handleDownload}
          />
        ) : (
          <FileList
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={(id, selected) =>
              setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))
            }
            onFolderOpen={(folder: any) => {
              if (folder?.type === 'folder' && Number.isFinite(folder.folderId)) {
                setFolderPath((prev) => [...prev, { id: Number(folder.folderId), name: folder.name }])
                setSelectedFiles([])
              }
            }}
            onDownload={handleDownload}
          />
        )}
      </div>

      <div className="px-6 pb-6">
        <Button
          variant="outline"
          className="gap-2"
          disabled={!selectedFiles.length || selectedFiles[0]?.startsWith('folder-')}
          onClick={() => {
            const f = filteredFiles.find((x) => x.id === selectedFiles[0])
            setComments({ open: true, fileId: selectedFiles[0], fileName: f?.name })
          }}
        >
          <MessageSquare className="h-4 w-4" />
          Comments
        </Button>
      </div>

      <NewFolderDialog
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
        currentDriveQuotaUsedMb={Number(drives.find((d: any) => String(d.id) === String(activeDriveId))?.quota_used_bytes || 0) / 1024 / 1024}
        currentDriveQuotaLimitMb={Number(drives.find((d: any) => String(d.id) === String(activeDriveId))?.quota_limit_bytes || 0) / 1024 / 1024}
      />
      <UploadZone
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={() => {
          setUploadOpen(false)
          void fetchDriveContents(activeDriveId, currentFolderId)
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

