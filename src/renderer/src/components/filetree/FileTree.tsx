import { useState, useEffect, useRef, useCallback } from 'react'
import { useFileTree } from '../../hooks/useFileTree'
import { FileTreeNode } from './FileTreeNode'
import type { FileEntry } from '../../types'

interface FileTreeProps {
  rootPath: string | null
  activeFilePath: string | null
  onOpenFile(path: string): void
}

type CtxAction = 'new-file' | 'new-folder' | 'rename' | 'delete'

interface CtxMenu {
  x: number
  y: number
  entry: FileEntry
}

interface InputPrompt {
  action: 'new-file' | 'new-folder'
  entry: FileEntry
  value: string
}

function normPath(p: string): string {
  return p.replace(/\\/g, '/')
}

function parentDir(p: string): string {
  const n = normPath(p)
  const idx = n.lastIndexOf('/')
  return idx > 0 ? n.slice(0, idx) : n
}

export function FileTree({ rootPath, activeFilePath, onOpenFile }: FileTreeProps) {
  const { entries, expanded, children, loading, toggleExpanded, refresh } = useFileTree(rootPath)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [prompt, setPrompt] = useState<InputPrompt | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const folderName = rootPath
    ? normPath(rootPath).split('/').filter(Boolean).pop() ?? rootPath
    : null

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCtxMenu(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ctxMenu])

  // Focus modal input when it appears
  useEffect(() => {
    if (prompt) setTimeout(() => inputRef.current?.focus(), 0)
  }, [prompt])

  // Build a FileEntry for the root folder (for right-click on empty space)
  const rootEntry = useCallback((): FileEntry => ({
    name: folderName ?? '',
    path: normPath(rootPath ?? ''),
    type: 'directory'
  }), [rootPath, folderName])

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, entry: { ...entry, path: normPath(entry.path) } })
  }, [])

  const selectAction = useCallback((action: CtxAction) => {
    if (!ctxMenu) return
    const entry = ctxMenu.entry
    setCtxMenu(null)
    if (action === 'rename') {
      setRenamingPath(entry.path)
      return
    }
    if (action === 'delete') {
      if (!confirm(`Delete "${entry.name}"?`)) return
      window.kode.fs.delete(entry.path)
        .then(() => refresh())
        .catch(err => alert(`Delete failed: ${err}`))
      return
    }
    setPrompt({ action, entry, value: '' })
  }, [ctxMenu, refresh])

  const commitPrompt = useCallback(async () => {
    if (!prompt) return
    const { action, entry, value } = prompt
    const name = value.trim()
    if (!name) { setPrompt(null); return }

    const dir = entry.type === 'directory' ? entry.path : parentDir(entry.path)
    const newPath = dir + '/' + name

    try {
      if (action === 'new-file') {
        await window.kode.fs.createFile(newPath)
      } else {
        await window.kode.fs.createDir(newPath)
      }
      await refresh()
    } catch (err) {
      alert(`Failed: ${err}`)
    }
    setPrompt(null)
  }, [prompt, refresh])

  const handleRenameCommit = useCallback(async (entry: FileEntry, newName: string) => {
    setRenamingPath(null)
    const trimmed = newName.trim()
    if (!trimmed || trimmed === entry.name) return
    const dir = parentDir(entry.path)
    const newPath = dir + '/' + trimmed
    try {
      await window.kode.fs.rename(entry.path, newPath)
      await refresh()
    } catch (err) {
      alert(`Rename failed: ${err}`)
    }
  }, [refresh])

  const menuItems: { label: string; action: CtxAction; danger?: boolean }[] = [
    { label: 'New File', action: 'new-file' },
    { label: 'New Folder', action: 'new-folder' },
    { label: 'Rename', action: 'rename' },
    { label: 'Delete', action: 'delete', danger: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px 0 12px',
        height: 30,
        flexShrink: 0,
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {folderName ?? 'Explorer'}
        </span>
      </div>

      {/* File list — right-click on empty space shows root folder context menu */}
      <div
        style={{ flex: 1, overflowY: 'auto', paddingTop: 2, paddingBottom: 4 }}
        onContextMenu={e => {
          if (!rootPath) return
          e.preventDefault()
          // Only handle if click landed on this div (not on a child node — those stopPropagation)
          handleContextMenu(e, rootEntry())
        }}
      >
        {!rootPath && (
          <div style={{
            padding: '16px 12px',
            color: 'var(--text-muted)',
            fontSize: 12,
            lineHeight: 1.8
          }}>
            No folder open.
            <br />
            Use File &gt; Open Folder
          </div>
        )}

        {rootPath && loading && entries.length === 0 && (
          <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            Loading...
          </div>
        )}

        {rootPath && !loading && entries.length === 0 && (
          <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            Empty folder
          </div>
        )}

        {rootPath && entries.map(entry => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            expanded={expanded}
            children={children}
            activeFilePath={activeFilePath}
            renamingPath={renamingPath}
            onToggle={toggleExpanded}
            onOpenFile={onOpenFile}
            onContextMenu={handleContextMenu}
            onRenameCommit={handleRenameCommit}
            onRenameCancel={() => setRenamingPath(null)}
          />
        ))}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            minWidth: 160,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
            zIndex: 2000,
            padding: '4px 0',
            fontSize: 12
          }}
        >
          {menuItems.map(item => (
            <div
              key={item.action}
              onClick={() => selectAction(item.action)}
              style={{
                padding: '5px 14px',
                cursor: 'pointer',
                color: item.danger ? 'var(--color-danger, #e53e3e)' : 'var(--text-primary)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--kode-selection)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Modal for New File / New Folder */}
      {prompt && (
        <div
          onClick={() => setPrompt(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              padding: '16px 18px',
              width: 300,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {prompt.action === 'new-file' ? 'New File' : 'New Folder'}
            </span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              In: {prompt.entry.name || folderName}
            </div>
            <input
              ref={inputRef}
              value={prompt.value}
              onChange={e => setPrompt(p => p ? { ...p, value: e.target.value } : p)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitPrompt()
                if (e.key === 'Escape') setPrompt(null)
              }}
              placeholder={prompt.action === 'new-file' ? 'filename.ts' : 'folder-name'}
              style={{
                padding: '6px 10px', fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                data-flat
                onClick={() => setPrompt(null)}
                style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={commitPrompt}
                style={{
                  fontSize: 12, padding: '4px 12px', cursor: 'pointer',
                  background: 'var(--kode-primary)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
