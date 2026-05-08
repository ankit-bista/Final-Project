'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { FileGrid } from '@/components/file-grid'
import { FileList } from '@/components/file-list'
import { ViewToggle } from '@/components/view-toggle'
import { FileViewerModal } from '@/components/file-viewer-modal'
import { FileCommentsPanel } from '@/components/file-comments-panel'
import { UploadZone } from '@/components/upload-zone'
import { ShareDialog, DeleteDialog } from '@/components/file-dialogs'
import { Button } from '@/components/ui/button'
import { PublicLanding } from '@/components/public-landing'
import { Link2, MessageSquare, Upload } from 'lucide-react'
import api from '@/lib/api'
import { useWeb3 } from '@/context/web3-context'
import { cacheFileKeyByCid, decryptBlobWithWallet, decryptWithMetaMask, encryptForPublicKey, getCachedFileKeyByCid } from '@/lib/file-crypto'
import { sortFilesByTypeFromScratch } from '@/lib/file-sort'

type Tab = 'my' | 'shared' | 'recent'

export default function CombinedPage() {
  const { isConnected, role, account } = useWeb3()
  const [tab, setTab] = useState<Tab>('my')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [myFiles, setMyFiles] = useState<any[]>([])
  const [sharedFiles, setSharedFiles] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewer, setViewer] = useState<{ open: boolean; fileId?: string; fileName?: string; url?: string }>({ open: false })
  const [comments, setComments] = useState<{ open: boolean; fileId?: string; fileName?: string }>({ open: false })
  const [shareData, setShareData] = useState<{ open: boolean; fileId?: string }>({ open: false })
  const [shareProgressLabel, setShareProgressLabel] = useState('')
  const [shareProgressPercent, setShareProgressPercent] = useState(0)
  const [deleteData, setDeleteData] = useState<{ open: boolean; fileId?: string }>({ open: false })

  const mapFile = (f: any, isShared = false) => ({
    id: String(f.id),
    name: f?.encryption?.originalName || f.filename,
    type: 'file',
    size: f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
    modified: new Date().toLocaleDateString(),
    shared: isShared,
    cid: f.cid,
    customHash: f.custom_hash,
    txHash: f.tx_hash || null,
    isOnBlockchain: Boolean(f.tx_hash),
    encryption: f.encryption || null,
  })

  const loadAll = async () => {
    const [mineRes, sharedRes] = await Promise.all([api.get('/files'), api.get('/shared-with-me')])
    setMyFiles((mineRes.data || []).map((f: any) => mapFile(f, false)))
    setSharedFiles((sharedRes.data || []).map((f: any) => mapFile(f, true)))
  }

  useEffect(() => {
    void loadAll()
  }, [isConnected])

  const baseFiles = useMemo(() => {
    if (tab === 'my') return myFiles
    if (tab === 'shared') return sharedFiles
    return [...myFiles].sort((a, b) => Number(b.id) - Number(a.id))
  }, [tab, myFiles, sharedFiles])

  const files = useMemo(
    () => sortFilesByTypeFromScratch(baseFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))),
    [baseFiles, search]
  )

  const handleView = async (id: string) => {
    const file = files.find((f) => f.id === id)
    setViewer({ open: true, fileId: id, fileName: file?.name })
  }

  const handleDownload = async (id: string) => {
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
  }

  const handleAnchor = async () => {
    if (!selectedFiles.length) return
    const id = selectedFiles[0]
    await api.post(`/files/${id}/anchor`)
    await loadAll()
  }

  const handleDelete = async () => {
    if (!deleteData.fileId) return
    await api.post(`/delete/${deleteData.fileId}`)
    setDeleteData({ open: false })
    await loadAll()
  }

  // if (!isConnected) return <PublicLanding />

  return (
    <MainLayout title="Combined Workspace" onSearch={setSearch}>
      <BreadcrumbNav items={[{ label: 'Combined' }]} />

      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={tab === 'my' ? 'default' : 'outline'} onClick={() => { setTab('my'); setSelectedFiles([]) }}>My Files</Button>
          <Button variant={tab === 'shared' ? 'default' : 'outline'} onClick={() => { setTab('shared'); setSelectedFiles([]) }}>Shared</Button>
          <Button variant={tab === 'recent' ? 'default' : 'outline'} onClick={() => { setTab('recent'); setSelectedFiles([]) }}>Recent</Button>
          {(tab === 'my' || tab === 'recent') && (
            <Button variant="outline" className="gap-2" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          )}
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="p-6">
        {view === 'grid' ? (
          <FileGrid
            files={files}
            selectedFiles={selectedFiles}
            onSelectFile={(id) => setSelectedFiles((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
            onView={handleView}
            onDownload={handleDownload}
            onShare={(id) => setShareData({ open: true, fileId: id })}
            onDelete={(id) => setDeleteData({ open: true, fileId: id })}
          />
        ) : (
          <FileList
            files={files}
            selectedFiles={selectedFiles}
            onSelectFile={(id, selected) => setSelectedFiles((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)))}
            onView={handleView}
            onDownload={handleDownload}
            onShare={(id) => setShareData({ open: true, fileId: id })}
            onDelete={(id) => setDeleteData({ open: true, fileId: id })}
          />
        )}

        <div className="pt-4 flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!selectedFiles.length} onClick={() => {
            const f = files.find((x) => x.id === selectedFiles[0])
            setComments({ open: true, fileId: selectedFiles[0], fileName: f?.name })
          }}>
            <MessageSquare className="h-4 w-4" />
            Comments
          </Button>
          <Button variant="outline" className="gap-2" disabled={!selectedFiles.length || role === 'commenter'} onClick={handleAnchor}>
            <Link2 className="h-4 w-4" />
            Anchor Selected
          </Button>
        </div>
      </div>

      <UploadZone isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUploadComplete={() => { setUploadOpen(false); void loadAll() }} />
      <ShareDialog
        open={shareData.open}
        onOpenChange={(open) => setShareData((prev) => ({ ...prev, open }))}
        itemName="My Drive"
        onShare={async (username, role, options) => {
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
          const encryptableFiles = myFiles.filter((f) => Boolean(f.encryption?.ownerEncryptedKey))
          const total = Math.max(1, encryptableFiles.length)
          let done = 0
          let skipped = 0
          for (const f of myFiles) {
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
          await loadAll()
          setTimeout(() => {
            setShareProgressLabel('')
            setShareProgressPercent(0)
          }, 300)
        }}
        progressLabel={shareProgressLabel}
        progressPercent={shareProgressPercent}
      />
      <DeleteDialog
        open={deleteData.open}
        onOpenChange={(open) => setDeleteData((prev) => ({ ...prev, open }))}
        itemName={deleteData.fileId ? files.find((f) => f.id === deleteData.fileId)?.name || 'File' : 'File'}
        onConfirm={handleDelete}
      />
      <FileViewerModal open={viewer.open} onOpenChange={(open) => setViewer((p) => ({ ...p, open }))} fileId={viewer.fileId} fileName={viewer.fileName} viewUrl={viewer.url} />
      <FileCommentsPanel open={comments.open} onOpenChange={(open) => setComments((p) => ({ ...p, open }))} fileId={comments.fileId} fileName={comments.fileName} />
    </MainLayout>
  )
}

