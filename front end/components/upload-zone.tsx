'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import api from '@/lib/api'
import { cacheFileKeyByCid, encryptFileInBrowser, getMyEncryptionPublicKey } from '@/lib/file-crypto'
import { useWeb3 } from '@/context/web3-context'

interface UploadZoneProps {
  onFilesSelected?: (files: File[]) => void
  onUploadComplete?: () => void
  isOpen?: boolean
  onClose?: () => void
}

export function UploadZone({
  onFilesSelected,
  onUploadComplete,
  isOpen = false,
  onClose,
}: UploadZoneProps) {
  const { account } = useWeb3()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [filename, setFilename] = useState('')
  const [description, setDescription] = useState('')
  const [drives, setDrives] = useState<any[]>([])
  const [selectedDriveId, setSelectedDriveId] = useState<string>('')
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDrives = async () => {
    try {
      const res = await api.get('/api/drives/me')
      const rows = res.data || []
      setDrives(rows)
      const defaultDrive = rows.find((d: any) => d.personal) || rows[0]
      if (defaultDrive?.id) setSelectedDriveId(String(defaultDrive.id))
    } catch (err) {
      console.error('Failed to load drives', err)
    }
  }

  const loadFolders = async (driveId: string) => {
    if (!driveId) return setFolders([])
    try {
      const res = await api.get(`/api/drives/${driveId}/folders`)
      setFolders(res.data || [])
    } catch (err) {
      console.error('Failed to load folders', err)
      setFolders([])
    }
  }

  useEffect(() => {
    if (isOpen) void loadDrives()
  }, [isOpen])

  useEffect(() => {
    if (selectedDriveId) void loadFolders(selectedDriveId)
  }, [selectedDriveId])

  useEffect(() => {
    if (!drives.length) return
    const selected = drives.find((d: any) => String(d.id) === String(selectedDriveId))
    const selectedRole = String(selected?.my_role || '')
    const canWriteSelected = selectedRole === 'admin' || selectedRole === 'editor'
    if (!selected || !canWriteSelected) {
      const firstWritable = drives.find((d: any) => {
        const role = String(d?.my_role || '')
        return role === 'admin' || role === 'editor'
      })
      if (firstWritable?.id) {
        setSelectedDriveId(String(firstWritable.id))
        setSelectedFolderId('')
      }
    }
  }, [drives, selectedDriveId])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFilesSelected(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || [])
    handleFilesSelected(files)
  }

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    if (files.length === 1) {
      setFilename(files[0].name)
    } else {
      setFilename('')
    }
    onFilesSelected?.(files)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!account) {
      alert('Connect wallet first')
      return
    }
    const selectedDrive = drives.find((d: any) => String(d.id) === String(selectedDriveId))
    const selectedRole = String(selectedDrive?.my_role || '')
    const canWriteToDrive = selectedRole === 'admin' || selectedRole === 'editor'
    if (selectedDrive && !canWriteToDrive) {
      alert('You only have viewer access on this drive. Select a drive where you are admin/editor to upload.')
      return
    }
    setIsUploading(true);
    
    try {
      const ownerPublicKey = await getMyEncryptionPublicKey(account)
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { encryptedFile, encryption, keyBase64 } = await encryptFileInBrowser(file, ownerPublicKey)
        const formData = new FormData();
        formData.append('file', encryptedFile);
        
        // If multiple files, we append the original name unless explicitly set for one file
        if (selectedFiles.length === 1 && filename) {
          formData.append('filename', filename.endsWith('.enc') ? filename : `${filename}.enc`);
        } else {
          formData.append('filename', `${file.name}.enc`);
        }
        
        formData.append('description', description);
        formData.append('driveId', selectedDriveId || '');
        formData.append('folderId', selectedFolderId || '');
        formData.append('encryption', JSON.stringify(encryption))

        const uploadRes = await api.post('/upload', formData);
        if (uploadRes?.data?.cid) {
          cacheFileKeyByCid(String(uploadRes.data.cid), keyBase64)
        }
      }
      setSelectedFiles([]);
      setFilename('');
      setDescription('');
      onUploadComplete?.();
    } catch (err: any) {
      console.error('Upload failed', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data ||
        err?.message ||
        'Upload failed';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedFiles.length === 0 ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragEnter}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-muted'
                : 'border-border hover:border-primary/60'
            )}
          >
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Drag and drop your files here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to select files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto mb-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="text-sm text-muted-foreground truncate bg-muted p-2 rounded"
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            </div>

            {selectedFiles.length === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom File Name</label>
                <Input 
                  value={filename} 
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Enter file name"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Drive</label>
              <select
                value={selectedDriveId}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedDriveId(value)
                  setSelectedFolderId('')
                  void loadFolders(value)
                }}
                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
              >
                {drives.map((drive) => (
                  <option key={String(drive.id)} value={String(drive.id)}>
                    {drive.name} {drive.personal ? '(Default)' : ''} [{String(drive.my_role || 'viewer')}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Folder</label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
              >
                <option value="">Root</option>
                {folders.map((folder) => (
                  <option key={String(folder.id)} value={String(folder.id)}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description or tags here..."
                rows={3}
              />
            </div>

            <div className="mt-6 flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedFiles([])
                  setFilename('')
                  setDescription('')
                  onClose?.()
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
