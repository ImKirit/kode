import { useState, useEffect, useCallback, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface UseAIChatResult {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  apiKey: string
  setApiKey(key: string): void
  sendMessage(text: string): Promise<void>
  stop(): void
  clearMessages(): void
}

export function useAIChat(): UseAIChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem('kode.apiKey') ?? ''
  )

  const messagesRef = useRef<ChatMessage[]>([])
  const isStreamingRef = useRef(false)
  const apiKeyRef = useRef(apiKey)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { apiKeyRef.current = apiKey }, [apiKey])

  useEffect(() => {
    const unToken = window.kode.ai.onToken((text) => {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + text }
        }
        return copy
      })
    })
    const unDone = window.kode.ai.onDone(() => {
      setIsStreaming(false)
    })
    const unError = window.kode.ai.onError((msg) => {
      setIsStreaming(false)
      setError(msg)
    })
    return () => { unToken(); unDone(); unError() }
  }, [])

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem('kode.apiKey', key)
    setApiKeyState(key)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreamingRef.current) return
    const trimmed = text.trim()
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    const prevMessages = messagesRef.current
    setMessages(prev => [...prev, userMsg, assistantMsg])
    isStreamingRef.current = true
    setIsStreaming(true)
    setError(null)
    await window.kode.ai.sendMessage(
      [...prevMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
      apiKeyRef.current
    )
  }, [])

  const stop = useCallback(() => {
    window.kode.ai.stop()
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isStreaming, error, apiKey, setApiKey, sendMessage, stop, clearMessages }
}
