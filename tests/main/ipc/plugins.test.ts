import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcMainHandle = vi.hoisted(() => vi.fn())
const mockListFn = vi.hoisted(() => vi.fn())
const mockSearchFn = vi.hoisted(() => vi.fn())
const mockInstallFn = vi.hoisted(() => vi.fn())
const mockUninstallFn = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpcMainHandle },
  app: { getPath: () => '/fake/home' }
}))

vi.mock('../../../src/main/plugins/PluginLoader', () => ({
  PluginLoader: vi.fn().mockImplementation(() => ({
    list: mockListFn,
    search: mockSearchFn,
    install: mockInstallFn,
    uninstall: mockUninstallFn
  }))
}))

function getHandle(channel: string) {
  const call = mockIpcMainHandle.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((_event: unknown, ...args: unknown[]) => unknown) | undefined
}

describe('registerPluginHandlers', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    mockListFn.mockClear()
    mockSearchFn.mockClear()
    mockInstallFn.mockClear()
    mockUninstallFn.mockClear()
  })

  it('registers plugin:list, plugin:search, plugin:install, plugin:uninstall', async () => {
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    const channels = mockIpcMainHandle.mock.calls.map(c => c[0])
    expect(channels).toContain('plugin:list')
    expect(channels).toContain('plugin:search')
    expect(channels).toContain('plugin:install')
    expect(channels).toContain('plugin:uninstall')
  })

  it('plugin:list calls loader.list()', async () => {
    mockListFn.mockResolvedValue([{ id: 'kode-plugin-git', name: 'kode-plugin-git' }])
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    const handler = getHandle('plugin:list')!
    const result = await handler({})
    expect(mockListFn).toHaveBeenCalled()
    expect(result).toEqual([{ id: 'kode-plugin-git', name: 'kode-plugin-git' }])
  })

  it('plugin:search calls loader.search() with query', async () => {
    mockSearchFn.mockResolvedValue([])
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    const handler = getHandle('plugin:search')!
    await handler({}, 'eslint')
    expect(mockSearchFn).toHaveBeenCalledWith('eslint')
  })

  it('plugin:install calls loader.install() with id', async () => {
    mockInstallFn.mockResolvedValue(undefined)
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    const handler = getHandle('plugin:install')!
    await handler({}, 'kode-plugin-git')
    expect(mockInstallFn).toHaveBeenCalledWith('kode-plugin-git')
  })

  it('plugin:uninstall calls loader.uninstall() with id', async () => {
    mockUninstallFn.mockResolvedValue(undefined)
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    const handler = getHandle('plugin:uninstall')!
    await handler({}, 'kode-plugin-git')
    expect(mockUninstallFn).toHaveBeenCalledWith('kode-plugin-git')
  })

  it('is idempotent — registers handlers only once', async () => {
    const { registerPluginHandlers } = await import('../../../src/main/ipc/plugins')
    registerPluginHandlers()
    registerPluginHandlers()
    const listCalls = mockIpcMainHandle.mock.calls.filter(c => c[0] === 'plugin:list')
    expect(listCalls).toHaveLength(1)
  })
})
