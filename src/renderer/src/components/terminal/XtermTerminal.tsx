import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

interface XtermTerminalProps {
  termId: string
  isActive: boolean
  onClose?(): void
}

export function XtermTerminal({ termId, isActive, onClose }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isActiveRef = useRef(isActive)

  // Keep isActiveRef in sync with the isActive prop
  useEffect(() => { isActiveRef.current = isActive }, [isActive])

  // Mount: create xterm instance, open it, attach data listener and resize observer
  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78'
      },
      fontFamily: 'Cascadia Code, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: false
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    termRef.current = term
    fitAddonRef.current = fitAddon

    if (containerRef.current) {
      term.open(containerRef.current)
      fitAddon.fit()
      window.kode.terminal.resize(termId, term.cols, term.rows)
    }

    const unsubData = window.kode.terminal.onData(termId, data => term.write(data))

    // Forward user keystrokes to the PTY
    const { dispose: disposeInput } = term.onData(data => {
      window.kode.terminal.write(termId, data)
    })

    // Write exit message and notify parent when PTY exits
    const unsubExit = window.kode.terminal.onExit(termId, () => {
      term.write('\r\n\x1b[2m[Process exited]\x1b[0m\r\n')
      onClose?.()
    })

    const observer = new ResizeObserver(() => {
      if (!isActiveRef.current) return  // Skip resize for hidden terminals
      fitAddon.fit()
      window.kode.terminal.resize(termId, term.cols, term.rows)
    })
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      unsubData()
      disposeInput()
      unsubExit()
      observer.disconnect()
      term.dispose()
    }
  }, [termId])

  // Re-fit whenever this terminal becomes the active (visible) one
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      fitAddonRef.current.fit()
      window.kode.terminal.resize(termId, termRef.current.cols, termRef.current.rows)
    }
  }, [isActive, termId])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
