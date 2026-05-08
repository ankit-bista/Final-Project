'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { UploadZone } from '@/components/upload-zone'
import { NewFolderDialog, DeleteDialog, ShareDialog } from '@/components/file-dialogs'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Button } from '@/components/ui/button'
import { Link2, MessageSquare, Plus, Upload } from 'lucide-react'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { cacheFileKeyByCid, decryptBlobWithWallet, decryptWithMetaMask, encryptForPublicKey, getCachedFileKeyByCid } from '@/lib/file-crypto'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

export default function DashboardPage() {
  const { isConnected, role, remainingBytes, account } = useWeb3()
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [deleteData, setDeleteData] = useState<{ open: boolean; fileId?: string; fileIds?: string[] }>({ open: false })
  const [shareData, setShareData] = useState<{ open: boolean; fileId?: string }>({ open: false })
  const [shareProgressLabel, setShareProgressLabel] = useState('')
  const [shareProgressPercent, setShareProgressPercent] = useState(0)
  const [fileRows, setFileRows] = useState<any[]>([])
  const [folderRows, setFolderRows] = useState<any[]>([])
  const [drives, setDrives] = useState<any[]>([])
  const [activeDriveId, setActiveDriveId] = useState<string>('')
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>([])
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })

  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null

  const fetchDrives = async () => {
    try {
      const res = await api.get('/api/drives/me')
      const rows = res.data || []
      setDrives(rows)
      if (!activeDriveId && rows.length) {
        const def = rows.find((d: any) => d.personal) || rows[0]
        setActiveDriveId(String(def.id))
      }
    } catch (err) {
      console.error('Failed to fetch drives', err)
    }
  }

  const fetchDriveContents = async (driveId: string, folderId?: number | null) => {
    if (!driveId) return
    try {
      const [filesRes, foldersRes] = await Promise.all([
        api.get(`/api/drives/${driveId}/files`, {
          params: { folderId: folderId == null ? '' : folderId },
        }),
        api.get(`/api/drives/${driveId}/folders`, {
          params: { parentFolderId: folderId == null ? '' : folderId },
        }),
      ])
      const mappedFiles = (filesRes.data || []).map((f: any) => ({
        id: f.id.toString(),
        name: f?.encryption?.originalName || f.filename,
        type: 'file',
        size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        modified: new Date().toLocaleDateString(),
        shared: false,
        cid: f.cid,
        customHash: f.custom_hash,
        txHash: f.tx_hash || null,
        isOnBlockchain: Boolean(f.tx_hash),
        encryption: f.encryption || null,
        driveId: f.drive_id ?? null,
        folderId: f.folder_id ?? null,
      }))
      const mappedFolders = (foldersRes.data || []).map((folder: any) => ({
        id: `folder-${folder.id}`,
        folderId: Number(folder.id),
        name: folder.name,
        type: 'folder',
        size: '--',
        modified: new Date(folder.created_at || Date.now()).toLocaleDateString(),
        shared: false,
        isOnBlockchain: false,
      }))
      setFileRows(mappedFiles)
      setFolderRows(mappedFolders)
    } catch (err) {
      console.error('Failed to fetch drive contents', err)
    }
  }

  useEffect(() => {
    void fetchDrives()
  }, [isConnected])

  useEffect(() => {
    if (!activeDriveId) return
    void fetchDriveContents(activeDriveId, currentFolderId)
  }, [activeDriveId, currentFolderId])

  const files = useMemo(() => [...folderRows, ...fileRows], [folderRows, fileRows])
  const filteredFiles = useMemo(() => {
    const searched = files.filter((file) =>
      String(file.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    return sortFilesByTypeFromScratch(searched)
  }, [files, searchQuery])

  const handleSelectFile = (id: string, selected: boolean = !selectedFiles.includes(id)) => {
    setSelectedFiles((prev) =>
      selected ? [...prev, id] : prev.filter((fid) => fid !== id)
    )
  }

  const breadcrumbItems = [
    {
      label: drives.find((d) => String(d.id) === String(activeDriveId))?.name || 'Drive',
      onClick: () => setFolderPath([]),
    },
    ...folderPath.map((f, idx) => ({
      label: f.name,
      onClick: () => setFolderPath(folderPath.slice(0, idx + 1)),
    })),
  ]

  const handleUploadComplete = () => {
    setUploadOpen(false);
    void fetchDriveContents(activeDriveId, currentFolderId);
  }

  const handleDeleteClick = (id: string) => {
    setDeleteData({ open: true, fileId: id });
  }

  const handleConfirmDelete = async () => {
    if (deleteData.fileId) {
       try {
         await api.post(`/delete/${deleteData.fileId}`);
         setSelectedFiles((prev) => prev.filter((fid) => fid !== deleteData.fileId));
         void fetchDriveContents(activeDriveId, currentFolderId);
       } catch (err) {
         console.error('Delete failed', err);
       }
    } else if (deleteData.fileIds) {
       // Bulk delete
       for (const id of deleteData.fileIds) {
         try {
           await api.post(`/delete/${id}`);
         } catch (err) {
           console.error(`Delete failed for ${id}`, err);
         }
       }
       setSelectedFiles([]);
       void fetchDriveContents(activeDriveId, currentFolderId);
    }
    setDeleteData({ open: false });
  }

  const handleDownloadClick = async (id: string) => {
    if (id.startsWith('folder-')) return
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
        const decrypted = await decryptBlobWithWallet(account, contentRes.data as Blob, crypto.encryptedKey, crypto.iv)
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

  const handleShareClick = (id: string) => {
    setShareData({ open: true, fileId: id });
  }
  const handleViewClick = async (id: string) => {
    if (id.startsWith('folder-')) return
    const file = files.find((f) => f.id === id)
    setViewer({ open: true, fileId: id, fileName: file?.name })
  }
  const handleOpenComments = (id: string) => {
    const file = files.find((f) => f.id === id)
    setComments({ open: true, fileId: id, fileName: file?.name })
  }
  const handleAnchorSelected = async () => {
    if (!selectedFiles.length) return
    if (selectedFiles[0].startsWith('folder-')) return
    const id = selectedFiles[0]
    try {
      const res = await api.post(`/files/${id}/anchor`)
      const txHash = res.data?.txHash
      alert(txHash ? `Anchored on blockchain.\nTx: ${txHash}` : 'Anchor submitted.')
      await fetchDriveContents(activeDriveId, currentFolderId)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to anchor file')
    }
  }

  const handleCreateFolder = async (folderName: string) => {
    if (!activeDriveId) return
    await api.post(`/api/drives/${activeDriveId}/folders`, {
      name: folderName,
      parentFolderId: currentFolderId,
    })
    await fetchDriveContents(activeDriveId, currentFolderId)
  }

  const handleCreateDrive = async () => {
    const name = window.prompt('Enter shared drive name')
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

  const handleInvite = async () => {
    if (!activeDriveId) return
    const identifier = window.prompt('Invite user (username or wallet)')
    if (!identifier?.trim()) return
    const roleChoice = window.prompt('Role for invited user: admin, editor, or viewer', 'viewer') || 'viewer'
    try {
      await api.post(`/api/drives/${activeDriveId}/invite`, {
        identifier: identifier.trim(),
        role: roleChoice,
      })
      alert('User invited successfully')
    } catch (err: any) {
      console.error('Invite failed', err)
      alert(err?.response?.data?.error || 'Failed to invite user')
    }
  }

  const handleConfirmShare = async (
    username: string,
    role: 'viewer' | 'editor',
    options?: { skipUncached?: boolean }
  ) => {
    if (!account) throw new Error('Connect wallet first')
    setShareProgressLabel('Resolving recipient...')
    setShareProgressPercent(10)
    const targetRes = await api.get(`/share-target?identifier=${encodeURIComponent(username)}`)
    const targetPublicKey = targetRes?.data?.encryptionPublicKey as string | null
    if (!targetPublicKey) {
      setShareProgressLabel('')
      setShareProgressPercent(0)
      throw new Error('Recipient has no encryption key. Ask them to login once with MetaMask.')
    }

    setShareProgressLabel('Preparing file keys...')
    setShareProgressPercent(25)
    const keyShares: Record<string, any> = {}
    const encryptableFiles = fileRows.filter((f) => Boolean(f.encryption?.ownerEncryptedKey))
    const total = Math.max(1, encryptableFiles.length)
    let done = 0
    let skipped = 0
    for (const f of fileRows) {
      if (!f.encryption?.ownerEncryptedKey) continue
      let rawKey = getCachedFileKeyByCid(f.cid)
      if (!rawKey) {
        if (options?.skipUncached) {
          skipped += 1
          done += 1
          setShareProgressLabel(`Skipping uncached key for ${f.name}`)
          setShareProgressPercent(25 + (done / total) * 55)
          continue
        }
        setShareProgressLabel(`Approve MetaMask to decrypt key for ${f.name}...`)
        // Keep progress moving while waiting for wallet confirmation.
        const base = 25 + (done / total) * 55
        let pulse = 0
        const ticker = window.setInterval(() => {
          pulse = (pulse + 1) % 6
          setShareProgressPercent(Math.min(89, base + pulse * 1.5))
        }, 350)
        try {
          rawKey = await decryptWithMetaMask(account, f.encryption.ownerEncryptedKey)
        } finally {
          window.clearInterval(ticker)
        }
        if (f.cid) cacheFileKeyByCid(f.cid, rawKey)
      }
      setShareProgressLabel(`Encrypting key for ${f.name}...`)
      keyShares[String(f.id)] = encryptForPublicKey(targetPublicKey, rawKey)
      done += 1
      setShareProgressPercent(25 + (done / total) * 55)
    }

    setShareProgressLabel('Sending secure share...')
    setShareProgressPercent(90)
    await api.post('/drive/share', { username, role, keyShares })
    if (options?.skipUncached && skipped > 0) {
      alert(`Shared with ${Object.keys(keyShares).length} file keys. Skipped ${skipped} uncached file(s).`)
    }
    setShareProgressLabel('Done')
    setShareProgressPercent(100)
    fetchDriveContents(activeDriveId, currentFolderId)
    setTimeout(() => {
      setShareProgressLabel('')
      setShareProgressPercent(0)
    }, 300)
  }

  // if (!isConnected) {
  //   return <PublicLanding />
  // }

  return (
    <MainLayout title="My Drive" onSearch={setSearchQuery}>
      <BreadcrumbNav items={breadcrumbItems} />
      
      {/* Action bar */}
      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <select
            value={activeDriveId}
            onChange={(e) => {
              setActiveDriveId(e.target.value)
              setFolderPath([])
              setSelectedFiles([])
            }}
            className="border border-input bg-background rounded-md px-3 py-2 text-sm min-w-[220px]"
          >
            {drives.map((drive) => (
              <option key={String(drive.id)} value={String(drive.id)}>
                {drive.name} {drive.personal ? '(Default)' : ''}
              </option>
            ))}
          </select>
          <Button onClick={() => setNewFolderOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
          <Button variant="outline" onClick={handleCreateDrive}>New Shared Drive</Button>
          <Button variant="outline" onClick={handleInvite}>Invite</Button>
          <Button variant="outline" className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>
        <div className="flex items-center gap-4">
          {(role === 'uploader' || role === 'admin') && (
            <div className="text-xs text-muted-foreground">Remaining quota: {Math.max(0, Math.floor(remainingBytes / 1024 / 1024))} MB</div>
          )}
          <div className="text-sm text-muted-foreground">
            {filteredFiles.length} items
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* File grid or list */}
      <div className="p-6">
        {view === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onFolderOpen={(folder: any) => {
              if (folder?.type === 'folder' && Number.isFinite(folder.folderId)) {
                setFolderPath((prev) => [...prev, { id: Number(folder.folderId), name: folder.name }])
                setSelectedFiles([])
              }
            }}
            onDelete={handleDeleteClick}
            onDownload={handleDownloadClick}
            onShare={handleShareClick}
            onView={handleViewClick}
          />
        ) : (
          <FileList
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onFolderOpen={(folder: any) => {
              if (folder?.type === 'folder' && Number.isFinite(folder.folderId)) {
                setFolderPath((prev) => [...prev, { id: Number(folder.folderId), name: folder.name }])
                setSelectedFiles([])
              }
            }}
            onDelete={handleDeleteClick}
            onDownload={handleDownloadClick}
            onShare={handleShareClick}
            onView={handleViewClick}
          />
        )}
      </div>
      <div className="px-6 pb-6">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!selectedFiles.length || selectedFiles[0]?.startsWith('folder-')} onClick={() => handleOpenComments(selectedFiles[0])}>
            <MessageSquare className="h-4 w-4" />
            Comments
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedFiles.length || role === 'commenter' || selectedFiles[0]?.startsWith('folder-')}
            onClick={handleAnchorSelected}
          >
            <Link2 className="h-4 w-4" />
            Anchor Selected
          </Button>
        </div>
      </div>

      <DeleteDialog 
        open={deleteData.open} 
        onOpenChange={(open) => setDeleteData((prev) => ({ ...prev, open }))}
        itemName={deleteData.fileId ? files.find(f => f.id === deleteData.fileId)?.name || 'File' : 'Selected Files'}
        itemCount={deleteData.fileIds?.length}
        onConfirm={handleConfirmDelete}
      />

      <ShareDialog
        open={shareData.open}
        onOpenChange={(open) => setShareData((prev) => ({ ...prev, open }))}
        itemName="My Drive"
        onShare={handleConfirmShare}
        progressLabel={shareProgressLabel}
        progressPercent={shareProgressPercent}
      />

      <NewFolderDialog
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Upload zone */}
      <UploadZone
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

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
