'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useWeb3 } from '@/context/web3-context'
import { decryptBlobWithWallet } from '@/lib/file-crypto'

interface FileViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileId?: string
  fileName?: string
  viewUrl?: string | null
}

export function FileViewerModal({ open, onOpenChange, fileId, fileName, viewUrl }: FileViewerModalProps) {
  const { account } = useWeb3()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [contentType, setContentType] = useState<string>('')
  const [textContent, setTextContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string>('')
  const [cryptoMeta, setCryptoMeta] = useState<any>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    const load = async () => {
      if (!open || !fileId) return
      setLoading(true)
      setError('')
      setActionError('')
      setTextContent('')
      setBlobUrl(null)
      setGatewayUrl(null)
      setCryptoMeta(null)
      try {
        const [res, metaRes] = await Promise.all([
          api.get(`/files/${fileId}/content`, { responseType: 'blob' }),
          api.get(`/files/${fileId}/crypto`),
        ])
        const blob = res.data as Blob
        const meta = metaRes?.data || {}
        setCryptoMeta(meta)

        if (meta?.isEncrypted) {
          if (!account) throw new Error('Connect wallet to decrypt this file')
          const decrypted = await decryptBlobWithWallet(account, blob, meta.encryptedKey, meta.iv)
          const plainBlob = new Blob([decrypted], {
            type: meta.originalMimeType || 'application/octet-stream',
          })
          const type = plainBlob.type || ''
          setContentType(type)
          if (type.startsWith('text/') || type.includes('json')) {
            const txt = await plainBlob.text()
            setTextContent(txt)
          } else {
            objectUrl = URL.createObjectURL(plainBlob)
            setBlobUrl(objectUrl)
          }
        } else {
          const type = blob.type || ''
          setContentType(type)
          if (type.startsWith('text/') || type.includes('json')) {
            const txt = await blob.text()
            setTextContent(txt)
          } else {
            objectUrl = URL.createObjectURL(blob)
            setBlobUrl(objectUrl)
          }
        }
      } catch (e: any) {
        // Axios + responseType:'blob' returns errors as Blob too; parse if possible.
        try {
          const maybeBlob = e?.response?.data
          if (maybeBlob && typeof maybeBlob === 'object' && typeof maybeBlob.text === 'function') {
            const raw = await maybeBlob.text()
            try {
              const parsed = JSON.parse(raw)
              setError(parsed?.error || raw || 'Failed to load file')
            } catch {
              setError(raw || 'Failed to load file')
            }
          } else {
            setError(e?.response?.data?.error || e?.message || 'Failed to load file')
          }
        } catch {
          setError('Failed to load file')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, fileId, account])

  const isImage = useMemo(() => contentType.startsWith('image/'), [contentType])
  const isPdf = useMemo(() => contentType.includes('pdf'), [contentType])
  const ext = useMemo(() => (fileName || '').split('.').pop()?.toLowerCase() || '', [fileName])
  const isOffice =
    useMemo(
      () =>
        ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'key', 'pages', 'numbers'].includes(ext) ||
        contentType.includes('officedocument') ||
        contentType.includes('msword') ||
        contentType.includes('mspowerpoint') ||
        contentType.includes('vnd.ms-powerpoint') ||
        contentType.includes('vnd.ms-excel'),
      [ext, contentType]
    )

  const ensureGatewayUrl = async () => {
    if (!fileId) return null
    if (gatewayUrl) return gatewayUrl
    try {
      const res = await api.get(`/files/${fileId}/view-url`)
      const url = res?.data?.url as string | undefined
      if (url) {
        setGatewayUrl(url)
        return url
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed to get IPFS viewer URL')
    }
    return null
  }

  const handleOpenGateway = async () => {
    setActionError('')
    const url = (await ensureGatewayUrl()) || viewUrl
    if (!url) {
      setActionError('No viewer URL available')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async () => {
    if (!fileId) return
    setActionError('')
    try {
      const res = await api.post(`/files/${fileId}/link`, { expiresInMinutes: 60 })
      const url = res?.data?.url as string | undefined
      if (!url) throw new Error('Missing download URL')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      setActionError(e?.response?.data || e?.response?.data?.error || 'Download not allowed for this share')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] w-[90vw] max-w-6xl">
        <DialogHeader>
          <DialogTitle>{fileName || 'File Viewer'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading file...</div>
        ) : error ? (
          <div className="p-4 space-y-3">
            {isOffice ? (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Preview isn’t supported for this file type ({ext.toUpperCase()}).
                </div>
                <div className="text-xs text-destructive">{error}</div>
              </div>
            ) : (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleOpenGateway} disabled={!fileId}>
                Open via IPFS gateway
              </Button>
              <Button onClick={handleDownload} disabled={!fileId}>
                Download
              </Button>
            </div>
            {actionError && <div className="text-xs text-destructive">{actionError}</div>}
          </div>
        ) : textContent ? (
          <pre className="h-full w-full overflow-auto rounded border bg-muted p-4 text-sm">{textContent}</pre>
        ) : blobUrl && isImage ? (
          <div className="flex h-full items-center justify-center rounded border bg-muted/30 p-2">
            <img src={blobUrl} alt={fileName || 'file'} className="max-h-full max-w-full object-contain" />
          </div>
        ) : blobUrl && isPdf ? (
          <iframe title={fileName || 'file-viewer'} src={blobUrl} className="h-full w-full rounded border" />
        ) : blobUrl && isOffice ? (
          <div className="p-6 h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="text-sm text-muted-foreground">
              Preview isn’t supported for this file type ({ext.toUpperCase()}).
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleOpenGateway} disabled={!fileId}>
                Open via IPFS gateway
              </Button>
              <Button onClick={handleDownload} disabled={!fileId}>
                Download
              </Button>
            </div>
            {actionError && <div className="text-xs text-destructive">{actionError}</div>}
          </div>
        ) : viewUrl ? (
          <iframe title={fileName || 'file-viewer'} src={viewUrl} className="h-full w-full rounded border" />
        ) : blobUrl ? (
          <div className="p-4 text-sm">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Preview isn’t available for this file type.</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleOpenGateway} disabled={!fileId}>
                  Open via IPFS gateway
                </Button>
                <Button onClick={handleDownload} disabled={!fileId}>
                  Download
                </Button>
              </div>
              {actionError && <div className="text-xs text-destructive">{actionError}</div>}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No viewer URL available.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

