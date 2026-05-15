import { useRef, useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import type { FileEntry } from '../../types'

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  expanded: Set<string>
  children: Record<string, FileEntry[]>
  activeFilePath: string | null
  renamingPath: string | null
  onToggle(path: string): void
  onOpenFile(path: string): void
  onContextMenu(e: React.MouseEvent, entry: FileEntry): void
  onRenameCommit(entry: FileEntry, newName: string): void
  onRenameCancel(): void
}

function RenameInput({ entry, onCommit, onCancel }: {
  entry: FileEntry
  onCommit(newName: string): void
  onCancel(): void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(entry.name)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const name = entry.name
    const dotIdx = entry.type === 'file' ? name.lastIndexOf('.') : -1
    const end = dotIdx > 0 ? dotIdx : name.length
    el.setSelectionRange(0, end)
  }, [])

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'Enter') { e.preventDefault(); onCommit(value) }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      onBlur={() => onCommit(value)}
      onClick={e => e.stopPropagation()}
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        padding: '1px 4px',
        margin: '0 2px',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--accent)',
        borderRadius: 3,
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />
  )
}

export function FileTreeNode({
  entry, depth, expanded, children, activeFilePath,
  renamingPath, onToggle, onOpenFile, onContextMenu,
  onRenameCommit, onRenameCancel
}: FileTreeNodeProps) {
  const isExpanded = expanded.has(entry.path)
  const isActive = entry.path === activeFilePath
  const isRenaming = renamingPath === entry.path
  const kids = children[entry.path] ?? []

  const dotIndex = entry.name.lastIndexOf('.')
  const baseName = dotIndex > 0 ? entry.name.slice(0, dotIndex) : entry.name
  const ext = dotIndex > 0 ? entry.name.slice(dotIndex) : ''

  function handleClick() {
    if (isRenaming) return
    if (entry.type === 'directory') {
      onToggle(entry.path)
    } else {
      onOpenFile(entry.path)
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, entry) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          paddingLeft: 8 + depth * 14,
          paddingRight: 8,
          height: 22,
          cursor: isRenaming ? 'default' : 'pointer',
          background: isActive ? 'var(--kode-selection)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          userSelect: 'none',
          borderRadius: 0
        }}
        onMouseEnter={e => {
          if (!isActive && !isRenaming) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Expand chevron for directories, indent spacer for files */}
        {entry.type === 'directory' ? (
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-muted)', width: 14 }}>
            {isExpanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />}
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {/* File/Folder icon */}
        {entry.type === 'directory' ? (
          isExpanded
            ? <FolderOpen size={14} style={{ flexShrink: 0, color: '#c9a84c' }} />
            : <Folder size={14} style={{ flexShrink: 0, color: '#c9a84c' }} />
        ) : (
          <File size={14} style={{ flexShrink: 0, color: 'var(--text-muted)', opacity: 0.7 }} />
        )}

        {/* Name — inline rename input or normal display */}
        {isRenaming ? (
          <RenameInput
            entry={entry}
            onCommit={newName => onRenameCommit(entry, newName)}
            onCancel={onRenameCancel}
          />
        ) : (
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginLeft: 4
          }}>
            {entry.type === 'file' && ext ? (
              <>
                {baseName}
                <span style={{ color: 'var(--text-muted)', opacity: 0.75 }}>{ext}</span>
              </>
            ) : (
              entry.name
            )}
          </span>
        )}
      </div>

      {entry.type === 'directory' && isExpanded && kids.map(child => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          expanded={expanded}
          children={children}
          activeFilePath={activeFilePath}
          renamingPath={renamingPath}
          onToggle={onToggle}
          onOpenFile={onOpenFile}
          onContextMenu={onContextMenu}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </>
  )
}
