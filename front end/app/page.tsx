'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { UploadZone } from '@/components/upload-zone'
import { NewFolderDialog } from '@/components/new-folder-dialog'
import { DeleteDialog } from '@/components/delete-dialog'
import { ShareDialog } from '@/components/share-dialog'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { Button } from '@/components/ui/button'
import { Link2, MessageSquare, Plus, Upload } from 'lucide-react'
import { PublicLanding } from '@/components/public-landing'
import { useFileNavigation } from '@/hooks/use-file-navigation'
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
  const [files, setFiles] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })
  
  const navigation = useFileNavigation(files)

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files')
      // Map API response to UI expected format
      const mappedFiles = res.data.map((f: any) => ({
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
      }))
      setFiles(mappedFiles)
    } catch (err) {
      console.error('Failed to fetch files', err)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchFiles()
    } else {
      setFiles([])
    }
  }, [isConnected])

  const filteredFiles = useMemo(() => {
    const searched = navigation.contents.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return sortFilesByTypeFromScratch(searched)
  }, [navigation.contents, searchQuery])

  const handleSelectFile = (id: string, selected: boolean = !selectedFiles.includes(id)) => {
    setSelectedFiles((prev) =>
      selected ? [...prev, id] : prev.filter((fid) => fid !== id)
    )
  }

  const breadcrumbItems = navigation.breadcrumbs.map((item: any) => ({
    ...item,
    onClick: () => navigation.navigateToPath(item.path),
  }))

  const handleUploadComplete = () => {
    setUploadOpen(false);
    fetchFiles();
  }

  const handleDeleteClick = (id: string) => {
    setDeleteData({ open: true, fileId: id });
  }

  const handleConfirmDelete = async () => {
    if (deleteData.fileId) {
       try {
         await api.post(`/delete/${deleteData.fileId}`);
         setSelectedFiles((prev) => prev.filter((fid) => fid !== deleteData.fileId));
         fetchFiles();
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
       fetchFiles();
    }
    setDeleteData({ open: false });
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
      await fetchFiles()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to anchor file')
    }
  }

  const handleCreateFolder = (folderName: string) => {
    const now = new Date().toLocaleDateString()
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      size: '--',
      modified: now,
      created: now,
      owner: 'You',
      shared: false,
      starred: false,
      children: [],
      isOnBlockchain: false,
    }

    setFiles((prev) => [newFolder, ...prev])
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
    const encryptableFiles = files.filter((f) => Boolean(f.encryption?.ownerEncryptedKey))
    const total = Math.max(1, encryptableFiles.length)
    let done = 0
    let skipped = 0
    for (const f of files) {
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
    fetchFiles()
    setTimeout(() => {
      setShareProgressLabel('')
      setShareProgressPercent(0)
    }, 300)
  }

  if (!isConnected) {
    return <PublicLanding />
  }

  return (
    <MainLayout title="My Files" onSearch={setSearchQuery}>
      <BreadcrumbNav items={breadcrumbItems.slice(1)} onNavigate={navigation.navigateToPath} />
      
      {/* Action bar */}
      <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setNewFolderOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
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
            onFolderOpen={navigation.openFolder}
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
            onFolderOpen={navigation.openFolder}
            onDelete={handleDeleteClick}
            onDownload={handleDownloadClick}
            onShare={handleShareClick}
            onView={handleViewClick}
          />
        )}
      </div>
      <div className="px-6 pb-6">
        <div className="flex gap-2">
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
