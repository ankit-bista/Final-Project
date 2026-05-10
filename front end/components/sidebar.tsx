'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Folder,
  Share2,
  Settings,
  Users,
  BarChart3,
  Zap,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    label: 'My Drive',
    href: '/',
    icon: Folder,
  },
  {
    label: 'Collaborative Drive',
    href: '/collaborative',
    icon: Layers,
  },
  {
    label: 'Shared Drives',
    href: '/combined',
    icon: Folder,
  },
  {
    label: 'Shared With Me',
    href: '/shared',
    icon: Share2,
  },
]

const USER_ITEMS = [
  {
    label: 'Users',
    href: '/users',
    icon: Users,
  },
]

const ADMIN_ITEMS = [
  {
    label: 'Admin Dashboard',
    href: '/admin',
    icon: BarChart3,
  },
]

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/icon.png" alt="SecureVault" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">SecureVault</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* User Management Section */}
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          {USER_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-sidebar-border">
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-destructive text-destructive-foreground'
                      : 'text-sidebar-foreground hover:bg-destructive/15'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer - Settings & Blockchain */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/blockchain"
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
            pathname === '/blockchain'
              ? 'bg-accent text-accent-foreground'
              : 'text-sidebar-foreground hover:bg-accent/20'
          )}
        >
          <Zap className="w-5 h-5" />
          <span className="text-sm font-medium">Blockchain</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
            pathname === '/settings'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  )
}
