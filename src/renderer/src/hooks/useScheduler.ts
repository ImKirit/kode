import { useState, useEffect, useCallback, useRef } from 'react'

export interface ToolCallEntry {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
  status: 'pending' | 'success' | 'error' | 'denied'
  result?: string
}

export interface ToolApprovalRequest {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallEntry[]
}

export interface UseSchedulerResult {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  retryCountdown: number | null
  queue: string[]
  pendingApproval: ToolApprovalRequest | null
  sendOrEnqueue(text: string, systemPrompt?: string): void
  stop(): void
  clearMessages(): void
  removeFromQueue(index: number): void
  clearQueue(): void
  approveTool(callId: string): void
  denyTool(callId: string): void
}

export function useScheduler(): UseSchedulerResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null)

  const messagesRef = useRef<ChatMessage[]>([])
  const isStreamingRef = useRef(false)
  const retryCountdownRef = useRef<number | null>(null)
  const pendingMessagesRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }> | null>(null)
  const prevIsStreamingRef = useRef(false)
  const queueRef = useRef<string[]>([])
  const systemPromptRef = useRef<string | undefined>(undefined)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { retryCountdownRef.current = retryCountdown }, [retryCountdown])
  useEffect(() => { queueRef.current = queue }, [queue])

  // AI event subscriptions
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
      setMessages(prev => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && copy[copy.length - 1].content === '') {
          copy.pop()
        }
        return copy
      })
      setRetryCountdown(Math.ceil(retryAfterMs / 1000))
    })

    const unToolCall = window.kode.ai.onToolCall((e) => {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') {
          const entry: ToolCallEntry = {
            callId: e.callId,
            toolName: e.toolName,
            serverId: e.serverId,
            args: e.args,
            status: 'pending'
          }
          copy[copy.length - 1] = {
            ...last,
            toolCalls: [...(last.toolCalls ?? []), entry]
          }
        }
        return copy
      })
    })

    const unToolResult = window.kode.ai.onToolResult((e) => {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant' && last.toolCalls) {
          const toolCalls = last.toolCalls.map(tc =>
            tc.callId === e.callId
              ? { ...tc, status: (e.isError ? 'error' : 'success') as 'success' | 'error', result: e.result }
              : tc
          )
          copy[copy.length - 1] = { ...last, toolCalls }
        }
        return copy
      })
    })

    const unToolApproval = window.kode.ai.onToolApproval((e) => {
      setPendingApproval(e)
    })

    return () => {
      unToken()
      unDone()
      unError()
      unRateLimit()
      unToolCall()
      unToolResult()
      unToolApproval()
    }
  }, [])

  // Countdown tick
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
        window.kode.ai.sendMessage(msgs, systemPromptRef.current)
      }
      return
    }
    const timer = setTimeout(() => setRetryCountdown(s => s !== null ? s - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  // Auto-drain queue
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current
    prevIsStreamingRef.current = isStreaming
    if (!wasStreaming || isStreaming || retryCountdownRef.current !== null) return
    if (queueRef.current.length === 0) return

    const [next, ...rest] = queueRef.current
    const userMsg: ChatMessage = { role: 'user', content: next }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    const newMessages = [...messagesRef.current, userMsg]
    queueRef.current = rest
    setQueue(rest)
    setMessages(m => [...m, userMsg, assistantMsg])
    pendingMessagesRef.current = newMessages
    isStreamingRef.current = true
    setIsStreaming(true)
    setError(null)
    window.kode.ai.sendMessage(newMessages, systemPromptRef.current)
  }, [isStreaming])

  const sendOrEnqueue = useCallback((text: string, systemPrompt?: string) => {
    if (!text.trim()) return
    const trimmed = text.trim()
    systemPromptRef.current = systemPrompt
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
    window.kode.ai.sendMessage(newMessages, systemPrompt)
  }, [])

  const stop = useCallback(() => {
    window.kode.ai.stop()
    pendingMessagesRef.current = null
    queueRef.current = []
    isStreamingRef.current = false
    setIsStreaming(false)
    setRetryCountdown(null)
    setQueue([])
  }, [])

  const clearMessages = useCallback(() => {
    pendingMessagesRef.current = null
    setRetryCountdown(null)
    setMessages([])
    setError(null)
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearQueue = useCallback(() => setQueue([]), [])

  const approveTool = useCallback((callId: string) => {
    window.kode.ai.approveTool(callId)
    setPendingApproval(null)
  }, [])

  const denyTool = useCallback((callId: string) => {
    window.kode.ai.denyTool(callId)
    setPendingApproval(null)
    setMessages(prev => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant' && last.toolCalls) {
        const toolCalls = last.toolCalls.map(tc =>
          tc.callId === callId ? { ...tc, status: 'denied' as const } : tc
        )
        copy[copy.length - 1] = { ...last, toolCalls }
      }
      return copy
    })
  }, [])

  return {
    messages, isStreaming, error, retryCountdown, queue, pendingApproval,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue,
    approveTool, denyTool
  }
}
