import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import type { FileEntry } from '../../types'

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  expanded: Set<string>
  children: Record<string, FileEntry[]>
  activeFilePath: string | null
  onToggle(path: string): void
  onOpenFile(path: string): void
}

export function FileTreeNode({
  entry, depth, expanded, children, activeFilePath, onToggle, onOpenFile
}: FileTreeNodeProps) {
  const isExpanded = expanded.has(entry.path)
  const isActive = entry.path === activeFilePath
  const kids = children[entry.path] ?? []

  function handleClick() {
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `2px 8px 2px ${8 + depth * 16}px`,
          cursor: 'pointer',
          background: isActive ? 'var(--kode-selection)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: isActive ? 500 : 400,
          userSelect: 'none',
          borderRadius: 0,
          lineHeight: '22px'
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        {entry.type === 'directory' ? (
          <>
            {isExpanded
              ? <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              : <ChevronRight size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
            {isExpanded
              ? <FolderOpen size={13} style={{ flexShrink: 0, color: '#c9a84c' }} />
              : <Folder size={13} style={{ flexShrink: 0, color: '#c9a84c' }} />}
          </>
        ) : (
          <>
            <span style={{ width: 13, flexShrink: 0 }} />
            <File size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          </>
        )}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginLeft: 3
        }}>
          {entry.name}
        </span>
      </div>

      {entry.type === 'directory' && isExpanded && kids.map(child => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          expanded={expanded}
          children={children}
          activeFilePath={activeFilePath}
          onToggle={onToggle}
          onOpenFile={onOpenFile}
        />
      ))}
    </>
  )
}
