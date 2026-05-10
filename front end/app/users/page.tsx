'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { UserTable } from '@/components/user-table'
import { User } from '@/lib/mock-data'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OutgoingSharesPanel } from '@/components/users/outgoing-shares-panel'
import { CommentNotificationsPanel } from '@/components/users/comment-notifications-panel'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'uploader' | 'commenter'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [outgoingShares, setOutgoingShares] = useState<any[]>([])
  const [commentNotifications, setCommentNotifications] = useState<any[]>([])
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<'admin' | 'commenter' | 'uploader'>('commenter')
  const [editingQuotaMb, setEditingQuotaMb] = useState('1024')

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users')
      const mappedUsers = res.data.map((u: any) => ({
        id: u.id.toString(),
        name: u.username || 'Unknown',
        walletAddress: u.wallet_address || '0x0000000000000000000000000000000000000000',
        role: u.role || 'commenter',
        storageUsed: u.storage_used || 0,
        storageQuota: u.quota_bytes || 0,
        createdAt: new Date(u.created_at || Date.now()),
        lastLogin: u.last_login ? new Date(u.last_login) : undefined,
        isActive: u.is_active !== undefined ? !!u.is_active : true,
      }))
      setUsers(mappedUsers)
    } catch (err) {
      console.error('Failed to fetch users', err)
      // fallback to empty or alert
    }
  }

  const fetchActivity = async () => {
    const [sharesRes, commentsRes] = await Promise.allSettled([
      api.get('/shares/outgoing'),
      api.get('/notifications/comments?limit=20'),
    ])

    if (sharesRes.status === 'fulfilled') {
      setOutgoingShares(sharesRes.value.data || [])
    } else {
      console.error('Failed to fetch outgoing shares', sharesRes.reason)
      setOutgoingShares([])
    }

    if (commentsRes.status === 'fulfilled') {
      setCommentNotifications(commentsRes.value.data || [])
    } else {
      console.error('Failed to fetch comment notifications', commentsRes.reason)
      setCommentNotifications([])
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchActivity()
  }, [])

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !query ||
      user.name.toLowerCase().includes(query) ||
      user.walletAddress.toLowerCase().includes(query)
    const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? user.isActive
          : !user.isActive

    return matchesQuery && matchesRole && matchesStatus
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.isActive).length
  const adminUsers = users.filter((u) => u.role === 'admin').length
  const uploaderUsers = users.filter((u) => u.role === 'uploader').length
  const totalUsedBytes = users.reduce((sum, u) => sum + Number(u.storageUsed || 0), 0)
  const totalQuotaBytes = users.reduce((sum, u) => sum + Number(u.storageQuota || 0), 0)
  const utilizationPct = totalQuotaBytes > 0 ? Math.min(100, Math.round((totalUsedBytes / totalQuotaBytes) * 100)) : 0

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/api/admin/users/${userId}`)
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      console.error('Failed to delete user', err)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setEditingRole((user.role as any) || 'commenter')
    setEditingQuotaMb(String(Math.max(0, Math.floor((user.storageQuota || 0) / 1024 / 1024))))
  }

  const handleSaveAccess = async () => {
    if (!editingUserId) return
    try {
      const quotaBytes = Math.max(0, Math.floor(Number(editingQuotaMb || '0') * 1024 * 1024))
      await api.post(`/api/admin/users/${editingUserId}/access`, {
        role: editingRole,
        quotaBytes,
      })
      setEditingUserId(null)
      await fetchUsers()
    } catch (err) {
      console.error('Failed to update user access', err)
      alert('Failed to update role/quota')
    }
  }

  return (
    <MainLayout title="Users" onSearch={setSearchQuery}>
      <BreadcrumbNav items={[{ label: 'Users' }]} />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">User Management</h2>
            <p className="text-muted-foreground">
              Manage roles, quota, and access health across all users.
            </p>
          </div>
          <Button variant="outline" onClick={fetchUsers}>Refresh</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total users</p>
            <p className="text-2xl font-semibold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Active users</p>
            <p className="text-2xl font-semibold">{activeUsers}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="text-2xl font-semibold">{adminUsers}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Uploaders</p>
            <p className="text-2xl font-semibold">{uploaderUsers}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Storage utilization</p>
            <p className="text-2xl font-semibold">{utilizationPct}%</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search by username or wallet"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Role filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="uploader">Uploader</SelectItem>
              <SelectItem value="commenter">Commenter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery('')
              setRoleFilter('all')
              setStatusFilter('all')
            }}
          >
            Clear filters
          </Button>
        </div>

        <UserTable
          users={filteredUsers}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
        {editingUserId && (
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">Update Access for User #{editingUserId}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={editingRole} onValueChange={(v: any) => setEditingRole(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commenter">Commenter (view + comments)</SelectItem>
                  <SelectItem value="uploader">Uploader (upload + file actions)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Input value={editingQuotaMb} onChange={(e) => setEditingQuotaMb(e.target.value)} placeholder="Quota in MB (for uploader)" />
              <div className="flex gap-2">
                <Button onClick={handleSaveAccess}>Save Access</Button>
                <Button variant="outline" onClick={() => setEditingUserId(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <OutgoingSharesPanel items={outgoingShares} />
          <CommentNotificationsPanel items={commentNotifications} />
        </div>
      </div>
    </MainLayout>
  )
}
