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
  monacoTheme: string
}

export function EditorArea({
  openFiles, activeFilePath, onActivate, onClose, onContentChange, onSave, monacoTheme
}: EditorAreaProps) {
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
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {openFiles.map(file => (
          <div
            key={file.path}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: file.path === activeFilePath ? 'visible' : 'hidden',
              pointerEvents: file.path === activeFilePath ? 'auto' : 'none'
            }}
          >
            <MonacoEditor
              content={file.content}
              language={file.language}
              filePath={file.path}
              isActive={file.path === activeFilePath}
              monacoTheme={monacoTheme}
              onChange={v => onContentChange(file.path, v)}
              onSave={() => onSave(file.path)}
            />
          </div>
        ))}
        {openFiles.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: 12,
            userSelect: 'none',
            opacity: 0.6
          }}>
            <span>Open a file to start editing</span>
          </div>
        )}
      </div>
    </div>
  )
}
