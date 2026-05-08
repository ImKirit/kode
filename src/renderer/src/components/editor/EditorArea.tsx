import { EditorTab } from './EditorTab'
import { MonacoEditor } from './MonacoEditor'
import type { OpenFile } from '../../types'

interface EditorAreaProps {
  openFiles: OpenFile[]
  activeFilePath: string | null
  onActivate(path: string): void
  onClose(path: string): void
  onContentChange(path: string, content: string): void
  onSave(path: string): void
}

export function EditorArea({
  openFiles, activeFilePath, onActivate, onClose, onContentChange, onSave
}: EditorAreaProps) {
  const activeFile = openFiles.find(f => f.path === activeFilePath)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        height: 35
      }}>
        {openFiles.map(file => (
          <EditorTab
            key={file.path}
            path={file.path}
            name={file.name}
            active={file.path === activeFilePath}
            dirty={file.dirty}
            onActivate={() => onActivate(file.path)}
            onClose={() => onClose(file.path)}
          />
        ))}
      </div>

      {/* Monaco area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeFile ? (
          <MonacoEditor
            key={activeFile.path}
            content={activeFile.content}
            language={activeFile.language}
            filePath={activeFile.path}
            onChange={v => onContentChange(activeFile.path, v)}
            onSave={() => onSave(activeFile.path)}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 12,
            color: 'var(--text-muted)',
            fontSize: 13,
            userSelect: 'none'
          }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>{ }</span>
            <span>Open a file to start editing</span>
          </div>
        )}
      </div>
    </div>
  )
}
