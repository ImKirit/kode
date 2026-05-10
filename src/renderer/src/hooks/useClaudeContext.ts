import { useState, useEffect } from 'react'

interface UseClaudeContextResult {
  systemPrompt: string | null
  hasContext: boolean
}

export function useClaudeContext(rootPath: string | null): UseClaudeContextResult {
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)

  useEffect(() => {
    if (!rootPath) {
      setSystemPrompt(null)
      return
    }
    window.kode.claude.loadContext(rootPath)
      .then(({ content }) => setSystemPrompt(content))
      .catch(() => setSystemPrompt(null))
  }, [rootPath])

  return { systemPrompt, hasContext: systemPrompt !== null }
}
