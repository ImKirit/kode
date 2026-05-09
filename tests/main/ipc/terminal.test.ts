import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node-pty', () => ({
  spawn: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis()
  },
  BrowserWindow: {
    fromWebContents: vi.fn()
  }
}))

import * as pty from 'node-pty'
import { ipcMain, BrowserWindow } from 'electron'
import { registerTerminalHandlers, killAllTerminals } from '../../../src/main/ipc/terminal'

describe('terminal IPC handlers', () => {
  let spawnHandler: Function
  let writeListener: Function
  let resizeListener: Function
  let killListener: Function

  let mockPty: {
    onData: ReturnType<typeof vi.fn>
    onExit: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    resize: ReturnType<typeof vi.fn>
    kill: ReturnType<typeof vi.fn>
  }
  let mockWebContents: { send: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockPty = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn()
    }
    mockWebContents = { send: vi.fn() }

    vi.mocked(pty.spawn).mockReturnValue(mockPty as any)
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({
      webContents: mockWebContents
    } as any)

    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      if (channel === 'terminal:spawn') spawnHandler = handler as Function
      return ipcMain
    })
    vi.mocked(ipcMain.on).mockImplementation((channel, listener) => {
      if (channel === 'terminal:write') writeListener = listener as Function
      if (channel === 'terminal:resize') resizeListener = listener as Function
      if (channel === 'terminal:kill') killListener = listener as Function
      return ipcMain
    })

    registerTerminalHandlers()
  })

  afterEach(() => {
    killAllTerminals()
    vi.clearAllMocks()
  })

  it('spawn: creates a PTY with correct dimensions and shell', async () => {
    const mockEvent = { sender: {} }
    await spawnHandler(mockEvent, 80, 24)
    expect(pty.spawn).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ cols: 80, rows: 24, name: 'xterm-color' })
    )
  })

  it('spawn: returns a non-empty string termId', async () => {
    const mockEvent = { sender: {} }
    const termId = await spawnHandler(mockEvent, 80, 24)
    expect(typeof termId).toBe('string')
    expect(termId.length).toBeGreaterThan(0)
  })

  it('spawn: PTY data is forwarded to the renderer via terminal:data', async () => {
    const mockEvent = { sender: {} }
    const termId = await spawnHandler(mockEvent, 80, 24)
    const dataCallback = vi.mocked(mockPty.onData).mock.calls[0][0]
    dataCallback('hello')
    expect(mockWebContents.send).toHaveBeenCalledWith('terminal:data', termId, 'hello')
  })

  it('write: sends data to the correct PTY', async () => {
    const mockEvent = { sender: {} }
    const termId = await spawnHandler(mockEvent, 80, 24)
    writeListener({}, termId, 'ls\n')
    expect(mockPty.write).toHaveBeenCalledWith('ls\n')
  })

  it('resize: resizes the correct PTY', async () => {
    const mockEvent = { sender: {} }
    const termId = await spawnHandler(mockEvent, 80, 24)
    resizeListener({}, termId, 120, 40)
    expect(mockPty.resize).toHaveBeenCalledWith(120, 40)
  })

  it('kill: kills and removes the PTY; subsequent writes are no-ops', async () => {
    const mockEvent = { sender: {} }
    const termId = await spawnHandler(mockEvent, 80, 24)
    killListener({}, termId)
    expect(mockPty.kill).toHaveBeenCalled()
    // After kill the Map entry is gone — write should not reach the PTY
    writeListener({}, termId, 'test')
    expect(mockPty.write).not.toHaveBeenCalled()
  })

  it('killAllTerminals: kills every active PTY', async () => {
    const mockEvent = { sender: {} }
    await spawnHandler(mockEvent, 80, 24)
    await spawnHandler(mockEvent, 80, 24)
    killAllTerminals()
    expect(mockPty.kill).toHaveBeenCalledTimes(2)
  })
})
