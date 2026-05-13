import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = {
  getSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  archiveSession: vi.fn(),
  deleteSession: vi.fn(),
  getMessages: vi.fn(),
  addMessage: vi.fn(),
  searchSessions: vi.fn(),
  addFileChange: vi.fn(),
}

vi.mock('../../../src/main/db/ChatDB', () => ({
  getChatDB: () => mockDb
}))

const handlers: Record<string, (...args: unknown[]) => unknown> = {}
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers[channel] = fn
    }
  }
}))

beforeEach(async () => {
  vi.clearAllMocks()
  Object.keys(handlers).forEach(k => delete handlers[k])
  const { registerChatHandlers } = await import('../../../src/main/ipc/chat')
  registerChatHandlers()
})

describe('registerChatHandlers', () => {
  it('chat:getSessions calls getChatDB().getSessions()', async () => {
    mockDb.getSessions.mockReturnValue([{ id: 's1', name: 'Test' }])
    const result = await handlers['chat:getSessions']({})
    expect(result).toEqual([{ id: 's1', name: 'Test' }])
  })

  it('chat:createSession calls createSession with args', async () => {
    const session = { id: 's1', name: 'Chat', provider: 'anthropic', model: 'claude-3' }
    mockDb.createSession.mockReturnValue(session)
    const result = await handlers['chat:createSession']({}, 's1', 'Chat', 'anthropic', 'claude-3')
    expect(mockDb.createSession).toHaveBeenCalledWith('s1', 'Chat', 'anthropic', 'claude-3')
    expect(result).toEqual(session)
  })

  it('chat:updateSession calls updateSession', async () => {
    await handlers['chat:updateSession']({}, 's1', 'New Name')
    expect(mockDb.updateSession).toHaveBeenCalledWith('s1', 'New Name')
  })

  it('chat:archiveSession calls archiveSession', async () => {
    await handlers['chat:archiveSession']({}, 's1')
    expect(mockDb.archiveSession).toHaveBeenCalledWith('s1')
  })

  it('chat:deleteSession calls deleteSession', async () => {
    await handlers['chat:deleteSession']({}, 's1')
    expect(mockDb.deleteSession).toHaveBeenCalledWith('s1')
  })

  it('chat:getMessages calls getMessages', async () => {
    mockDb.getMessages.mockReturnValue([])
    await handlers['chat:getMessages']({}, 's1')
    expect(mockDb.getMessages).toHaveBeenCalledWith('s1')
  })

  it('chat:addMessage calls addMessage', async () => {
    const msg = { id: 'm1', session_id: 's1', role: 'user', content: 'hi' }
    mockDb.addMessage.mockReturnValue(msg)
    const result = await handlers['chat:addMessage']({}, 'm1', 's1', 'user', 'hi')
    expect(result).toEqual(msg)
  })

  it('chat:search calls searchSessions', async () => {
    mockDb.searchSessions.mockReturnValue([])
    await handlers['chat:search']({}, 'query')
    expect(mockDb.searchSessions).toHaveBeenCalledWith('query')
  })
})
