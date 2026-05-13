import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatHistory } from '../../../src/renderer/src/hooks/useChatHistory'

const mockSession = (id: string, name: string) => ({
  id, name, provider: 'anthropic', model: 'claude', created_at: 1000, updated_at: 1000, archived: 0
})
const mockMessage = (id: string, sessionId: string, role: string, content: string) => ({
  id, session_id: sessionId, role, content, tokens: null, cost: null, created_at: 1000
})

const mockChat = {
  getSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  updateSession: vi.fn().mockResolvedValue(undefined),
  archiveSession: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  getMessages: vi.fn().mockResolvedValue([]),
  addMessage: vi.fn(),
  search: vi.fn().mockResolvedValue([]),
  addFileChange: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChat.getSessions.mockResolvedValue([])
  mockChat.getMessages.mockResolvedValue([])
  mockChat.search.mockResolvedValue([])

  Object.defineProperty(window, 'kode', {
    value: { chat: mockChat },
    writable: true,
    configurable: true
  })
})

describe('useChatHistory', () => {
  it('loads sessions on mount', async () => {
    const sessions = [mockSession('s1', 'Chat 1')]
    mockChat.getSessions.mockResolvedValue(sessions)
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    expect(result.current.sessions).toEqual(sessions)
  })

  it('createSession adds session to list', async () => {
    const session = mockSession('s1', 'New')
    mockChat.createSession.mockResolvedValue(session)
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      await result.current.createSession('New', 'anthropic', 'claude')
    })
    expect(mockChat.createSession).toHaveBeenCalled()
    expect(result.current.sessions).toContainEqual(session)
  })

  it('renameSession updates name in list', async () => {
    mockChat.getSessions.mockResolvedValue([mockSession('s1', 'Old')])
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      await result.current.renameSession('s1', 'New Name')
    })
    expect(result.current.sessions[0].name).toBe('New Name')
  })

  it('archiveSession removes session from list', async () => {
    mockChat.getSessions.mockResolvedValue([mockSession('s1', 'Test')])
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      await result.current.archiveSession('s1')
    })
    expect(result.current.sessions).toHaveLength(0)
  })

  it('deleteSession removes session from list', async () => {
    mockChat.getSessions.mockResolvedValue([mockSession('s1', 'Test')])
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      await result.current.deleteSession('s1')
    })
    expect(result.current.sessions).toHaveLength(0)
  })

  it('setCurrentSessionId loads messages', async () => {
    const messages = [mockMessage('m1', 's1', 'user', 'hello')]
    mockChat.getMessages.mockResolvedValue(messages)
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      result.current.setCurrentSessionId('s1')
    })
    await act(async () => {})
    expect(result.current.messages).toEqual(messages)
  })

  it('search calls chat.search and sets results', async () => {
    const searchResults = [{ session: mockSession('s1', 'Chat'), snippet: '...found...' }]
    mockChat.search.mockResolvedValue(searchResults)
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      result.current.search('found')
    })
    await act(async () => {})
    expect(result.current.searchResults).toEqual(searchResults)
    expect(result.current.searchQuery).toBe('found')
  })

  it('clearSearch resets search state', async () => {
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      result.current.search('test')
    })
    await act(async () => {
      result.current.clearSearch()
    })
    expect(result.current.searchQuery).toBe('')
    expect(result.current.searchResults).toHaveLength(0)
  })

  it('saveMessage calls addMessage', async () => {
    const msg = mockMessage('m1', 's1', 'user', 'hi')
    mockChat.addMessage.mockResolvedValue(msg)
    const { result } = renderHook(() => useChatHistory())
    await act(async () => {})
    await act(async () => {
      await result.current.saveMessage('s1', 'user', 'hi')
    })
    expect(mockChat.addMessage).toHaveBeenCalled()
  })
})
