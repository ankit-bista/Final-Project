'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BreadcrumbItem {
  label: string
  href?: string
  path?: string[]
  onClick?: () => void
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  onNavigate?: (path: string[]) => void
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  const handleNavigation = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.path && onNavigate) {
      onNavigate(item.path)
    }
  }

  return (
    <nav className="flex items-center gap-1 px-6 py-3 bg-background text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate?.([])}
        className="gap-1 text-muted-foreground hover:text-foreground"
      >
        <Home className="w-4 h-4" />
        <span>My Files</span>
      </Button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item)}
              className={index === items.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              {item.label}
            </Button>
          )}
        </div>
      ))}
    </nav>
  )
}
