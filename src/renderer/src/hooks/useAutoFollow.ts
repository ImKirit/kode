import { useState, useEffect, useCallback, useRef } from 'react'
import type { OpenFile } from '../types'

const STORAGE_KEY = 'kode.autoFollow'

interface UseAutoFollowDeps {
  rootPath: string | null
  openFiles: OpenFile[]
  openFile(path: string): Promise<void>
  updateFileContent(path: string, content: string): void
  setActiveFile(path: string): void
}

interface UseAutoFollowResult {
  enabled: boolean
  toggle(): void
}

export function useAutoFollow({
  rootPath,
  openFiles,
  openFile,
  updateFileContent,
  setActiveFile
}: UseAutoFollowDeps): UseAutoFollowResult {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'false')
    } catch {
      return false
    }
  })

  const enabledRef = useRef(enabled)
  const openFilesRef = useRef(openFiles)
  const openFileRef = useRef(openFile)
  const updateFileContentRef = useRef(updateFileContent)
  const setActiveFileRef = useRef(setActiveFile)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { openFilesRef.current = openFiles }, [openFiles])
  useEffect(() => { openFileRef.current = openFile }, [openFile])
  useEffect(() => { updateFileContentRef.current = updateFileContent }, [updateFileContent])
  useEffect(() => { setActiveFileRef.current = setActiveFile }, [setActiveFile])

  // Watch / unwatch when enabled or rootPath changes
  useEffect(() => {
    if (enabled && rootPath) {
      window.kode.fs.watchRoot(rootPath)
    } else {
      window.kode.fs.unwatchRoot()
    }
  }, [enabled, rootPath])

  // Subscribe to file change events (once on mount)
  useEffect(() => {
    const cleanup = window.kode.fs.onFileChange((filePath, content) => {
      if (!enabledRef.current) return
      const isOpen = openFilesRef.current.some(f => f.path === filePath)
      if (isOpen) {
        updateFileContentRef.current(filePath, content)
        setActiveFileRef.current(filePath)
      } else {
        openFileRef.current(filePath)
      }
    })
    return cleanup
  }, [])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { enabled, toggle }
}
