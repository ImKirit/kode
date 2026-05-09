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
  // Messages sent to the API for the current request — used for retry on rate limit
  const pendingMessagesRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }> | null>(null)
  // Track previous isStreaming value for auto-drain detection
  const prevIsStreamingRef = useRef(false)
  const queueRef = useRef<string[]>([])

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { retryCountdownRef.current = retryCountdown }, [retryCountdown])
  useEffect(() => { queueRef.current = queue }, [queue])

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
    window.kode.ai.sendMessage(newMessages)
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

  return {
    messages, isStreaming, error, retryCountdown, queue,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue
  }
}
