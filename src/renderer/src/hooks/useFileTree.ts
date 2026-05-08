import { useState, useEffect, useCallback, useRef } from 'react'
import type { FileEntry } from '../types'

interface UseFileTree {
  entries: FileEntry[]
  expanded: Set<string>
  children: Record<string, FileEntry[]>
  loading: boolean
  toggleExpanded(path: string): Promise<void>
  refresh(): Promise<void>
}

export function useFileTree(rootPath: string | null): UseFileTree {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const expandedRef = useRef<Set<string>>(new Set())
  const [children, setChildren] = useState<Record<string, FileEntry[]>>({})
  const [loading, setLoading] = useState(false)

  const loadDir = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    return window.kode.fs.readDir(dirPath)
  }, [])

  useEffect(() => {
    if (!rootPath) {
      setEntries([])
      return
    }
    setLoading(true)
    loadDir(rootPath).then(e => {
      setEntries(e)
      setLoading(false)
    })
  }, [rootPath, loadDir])

  const toggleExpanded = useCallback(async (dirPath: string) => {
    const isCurrentlyExpanded = expandedRef.current.has(dirPath)

    if (isCurrentlyExpanded) {
      // Collapse
      const next = new Set(expandedRef.current)
      next.delete(dirPath)
      expandedRef.current = next
      setExpanded(new Set(next))
    } else {
      // Expand
      const next = new Set(expandedRef.current)
      next.add(dirPath)
      expandedRef.current = next
      setExpanded(new Set(next))

      // Load children
      const kids = await loadDir(dirPath)
      setChildren(c => ({ ...c, [dirPath]: kids }))
    }
  }, [loadDir])

  const refresh = useCallback(async () => {
    if (!rootPath) return
    const e = await loadDir(rootPath)
    setEntries(e)
    // Re-fetch all expanded dirs
    const updates = Array.from(expandedRef.current).map(p =>
      loadDir(p).then(kids => setChildren(c => ({ ...c, [p]: kids })))
    )
    await Promise.all(updates)
  }, [rootPath, loadDir])

  return { entries, expanded, children, loading, toggleExpanded, refresh }
}
