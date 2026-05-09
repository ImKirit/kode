# M6: Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prompt queue (submit while streaming → queues automatically), and auto-resume on rate-limit (detect 429, show countdown, retry when timer expires).

**Architecture:** A new `useScheduler` hook owns all chat message state, prompt queue state, and rate-limit retry state — replacing `useAIChat` in `AIChatPanel`. The main process detects 429 errors and fires a new `ai:rateLimit` IPC event instead of `ai:error`. A new `QueueDisplay` component renders queued items and the retry countdown below the message list.

**Tech Stack:** React hooks, Electron IPC, Anthropic/OpenAI SDKs (existing), Vitest + @testing-library/react.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/main/ipc/ai.ts` | Modify | Detect 429 → fire `ai:rateLimit` with `retryAfterMs` |
| `src/preload/index.ts` | Modify | Expose `window.kode.ai.onRateLimit` |
| `src/renderer/src/types/electron.d.ts` | Modify | Add `onRateLimit` type to Window.kode.ai |
| `src/renderer/src/hooks/usePromptQueue.ts` | Create | Pure queue state (enqueue / remove / clear) |
| `src/renderer/src/hooks/useScheduler.ts` | Create | Chat messages + queue + rate-limit countdown + auto-drain |
| `src/renderer/src/components/ai/QueueDisplay.tsx` | Create | Renders queued items and retry countdown UI |
| `src/renderer/src/components/ai/AIChatPanel.tsx` | Modify | Use useScheduler + QueueDisplay; remove useAIChat |
| `tests/main/ipc/ai.test.ts` | Modify | Add 2 tests for 429 → ai:rateLimit |
| `tests/renderer/hooks/usePromptQueue.test.ts` | Create | 5 tests |
| `tests/renderer/hooks/useScheduler.test.ts` | Create | 12 tests |
| `tests/renderer/components/ai/QueueDisplay.test.tsx` | Create | 7 tests |
| `tests/renderer/components/ai/AIChatPanel.test.tsx` | Modify | Switch mock from useAIChat → useScheduler; add 3 tests |

---

### Task 1: Rate-limit IPC — main process + preload + types

**Files:**
- Modify: `src/main/ipc/ai.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/types/electron.d.ts`
- Modify: `tests/main/ipc/ai.test.ts`

- [ ] **Step 1: Write the two failing tests in ai.test.ts**

Add these two tests inside the existing `describe('registerAiHandlers — M4', ...)` block in `tests/main/ipc/ai.test.ts`, after the last test:

```typescript
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
  expect(mockWebContentsSend).toHaveBeenCalledWith('ai:rateLimit', expect.any(Number))
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
  expect(mockWebContentsSend).toHaveBeenCalledWith('ai:rateLimit', expect.any(Number))
  expect(mockWebContentsSend).not.toHaveBeenCalledWith('ai:error', expect.anything())
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/main/ipc/ai.test.ts
```

Expected: FAIL — the two new tests fail (ai:error fires instead of ai:rateLimit).

- [ ] **Step 3: Update ai.ts — detect 429 in Anthropic catch**

Replace the `.catch` block inside the `if (provider === 'anthropic')` path in `src/main/ipc/ai.ts`:

```typescript
return stream.finalMessage()
  .then(() => { currentStream = null; send('ai:done') })
  .catch((err: unknown) => {
    currentStream = null
    if (err instanceof Error && err.name === 'AbortError') {
      send('ai:done')
    } else if ((err as { status?: number }).status === 429) {
      const retryAfter = (err as { headers?: Record<string, string> }).headers?.['retry-after']
      send('ai:rateLimit', retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000)
    } else {
      send('ai:error', err instanceof Error ? err.message : String(err))
    }
  })
```

- [ ] **Step 4: Update ai.ts — detect 429 in OpenAI catch**

Replace the `catch` block inside the `else if (provider === 'openai')` path:

```typescript
} catch (err: unknown) {
  openaiAbortController = null
  if (err instanceof Error && err.name === 'AbortError') {
    send('ai:done')
  } else if ((err as { status?: number }).status === 429) {
    const retryAfter = (err as { headers?: Record<string, string> }).headers?.['retry-after']
    send('ai:rateLimit', retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000)
  } else {
    send('ai:error', err instanceof Error ? err.message : String(err))
  }
}
```

- [ ] **Step 5: Run ai.test.ts — verify all 12 pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/main/ipc/ai.test.ts
```

Expected: 12 tests PASS (10 existing + 2 new).

- [ ] **Step 6: Add onRateLimit to preload**

In `src/preload/index.ts`, add `onRateLimit` to the `ai` object, after `onError`:

```typescript
onRateLimit: (cb: (retryAfterMs: number) => void): (() => void) => {
  const listener = (_event: IpcRendererEvent, ms: number) => cb(ms)
  ipcRenderer.on('ai:rateLimit', listener)
  return () => ipcRenderer.removeListener('ai:rateLimit', listener)
},
```

- [ ] **Step 7: Add onRateLimit type to electron.d.ts**

In `src/renderer/src/types/electron.d.ts`, add to the `ai` block after `onError`:

```typescript
onRateLimit(cb: (retryAfterMs: number) => void): () => void
```

- [ ] **Step 8: Run full suite — verify still 137 passing**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: 137 tests passing (135 + 2 new ai tests).

- [ ] **Step 9: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/main/ipc/ai.ts src/preload/index.ts src/renderer/src/types/electron.d.ts tests/main/ipc/ai.test.ts
git commit -m "feat(m6): detect 429 rate limit → ai:rateLimit event with retryAfterMs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: usePromptQueue hook

**Files:**
- Create: `src/renderer/src/hooks/usePromptQueue.ts`
- Create: `tests/renderer/hooks/usePromptQueue.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/hooks/usePromptQueue.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePromptQueue } from '@renderer/hooks/usePromptQueue'

describe('usePromptQueue', () => {
  it('starts with empty queue', () => {
    const { result } = renderHook(() => usePromptQueue())
    expect(result.current.queue).toEqual([])
  })

  it('enqueue adds items to end in order', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('hello') })
    act(() => { result.current.enqueue('world') })
    expect(result.current.queue).toEqual(['hello', 'world'])
  })

  it('remove removes item by index, leaving others intact', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('a') })
    act(() => { result.current.enqueue('b') })
    act(() => { result.current.enqueue('c') })
    act(() => { result.current.remove(1) })
    expect(result.current.queue).toEqual(['a', 'c'])
  })

  it('clear empties the queue', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('x') })
    act(() => { result.current.enqueue('y') })
    act(() => { result.current.clear() })
    expect(result.current.queue).toEqual([])
  })

  it('remove with out-of-bounds index does not throw', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('a') })
    act(() => { result.current.remove(99) })
    expect(result.current.queue).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/usePromptQueue.test.ts
```

Expected: FAIL — `Cannot find module '@renderer/hooks/usePromptQueue'`

- [ ] **Step 3: Implement usePromptQueue.ts**

Create `src/renderer/src/hooks/usePromptQueue.ts`:

```typescript
import { useState, useCallback } from 'react'

export interface UsePromptQueueResult {
  queue: string[]
  enqueue(text: string): void
  remove(index: number): void
  clear(): void
}

export function usePromptQueue(): UsePromptQueueResult {
  const [queue, setQueue] = useState<string[]>([])

  const enqueue = useCallback((text: string) => {
    setQueue(prev => [...prev, text])
  }, [])

  const remove = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clear = useCallback(() => setQueue([]), [])

  return { queue, enqueue, remove, clear }
}
```

- [ ] **Step 4: Run tests — verify 5 pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/usePromptQueue.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/hooks/usePromptQueue.ts tests/renderer/hooks/usePromptQueue.test.ts
git commit -m "feat(m6): usePromptQueue hook — enqueue/remove/clear

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: useScheduler hook

**Files:**
- Create: `src/renderer/src/hooks/useScheduler.ts`
- Create: `tests/renderer/hooks/useScheduler.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/hooks/useScheduler.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/useScheduler.test.ts
```

Expected: FAIL — `Cannot find module '@renderer/hooks/useScheduler'`

- [ ] **Step 3: Implement useScheduler.ts**

Create `src/renderer/src/hooks/useScheduler.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface UseSchedulerResult {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  retryCountdown: number | null
  queue: string[]
  sendOrEnqueue(text: string): void
  stop(): void
  clearMessages(): void
  removeFromQueue(index: number): void
  clearQueue(): void
}

export function useScheduler(): UseSchedulerResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // Refs to avoid stale closures
  const messagesRef = useRef<ChatMessage[]>([])
  const isStreamingRef = useRef(false)
  const retryCountdownRef = useRef<number | null>(null)
  // Messages sent to the API for the current (or last) request — used for retry
  const pendingMessagesRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }> | null>(null)
  // Track previous isStreaming value for auto-drain detection
  const prevIsStreamingRef = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { retryCountdownRef.current = retryCountdown }, [retryCountdown])

  // AI event subscriptions (once on mount)
  useEffect(() => {
    const unToken = window.kode.ai.onToken((text) => {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + text }
        }
        return copy
      })
    })

    const unDone = window.kode.ai.onDone(() => {
      pendingMessagesRef.current = null
      isStreamingRef.current = false
      setIsStreaming(false)
    })

    const unError = window.kode.ai.onError((msg) => {
      pendingMessagesRef.current = null
      isStreamingRef.current = false
      setIsStreaming(false)
      setError(msg)
    })

    const unRateLimit = window.kode.ai.onRateLimit((retryAfterMs) => {
      isStreamingRef.current = false
      setIsStreaming(false)
      // Remove the empty assistant placeholder added when message was sent
      setMessages(prev => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && copy[copy.length - 1].content === '') {
          copy.pop()
        }
        return copy
      })
      setRetryCountdown(Math.ceil(retryAfterMs / 1000))
    })

    return () => { unToken(); unDone(); unError(); unRateLimit() }
  }, [])

  // Countdown tick — decrements every second, retries at 0
  useEffect(() => {
    if (retryCountdown === null) return
    if (retryCountdown === 0) {
      setRetryCountdown(null)
      const msgs = pendingMessagesRef.current
      if (msgs) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
        setMessages(prev => [...prev, assistantMsg])
        isStreamingRef.current = true
        setIsStreaming(true)
        setError(null)
        window.kode.ai.sendMessage(msgs)
      }
      return
    }
    const timer = setTimeout(() => setRetryCountdown(s => s !== null ? s - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  // Auto-drain: when streaming finishes (and no rate-limit pending), send next queued item
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current
    prevIsStreamingRef.current = isStreaming
    if (!wasStreaming || isStreaming || retryCountdownRef.current !== null) return

    setQueue(prev => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      const userMsg: ChatMessage = { role: 'user', content: next }
      const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
      const newMessages = [...messagesRef.current, userMsg]
      setMessages(m => [...m, userMsg, assistantMsg])
      pendingMessagesRef.current = newMessages
      isStreamingRef.current = true
      setIsStreaming(true)
      setError(null)
      window.kode.ai.sendMessage(newMessages)
      return rest
    })
  }, [isStreaming])

  const sendOrEnqueue = useCallback((text: string) => {
    if (!text.trim()) return
    const trimmed = text.trim()
    if (isStreamingRef.current || retryCountdownRef.current !== null) {
      setQueue(prev => [...prev, trimmed])
      return
    }
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    const newMessages = [...messagesRef.current, userMsg]
    setMessages(prev => [...prev, userMsg, assistantMsg])
    pendingMessagesRef.current = newMessages
    isStreamingRef.current = true
    setIsStreaming(true)
    setError(null)
    window.kode.ai.sendMessage(newMessages)
  }, [])

  const stop = useCallback(() => {
    window.kode.ai.stop()
    pendingMessagesRef.current = null
    isStreamingRef.current = false
    setIsStreaming(false)
    setRetryCountdown(null)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  return {
    messages, isStreaming, error, retryCountdown, queue,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue
  }
}
```

- [ ] **Step 4: Run tests — verify 12 pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/useScheduler.test.ts
```

Expected: 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/hooks/useScheduler.ts tests/renderer/hooks/useScheduler.test.ts
git commit -m "feat(m6): useScheduler hook — queue, auto-drain, rate-limit countdown + retry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: QueueDisplay component

**Files:**
- Create: `src/renderer/src/components/ai/QueueDisplay.tsx`
- Create: `tests/renderer/components/ai/QueueDisplay.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/components/ai/QueueDisplay.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueueDisplay } from '@renderer/components/ai/QueueDisplay'

describe('QueueDisplay', () => {
  it('renders nothing when queue is empty and no countdown', () => {
    const { container } = render(
      <QueueDisplay queue={[]} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders queue-display when queue has items', () => {
    render(
      <QueueDisplay queue={['hello']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('queue-display')).toBeInTheDocument()
  })

  it('renders queue item text', () => {
    render(
      <QueueDisplay queue={['first prompt', 'second prompt']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByText('first prompt')).toBeInTheDocument()
    expect(screen.getByText('second prompt')).toBeInTheDocument()
  })

  it('calls onRemove with correct index when remove button clicked', () => {
    const onRemove = vi.fn()
    render(
      <QueueDisplay queue={['a', 'b', 'c']} retryCountdown={null} onRemove={onRemove} onClearQueue={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /remove queued prompt 2/i }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('calls onClearQueue when Clear all button is clicked', () => {
    const onClearQueue = vi.fn()
    render(
      <QueueDisplay queue={['item']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={onClearQueue} />
    )
    fireEvent.click(screen.getByRole('button', { name: /clear queue/i }))
    expect(onClearQueue).toHaveBeenCalledTimes(1)
  })

  it('renders retry countdown when retryCountdown is non-null', () => {
    render(
      <QueueDisplay queue={[]} retryCountdown={42} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('retry-countdown')).toBeInTheDocument()
    expect(screen.getByText(/retrying in 42s/i)).toBeInTheDocument()
  })

  it('renders both countdown and queue items together', () => {
    render(
      <QueueDisplay queue={['pending']} retryCountdown={10} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('retry-countdown')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/components/ai/QueueDisplay.test.tsx
```

Expected: FAIL — `Cannot find module '@renderer/components/ai/QueueDisplay'`

- [ ] **Step 3: Implement QueueDisplay.tsx**

Create `src/renderer/src/components/ai/QueueDisplay.tsx`:

```typescript
interface QueueDisplayProps {
  queue: string[]
  retryCountdown: number | null
  onRemove(index: number): void
  onClearQueue(): void
}

export function QueueDisplay({ queue, retryCountdown, onRemove, onClearQueue }: QueueDisplayProps) {
  if (queue.length === 0 && retryCountdown === null) return null

  return (
    <div
      data-testid="queue-display"
      style={{
        borderTop: '1px solid var(--border)',
        padding: '6px 12px',
        background: 'var(--bg-primary)',
        flexShrink: 0
      }}
    >
      {retryCountdown !== null && (
        <div
          data-testid="retry-countdown"
          style={{
            fontSize: 11,
            color: '#f59e0b',
            marginBottom: queue.length > 0 ? 6 : 0,
            padding: '2px 0'
          }}
        >
          Rate limited — retrying in {retryCountdown}s
        </div>
      )}

      {queue.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4
          }}>
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Queued ({queue.length})
            </span>
            <button
              onClick={onClearQueue}
              aria-label="Clear queue"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                color: 'var(--text-muted)',
                padding: '1px 4px'
              }}
            >
              Clear all
            </button>
          </div>

          {queue.map((text, i) => (
            <div
              key={i}
              data-testid={`queue-item-${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
            >
              <span style={{
                flex: 1,
                fontSize: 11,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {text}
              </span>
              <button
                onClick={() => onRemove(i)}
                aria-label={`Remove queued prompt ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '1px 3px',
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify 7 pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/components/ai/QueueDisplay.test.tsx
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/components/ai/QueueDisplay.tsx tests/renderer/components/ai/QueueDisplay.test.tsx
git commit -m "feat(m6): QueueDisplay component — queued items and rate-limit countdown UI

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Wire AIChatPanel — useScheduler + QueueDisplay

**Files:**
- Modify: `src/renderer/src/components/ai/AIChatPanel.tsx`
- Modify: `tests/renderer/components/ai/AIChatPanel.test.tsx`

- [ ] **Step 1: Read current AIChatPanel.tsx before editing**

Read `src/renderer/src/components/ai/AIChatPanel.tsx` to confirm the current state.

- [ ] **Step 2: Replace AIChatPanel.tsx**

Replace `src/renderer/src/components/ai/AIChatPanel.tsx` with:

```typescript
import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings } from 'lucide-react'
import { useScheduler } from '../../hooks/useScheduler'
import { useSettings } from '../../hooks/useSettings'
import { ChatMessage } from './ChatMessage'
import { ProviderSettings } from './ProviderSettings'
import { QueueDisplay } from './QueueDisplay'

export function AIChatPanel() {
  const {
    messages, isStreaming, error, retryCountdown, queue,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue
  } = useScheduler()
  const { settings, setActiveProvider, setProviderKey, setProviderModel } = useSettings()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = messagesEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    sendOrEnqueue(input)
    setInput('')
  }, [input, sendOrEnqueue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const isBlocked = isStreaming || retryCountdown !== null
  const activeModel = settings?.providers[settings.activeProvider]?.model ?? ''
  const modelLabel = activeModel.split('-').slice(0, 3).join('-')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 0 14px',
        height: 35,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          AI Agent
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeModel && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 5px'
            }}>
              {modelLabel}
            </span>
          )}
          <button
            onClick={() => setShowSettings(v => !v)}
            aria-label="Settings"
            title="Provider settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings size={13} />
          </button>
          <button
            onClick={clearMessages}
            title="Clear conversation"
            aria-label="Clear"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Provider settings panel (collapsible) */}
      {showSettings && settings && (
        <ProviderSettings
          settings={settings}
          onSetActiveProvider={setActiveProvider}
          onSetProviderKey={setProviderKey}
          onSetProviderModel={setProviderModel}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 4px',
        minHeight: 0
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 12,
            opacity: 0.6
          }}>
            Start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={`${msg.role}-${i}`}
            role={msg.role}
            content={msg.content}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <div style={{
            padding: '6px 10px',
            marginBottom: 8,
            background: 'rgba(220, 80, 80, 0.12)',
            border: '1px solid rgba(220, 80, 80, 0.3)',
            borderRadius: 6,
            fontSize: 12,
            color: '#f87171'
          }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Queue + retry countdown */}
      <QueueDisplay
        queue={queue}
        retryCountdown={retryCountdown}
        onRemove={removeFromQueue}
        onClearQueue={clearQueue}
      />

      {/* Input area */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        <textarea
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBlocked}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto'
          }}
        />
        {isBlocked ? (
          <button
            onClick={stop}
            aria-label="Stop"
            style={{
              background: 'rgba(220, 80, 80, 0.15)',
              border: '1px solid rgba(220, 80, 80, 0.4)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#f87171',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            aria-label="Send"
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace AIChatPanel.test.tsx**

Replace `tests/renderer/components/ai/AIChatPanel.test.tsx` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSendOrEnqueue = vi.hoisted(() => vi.fn())
const mockStop = vi.hoisted(() => vi.fn())
const mockClearMessages = vi.hoisted(() => vi.fn())
const mockRemoveFromQueue = vi.hoisted(() => vi.fn())
const mockClearQueue = vi.hoisted(() => vi.fn())
const mockUseScheduler = vi.hoisted(() => vi.fn())

const mockSetActiveProvider = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderKey = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderModel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdateSettings = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUseSettings = vi.hoisted(() => vi.fn())

vi.mock('@renderer/hooks/useScheduler', () => ({ useScheduler: mockUseScheduler }))
vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: mockUseSettings }))
vi.mock('@renderer/components/ai/ChatMessage', () => ({
  ChatMessage: ({ content }: { content: string }) => <div data-testid="chat-message">{content}</div>
}))
vi.mock('@renderer/components/ai/ProviderSettings', () => ({
  ProviderSettings: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="provider-settings">
      <button onClick={onClose}>Close Settings</button>
    </div>
  )
}))
vi.mock('@renderer/components/ai/QueueDisplay', () => ({
  QueueDisplay: ({ queue, retryCountdown }: { queue: string[]; retryCountdown: number | null }) => (
    <div data-testid="queue-display-mock">
      {retryCountdown !== null && <span data-testid="countdown">{retryCountdown}</span>}
      {queue.map((t, i) => <span key={i} data-testid={`queued-${i}`}>{t}</span>)}
    </div>
  )
}))

const DEFAULT_SETTINGS = {
  activeProvider: 'anthropic' as const,
  providers: {
    anthropic: { apiKey: 'sk-ant', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' }
  }
}

function defaultSchedulerState(overrides = {}) {
  return {
    messages: [],
    isStreaming: false,
    error: null,
    retryCountdown: null,
    queue: [],
    sendOrEnqueue: mockSendOrEnqueue,
    stop: mockStop,
    clearMessages: mockClearMessages,
    removeFromQueue: mockRemoveFromQueue,
    clearQueue: mockClearQueue,
    ...overrides
  }
}

function defaultSettingsState(overrides = {}) {
  return {
    settings: DEFAULT_SETTINGS,
    loading: false,
    updateSettings: mockUpdateSettings,
    setActiveProvider: mockSetActiveProvider,
    setProviderKey: mockSetProviderKey,
    setProviderModel: mockSetProviderModel,
    ...overrides
  }
}

import { AIChatPanel } from '@renderer/components/ai/AIChatPanel'

beforeEach(() => {
  mockSendOrEnqueue.mockClear()
  mockStop.mockClear()
  mockClearMessages.mockClear()
  mockUseScheduler.mockReturnValue(defaultSchedulerState())
  mockUseSettings.mockReturnValue(defaultSettingsState())
})

describe('AIChatPanel', () => {
  it('renders the AI Agent header', () => {
    render(<AIChatPanel />)
    expect(screen.getByText('AI Agent')).toBeInTheDocument()
  })

  it('shows settings gear button', () => {
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('shows model badge with current provider and model', () => {
    render(<AIChatPanel />)
    expect(screen.getByText(/claude-sonnet/i)).toBeInTheDocument()
  })

  it('renders the message input textarea', () => {
    render(<AIChatPanel />)
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
  })

  it('calls sendOrEnqueue when Send button is clicked with non-empty input', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendOrEnqueue).toHaveBeenCalledWith('Hello')
  })

  it('does not call sendOrEnqueue when input is empty', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendOrEnqueue).not.toHaveBeenCalled()
  })

  it('shows Stop button when streaming', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ isStreaming: true }))
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('shows Stop button when retryCountdown is active', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ retryCountdown: 30 }))
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('textarea is disabled when retryCountdown is active', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ retryCountdown: 30 }))
    render(<AIChatPanel />)
    expect(screen.getByPlaceholderText('Message...')).toBeDisabled()
  })

  it('calls stop() when Stop button is clicked', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ isStreaming: true }))
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(mockStop).toHaveBeenCalled()
  })

  it('renders error message when error is set', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ error: 'No API key configured' }))
    render(<AIChatPanel />)
    expect(screen.getByText('No API key configured')).toBeInTheDocument()
  })

  it('opens ProviderSettings when gear is clicked', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByTestId('provider-settings')).toBeInTheDocument()
  })

  it('closes ProviderSettings when close is called from within it', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    fireEvent.click(screen.getByText('Close Settings'))
    expect(screen.queryByTestId('provider-settings')).not.toBeInTheDocument()
  })

  it('sends message on Enter key', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: false })
    expect(mockSendOrEnqueue).toHaveBeenCalledWith('Hello')
  })

  it('does not send on Shift+Enter', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: true })
    expect(mockSendOrEnqueue).not.toHaveBeenCalled()
  })

  it('renders QueueDisplay', () => {
    render(<AIChatPanel />)
    expect(screen.getByTestId('queue-display-mock')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run full test suite**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: All tests pass. Count: 137 (existing after Task 1) + 5 (usePromptQueue) + 12 (useScheduler) + 7 (QueueDisplay) + 16 (AIChatPanel, up from 13) = 164 total.

If any test fails, read the error carefully and fix it before committing.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/components/ai/AIChatPanel.tsx tests/renderer/components/ai/AIChatPanel.test.tsx
git commit -m "feat(m6): wire AIChatPanel with useScheduler + QueueDisplay

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Push to remote

- [ ] **Step 1: Run full test suite one final time**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: All tests passing (164 total).

- [ ] **Step 2: Push**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Prompt queue (submit while streaming → queues): covered by `useScheduler.sendOrEnqueue` + `queue` state + auto-drain effect (Tasks 3, 5)
- Queue UI (see queued items, remove them): covered by `QueueDisplay` (Task 4) wired into `AIChatPanel` (Task 5)
- Auto-resume on rate limit (detect 429, countdown, retry): covered by `ai:rateLimit` event (Task 1) + `useScheduler` countdown + retry logic (Task 3)
- Rate limit countdown UI: covered by `QueueDisplay` `retryCountdown` rendering (Task 4)
- Stop cancels retry countdown: covered by `stop()` in `useScheduler` setting `retryCountdown = null` (Task 3)

**Placeholder scan:** No TBD, no TODO. All code blocks complete.

**Type consistency:**
- `UseSchedulerResult.sendOrEnqueue` matches `AIChatPanel`'s `handleSend` call
- `QueueDisplayProps.onRemove(index: number)` matches `useScheduler.removeFromQueue(index: number)`
- `retryCountdown: number | null` consistent across `useScheduler`, `QueueDisplay`, `AIChatPanel`
- `window.kode.ai.onRateLimit(cb: (retryAfterMs: number) => void)` matches preload, types, and `useScheduler` subscription
