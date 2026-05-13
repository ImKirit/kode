import { useEffect } from 'react'
import { mergeKeybindings, matchesKey } from '../styles/keybindings'
import type { KeybindingMap } from '../styles/keybindings'

interface KeyboardShortcutsConfig {
  onToggleSidebar(): void
  onToggleBottomPanel(): void
  onToggleAiPanel(): void
  onSaveFile?(): void
  onOpenFolder?(): void
  onOpenSettings?(): void
  keybindings?: Partial<KeybindingMap>
}

export function useKeyboardShortcuts({
  onToggleSidebar,
  onToggleBottomPanel,
  onToggleAiPanel,
  onSaveFile,
  onOpenFolder,
  onOpenSettings,
  keybindings
}: KeyboardShortcutsConfig): void {
  const kb = mergeKeybindings(keybindings)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (matchesKey(e, kb.toggleSidebar)) {
        e.preventDefault()
        onToggleSidebar()
      } else if (matchesKey(e, kb.toggleBottomPanel)) {
        e.preventDefault()
        onToggleBottomPanel()
      } else if (matchesKey(e, kb.toggleAiPanel)) {
        e.preventDefault()
        onToggleAiPanel()
      } else if (onSaveFile && matchesKey(e, kb.saveFile)) {
        e.preventDefault()
        onSaveFile()
      } else if (onOpenFolder && matchesKey(e, kb.openFolder)) {
        e.preventDefault()
        onOpenFolder()
      } else if (onOpenSettings && matchesKey(e, kb.openSettings)) {
        e.preventDefault()
        onOpenSettings()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleSidebar, onToggleBottomPanel, onToggleAiPanel, onSaveFile, onOpenFolder, onOpenSettings, kb])
}
