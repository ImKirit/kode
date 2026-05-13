import { ipcMain, app, safeStorage } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { McpServerConfig } from '../mcp/types'

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
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  keybindings?: Record<string, string>
}

const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: 'anthropic',
  providers: {
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' }
  },
  mcpServers: [],
  mcpPermission: 'full',
}

interface StoredSettings {
  activeProvider: 'anthropic' | 'openai'
  providers: {
    anthropic: { encryptedApiKey: string; model: string }
    openai: { encryptedApiKey: string; model: string }
  }
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
      activeProvider: stored.activeProvider ?? 'anthropic',
      providers: {
        anthropic: {
          apiKey: decrypt(stored.providers?.anthropic?.encryptedApiKey ?? ''),
          model: stored.providers?.anthropic?.model ?? 'claude-sonnet-4-6'
        },
        openai: {
          apiKey: decrypt(stored.providers?.openai?.encryptedApiKey ?? ''),
          model: stored.providers?.openai?.model ?? 'gpt-4o'
        }
      }
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings: AppSettings): void {
  const stored: StoredSettings = {
    activeProvider: settings.activeProvider,
    providers: {
      anthropic: {
        encryptedApiKey: encrypt(settings.providers.anthropic.apiKey),
        model: settings.providers.anthropic.model
      },
      openai: {
        encryptedApiKey: encrypt(settings.providers.openai.apiKey),
        model: settings.providers.openai.model
      }
    }
  }
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(stored, null, 2), 'utf8')
  } catch {
    // Disk write failed — in-memory state remains unchanged
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
