import { useState, useEffect, useCallback } from 'react'
import type { ChatSession, ChatMessage, SearchResult } from '../types/electron'

export interface UseChatHistoryResult {
  sessions: ChatSession[]
  currentSessionId: string | null
  messages: ChatMessage[]
  searchResults: SearchResult[]
  searchQuery: string
  loadingSessions: boolean
  setCurrentSessionId(id: string | null): void
  createSession(name: string, provider: string, model: string): Promise<ChatSession>
  renameSession(id: string, name: string): Promise<void>
  archiveSession(id: string): Promise<void>
  deleteSession(id: string): Promise<void>
  saveMessage(sessionId: string, role: string, content: string): Promise<void>
  search(query: string): void
  clearSearch(): void
  reloadSessions(): void
}

export function useChatHistory(): UseChatHistoryResult {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSessions, setLoadingSessions] = useState(true)

  const reloadSessions = useCallback(() => {
    window.kode.chat.getSessions()
      .then(s => { setSessions(s); setLoadingSessions(false) })
      .catch(() => setLoadingSessions(false))
  }, [])

  useEffect(() => {
    reloadSessions()
  }, [reloadSessions])

  useEffect(() => {
    if (!currentSessionId) { setMessages([]); return }
    window.kode.chat.getMessages(currentSessionId).then(setMessages).catch(() => {})
  }, [currentSessionId])

  const createSession = useCallback(async (name: string, provider: string, model: string): Promise<ChatSession> => {
    const id = crypto.randomUUID()
    const session = await window.kode.chat.createSession(id, name, provider, model)
    setSessions(prev => [session, ...prev])
    return session
  }, [])

  const renameSession = useCallback(async (id: string, name: string) => {
    await window.kode.chat.updateSession(id, name)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }, [])

  const archiveSession = useCallback(async (id: string) => {
    await window.kode.chat.archiveSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) setCurrentSessionId(null)
  }, [currentSessionId])

  const deleteSession = useCallback(async (id: string) => {
    await window.kode.chat.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) setCurrentSessionId(null)
  }, [currentSessionId])

  const saveMessage = useCallback(async (sessionId: string, role: string, content: string) => {
    const id = crypto.randomUUID()
    const msg = await window.kode.chat.addMessage(id, sessionId, role, content)
    if (sessionId === currentSessionId) {
      setMessages(prev => [...prev, msg])
    }
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, updated_at: Date.now() } : s
    ))
  }, [currentSessionId])

  const search = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) { setSearchResults([]); return }
    window.kode.chat.search(query).then(setSearchResults).catch(() => {})
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [])

  return {
    sessions, currentSessionId, messages, searchResults, searchQuery,
    loadingSessions, setCurrentSessionId, createSession, renameSession,
    archiveSession, deleteSession, saveMessage, search, clearSearch, reloadSessions
  }
}
