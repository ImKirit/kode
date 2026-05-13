export type KeybindingAction =
  | 'toggleSidebar'
  | 'toggleBottomPanel'
  | 'toggleAiPanel'
  | 'saveFile'
  | 'openFolder'
  | 'openSettings'

export type KeybindingMap = Record<KeybindingAction, string>

export const ACTION_LABELS: Record<KeybindingAction, string> = {
  toggleSidebar: 'Toggle Sidebar',
  toggleBottomPanel: 'Toggle Terminal',
  toggleAiPanel: 'Toggle AI Panel',
  saveFile: 'Save File',
  openFolder: 'Open Folder',
  openSettings: 'Open Settings'
}

export const DEFAULT_KEYBINDINGS: KeybindingMap = {
  toggleSidebar: 'Ctrl+B',
  toggleBottomPanel: 'Ctrl+J',
  toggleAiPanel: 'Ctrl+Shift+A',
  saveFile: 'Ctrl+S',
  openFolder: 'Ctrl+O',
  openSettings: 'Ctrl+,'
}

export function formatKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) parts.push(key)
  return parts.join('+')
}

export function matchesKey(e: KeyboardEvent, binding: string): boolean {
  return formatKey(e) === binding
}

export function mergeKeybindings(overrides?: Partial<KeybindingMap>): KeybindingMap {
  return { ...DEFAULT_KEYBINDINGS, ...(overrides ?? {}) }
}
