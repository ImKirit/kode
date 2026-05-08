import { useFileTree } from '../../hooks/useFileTree'
import { FileTreeNode } from './FileTreeNode'

interface FileTreeProps {
  rootPath: string | null
  activeFilePath: string | null
  onOpenFile(path: string): void
}

export function FileTree({ rootPath, activeFilePath, onOpenFile }: FileTreeProps) {
  const { entries, expanded, children, loading, toggleExpanded } = useFileTree(rootPath)

  if (!rootPath) {
    return (
      <div style={{
        padding: '20px 12px',
        color: 'var(--text-muted)',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 1.8
      }}>
        No folder open.
        <br />
        Use File &gt; Open Folder
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        Loading...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        Empty folder
      </div>
    )
  }

  return (
    <div style={{
      overflow: 'auto',
      height: '100%',
      paddingTop: 4,
      paddingBottom: 4
    }}>
      {entries.map(entry => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          expanded={expanded}
          children={children}
          activeFilePath={activeFilePath}
          onToggle={toggleExpanded}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  )
}
