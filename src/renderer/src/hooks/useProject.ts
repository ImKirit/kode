import { useState, useCallback, useEffect, useRef } from 'react'
import type { OpenFile, ProjectState } from '../types'
import { languageFromPath } from '../types'

const SESSION_KEY = 'kode:session'
const IS_NEW_WINDOW = new URLSearchParams(window.location.search).get('newWindow') === '1'

interface UseProject {
  project: ProjectState
  openFiles: OpenFile[]
  activeFilePath: string | null
  openFolder(): Promise<void>
  openFile(filePath: string): Promise<void>
  closeFile(filePath: string): void
  setActiveFile(filePath: string): void
  updateFileContent(filePath: string, content: string): void
  saveFile(filePath: string): Promise<void>
}

export function useProject(): UseProject {
  const [project, setProject] = useState<ProjectState>({ rootPath: null, name: '' })
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const openFilesRef = useRef<OpenFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const isRestoringRef = useRef(false)
  const [pendingRestore, setPendingRestore] = useState<{ paths: string[]; active: string | null } | null>(null)

  useEffect(() => {
    openFilesRef.current = openFiles
  }, [openFiles])

  useEffect(() => {
    const title = project.name ? `Kode | ${project.name}` : 'Kode'
    window.kode.setTitle(title)
  }, [project.name])

  // Restore session on mount (skip for new empty windows)
  useEffect(() => {
    if (IS_NEW_WINDOW) return
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return
      const { rootPath, openPaths, active } = JSON.parse(raw) as {
        rootPath: string; openPaths: string[]; active: string | null
      }
      if (!rootPath) return
      isRestoringRef.current = true
      const name = rootPath.split(/[/\\]/).pop() ?? rootPath
      setProject({ rootPath, name })
      if (openPaths?.length) {
        setPendingRestore({ paths: openPaths, active: active ?? null })
      } else {
        isRestoringRef.current = false
      }
    } catch { /* ignore corrupt session */ }
  }, [])

  // Open pending files once rootPath is available
  useEffect(() => {
    if (!pendingRestore || !project.rootPath) return
    const { paths, active } = pendingRestore
    setPendingRestore(null)
    ;(async () => {
      for (const p of paths) {
        await openFile(p).catch(() => null)
      }
      if (active) setActiveFilePath(active)
      isRestoringRef.current = false
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRestore, project.rootPath])

  // Persist session whenever state changes (skip during restore)
  useEffect(() => {
    if (isRestoringRef.current) return
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      rootPath: project.rootPath,
      openPaths: openFiles.map(f => f.path),
      active: activeFilePath
    }))
  }, [project.rootPath, openFiles, activeFilePath])

  const openFolder = useCallback(async () => {
    const folderPath = await window.kode.fs.openFolder()
    if (!folderPath) return
    const name = folderPath.split(/[/\\]/).pop() ?? folderPath
    setProject({ rootPath: folderPath, name })
  }, [])

  const openFile = useCallback(async (filePath: string) => {
    // Set active immediately for responsiveness
    setActiveFilePath(filePath)
    // Check if already open using functional updater to avoid stale closure
    setOpenFiles(prev => {
      if (prev.some(f => f.path === filePath)) return prev
      // Not open yet — will be added after fetch (async below)
      return prev
    })
    // Fetch content if not already open
    setOpenFiles(prev => {
      if (prev.some(f => f.path === filePath)) return prev
      // Return prev now; we'll add after the async fetch
      return prev
    })
    // Use a ref-free approach: read current state via closure snapshot is unreliable,
    // so we fetch and then do a guarded add
    const content = await window.kode.fs.readFile(filePath)
    const name = filePath.split(/[/\\]/).pop() ?? filePath
    setOpenFiles(prev => {
      if (prev.some(f => f.path === filePath)) return prev
      return [...prev, {
        path: filePath,
        name,
        content,
        dirty: false,
        language: languageFromPath(filePath)
      }]
    })
  }, [])

  const closeFile = useCallback((filePath: string) => {
    setOpenFiles(prev => {
      const idx = prev.findIndex(f => f.path === filePath)
      const next = prev.filter(f => f.path !== filePath)
      if (next.length > 0) {
        setActiveFilePath(next[Math.max(0, idx - 1)]?.path ?? next[0].path)
      } else {
        setActiveFilePath(null)
      }
      return next
    })
  }, [])

  const updateFileContent = useCallback((filePath: string, content: string) => {
    setOpenFiles(prev =>
      prev.map(f => f.path === filePath ? { ...f, content, dirty: true } : f)
    )
  }, [])

  const saveFile = useCallback(async (filePath: string) => {
    const file = openFilesRef.current.find(f => f.path === filePath)
    if (!file) return
    await window.kode.fs.writeFile(filePath, file.content)
    setOpenFiles(prev =>
      prev.map(f => f.path === filePath ? { ...f, dirty: false } : f)
    )
  }, [])

  return {
    project, openFiles, activeFilePath,
    openFolder, openFile, closeFile,
    setActiveFile: setActiveFilePath,
    updateFileContent, saveFile
  }
}
