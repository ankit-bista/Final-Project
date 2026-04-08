'use client'

import { AdminStats, formatBytes } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, HardDrive, Activity, TrendingUp } from 'lucide-react'

interface SystemStatsProps {
  stats: AdminStats
}

export function SystemStats({ stats }: SystemStatsProps) {
  const usagePercentage = (stats.usedStorage / stats.totalStorage) * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="text-xs text-muted-foreground">
            {stats.activeUsers} active
          </div>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(stats.usedStorage)}</div>
          <div className="text-xs text-muted-foreground">
            {usagePercentage.toFixed(1)}% of total
          </div>
        </CardContent>
      </Card>

      {/* Available Storage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(stats.availableStorage)}</div>
          <div className="text-xs text-muted-foreground">
            {(100 - usagePercentage).toFixed(1)}% free
          </div>
        </CardContent>
      </Card>

      {/* Average per User */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. per User</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(stats.averageStoragePerUser)}</div>
          <div className="text-xs text-muted-foreground">
            Across all users
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
