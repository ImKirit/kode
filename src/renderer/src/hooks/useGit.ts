import { useState, useEffect, useCallback } from 'react'

interface UseGitResult {
  files: FileStatus[]
  diff: string
  selectedFile: string | null
  isLoading: boolean
  commitMessage: string
  error: string | null
  refresh(): void
  selectFile(path: string): void
  stage(path: string): Promise<void>
  commit(): Promise<void>
  setCommitMessage(msg: string): void
}

export function useGit(rootPath: string | null): UseGitResult {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [diff, setDiff] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!rootPath) return
    setIsLoading(true)
    setError(null)
    try {
      const status = await window.kode.git.status(rootPath)
      setFiles(status)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [rootPath])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectFile = useCallback(async (filePath: string) => {
    if (!rootPath) return
    setSelectedFile(filePath)
    try {
      const d = await window.kode.git.diff(rootPath, filePath)
      setDiff(d)
    } catch (e) {
      setDiff('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath])

  const stage = useCallback(async (filePath: string) => {
    if (!rootPath) return
    try {
      await window.kode.git.stage(rootPath, filePath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, refresh])

  const commit = useCallback(async () => {
    if (!rootPath || !commitMessage.trim()) return
    try {
      await window.kode.git.commit(rootPath, commitMessage)
      setCommitMessage('')
      setFiles([])
      setDiff('')
      setSelectedFile(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, commitMessage, refresh])

  return {
    files, diff, selectedFile, isLoading, commitMessage, error,
    refresh, selectFile, stage, commit, setCommitMessage
  }
}
