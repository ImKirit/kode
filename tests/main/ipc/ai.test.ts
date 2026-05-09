import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcMainHandle = vi.hoisted(() => vi.fn())
const mockIpcMainOn = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockIpcMainHandle,
    on: mockIpcMainOn
  },
  BrowserWindow: {
    fromWebContents: vi.fn()
  }
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn()
}))

describe('registerAiHandlers', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    mockIpcMainOn.mockClear()
  })

  it('registers ai:sendMessage handle', async () => {
    const { registerAiHandlers } = await import('../../../src/main/ipc/ai')
    registerAiHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledWith('ai:sendMessage', expect.any(Function))
  })

  it('registers ai:stop listener', async () => {
    const { registerAiHandlers } = await import('../../../src/main/ipc/ai')
    registerAiHandlers()
    expect(mockIpcMainOn).toHaveBeenCalledWith('ai:stop', expect.any(Function))
  })

  it('is idempotent — calling twice does not double-register', async () => {
    const { registerAiHandlers } = await import('../../../src/main/ipc/ai')
    registerAiHandlers()
    registerAiHandlers() // second call should be no-op
    expect(mockIpcMainHandle).toHaveBeenCalledTimes(1)
  })
})
