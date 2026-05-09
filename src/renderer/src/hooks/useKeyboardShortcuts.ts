import { useEffect } from 'react'

interface KeyboardShortcutsConfig {
  onToggleSidebar(): void
  onToggleBottomPanel(): void
  onToggleAiPanel(): void
}

export function useKeyboardShortcuts({
  onToggleSidebar,
  onToggleBottomPanel,
  onToggleAiPanel
}: KeyboardShortcutsConfig): void {
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault()
        onToggleSidebar()
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'j') {
        e.preventDefault()
        onToggleBottomPanel()
      } else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        onToggleAiPanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleSidebar, onToggleBottomPanel, onToggleAiPanel])
}
