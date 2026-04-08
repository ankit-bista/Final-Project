'use client'

import { User, formatBytes, formatDate } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Trash2, Edit, CheckCircle, XCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserTableProps {
  users: User[]
  onEdit?: (user: User) => void
  onDelete?: (userId: string) => void
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const shortAddr = (addr: string) => {
    if (!addr) return '—'
    if (addr.length <= 12) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead>Name</TableHead>
            <TableHead>Wallet</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Storage Used</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {shortAddr(user.walletAddress)}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.role === 'admin' 
                    ? 'bg-destructive/15 text-destructive'
                    : user.role === 'uploader'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-accent/20 text-accent'
                }`}>
                  {user.role === 'admin' ? 'Admin' : user.role === 'uploader' ? 'Uploader' : 'Commenter'}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{formatBytes(user.storageUsed)}</div>
                  <div className="text-xs text-muted-foreground">
                    of {formatBytes(user.storageQuota)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {user.isActive ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-secondary" />
                      <span className="text-xs text-secondary">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(user)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(user.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
