import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as path from 'node:path'
import * as os from 'node:os'

const mockIpcMainHandle = vi.hoisted(() => vi.fn())
// encryptString receives a string and must return a Buffer-like object with toString('base64')
// We simulate encryption by prepending 'enc:' and returning an object with toString
const mockEncryptString = vi.hoisted(() =>
  vi.fn((s: string) => {
    const encoded = `enc:${s}`
    return {
      toString: (encoding?: string) => (encoding === 'base64' ? btoa(encoded) : encoded)
    }
  })
)
// decryptString receives a Buffer and must return the original string
// In our mock the Buffer was created from base64(enc:value), so we decode it
const mockDecryptString = vi.hoisted(() =>
  vi.fn((b: { toString: (enc?: string) => string }) => {
    const raw = atob(b.toString('base64'))
    return raw.replace('enc:', '')
  })
)
const mockIsEncryptionAvailable = vi.hoisted(() => vi.fn().mockReturnValue(true))
const mockGetPath = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpcMainHandle },
  safeStorage: {
    isEncryptionAvailable: mockIsEncryptionAvailable,
    encryptString: mockEncryptString,
    decryptString: mockDecryptString
  },
  app: { getPath: mockGetPath }
}))

// Use real fs with a temp path
import * as fs from 'node:fs'

const SETTINGS_FILE = path.join(os.tmpdir(), 'kode-settings.json')

describe('registerSettingsHandlers', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    mockEncryptString.mockClear()
    mockDecryptString.mockClear()
    mockIsEncryptionAvailable.mockReturnValue(true)
    mockGetPath.mockReturnValue(os.tmpdir())
    // Remove test settings file if it exists
    if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE)
  })

  it('registers settings:get handle', async () => {
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledWith('settings:get', expect.any(Function))
  })

  it('registers settings:set handle', async () => {
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledWith('settings:set', expect.any(Function))
  })

  it('is idempotent', async () => {
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    registerSettingsHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledTimes(2) // one for :get, one for :set
  })

  it('settings:get returns default settings when no file exists', async () => {
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    const handler = mockIpcMainHandle.mock.calls.find(c => c[0] === 'settings:get')?.[1]
    const result = await handler!({})
    expect(result.activeProvider).toBe('anthropic')
    expect(result.providers.anthropic.apiKey).toBe('')
    expect(result.providers.anthropic.model).toBe('claude-sonnet-4-6')
    expect(result.providers.openai.apiKey).toBe('')
    expect(result.providers.openai.model).toBe('gpt-4o')
  })

  it('settings:set encrypts apiKey and persists to file, settings:get decrypts it', async () => {
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    const setHandler = mockIpcMainHandle.mock.calls.find(c => c[0] === 'settings:set')?.[1]
    const getHandler = mockIpcMainHandle.mock.calls.find(c => c[0] === 'settings:get')?.[1]

    await setHandler!({}, {
      activeProvider: 'anthropic',
      providers: {
        anthropic: { apiKey: 'sk-real-key', model: 'claude-sonnet-4-6' },
        openai: { apiKey: '', model: 'gpt-4o' }
      }
    })

    expect(mockEncryptString).toHaveBeenCalledWith('sk-real-key')

    const result = await getHandler!({})
    expect(result.providers.anthropic.apiKey).toBe('sk-real-key')
    expect(mockDecryptString).toHaveBeenCalled()
  })

  it('settings:get returns empty apiKey when encryption not available and key not set', async () => {
    mockIsEncryptionAvailable.mockReturnValue(false)
    const { registerSettingsHandlers, _resetRegistered } = await import('../../../src/main/ipc/settings')
    _resetRegistered()
    registerSettingsHandlers()
    const handler = mockIpcMainHandle.mock.calls.find(c => c[0] === 'settings:get')?.[1]
    const result = await handler!({})
    expect(result.providers.anthropic.apiKey).toBe('')
  })
})
