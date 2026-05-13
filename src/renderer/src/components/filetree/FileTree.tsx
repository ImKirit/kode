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
        padding: '7px 12px 6px',
        flexShrink: 0,
        borderBottom: '1px solid var(--kode-border-dim)'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }}>
          Explorer
        </span>
        {folderName && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 120
          }}>
            {folderName}
          </span>
        )}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4, paddingBottom: 4 }}>
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
        {rootPath && loading && (
          <div style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            Loading...
          </div>
        )}
        {rootPath && !loading && entries.length === 0 && (
          <div style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
            Empty folder
          </div>
        )}
        {rootPath && !loading && entries.map(entry => (
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
