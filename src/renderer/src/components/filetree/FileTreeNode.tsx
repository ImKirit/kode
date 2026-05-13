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

  const dotIndex = entry.name.lastIndexOf('.')
  const baseName = dotIndex > 0 ? entry.name.slice(0, dotIndex) : entry.name
  const ext = dotIndex > 0 ? entry.name.slice(dotIndex) : ''

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
          gap: 3,
          paddingLeft: 8 + depth * 14,
          paddingRight: 8,
          height: 22,
          cursor: 'pointer',
          background: isActive ? 'var(--kode-selection)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          userSelect: 'none',
          borderRadius: 0
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
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

        {/* Name: base + dimmed extension for files */}
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
