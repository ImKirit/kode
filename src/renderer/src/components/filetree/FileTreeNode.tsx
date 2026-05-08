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
          background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          userSelect: 'none',
          borderRadius: 2,
          lineHeight: '20px'
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        {entry.type === 'directory' ? (
          <>
            {isExpanded
              ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
            {isExpanded
              ? <FolderOpen size={14} style={{ flexShrink: 0, color: '#e8c56d' }} />
              : <Folder size={14} style={{ flexShrink: 0, color: '#e8c56d' }} />}
          </>
        ) : (
          <>
            <span style={{ width: 14, flexShrink: 0 }} />
            <File size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          </>
        )}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginLeft: 4
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
