import Database from 'better-sqlite3'
import path from 'node:path'

export interface ChatSession {
  id: string
  name: string
  provider: string
  model: string
  created_at: number
  updated_at: number
  archived: number
}

export interface ChatMessage {
  id: string
  session_id: string
  role: string
  content: string
  tokens: number | null
  cost: number | null
  created_at: number
}

export interface FileChange {
  id: string
  session_id: string
  file_path: string
  diff: string
  created_at: number
}

export interface SearchResult {
  session: ChatSession
  snippet: string
}

export class ChatDB {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        cost REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS file_changes (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        diff TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `)
  }

  createSession(id: string, name: string, provider: string, model: string): ChatSession {
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO sessions (id, name, provider, model, created_at, updated_at, archived) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).run(id, name, provider, model, now, now)
    return this.getSession(id)!
  }

  getSessions(includeArchived = false): ChatSession[] {
    const sql = includeArchived
      ? 'SELECT * FROM sessions ORDER BY updated_at DESC'
      : 'SELECT * FROM sessions WHERE archived = 0 ORDER BY updated_at DESC'
    return this.db.prepare(sql).all() as ChatSession[]
  }

  getSession(id: string): ChatSession | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as ChatSession | undefined
  }

  updateSession(id: string, name: string): void {
    this.db.prepare('UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?').run(name, Date.now(), id)
  }

  archiveSession(id: string): void {
    this.db.prepare('UPDATE sessions SET archived = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
  }

  deleteSession(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  }

  addMessage(id: string, sessionId: string, role: string, content: string, tokens?: number, cost?: number): ChatMessage {
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO messages (id, session_id, role, content, tokens, cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, sessionId, role, content, tokens ?? null, cost ?? null, now)
    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId)
    return this.getMessage(id)!
  }

  getMessage(id: string): ChatMessage | undefined {
    return this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as ChatMessage | undefined
  }

  getMessages(sessionId: string): ChatMessage[] {
    return this.db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as ChatMessage[]
  }

  searchSessions(query: string): SearchResult[] {
    if (!query.trim()) return []
    const like = `%${query}%`
    const rows = this.db.prepare(`
      SELECT m.session_id, m.content, s.id, s.name, s.provider, s.model,
             s.created_at, s.updated_at, s.archived
      FROM messages m
      JOIN sessions s ON m.session_id = s.id
      WHERE m.content LIKE ? AND s.archived = 0
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all(like) as Array<ChatMessage & ChatSession & { session_id: string }>

    const seen = new Set<string>()
    const results: SearchResult[] = []
    for (const row of rows) {
      if (seen.has(row.session_id)) continue
      seen.add(row.session_id)
      const idx = row.content.toLowerCase().indexOf(query.toLowerCase())
      const start = Math.max(0, idx - 40)
      const snippet = row.content.slice(start, start + 100)
      results.push({
        session: {
          id: row.id, name: row.name, provider: row.provider, model: row.model,
          created_at: row.created_at, updated_at: row.updated_at, archived: row.archived
        },
        snippet
      })
    }
    return results
  }

  addFileChange(id: string, sessionId: string, filePath: string, diff: string): void {
    this.db.prepare(
      'INSERT INTO file_changes (id, session_id, file_path, diff, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, sessionId, filePath, diff, Date.now())
  }

  getFileChanges(sessionId: string): FileChange[] {
    return this.db.prepare(
      'SELECT * FROM file_changes WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as FileChange[]
  }

  close(): void {
    this.db.close()
  }
}

let _db: ChatDB | null = null

export function getChatDB(dataPath?: string): ChatDB {
  if (!_db) {
    const p = dataPath ?? path.join(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('electron').app.getPath('userData'),
      'chat.db'
    )
    _db = new ChatDB(p)
  }
  return _db
}
