'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { useWeb3 } from '@/context/web3-context'
import api from '@/lib/api'
import { getApiErrorMessage } from '@/lib/error-message'
import {
  User,
  Folder,
  File,
  Trash2,
  Pencil,
  Layers,
  Database,
  UserCheck,
  Shield,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UserItem {
  id: number
  name: string
  type: 'file' | 'folder'
  size: number | null
  dateAdded: string
}

interface UserDrive {
  id: number
  name: string
  personal: boolean
  my_role: string
  file_count: number
}

function formatBytes(bytes: number | null, decimals = 2) {
  if (bytes === null) return '—'
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function SettingsDashboardPage() {
  const { account, role } = useWeb3()
  const [activeTab, setActiveTab] = useState<'profile' | 'files' | 'drives'>('profile')

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Profile State
  const [profileName, setProfileName] = useState('')
  const [profileInfo, setProfileInfo] = useState<any>(null)

  // Files & Folders State
  const [items, setItems] = useState<UserItem[]>([])
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  // Drives State
  const [drives, setDrives] = useState<UserDrive[]>([])
  const [renameTarget, setRenameTarget] = useState<UserDrive | null>(null)
  const [renameName, setRenameName] = useState('')
  const [deleteDriveTarget, setDeleteDriveTarget] = useState<UserDrive | null>(null)

  // Load profile information
  const loadProfile = async () => {
    try {
      const res = await api.get('/me')
      setProfileInfo(res.data)
      setProfileName(res.data.fullName || '')
    } catch (err) {
      console.error('Failed to load profile', err)
      setError(getApiErrorMessage(err, 'Failed to load profile'))
    }
  }

  // Load personal files and folders
  const loadItems = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/user/items')
      setItems(res.data || [])
    } catch (err) {
      console.error('Failed to load files and folders', err)
      setError(getApiErrorMessage(err, 'Failed to load files and folders'))
    } finally {
      setLoading(false)
    }
  }

  // Load drives
  const loadDrives = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/drives/me')
      setDrives(res.data || [])
    } catch (err) {
      console.error('Failed to load drives', err)
      setError(getApiErrorMessage(err, 'Failed to load drives'))
    } finally {
      setLoading(false)
    }
  }

  // Effect to load tab data
  useEffect(() => {
    setError(null)
    setSuccessMsg(null)
    if (activeTab === 'profile') {
      void loadProfile()
    } else if (activeTab === 'files') {
      void loadItems()
    } else if (activeTab === 'drives') {
      void loadDrives()
    }
  }, [activeTab])

  // Profile Update Handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    try {
      setLoading(true)
      await api.patch('/api/user/profile', { fullName: profileName })
      setSuccessMsg('Profile name updated successfully!')
      void loadProfile()
    } catch (err) {
      console.error('Failed to update profile name', err)
      setError(getApiErrorMessage(err, 'Failed to update profile name'))
    } finally {
      setLoading(false)
    }
  }

  // File/Folder Delete Handler
  const handleDeleteItem = async () => {
    if (!deleteTarget) return
    setError(null)
    setSuccessMsg(null)
    try {
      setLoading(true)
      if (deleteTarget.type === 'file') {
        await api.delete(`/api/files/${deleteTarget.id}`)
      } else {
        await api.delete(`/api/folders/${deleteTarget.id}`)
      }
      setSuccessMsg(`${deleteTarget.type === 'file' ? 'File' : 'Folder'} deleted successfully!`)
      setDeleteTarget(null)
      void loadItems()
    } catch (err) {
      console.error('Failed to delete item', err)
      setError(getApiErrorMessage(err, 'Failed to delete item'))
    } finally {
      setLoading(false)
    }
  }

  // Drive Rename Handler
  const handleRenameDrive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTarget || !renameName.trim()) return
    setError(null)
    setSuccessMsg(null)
    try {
      setLoading(true)
      await api.patch(`/api/drives/${renameTarget.id}`, { name: renameName.trim() })
      setSuccessMsg('Drive renamed successfully!')
      setRenameTarget(null)
      setRenameName('')
      void loadDrives()
    } catch (err) {
      console.error('Failed to rename drive', err)
      setError(getApiErrorMessage(err, 'Failed to rename drive'))
    } finally {
      setLoading(false)
    }
  }

  // Drive Delete Handler
  const handleDeleteDrive = async () => {
    if (!deleteDriveTarget) return
    setError(null)
    setSuccessMsg(null)
    try {
      setLoading(true)
      await api.delete(`/api/drives/${deleteDriveTarget.id}`)
      setSuccessMsg('Collaborative drive deleted successfully!')
      setDeleteDriveTarget(null)
      void loadDrives()
    } catch (err) {
      console.error('Failed to delete drive', err)
      setError(getApiErrorMessage(err, 'Failed to delete drive'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title="Settings & Admin" isAdmin={role === 'admin'}>
      <BreadcrumbNav items={[{ label: 'Settings & Admin' }]} />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your personal profile, files, folders, and collaborative drives.</p>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm rounded-lg animate-in fade-in duration-300">
            <UserCheck className="w-4 h-4 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground shadow-sm animate-in fade-in duration-100'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              Account Settings
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'files'
                  ? 'bg-primary text-primary-foreground shadow-sm animate-in fade-in duration-100'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Folder className="w-4 h-4" />
              File & Folder Management
            </button>
            <button
              onClick={() => setActiveTab('drives')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === 'drives'
                  ? 'bg-primary text-primary-foreground shadow-sm animate-in fade-in duration-100'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              Drive Management
            </button>
          </div>

          {/* Right Active Panel */}
          <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6 shadow-sm">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Account Settings</h2>
                  <p className="text-xs text-muted-foreground">Update your identity and review your access limits.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Alice Smith"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Update Profile
                  </Button>
                </form>

                {profileInfo && (
                  <div className="border-t border-border pt-6 grid gap-4 sm:grid-cols-2 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Wallet Address</p>
                      <p className="font-mono text-xs break-all bg-muted p-2 rounded border border-border text-foreground">{account}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Username Identifier</p>
                      <p className="font-semibold text-foreground">{profileInfo.username || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Current Role</p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                        <Shield className="w-3 h-3" />
                        {profileInfo.role}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Storage Quota Limit</p>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {formatBytes(profileInfo.usedBytes)} of {formatBytes(profileInfo.quotaBytes)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">File & Folder Management</h2>
                  <p className="text-xs text-muted-foreground">List and safely clean up the items you have added.</p>
                </div>

                {loading && items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    Loading your files and folders...
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl gap-2 text-muted-foreground text-sm">
                    <Database className="w-8 h-8 text-muted-foreground" />
                    No files or folders found.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                          <th className="p-3">Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Size</th>
                          <th className="p-3">Date Added</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {items.map((item) => (
                          <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/30">
                            <td className="p-3 font-medium text-foreground flex items-center gap-2">
                              {item.type === 'folder' ? (
                                <Folder className="w-4 h-4 text-primary shrink-0" />
                              ) : (
                                <File className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate max-w-[200px]" title={item.name}>
                                {item.name}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground capitalize">{item.type}</td>
                            <td className="p-3 text-muted-foreground">{formatBytes(item.size)}</td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(item.dateAdded).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(item)}
                                className="text-destructive hover:bg-destructive/10 font-bold"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'drives' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Drive Management</h2>
                  <p className="text-xs text-muted-foreground">Review your personal storage drive and collaborative spaces.</p>
                </div>

                {loading && drives.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    Loading your drives...
                  </div>
                ) : drives.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl gap-2 text-muted-foreground text-sm">
                    <Layers className="w-8 h-8 text-muted-foreground" />
                    No drives found.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                          <th className="p-3">Drive Name</th>
                          <th className="p-3">Drive Type</th>
                          <th className="p-3">Total Files</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {drives.map((d) => (
                          <tr key={d.id} className="hover:bg-muted/30">
                            <td className="p-3 font-semibold text-foreground">{d.name}</td>
                            <td className="p-3 text-muted-foreground">
                              {d.personal ? 'Personal' : 'Collaborative'}
                            </td>
                            <td className="p-3 text-muted-foreground">{d.file_count} files</td>
                            <td className="p-3 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRenameTarget(d)
                                  setRenameName(d.name)
                                }}
                                className="text-muted-foreground hover:bg-muted font-bold"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={d.personal}
                                onClick={() => setDeleteDriveTarget(d)}
                                className={`text-destructive font-bold ${
                                  d.personal ? 'opacity-30 cursor-not-allowed' : 'hover:bg-destructive/10'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Item Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border w-full max-w-md rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground capitalize">Delete {deleteTarget.type}</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete the {deleteTarget.type}{' '}
                <span className="font-semibold text-foreground">"{deleteTarget.name}"</span>?
              </p>
              {deleteTarget.type === 'folder' && (
                <p className="text-destructive font-medium text-xs bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  Warning: Deleting a folder recursively deletes all files and folders inside it. This action cannot be undone.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteItem} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Drive Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleRenameDrive}
            className="bg-background border border-border w-full max-w-md rounded-xl p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Rename Drive</h3>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Drive Name</label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="New drive name"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Drive Confirmation Modal */}
      {deleteDriveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border w-full max-w-md rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Delete Shared Drive</h3>
              <button
                onClick={() => setDeleteDriveTarget(null)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Are you sure you want to delete the collaborative drive{' '}
                <span className="font-semibold text-foreground">"{deleteDriveTarget.name}"</span>?
              </p>
              <p className="text-destructive font-medium text-xs bg-destructive/10 p-2.5 rounded border border-destructive/20">
                Warning: Deleting a drive completely deletes all files, folders, drive members, and logs associated with it. This action is permanent.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteDriveTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteDrive} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
