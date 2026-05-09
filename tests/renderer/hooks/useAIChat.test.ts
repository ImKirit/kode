import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIChat } from '../../../src/renderer/src/hooks/useAIChat'

// Callbacks captured from window.kode.ai.on* calls
let onTokenCb: (text: string) => void = () => {}
let onDoneCb: () => void = () => {}
let onErrorCb: (msg: string) => void = () => {}

const mockSendMessage = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn()

beforeEach(() => {
  onTokenCb = () => {}
  onDoneCb = () => {}
  onErrorCb = () => {}
  mockSendMessage.mockClear()
  mockStop.mockClear()
  localStorage.clear()
  localStorage.setItem('kode.apiKey', 'sk-test')

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn() },
      terminal: {
        spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {})
      },
      ai: {
        sendMessage: mockSendMessage,
        stop: mockStop,
        onToken: (cb: (text: string) => void) => { onTokenCb = cb; return () => {} },
        onDone: (cb: () => void) => { onDoneCb = cb; return () => {} },
        onError: (cb: (msg: string) => void) => { onErrorCb = cb; return () => {} }
      },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

describe('useAIChat', () => {
  it('initial state: empty messages, not streaming, no error', () => {
    const { result } = renderHook(() => useAIChat())
    expect(result.current.messages).toEqual([])
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('loads apiKey from localStorage on init', () => {
    localStorage.setItem('kode.apiKey', 'sk-stored')
    const { result } = renderHook(() => useAIChat())
    expect(result.current.apiKey).toBe('sk-stored')
  })

  it('setApiKey saves to localStorage and updates state', () => {
    const { result } = renderHook(() => useAIChat())
    act(() => { result.current.setApiKey('sk-new') })
    expect(result.current.apiKey).toBe('sk-new')
    expect(localStorage.getItem('kode.apiKey')).toBe('sk-new')
  })

  it('sendMessage appends user + empty assistant message, sets isStreaming', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hello' })
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: '' })
    expect(result.current.isStreaming).toBe(true)
  })

  it('sendMessage calls window.kode.ai.sendMessage with correct args', async () => {
    const { result } = renderHook(() => useAIChat())
    act(() => { result.current.setApiKey('sk-test') })
    await act(async () => { await result.current.sendMessage('Hi') })
    expect(mockSendMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hi' }],
      'sk-test'
    )
  })

  it('token events append text to last assistant message', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    act(() => { onTokenCb('World') })
    act(() => { onTokenCb('!') })
    expect(result.current.messages[1].content).toBe('World!')
  })

  it('done event sets isStreaming to false', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    act(() => { onDoneCb() })
    expect(result.current.isStreaming).toBe(false)
  })

  it('error event sets isStreaming false and error message', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    act(() => { onErrorCb('Invalid API key') })
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBe('Invalid API key')
  })

  it('stop calls window.kode.ai.stop and sets isStreaming false', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    act(() => { result.current.stop() })
    expect(mockStop).toHaveBeenCalled()
    expect(result.current.isStreaming).toBe(false)
  })

  it('clearMessages resets messages and error', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('Hello') })
    act(() => { onErrorCb('oops') })
    act(() => { result.current.clearMessages() })
    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('ignores sendMessage while already streaming', async () => {
    const { result } = renderHook(() => useAIChat())
    await act(async () => { await result.current.sendMessage('First') })
    await act(async () => { await result.current.sendMessage('Second') })
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
  })
})
