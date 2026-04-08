'use client'

import { formatDate } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, Upload, Share2, Users, Settings, Trash2 } from 'lucide-react'

interface ActivityEntry {
  id: string
  type: 'login' | 'upload' | 'share' | 'user_added' | 'settings_changed' | 'deleted'
  description: string
  user: string
  timestamp: Date
}

const mockActivityLog: ActivityEntry[] = [
  {
    id: '1',
    type: 'login',
    description: 'User logged in',
    user: 'John Doe',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    type: 'upload',
    description: 'Uploaded file: project-report.pdf',
    user: 'Sarah Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '3',
    type: 'share',
    description: 'Shared folder with 3 people',
    user: 'Mike Johnson',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '4',
    type: 'user_added',
    description: 'New user account created',
    user: 'Admin User',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '5',
    type: 'login',
    description: 'User logged in',
    user: 'Emily Brown',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
]

function getActivityIcon(type: ActivityEntry['type']) {
  switch (type) {
    case 'login':
      return <LogIn className="w-4 h-4 text-primary" />
    case 'upload':
      return <Upload className="w-4 h-4 text-secondary" />
    case 'share':
      return <Share2 className="w-4 h-4 text-accent" />
    case 'user_added':
      return <Users className="w-4 h-4 text-accent" />
    case 'settings_changed':
      return <Settings className="w-4 h-4 text-muted-foreground" />
    case 'deleted':
      return <Trash2 className="w-4 h-4 text-destructive" />
    default:
      return null
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 1000 / 60)
  const hours = Math.floor(minutes / 60)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return formatDate(date)
}

export function ActivityLog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivityLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
              <div className="mt-1">
                {getActivityIcon(entry.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{entry.description}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.user} • {formatTimestamp(entry.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
