import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScheduler } from '@renderer/hooks/useScheduler'

let onTokenCb: (text: string) => void = () => {}
let onDoneCb: () => void = () => {}
let onErrorCb: (msg: string) => void = () => {}
let onRateLimitCb: (ms: number) => void = () => {}

const mockSendMessage = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn()

beforeEach(() => {
  onTokenCb = () => {}
  onDoneCb = () => {}
  onErrorCb = () => {}
  onRateLimitCb = () => {}
  mockSendMessage.mockClear()
  mockStop.mockClear()

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn() },
      terminal: {
        spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {})
      },
      settings: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
      ai: {
        sendMessage: mockSendMessage,
        stop: mockStop,
        onToken: (cb: (text: string) => void) => { onTokenCb = cb; return () => {} },
        onDone: (cb: () => void) => { onDoneCb = cb; return () => {} },
        onError: (cb: (msg: string) => void) => { onErrorCb = cb; return () => {} },
        onRateLimit: (cb: (ms: number) => void) => { onRateLimitCb = cb; return () => {} }
      },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

describe('useScheduler', () => {
  it('initial state: empty messages, not streaming, no error, empty queue, no countdown', () => {
    const { result } = renderHook(() => useScheduler())
    expect(result.current.messages).toEqual([])
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.queue).toEqual([])
    expect(result.current.retryCountdown).toBeNull()
  })

  it('sendOrEnqueue sends immediately when idle', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    expect(mockSendMessage).toHaveBeenCalledWith([{ role: 'user', content: 'Hello' }])
    expect(result.current.isStreaming).toBe(true)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hello' })
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: '' })
  })

  it('sendOrEnqueue queues when already streaming', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('First') })
    act(() => { result.current.sendOrEnqueue('Second') })
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    expect(result.current.queue).toEqual(['Second'])
  })

  it('onToken appends to last assistant message', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onTokenCb('World') })
    expect(result.current.messages[1].content).toBe('World')
  })

  it('onDone sets isStreaming false', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onDoneCb() })
    expect(result.current.isStreaming).toBe(false)
  })

  it('auto-drains queue when streaming ends', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('First') })
    act(() => { result.current.sendOrEnqueue('Second') })
    act(() => { onDoneCb() })
    expect(mockSendMessage).toHaveBeenCalledTimes(2)
    expect(result.current.queue).toEqual([])
  })

  it('onError sets isStreaming false and error', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onErrorCb('API error') })
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBe('API error')
  })

  it('onRateLimit sets retryCountdown and isStreaming false', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onRateLimitCb(5000) })
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.retryCountdown).toBe(5)
  })

  it('stop cancels streaming and clears countdown', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { result.current.stop() })
    expect(mockStop).toHaveBeenCalled()
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.retryCountdown).toBeNull()
  })

  it('clearMessages resets messages and error', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onErrorCb('oops') })
    act(() => { result.current.clearMessages() })
    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('removeFromQueue removes item by index', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('First') })
    act(() => { result.current.sendOrEnqueue('Second') })
    act(() => { result.current.sendOrEnqueue('Third') })
    act(() => { result.current.removeFromQueue(0) })
    expect(result.current.queue).toEqual(['Third'])
  })

  it('clearQueue empties the queue', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('First') })
    act(() => { result.current.sendOrEnqueue('Second') })
    act(() => { result.current.clearQueue() })
    expect(result.current.queue).toEqual([])
  })

  it('sendOrEnqueue queues when rate-limit countdown is active', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => { onRateLimitCb(60000) })
    act(() => { result.current.sendOrEnqueue('During countdown') })
    expect(result.current.queue).toEqual(['During countdown'])
  })
})
