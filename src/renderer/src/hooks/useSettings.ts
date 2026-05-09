import { useState, useEffect, useCallback } from 'react'

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface AppSettings {
  activeProvider: 'anthropic' | 'openai'
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
  }
}

export interface UseSettingsResult {
  settings: AppSettings | null
  loading: boolean
  updateSettings(settings: AppSettings): Promise<void>
  setActiveProvider(provider: 'anthropic' | 'openai'): Promise<void>
  setProviderKey(provider: 'anthropic' | 'openai', apiKey: string): Promise<void>
  setProviderModel(provider: 'anthropic' | 'openai', model: string): Promise<void>
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

  const setActiveProvider = useCallback(async (provider: 'anthropic' | 'openai') => {
    setSettingsState(prev => {
      if (!prev) return prev
      const next = { ...prev, activeProvider: provider }
      window.kode.settings.set(next).catch(() => {})
      return next
    })
  }, [])

  const setProviderKey = useCallback(async (provider: 'anthropic' | 'openai', apiKey: string) => {
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

  const setProviderModel = useCallback(async (provider: 'anthropic' | 'openai', model: string) => {
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

  return { settings, loading, updateSettings, setActiveProvider, setProviderKey, setProviderModel }
}
