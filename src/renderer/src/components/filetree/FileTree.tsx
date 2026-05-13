import { useFileTree } from '../../hooks/useFileTree'
import { FileTreeNode } from './FileTreeNode'

interface FileTreeProps {
  rootPath: string | null
  activeFilePath: string | null
  onOpenFile(path: string): void
}

export function FileTree({ rootPath, activeFilePath, onOpenFile }: FileTreeProps) {
  const { entries, expanded, children, loading, toggleExpanded } = useFileTree(rootPath)

  const folderName = rootPath
    ? rootPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? rootPath
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 2, paddingBottom: 4 }}>
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

        {/* Show loading only if we have no entries yet */}
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

        {/* Always render entries once loaded, regardless of loading state */}
        {rootPath && entries.map(entry => (
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
    </div>
  )
}
