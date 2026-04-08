'use client'

import { User } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Shield, ShieldOff } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdminManagementPanelProps {
  users: User[]
  onDemote?: (userId: string) => void
  onDelete?: (userId: string) => void
}

export function AdminManagementPanel({
  users,
  onDemote,
  onDelete,
}: AdminManagementPanelProps) {
  const adminUsers = users.filter((u) => u.role === 'admin')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Management</CardTitle>
        <CardDescription>
          Manage administrator accounts. Total: {adminUsers.length} admins
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Name</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.length > 0 ? (
                adminUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{user.walletAddress}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDemote?.(user.id)}
                          className="h-8 w-8"
                          title="Remove admin privileges"
                        >
                          <ShieldOff className="w-4 h-4 text-accent" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(user.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No admin users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
