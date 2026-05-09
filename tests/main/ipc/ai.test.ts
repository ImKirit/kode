import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcMainHandle = vi.hoisted(() => vi.fn())
const mockIpcMainOn = vi.hoisted(() => vi.fn())
const mockWebContentsSend = vi.hoisted(() => vi.fn())
const mockIsDestroyed = vi.hoisted(() => vi.fn().mockReturnValue(false))

const mockStreamOn = vi.hoisted(() => vi.fn())
const mockStreamAbort = vi.hoisted(() => vi.fn())
const mockFinalMessage = vi.hoisted(() => vi.fn())
const mockMessagesStream = vi.hoisted(() => vi.fn())

// OpenAI async iterable mock
const mockOpenAIStream = vi.hoisted(() => ({
  [Symbol.asyncIterator]: vi.fn()
}))
const mockChatCompletionsCreate = vi.hoisted(() => vi.fn())

// Settings mock
const mockLoadSettings = vi.hoisted(() => vi.fn())

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

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockChatCompletionsCreate } }
  }))
}))

vi.mock('../../../src/main/ipc/settings', () => ({
  loadSettings: mockLoadSettings
}))

function getHandle(channel: string) {
  const call = mockIpcMainHandle.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((...args: unknown[]) => unknown) | undefined
}
function getOn(channel: string) {
  const call = mockIpcMainOn.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((...args: unknown[]) => unknown) | undefined
}

describe('registerAiHandlers — M4', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockIpcMainHandle.mockClear()
    mockIpcMainOn.mockClear()
    mockWebContentsSend.mockClear()
    mockStreamOn.mockClear()
    mockStreamAbort.mockClear()
    mockIsDestroyed.mockReturnValue(false)

    mockFinalMessage.mockResolvedValue({})
    mockStreamOn.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })

    mockLoadSettings.mockReturnValue({
      activeProvider: 'anthropic',
      providers: {
        anthropic: { apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' },
        openai: { apiKey: 'sk-openai-test', model: 'gpt-4o' }
      }
    })
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

  it('is idempotent', async () => {
    const { registerAiHandlers } = await import('../../../src/main/ipc/ai')
    registerAiHandlers()
    registerAiHandlers()
    expect(mockIpcMainHandle).toHaveBeenCalledTimes(1)
  })

  it('reads API key from settings (not from renderer args)', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as ReturnType<typeof vi.fn>
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'sk-ant-test' })
  })

  it('sends ai:error when API key is empty', async () => {
    mockLoadSettings.mockReturnValue({
      activeProvider: 'anthropic',
      providers: {
        anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
        openai: { apiKey: '', model: 'gpt-4o' }
      }
    })
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:error', expect.stringContaining('API key'))
  })

  it('uses OpenAI when activeProvider is openai', async () => {
    mockLoadSettings.mockReturnValue({
      activeProvider: 'openai',
      providers: {
        anthropic: { apiKey: 'sk-ant', model: 'claude-sonnet-4-6' },
        openai: { apiKey: 'sk-openai-test', model: 'gpt-4o' }
      }
    })

    const chunks = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] }
    ]
    mockOpenAIStream[Symbol.asyncIterator].mockReturnValue({
      next: vi.fn()
        .mockResolvedValueOnce({ value: chunks[0], done: false })
        .mockResolvedValueOnce({ value: chunks[1], done: false })
        .mockResolvedValueOnce({ value: undefined, done: true })
    })
    mockChatCompletionsCreate.mockResolvedValue(mockOpenAIStream)

    const OpenAI = (await import('openai')).default as ReturnType<typeof vi.fn>
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    await handler({ sender: {} }, [{ role: 'user', content: 'hi' }])

    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-openai-test' })
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:token', 'Hello')
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:token', ' world')
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:done')
  })

  it('sends ai:done when Anthropic finalMessage resolves', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:done')
  })

  it('sends ai:error when Anthropic finalMessage rejects with non-abort error', async () => {
    mockFinalMessage.mockRejectedValue(new Error('Rate limit'))
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockWebContentsSend).toHaveBeenCalledWith('ai:error', 'Rate limit')
  })

  it('ai:stop aborts current Anthropic stream', async () => {
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
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
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    textCb?.('hello')
    expect(mockWebContentsSend).not.toHaveBeenCalled()
  })

  it('sends ai:rateLimit (not ai:error) when Anthropic returns 429', async () => {
    const rateLimitErr = Object.assign(new Error('Rate limited'), { status: 429 })
    mockFinalMessage.mockRejectedValue(rateLimitErr)
    mockMessagesStream.mockReturnValue({ on: mockStreamOn, abort: mockStreamAbort, finalMessage: mockFinalMessage })
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    await new Promise(resolve => setTimeout(resolve, 0))
    const rateLimitCall = mockWebContentsSend.mock.calls.find(c => c[0] === 'ai:rateLimit')
    expect(rateLimitCall).toBeDefined()
    expect(rateLimitCall![1]).toBeGreaterThan(0)
    expect(mockWebContentsSend).not.toHaveBeenCalledWith('ai:error', expect.anything())
  })

  it('sends ai:rateLimit (not ai:error) when OpenAI returns 429', async () => {
    mockLoadSettings.mockReturnValue({
      activeProvider: 'openai',
      providers: {
        anthropic: { apiKey: 'sk-ant', model: 'claude-sonnet-4-6' },
        openai: { apiKey: 'sk-openai-test', model: 'gpt-4o' }
      }
    })
    const rateLimitErr = Object.assign(new Error('Rate limited'), { status: 429 })
    mockChatCompletionsCreate.mockRejectedValue(rateLimitErr)
    const { registerAiHandlers, _resetRegistered } = await import('../../../src/main/ipc/ai')
    _resetRegistered()
    registerAiHandlers()
    const handler = getHandle('ai:sendMessage')!
    await handler({ sender: {} }, [{ role: 'user', content: 'hi' }])
    const rateLimitCall = mockWebContentsSend.mock.calls.find(c => c[0] === 'ai:rateLimit')
    expect(rateLimitCall).toBeDefined()
    expect(rateLimitCall![1]).toBeGreaterThan(0)
    expect(mockWebContentsSend).not.toHaveBeenCalledWith('ai:error', expect.anything())
  })
})
