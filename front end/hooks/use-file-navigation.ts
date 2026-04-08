'use client'

import { useState, useCallback } from 'react'
import { FileItem } from '@/lib/mock-data'

export function useFileNavigation(initialFiles: FileItem[]) {
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null)

  // Get current folder contents
  const getCurrentContents = useCallback(() => {
    if (currentPath.length === 0) {
      return initialFiles
    }

    let folder: FileItem | null = null
    for (const id of currentPath) {
      const parent = folder ? folder.children : initialFiles
      const found = parent?.find(f => f.id === id)
      if (!found) return []
      folder = found
    }

    return folder?.children || []
  }, [currentPath, initialFiles])

  // Navigate into a folder
  const openFolder = useCallback((folder: FileItem) => {
    if (folder.type === 'folder') {
      setCurrentPath(prev => [...prev, folder.id])
      setCurrentFolder(folder)
    }
  }, [])

  // Navigate back
  const goBack = useCallback(() => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1)
      setCurrentPath(newPath)
      
      // Set current folder
      if (newPath.length === 0) {
        setCurrentFolder(null)
      } else {
        let folder: FileItem | null = null
        for (const id of newPath) {
          const parent = folder ? folder.children : initialFiles
          const found = parent?.find(f => f.id === id)
          if (found) folder = found
        }
        setCurrentFolder(folder)
      }
    }
  }, [currentPath, initialFiles])

  // Navigate to root
  const goToRoot = useCallback(() => {
    setCurrentPath([])
    setCurrentFolder(null)
  }, [])

  // Navigate to specific path
  const navigateToPath = useCallback((path: string[]) => {
    setCurrentPath(path)
    
    if (path.length === 0) {
      setCurrentFolder(null)
    } else {
      let folder: FileItem | null = null
      for (const id of path) {
        const parent = folder ? folder.children : initialFiles
        const found = parent?.find(f => f.id === id)
        if (found) folder = found
      }
      setCurrentFolder(folder)
    }
  }, [initialFiles])

  // Get breadcrumb items
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [{ label: 'My Files', path: [] }]
    
    let folder: FileItem | null = null
    for (let i = 0; i < currentPath.length; i++) {
      const id = currentPath[i]
      const parent = folder ? folder.children : initialFiles
      const found = parent?.find(f => f.id === id)
      if (found) {
        folder = found
        breadcrumbs.push({
          label: found.name,
          path: currentPath.slice(0, i + 1),
        })
      }
    }
    
    return breadcrumbs
  }, [currentPath, initialFiles])

  return {
    currentPath,
    currentFolder,
    contents: getCurrentContents(),
    openFolder,
    goBack,
    goToRoot,
    navigateToPath,
    breadcrumbs: getBreadcrumbs(),
  }
}
