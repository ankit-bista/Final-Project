'use client'

import { Button } from '@/components/ui/button'
import { Grid3x3, List } from 'lucide-react'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="gap-1"
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="gap-1"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
    </div>
  )
}
