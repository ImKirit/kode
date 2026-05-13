import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const mockIpcMainHandle = vi.hoisted(() => vi.fn())
const mockShowSaveDialog = vi.hoisted(() => vi.fn())
const mockShowOpenDialog = vi.hoisted(() => vi.fn())
const mockLoadSettings = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpcMainHandle },
  dialog: {
    showSaveDialog: mockShowSaveDialog,
    showOpenDialog: mockShowOpenDialog
  },
  app: { getPath: () => '/fake' }
}))

vi.mock('../../../src/main/ipc/settings', () => ({
  loadSettings: mockLoadSettings,
  saveSettingsPublic: vi.fn()
}))

function getHandle(channel: string) {
  const call = mockIpcMainHandle.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((_event: unknown, ...args: unknown[]) => unknown) | undefined
}

describe('registerSettingsExportImportHandlers', () => {
  let tmpDir: string

  beforeEach(async () => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    tmpDir = await fsp.mkdtemp(join(tmpdir(), 'kode-settings-test-'))
    mockLoadSettings.mockReturnValue({
      activeProvider: 'anthropic',
      providers: { anthropic: { apiKey: 'secret-key', model: 'claude-sonnet-4-6' }, openai: { apiKey: '', model: 'gpt-4o' } },
      mcpServers: [],
      mcpPermission: 'full',
      keybindings: {}
    })
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  it('registers settings:export and settings:import handlers', async () => {
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const channels = mockIpcMainHandle.mock.calls.map(c => c[0])
    expect(channels).toContain('settings:export')
    expect(channels).toContain('settings:import')
  })

  it('settings:export writes JSON to chosen file (no API keys)', async () => {
    const outPath = join(tmpDir, 'export.json')
    mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: outPath })
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const handler = getHandle('settings:export')!
    const result = await handler({})
    expect(result).toEqual({ ok: true })
    const written = JSON.parse(await fsp.readFile(outPath, 'utf-8'))
    expect(written.activeProvider).toBe('anthropic')
    expect(written.providers).toBeUndefined() // API keys NOT exported
  })

  it('settings:export returns canceled when dialog dismissed', async () => {
    mockShowSaveDialog.mockResolvedValue({ canceled: true })
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const handler = getHandle('settings:export')!
    const result = await handler({})
    expect(result).toEqual({ ok: false, reason: 'canceled' })
  })

  it('settings:import reads and returns parsed settings', async () => {
    const importPath = join(tmpDir, 'import.json')
    await fsp.writeFile(importPath, JSON.stringify({
      activeProvider: 'openai',
      mcpServers: [],
      mcpPermission: 'ask',
      keybindings: { toggleSidebar: 'Ctrl+E' }
    }))
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [importPath] })
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const handler = getHandle('settings:import')!
    const result = await handler({}) as { ok: boolean; settings: Record<string, unknown> }
    expect(result.ok).toBe(true)
    expect(result.settings.activeProvider).toBe('openai')
    expect(result.settings.keybindings).toEqual({ toggleSidebar: 'Ctrl+E' })
  })

  it('settings:import returns canceled when dialog dismissed', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const handler = getHandle('settings:import')!
    const result = await handler({})
    expect(result).toEqual({ ok: false, reason: 'canceled' })
  })

  it('settings:import returns error on invalid JSON', async () => {
    const badPath = join(tmpDir, 'bad.json')
    await fsp.writeFile(badPath, 'not valid json {{{')
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badPath] })
    const { registerSettingsExportImportHandlers } = await import('../../../src/main/ipc/settingsExportImport')
    registerSettingsExportImportHandlers()
    const handler = getHandle('settings:import')!
    const result = await handler({}) as { ok: boolean; reason: string }
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/invalid/i)
  })
})
