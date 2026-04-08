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
    try {
      const [sharesRes, commentsRes] = await Promise.all([
        api.get('/shares/outgoing'),
        api.get('/notifications/comments?limit=20'),
      ])
      setOutgoingShares(sharesRes.data || [])
      setCommentNotifications(commentsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch share/comment activity', err)
      setOutgoingShares([])
      setCommentNotifications([])
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchActivity()
  }, [])

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        {/* Header with action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">User Management</h2>
            <p className="text-muted-foreground">
              Manage all users in the system. Total: {users.length} users
            </p>
          </div>
        </div>

        {/* User table */}
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
