'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { SystemStats } from '@/components/admin/system-stats'
import { StorageAnalytics } from '@/components/admin/storage-analytics'
import { ActivityLog } from '@/components/admin/activity-log'
import { AdminManagementPanel } from '@/components/admin/admin-management-panel'
import { mockUsers, mockAdminStats, User } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)

  const handleDemoteAdmin = (userId: string) => {
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, role: 'user' as const } : u
      )
    )
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId))
  }

  return (
    <MainLayout title="Admin Dashboard" isAdmin={true}>
      <BreadcrumbNav items={[{ label: 'Admin' }]} />
      
      <div className="p-6 space-y-6">
        {/* Admin Warning Banner */}
        <Alert className="border-accent/20 bg-accent/15">
          <AlertCircle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-foreground">Administrator Access</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            You are viewing the admin dashboard. Changes made here affect all users in the system.
          </AlertDescription>
        </Alert>

        {/* System Statistics */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">System Overview</h2>
          <SystemStats stats={mockAdminStats} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StorageAnalytics users={users} />
          <ActivityLog />
        </div>

        {/* Admin Management */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Administrator Management</h2>
          <AdminManagementPanel
            users={users}
            onDemote={handleDemoteAdmin}
            onDelete={handleDeleteUser}
          />
        </div>

        {/* System Settings Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">System Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-2">Storage Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage storage quotas and limits for all users
              </p>
              <Button variant="outline" className="w-full">
                Configure Storage
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-2">Security Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage security policies and authentication methods
              </p>
              <Button variant="outline" className="w-full">
                Security Settings
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-2">Backup & Recovery</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create backups and manage system recovery options
              </p>
              <Button variant="outline" className="w-full">
                Manage Backups
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-2">System Logs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View detailed logs of system events and errors
              </p>
              <Button variant="outline" className="w-full">
                View Logs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
