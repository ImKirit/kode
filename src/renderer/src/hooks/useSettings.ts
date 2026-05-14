import { useState, useEffect, useCallback } from 'react'
import type { McpServerConfig } from '../types/electron'
import type { KeybindingAction } from '../styles/keybindings'

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface EditorConfig {
  fontSize: number
  tabSize: number
  wordWrap: 'on' | 'off'
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: 'off',
  minimap: true,
  lineNumbers: 'on'
}

export type ProviderId = 'anthropic' | 'openai' | 'kode' | 'copilot'

export interface AppSettings {
  activeProvider: ProviderId
  providers: Record<ProviderId, ProviderConfig>
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  keybindings?: Record<string, string>
  editor?: EditorConfig
}

export interface UseSettingsResult {
  settings: AppSettings | null
  loading: boolean
  updateSettings(settings: AppSettings): Promise<void>
  setActiveProvider(provider: ProviderId): Promise<void>
  setProviderKey(provider: ProviderId, apiKey: string): Promise<void>
  setProviderModel(provider: ProviderId, model: string): Promise<void>
  addMcpServer(config: Omit<McpServerConfig, 'id'>): void
  removeMcpServer(id: string): void
  setMcpPermission(value: 'ask' | 'full'): void
  setKeybinding(action: KeybindingAction, key: string): void
  setEditorConfig(config: EditorConfig): void
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettingsState] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.kode.settings.get()
      .then(s => { setSettingsState(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const updateSettings = useCallback(async (next: AppSettings) => {
    await window.kode.settings.set(next)
    setSettingsState(next)
  }, [])

  const setActiveProvider = useCallback(async (provider: ProviderId) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = { ...prev, activeProvider: provider }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const setProviderKey = useCallback(async (provider: ProviderId, apiKey: string) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        providers: {
          ...prev.providers,
          [provider]: { ...prev.providers[provider], apiKey }
        }
      }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const setProviderModel = useCallback(async (provider: ProviderId, model: string) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        providers: {
          ...prev.providers,
          [provider]: { ...prev.providers[provider], model }
        }
      }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const addMcpServer = useCallback((config: Omit<McpServerConfig, 'id'>) => {
    const newServer: McpServerConfig = { ...config, id: crypto.randomUUID() }
    setSettingsState(prev => {
      if (!prev) return prev
      const next = { ...prev, mcpServers: [...(prev.mcpServers ?? []), newServer] }
      window.kode.settings.set(next).catch(() => {})
      window.kode.mcp.connect(newServer).catch(() => {})
      return next
    })
  }, [])

  const removeMcpServer = useCallback((id: string) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = { ...prev, mcpServers: (prev.mcpServers ?? []).filter(s => s.id !== id) }
      window.kode.settings.set(next).catch(() => {})
      window.kode.mcp.disconnect(id).catch(() => {})
      return next
    })
  }, [])

  const setMcpPermission = useCallback((value: 'ask' | 'full') => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = { ...prev, mcpPermission: value }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const setKeybinding = useCallback((action: KeybindingAction, key: string) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const existing = prev.keybindings ?? {}
      const next: AppSettings = {
        ...prev,
        keybindings: key ? { ...existing, [action]: key } : Object.fromEntries(
          Object.entries(existing).filter(([k]) => k !== action)
        )
      }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const setEditorConfig = useCallback((config: EditorConfig) => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next: AppSettings = { ...prev, editor: config }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  return { settings, loading, updateSettings, setActiveProvider, setProviderKey, setProviderModel, addMcpServer, removeMcpServer, setMcpPermission, setKeybinding, setEditorConfig }
}
