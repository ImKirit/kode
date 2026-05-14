import { ipcMain, app, safeStorage } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { McpServerConfig } from '../mcp/types'

export interface ProviderConfig {
  apiKey: string
  model: string
}

export type ProviderId = 'anthropic' | 'openai' | 'kode' | 'copilot'

export interface EditorConfig {
  fontSize: number
  tabSize: number
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  lineNumbers: 'on' | 'off' | 'relative'
  formatOnSave: boolean
}

export interface AppSettings {
  activeProvider: ProviderId
  providers: Record<ProviderId, ProviderConfig>
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  keybindings?: Record<string, string>
  editor?: EditorConfig
}

const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: 'anthropic',
  providers: {
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
    openai:    { apiKey: '', model: 'gpt-4o' },
    kode:      { apiKey: '', model: 'claude-sonnet-4-6' },
    copilot:   { apiKey: '', model: 'gpt-4o' }
  },
  mcpServers: [],
  mcpPermission: 'full',
}

interface StoredProviders {
  anthropic?: { encryptedApiKey: string; model: string }
  openai?:    { encryptedApiKey: string; model: string }
  kode?:      { model: string }
  copilot?:   { model: string }
}

interface StoredSettings {
  activeProvider: ProviderId
  providers: StoredProviders
  editor?: EditorConfig
  keybindings?: Record<string, string>
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'kode-settings.json')
}

function encrypt(value: string): string {
  if (!value || !safeStorage.isEncryptionAvailable()) return value
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(value: string): string {
  if (!value || !safeStorage.isEncryptionAvailable()) return value
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return ''
  }
}

export function loadSettings(): AppSettings {
  const filePath = settingsPath()
  if (!fs.existsSync(filePath)) return { ...DEFAULT_SETTINGS }
  try {
    const stored: StoredSettings = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return {
      activeProvider: (stored.activeProvider as ProviderId) ?? 'anthropic',
      providers: {
        anthropic: {
          apiKey: decrypt(stored.providers?.anthropic?.encryptedApiKey ?? ''),
          model:  stored.providers?.anthropic?.model ?? 'claude-sonnet-4-6'
        },
        openai: {
          apiKey: decrypt(stored.providers?.openai?.encryptedApiKey ?? ''),
          model:  stored.providers?.openai?.model ?? 'gpt-4o'
        },
        kode: {
          apiKey: '',
          model:  stored.providers?.kode?.model ?? 'claude-sonnet-4-6'
        },
        copilot: {
          apiKey: '',
          model:  stored.providers?.copilot?.model ?? 'gpt-4o'
        }
      },
      mcpServers:    (stored as unknown as AppSettings).mcpServers ?? [],
      mcpPermission: (stored as unknown as AppSettings).mcpPermission ?? 'full',
      keybindings:   stored.keybindings,
      editor:        stored.editor
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings: AppSettings): void {
  const existing: Partial<StoredSettings> = {}
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8')
    Object.assign(existing, JSON.parse(raw))
  } catch { /* first save */ }

  const stored: Record<string, unknown> = {
    ...existing,
    activeProvider: settings.activeProvider,
    providers: {
      anthropic: {
        encryptedApiKey: encrypt(settings.providers.anthropic.apiKey),
        model: settings.providers.anthropic.model
      },
      openai: {
        encryptedApiKey: encrypt(settings.providers.openai.apiKey),
        model: settings.providers.openai.model
      },
      kode:    { model: settings.providers.kode?.model ?? 'claude-sonnet-4-6' },
      copilot: { model: settings.providers.copilot?.model ?? 'gpt-4o' }
    },
    mcpServers:    settings.mcpServers,
    mcpPermission: settings.mcpPermission,
    keybindings:   settings.keybindings,
    editor:        settings.editor
  }
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(stored, null, 2), 'utf8')
  } catch {
    // disk write failed — in-memory state remains unchanged
  }
}

let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function registerSettingsHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('settings:get', (): AppSettings => loadSettings())

  ipcMain.handle('settings:set', (_event, settings: AppSettings): void => {
    saveSettings(settings)
  })

}
