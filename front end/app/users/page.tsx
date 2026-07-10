'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { UserTable } from '@/components/user-table'
import { User, formatBytes } from '@/lib/mock-data'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Database, FolderPlus, RefreshCcw, ShieldAlert, Trash2, UserPlus } from 'lucide-react'

type DriveRow = {
  id: number
  name: string
  owner_id: number
  owner_username?: string | null
  owner_wallet_address?: string | null
  quota_limit_bytes?: number
  quota_used_bytes?: number
  member_count?: number
  file_count?: number
  total_file_bytes?: number
  updated_at?: string
  created_at?: string
}

type DriveMember = {
  userId: number
  username?: string | null
  walletAddress?: string | null
  role: 'admin' | 'editor' | 'viewer'
}

type DriveFile = {
  id: number
  file_name?: string
  filename?: string
  ipfs_hash?: string
  cid?: string
  size_bytes?: number
  uploaded_by?: number
  created_at?: string
}

const shortValue = (value?: string | null) => {
  if (!value) return 'N/A'
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [drives, setDrives] = useState<DriveRow[]>([])
  const [members, setMembers] = useState<DriveMember[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [selectedDriveId, setSelectedDriveId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'uploader' | 'commenter'>('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<'admin' | 'commenter' | 'uploader'>('commenter')
  const [editingQuotaMb, setEditingQuotaMb] = useState('1024')
  const [newDriveName, setNewDriveName] = useState('')
  const [newDriveOwnerId, setNewDriveOwnerId] = useState('')
  const [newDriveQuotaMb, setNewDriveQuotaMb] = useState('0')
  const [memberIdentifier, setMemberIdentifier] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')
  const [driveQuotaMb, setDriveQuotaMb] = useState('0')

  const fetchUsers = async () => {
    const res = await api.get('/api/admin/users')
    const mappedUsers = res.data.map((u: any) => ({
      id: u.id.toString(),
      name: u.username || `User ${u.id}`,
      walletAddress: u.wallet_address || '',
      role: u.role || 'commenter',
      storageUsed: Number(u.storage_used || 0),
      storageQuota: Number(u.quota_bytes || 0),
      createdAt: new Date(u.created_at || Date.now()),
      lastLogin: u.last_login ? new Date(u.last_login) : undefined,
      isActive: u.is_active !== undefined ? !!u.is_active : true,
    }))
    setUsers(mappedUsers)
  }

  const fetchDrives = async () => {
    const res = await api.get('/api/admin/drives')
    const rows = res.data || []
    setDrives(rows)
    setSelectedDriveId((current) => current || (rows[0]?.id ? String(rows[0].id) : ''))
  }

  const refreshAll = async () => {
    try {
      await Promise.all([fetchUsers(), fetchDrives()])
    } catch (err) {
      console.error('Failed to refresh admin console', err)
    }
  }

  const fetchDriveDetails = async (driveId: string) => {
    if (!driveId) {
      setMembers([])
      setDriveFiles([])
      return
    }
    try {
      const [membersRes, filesRes] = await Promise.all([
        api.get(`/api/admin/drives/${driveId}/members`),
        api.get(`/api/admin/drives/${driveId}/files`),
      ])
      setMembers(membersRes.data || [])
      setDriveFiles(filesRes.data || [])
    } catch (err) {
      console.error('Failed to load drive details', err)
      setMembers([])
      setDriveFiles([])
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    void fetchDriveDetails(selectedDriveId)
    const active = drives.find((drive) => String(drive.id) === selectedDriveId)
    setDriveQuotaMb(String(Math.round(Number(active?.quota_limit_bytes || 0) / 1024 / 1024)))
  }, [selectedDriveId, drives])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.walletAddress.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const selectedDrive = drives.find((drive) => String(drive.id) === selectedDriveId)
  const totalUsedBytes = users.reduce((sum, user) => sum + Number(user.storageUsed || 0), 0)
  const totalDriveBytes = drives.reduce((sum, drive) => sum + Number(drive.total_file_bytes || drive.quota_used_bytes || 0), 0)

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    await api.delete(`/api/admin/users/${userId}`)
    await refreshAll()
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setEditingRole(user.role || 'commenter')
    setEditingQuotaMb(String(Math.max(0, Math.floor((user.storageQuota || 0) / 1024 / 1024))))
  }

  const handleSaveUserAccess = async () => {
    if (!editingUserId) return
    await api.post(`/api/admin/users/${editingUserId}/access`, {
      role: editingRole,
      quotaBytes: Math.max(0, Number(editingQuotaMb || 0)) * 1024 * 1024,
    })
    setEditingUserId(null)
    await fetchUsers()
  }

  const handleCreateDrive = async () => {
    if (!newDriveName.trim()) return
    const res = await api.post('/api/admin/drives', {
      name: newDriveName.trim(),
      ownerId: newDriveOwnerId ? Number(newDriveOwnerId) : undefined,
      quotaLimitBytes: Math.max(0, Number(newDriveQuotaMb || 0)) * 1024 * 1024,
    })
    setNewDriveName('')
    setNewDriveOwnerId('')
    setNewDriveQuotaMb('0')
    await fetchDrives()
    if (res.data?.id) setSelectedDriveId(String(res.data.id))
  }

  const handleDeleteDrive = async (driveId: number) => {
    if (!window.confirm('Delete this shared drive and all of its files? This cannot be undone.')) return
    await api.delete(`/api/admin/drives/${driveId}`)
    setSelectedDriveId('')
    await fetchDrives()
  }

  const handleAddMember = async () => {
    if (!selectedDriveId || !memberIdentifier.trim()) return
    await api.post(`/api/admin/drives/${selectedDriveId}/members`, {
      identifier: memberIdentifier.trim(),
      role: memberRole,
    })
    setMemberIdentifier('')
    setMemberRole('viewer')
    await fetchDriveDetails(selectedDriveId)
    await fetchDrives()
  }

  const handleRemoveMember = async (userId: number) => {
    if (!selectedDriveId) return
    await api.delete(`/api/admin/drives/${selectedDriveId}/members/${userId}`)
    await fetchDriveDetails(selectedDriveId)
    await fetchDrives()
  }

  const handleSaveDriveQuota = async () => {
    if (!selectedDriveId) return
    await api.post(`/api/admin/drives/${selectedDriveId}/quota`, {
      quotaLimitBytes: Math.max(0, Number(driveQuotaMb || 0)) * 1024 * 1024,
    })
    await fetchDrives()
  }

  return (
    <MainLayout title="Admin Console" isAdmin onSearch={setSearchQuery}>
      <BreadcrumbNav items={[{ label: 'Admin' }]} />

      <div className="p-6 space-y-6">
        <Alert className="border-destructive/20 bg-destructive/10">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>Administrator access</AlertTitle>
          <AlertDescription>
            Manage users, shared drives, drive members, quotas, and shared files from one place.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">System Administration</h2>
            <p className="text-muted-foreground">The old Users page is now the admin workspace.</p>
          </div>
          <Button variant="outline" onClick={refreshAll} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="text-2xl font-semibold">{users.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="text-2xl font-semibold">{users.filter((u) => u.role === 'admin').length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Shared drives</p>
            <p className="text-2xl font-semibold">{drives.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">User storage</p>
            <p className="text-2xl font-semibold">{formatBytes(totalUsedBytes)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Shared-drive files</p>
            <p className="text-2xl font-semibold">{formatBytes(totalDriveBytes)}</p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search users by username or wallet"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="md:max-w-sm"
            />
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="uploader">Uploader</SelectItem>
                <SelectItem value="commenter">Commenter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <UserTable users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser} />

          {editingUserId && (
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">Update user #{editingUserId}</h3>
              <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
                <Select value={editingRole} onValueChange={(value: any) => setEditingRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="uploader">Uploader</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={editingQuotaMb} onChange={(event) => setEditingQuotaMb(event.target.value)} placeholder="Quota in MB" />
                <div className="flex gap-2">
                  <Button onClick={handleSaveUserAccess}>Save</Button>
                  <Button variant="outline" onClick={() => setEditingUserId(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Shared Drives and Files</h2>
              <p className="text-sm text-muted-foreground">Create drives, delete drives, inspect files, and manage members.</p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_180px_180px_auto]">
              <Input value={newDriveName} onChange={(event) => setNewDriveName(event.target.value)} placeholder="New shared drive name" />
              <Input value={newDriveOwnerId} onChange={(event) => setNewDriveOwnerId(event.target.value)} placeholder="Owner user ID" />
              <Input value={newDriveQuotaMb} onChange={(event) => setNewDriveQuotaMb(event.target.value)} placeholder="Quota MB" />
              <Button onClick={handleCreateDrive} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Create Drive
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drives.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No shared drives yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {drives.map((drive) => (
                    <TableRow
                      key={drive.id}
                      className={selectedDriveId === String(drive.id) ? 'bg-muted/60' : ''}
                    >
                      <TableCell>
                        <button className="font-medium text-left hover:underline" onClick={() => setSelectedDriveId(String(drive.id))}>
                          {drive.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {drive.owner_username || `User ${drive.owner_id}`}
                        <div className="text-xs text-muted-foreground">{shortValue(drive.owner_wallet_address)}</div>
                      </TableCell>
                      <TableCell>{drive.file_count || 0}</TableCell>
                      <TableCell>{drive.member_count || 0}</TableCell>
                      <TableCell className="text-sm">
                        {formatBytes(Number(drive.total_file_bytes || drive.quota_used_bytes || 0))}
                        <div className="text-xs text-muted-foreground">
                          of {Number(drive.quota_limit_bytes || 0) > 0 ? formatBytes(Number(drive.quota_limit_bytes)) : 'Unlimited'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDrive(drive.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <h3 className="font-semibold">{selectedDrive?.name || 'Select a drive'}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDrive ? `${driveFiles.length} files, ${members.length} members` : 'Choose a shared drive to manage it.'}
                </p>
              </div>

              {selectedDrive && (
                <>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input value={driveQuotaMb} onChange={(event) => setDriveQuotaMb(event.target.value)} placeholder="Drive quota MB" />
                    <Button variant="outline" onClick={handleSaveDriveQuota}>Save Quota</Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <Input value={memberIdentifier} onChange={(event) => setMemberIdentifier(event.target.value)} placeholder="Username or wallet" />
                    <Select value={memberRole} onValueChange={(value: any) => setMemberRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleAddMember} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Members</h4>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm">{member.username || `User ${member.userId}`}</div>
                            <div className="truncate text-xs text-muted-foreground">{shortValue(member.walletAddress)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{member.role}</Badge>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.userId)} className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <Database className="h-4 w-4" />
                      Files
                    </h4>
                    <div className="max-h-72 overflow-auto rounded-md border">
                      {driveFiles.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No files in this drive.</div>
                      ) : (
                        driveFiles.map((file) => (
                          <div key={file.id} className="border-b px-3 py-2 last:border-b-0">
                            <div className="truncate text-sm font-medium">{file.file_name || file.filename || `File ${file.id}`}</div>
                            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                              <span>{formatBytes(Number(file.size_bytes || 0))}</span>
                              <span>{shortValue(file.ipfs_hash || file.cid)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
