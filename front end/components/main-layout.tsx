'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { AuthGate } from '@/components/auth-gate'

interface MainLayoutProps {
  children: ReactNode
  title?: string
  isAdmin?: boolean
  onSearch?: (query: string) => void
  requireAuth?: boolean
}

export function MainLayout({
  children,
  title,
  isAdmin = false,
  onSearch,
  requireAuth = true,
}: MainLayoutProps) {
  const layout = (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )

  if (!requireAuth) return layout
  return <AuthGate>{layout}</AuthGate>
}
