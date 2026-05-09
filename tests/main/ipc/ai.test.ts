import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- hoisted mocks (must exist before vi.mock factory runs) ---
const mockIpcMainHandle = vi.hoisted(() => vi.fn())
const mockIpcMainOn = vi.hoisted(() => vi.fn())
const mockWebContentsSend = vi.hoisted(() => vi.fn())
const mockIsDestroyed = vi.hoisted(() => vi.fn().mockReturnValue(false))

const mockStreamOn = vi.hoisted(() => vi.fn())
const mockStreamAbort = vi.hoisted(() => vi.fn())
const mockFinalMessage = vi.hoisted(() => vi.fn())
const mockMessagesStream = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpcMainHandle, on: mockIpcMainOn },
  BrowserWindow: {
    fromWebContents: vi.fn().mockReturnValue({
      isDestroyed: mockIsDestroyed,
      webContents: { send: mockWebContentsSend }
    })
  }
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: mockMessagesStream }
  }))
}))

// Helper to get the registered handler for a channel
function getHandle(channel: string) {
  const call = mockIpcMainHandle.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((...args: unknown[]) => unknown) | undefined
}
function getOn(channel: string) {
  const call = mockIpcMainOn.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((...args: unknown[]) => unknown) | undefined
}

describe('registerAiHandlers — streaming', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    mockIpcMainOn.mockClear()
    mockWebContentsSend.mockClear()
    mockStreamOn.mockClear()
    mockStreamAbort.mockClear()

    // Each test gets a fresh stream mock
    mockFinalMessage.mockResolvedValue({})
    mockStreamOn.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })
  })

  it('registers ai:sendMessage handle', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledWith('ai:sendMessage', expect.any(Function))
  })

  it('registers ai:stop listener', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    expect(mockIpcMainOn).toHaveBeenCalledWith('ai:stop', expect.any(Function))
  })

  it('is idempotent — calling twice does not double-register', async () => {
    const { registerAiHandlers } = await import('../../../src/main/ipc/ai')
    registerAiHandlers()
    registerAiHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledTimes(1)
  })

  it('creates Anthropic client with provided apiKey and calls stream()', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as ReturnType<typeof vi.fn>
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    const handler = getHandle('ai:sendMessage')!
    const fakeEvent = { sender: {} }
    handler(fakeEvent, [{ role: 'user', content: 'hi' }], 'sk-test-key')

    expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'sk-test-key' })
    expect(mockMessagesStream).toHaveBeenCalledWith({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: 'hi' }]
    })
  })

  it('sends ai:token to window when text event fires', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    let textCb: ((text: string) => void) | undefined
    mockStreamOn.mockImplementation((event: string, cb: (text: string) => void) => {
      if (event === 'text') textCb = cb
      return { on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage }
    })
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })

    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-test')

    textCb?.('Hello ')
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:token', 'Hello ')
  })

  it('sends ai:done when finalMessage resolves', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-test')

    // finalMessage resolves → ai:done
    await Promise.resolve() // flush microtask queue
    await Promise.resolve()
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:done')
  })

  it('sends ai:error when finalMessage rejects with non-abort error', async () => {
    mockFinalMessage.mockRejectedValue(new Error('Invalid API key'))
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })

    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-bad')

    await Promise.resolve()
    await Promise.resolve()
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:error', 'Invalid API key')
  })

  it('sends ai:done (not ai:error) when stream is aborted via ai:stop', async () => {
    const abortError = new Error('Stream aborted')
    abortError.name = 'AbortError'
    mockFinalMessage.mockRejectedValue(abortError)
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })

    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-test')

    const stopHandler = getOn('ai:stop')!
    stopHandler()

    await Promise.resolve()
    await Promise.resolve()
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:done')
    expect(mockWebContentsSend).not.toHaveBeenCalledWith('ai:error', expect.any(String))
  })

  it('ai:stop aborts the current stream', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    // Start a stream
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-test')

    // Stop it
    const stopHandler = getOn('ai:stop')!
    stopHandler()
    expect(mockStreamAbort).toHaveBeenCalled()
  })

  it('does not send to destroyed window', async () => {
    mockIsDestroyed.mockReturnValue(true)

    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()

    let textCb: ((text: string) => void) | undefined
    mockStreamOn.mockImplementation((event: string, cb: (text: string) => void) => {
      if (event === 'text') textCb = cb
      return { on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage }
    })
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })

    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }], 'sk-test')
    textCb?.('hello')

    expect(mockWebContentsSend).not.toHaveBeenCalled()
  })
})
