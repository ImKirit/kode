import { useState, useCallback, useRef } from 'react'

export interface TerminalTab {
  id: string
  title: string
}

export interface UseTerminalResult {
  terminals: TerminalTab[]
  activeTermId: string | null
  createTerminal(cwd?: string): Promise<void>
  closeTerminal(id: string): void
  setActiveTerminal(id: string): void
}

export function useTerminal(): UseTerminalResult {
  const [terminals, setTerminals] = useState<TerminalTab[]>([])
  const [activeTermId, setActiveTermId] = useState<string | null>(null)
  const counter = useRef(1)

  const createTerminal = useCallback(async (cwd?: string) => {
    const id = await window.kode.terminal.spawn(80, 24, cwd)
    const title = `Terminal ${counter.current++}`
    setTerminals(prev => [...prev, { id, title }])
    setActiveTermId(id)
  }, [])

  const closeTerminal = useCallback((id: string) => {
    window.kode.terminal.kill(id)
    setTerminals(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      if (next.length > 0) {
        setActiveTermId(next[Math.max(0, idx - 1)].id)
      } else {
        setActiveTermId(null)
      }
      return next
    })
  }, [])

  return {
    terminals,
    activeTermId,
    createTerminal,
    closeTerminal,
    setActiveTerminal: setActiveTermId
  }
}
