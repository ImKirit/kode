import { useState, useRef } from 'react'
import { Plus, Search, X, Trash2, Archive, Pencil } from 'lucide-react'
import type { ChatSession, SearchResult } from '../../types/electron'

interface ThreadsPanelProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  searchResults: SearchResult[]
  searchQuery: string
  onSelect(id: string): void
  onNew(): void
  onRename(id: string, name: string): void
  onArchive(id: string): void
  onDelete(id: string): void
  onSearch(query: string): void
  onClearSearch(): void
}

interface SessionRowProps {
  session: ChatSession
  active: boolean
  onSelect(): void
  onRename(name: string): void
  onArchive(): void
  onDelete(): void
}

function SessionRow({ session, active, onSelect, onRename, onArchive, onDelete }: SessionRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.name)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(session.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    if (editValue.trim() && editValue !== session.name) onRename(editValue.trim())
    setEditing(false)
  }

  const date = new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div
      data-testid="session-row"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '7px 10px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--accent)' : hovered ? 'var(--bg-primary)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginBottom: 2
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent)',
            borderRadius: 3,
            padding: '2px 6px',
            fontSize: 12,
            color: 'var(--text-primary)',
            outline: 'none',
            width: '100%'
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: active ? '#fff' : 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
          }}>
            {session.name}
          </span>
          {(hovered || active) && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <ActionBtn label="Rename" onClick={startEdit} color={active ? '#fff' : undefined}>
                <Pencil size={11} />
              </ActionBtn>
              <ActionBtn label="Archive" onClick={e => { e.stopPropagation(); onArchive() }} color={active ? '#fff' : undefined}>
                <Archive size={11} />
              </ActionBtn>
              <ActionBtn label="Delete" onClick={e => { e.stopPropagation(); onDelete() }} color={active ? '#fff' : undefined}>
                <Trash2 size={11} />
              </ActionBtn>
            </div>
          )}
        </div>
      )}
      <span style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
        {date}
      </span>
    </div>
  )
}

function ActionBtn({ children, label, onClick, color }: {
  children: React.ReactNode; label: string; onClick(e: React.MouseEvent): void; color?: string
}) {
  return (
    <button
      data-flat
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
        color: color ?? 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: 3
      }}
    >
      {children}
    </button>
  )
}

export function ThreadsPanel({
  sessions, currentSessionId, searchResults, searchQuery,
  onSelect, onNew, onRename, onArchive, onDelete, onSearch, onClearSearch
}: ThreadsPanelProps) {
  const showSearch = searchQuery.length > 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-sidebar)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Threads
        </span>
        <button
          data-flat
          aria-label="New thread"
          title="New thread"
          onClick={onNew}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 3 }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '6px 8px', flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={11} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 24, paddingRight: searchQuery ? 24 : 8,
              paddingTop: 5, paddingBottom: 5,
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontSize: 11,
              color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              data-flat
              onClick={onClearSearch}
              style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
        {showSearch ? (
          searchResults.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              No results
            </div>
          ) : (
            searchResults.map(r => (
              <div
                key={r.session.id}
                onClick={() => onSelect(r.session.id)}
                style={{
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  marginBottom: 2, background: currentSessionId === r.session.id ? 'var(--accent)' : 'transparent'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: currentSessionId === r.session.id ? '#fff' : 'var(--text-primary)' }}>
                  {r.session.name}
                </div>
                <div style={{ fontSize: 10, color: currentSessionId === r.session.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ...{r.snippet}...
                </div>
              </div>
            ))
          )
        ) : sessions.length === 0 ? (
          <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            No threads yet
          </div>
        ) : (
          sessions.map(s => (
            <SessionRow
              key={s.id}
              session={s}
              active={currentSessionId === s.id}
              onSelect={() => onSelect(s.id)}
              onRename={name => onRename(s.id, name)}
              onArchive={() => onArchive(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
