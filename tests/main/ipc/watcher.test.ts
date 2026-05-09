import { describe, it, expect, vi, beforeEach } from 'vitest'

const handles: Record<string, (...args: unknown[]) => unknown> = {}
const ons: Record<string, (...args: unknown[]) => unknown> = {}

const { mockWatcherOn, mockWatcherClose, mockChokidarWatch, mockReadFile, mockWebContentsSend, mockFromWebContents } = vi.hoisted(() => {
  const mockWatcherOn = vi.fn().mockReturnThis()
  const mockWatcherClose = vi.fn()
  const mockChokidarWatch = vi.fn(() => ({ on: mockWatcherOn, close: mockWatcherClose }))
  const mockReadFile = vi.fn().mockResolvedValue('file content')
  const mockWebContentsSend = vi.fn()
  const mockFromWebContents = vi.fn(() => ({
    isDestroyed: () => false,
    webContents: { send: mockWebContentsSend }
  }))
  return { mockWatcherOn, mockWatcherClose, mockChokidarWatch, mockReadFile, mockWebContentsSend, mockFromWebContents }
})

vi.mock('chokidar', () => ({ default: { watch: mockChokidarWatch }, watch: mockChokidarWatch }))

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, promises: { ...actual.promises, readFile: mockReadFile } }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => { handles[ch] = handler }),
    on: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => { ons[ch] = handler })
  },
  BrowserWindow: { fromWebContents: mockFromWebContents }
}))

describe('registerWatcherHandlers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    Object.keys(handles).forEach(k => delete handles[k])
    Object.keys(ons).forEach(k => delete ons[k])
  })

  it('registers fs:watchRoot handle', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    expect(handles['fs:watchRoot']).toBeDefined()
  })

  it('is idempotent — second call does not re-register', async () => {
    const { ipcMain } = await import('electron')
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    registerWatcherHandlers()
    expect(ipcMain.handle).toHaveBeenCalledTimes(1)
  })

  it('calls chokidar.watch with the provided rootPath', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/my/project')
    expect(mockChokidarWatch).toHaveBeenCalledWith('/my/project', expect.objectContaining({
      ignoreInitial: true,
      persistent: true
    }))
  })

  it('closes existing watcher before starting a new one', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project-a')
    await handles['fs:watchRoot']!({ sender: {} }, '/project-b')
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
    expect(mockChokidarWatch).toHaveBeenCalledTimes(2)
  })

  it('stopWatcher closes the active watcher', async () => {
    const { registerWatcherHandlers, stopWatcher, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project')
    stopWatcher()
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
  })

  it('fs:unwatchRoot closes the watcher', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project')
    ons['fs:unwatchRoot']!()
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
  })
})
