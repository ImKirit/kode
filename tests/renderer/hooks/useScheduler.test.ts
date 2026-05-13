import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScheduler } from '@renderer/hooks/useScheduler'

let onTokenCb: (text: string) => void = () => {}
let onDoneCb: () => void = () => {}
let onErrorCb: (msg: string) => void = () => {}
let onRateLimitCb: (ms: number) => void = () => {}
let onToolCallCb: (e: { callId: string; toolName: string; serverId: string; args: Record<string, unknown> }) => void = () => {}
let onToolResultCb: (e: { callId: string; result: string; isError: boolean }) => void = () => {}
let onToolApprovalCb: (e: { callId: string; toolName: string; serverId: string; args: Record<string, unknown> }) => void = () => {}
let onUsageCb: (e: { inputTokens: number; outputTokens: number }) => void = () => {}

const mockSendMessage = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn()
const mockApproveTool = vi.fn()
const mockDenyTool = vi.fn()

beforeEach(() => {
  onTokenCb = () => {}
  onDoneCb = () => {}
  onErrorCb = () => {}
  onRateLimitCb = () => {}
  onToolCallCb = () => {}
  onToolResultCb = () => {}
  onToolApprovalCb = () => {}
  onUsageCb = () => {}
  mockSendMessage.mockClear()
  mockStop.mockClear()
  mockApproveTool.mockClear()
  mockDenyTool.mockClear()

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
        approveTool: mockApproveTool,
        denyTool: mockDenyTool,
        onToken: (cb: (text: string) => void) => { onTokenCb = cb; return () => {} },
        onDone: (cb: () => void) => { onDoneCb = cb; return () => {} },
        onError: (cb: (msg: string) => void) => { onErrorCb = cb; return () => {} },
        onRateLimit: (cb: (ms: number) => void) => { onRateLimitCb = cb; return () => {} },
        onToolCall: (cb: (e: { callId: string; toolName: string; serverId: string; args: Record<string, unknown> }) => void) => { onToolCallCb = cb; return () => {} },
        onToolResult: (cb: (e: { callId: string; result: string; isError: boolean }) => void) => { onToolResultCb = cb; return () => {} },
        onToolApproval: (cb: (e: { callId: string; toolName: string; serverId: string; args: Record<string, unknown> }) => void) => { onToolApprovalCb = cb; return () => {} },
        onUsage: (cb: (e: { inputTokens: number; outputTokens: number }) => void) => { onUsageCb = cb; return () => {} }
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
    expect(result.current.pendingApproval).toBeNull()
  })

  it('sendOrEnqueue sends immediately when idle', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    expect(mockSendMessage).toHaveBeenCalledWith([{ role: 'user', content: 'Hello' }], undefined)
    expect(result.current.isStreaming).toBe(true)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hello' })
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: '' })
  })

  it('sendOrEnqueue passes systemPrompt through', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello', 'You are a helpful assistant.') })
    expect(mockSendMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hello' }],
      'You are a helpful assistant.'
    )
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

  it('stop clears the queue', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('First') })
    act(() => { result.current.sendOrEnqueue('Second') })
    act(() => { result.current.sendOrEnqueue('Third') })
    act(() => { result.current.stop() })
    expect(result.current.queue).toEqual([])
  })

  it('onToolCall adds pending tool entry to last assistant message', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolCallCb({ callId: 'c1', toolName: 'read_file', serverId: 'fs', args: { path: '/foo' } })
    })
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.role).toBe('assistant')
    expect(last.toolCalls).toHaveLength(1)
    expect(last.toolCalls![0]).toMatchObject({
      callId: 'c1',
      toolName: 'read_file',
      serverId: 'fs',
      args: { path: '/foo' },
      status: 'pending'
    })
  })

  it('onToolResult updates tool call status and result', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolCallCb({ callId: 'c1', toolName: 'read_file', serverId: 'fs', args: {} })
    })
    act(() => {
      onToolResultCb({ callId: 'c1', result: 'file contents', isError: false })
    })
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.toolCalls![0]).toMatchObject({
      callId: 'c1',
      status: 'success',
      result: 'file contents'
    })
  })

  it('onToolResult marks error status when isError is true', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolCallCb({ callId: 'c2', toolName: 'run_cmd', serverId: 'shell', args: {} })
    })
    act(() => {
      onToolResultCb({ callId: 'c2', result: 'permission denied', isError: true })
    })
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.toolCalls![0].status).toBe('error')
  })

  it('onToolApproval sets pendingApproval', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolApprovalCb({ callId: 'c3', toolName: 'run_cmd', serverId: 'shell', args: { cmd: 'rm -rf' } })
    })
    expect(result.current.pendingApproval).toMatchObject({
      callId: 'c3',
      toolName: 'run_cmd',
      serverId: 'shell',
      args: { cmd: 'rm -rf' }
    })
  })

  it('approveTool calls window.kode.ai.approveTool and clears pendingApproval', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolApprovalCb({ callId: 'c4', toolName: 'run_cmd', serverId: 'shell', args: {} })
    })
    act(() => { result.current.approveTool('c4') })
    expect(mockApproveTool).toHaveBeenCalledWith('c4')
    expect(result.current.pendingApproval).toBeNull()
  })

  it('denyTool calls window.kode.ai.denyTool, clears pendingApproval, and marks tool denied', async () => {
    const { result } = renderHook(() => useScheduler())
    await act(async () => { result.current.sendOrEnqueue('Hello') })
    act(() => {
      onToolCallCb({ callId: 'c5', toolName: 'run_cmd', serverId: 'shell', args: {} })
    })
    act(() => {
      onToolApprovalCb({ callId: 'c5', toolName: 'run_cmd', serverId: 'shell', args: {} })
    })
    act(() => { result.current.denyTool('c5') })
    expect(mockDenyTool).toHaveBeenCalledWith('c5')
    expect(result.current.pendingApproval).toBeNull()
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.toolCalls![0].status).toBe('denied')
  })
})
