'use client'

import { User, formatBytes } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface StorageAnalyticsProps {
  users: User[]
}

export function StorageAnalytics({ users }: StorageAnalyticsProps) {
  const topUsers = [...users]
    .sort((a, b) => b.storageUsed - a.storageUsed)
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Usage by User</CardTitle>
        <CardDescription>Top 5 users by storage consumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {topUsers.map((user) => {
          const percentage = (user.storageUsed / user.storageQuota) * 100
          return (
            <div key={user.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.walletAddress}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatBytes(user.storageUsed)}</p>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% used
                  </p>
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
