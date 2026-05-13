import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ChatDB } from '../../../src/main/db/ChatDB'
import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

let db: ChatDB
let tmpDir: string

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'chatdb-test-'))
  db = new ChatDB(path.join(tmpDir, 'chat.db'))
})

afterEach(async () => {
  db.close()
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('ChatDB - sessions', () => {
  it('creates and retrieves a session', () => {
    const s = db.createSession('s1', 'My Chat', 'anthropic', 'claude-3')
    expect(s.id).toBe('s1')
    expect(s.name).toBe('My Chat')
    expect(s.provider).toBe('anthropic')
    expect(s.model).toBe('claude-3')
    expect(s.archived).toBe(0)
  })

  it('getSessions returns only non-archived by default', () => {
    db.createSession('s1', 'Chat 1', '', '')
    db.createSession('s2', 'Chat 2', '', '')
    db.archiveSession('s2')
    const sessions = db.getSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('s1')
  })

  it('getSessions with includeArchived returns all', () => {
    db.createSession('s1', 'Chat 1', '', '')
    db.createSession('s2', 'Chat 2', '', '')
    db.archiveSession('s2')
    expect(db.getSessions(true)).toHaveLength(2)
  })

  it('updateSession renames the session', () => {
    db.createSession('s1', 'Old Name', '', '')
    db.updateSession('s1', 'New Name')
    expect(db.getSession('s1')?.name).toBe('New Name')
  })

  it('deleteSession removes session and messages', () => {
    db.createSession('s1', 'Chat', '', '')
    db.addMessage('m1', 's1', 'user', 'hello')
    db.deleteSession('s1')
    expect(db.getSession('s1')).toBeUndefined()
    expect(db.getMessages('s1')).toHaveLength(0)
  })
})

describe('ChatDB - messages', () => {
  beforeEach(() => {
    db.createSession('s1', 'Test', '', '')
  })

  it('adds and retrieves messages', () => {
    db.addMessage('m1', 's1', 'user', 'Hello')
    db.addMessage('m2', 's1', 'assistant', 'Hi there')
    const msgs = db.getMessages('s1')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].content).toBe('Hello')
    expect(msgs[1].role).toBe('assistant')
  })

  it('getMessage returns single message', () => {
    db.addMessage('m1', 's1', 'user', 'test')
    const m = db.getMessage('m1')
    expect(m?.content).toBe('test')
  })

  it('addMessage updates session updated_at', () => {
    const before = db.getSession('s1')!.updated_at
    // Small delay to ensure timestamp differs
    db.addMessage('m1', 's1', 'user', 'hello')
    const after = db.getSession('s1')!.updated_at
    expect(after).toBeGreaterThanOrEqual(before)
  })
})

describe('ChatDB - search', () => {
  beforeEach(() => {
    db.createSession('s1', 'Work Chat', 'anthropic', 'claude')
    db.createSession('s2', 'Personal', 'openai', 'gpt-4')
    db.addMessage('m1', 's1', 'user', 'how do I refactor this function')
    db.addMessage('m2', 's1', 'assistant', 'you can extract a helper')
    db.addMessage('m3', 's2', 'user', 'what is the weather today')
  })

  it('returns sessions containing the query', () => {
    const results = db.searchSessions('refactor')
    expect(results).toHaveLength(1)
    expect(results[0].session.id).toBe('s1')
  })

  it('snippet contains matched text', () => {
    const results = db.searchSessions('refactor')
    expect(results[0].snippet).toContain('refactor')
  })

  it('empty query returns empty results', () => {
    expect(db.searchSessions('')).toHaveLength(0)
  })

  it('deduplicates sessions when multiple messages match', () => {
    db.addMessage('m4', 's1', 'user', 'how to refactor again')
    const results = db.searchSessions('refactor')
    expect(results).toHaveLength(1)
  })
})

describe('ChatDB - file changes', () => {
  it('adds and retrieves file changes', () => {
    db.createSession('s1', 'Test', '', '')
    db.addFileChange('fc1', 's1', '/src/app.ts', '+ const x = 1')
    const changes = db.getFileChanges('s1')
    expect(changes).toHaveLength(1)
    expect(changes[0].file_path).toBe('/src/app.ts')
  })
})
