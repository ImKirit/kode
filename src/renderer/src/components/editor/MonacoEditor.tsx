import { useEffect, useRef } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface MonacoEditorProps {
  content: string
  language: string
  filePath: string
  isActive: boolean
  monacoTheme: string
  onChange(value: string): void
  onSave(): void
}

export function MonacoEditor({ content, language, onChange, onSave, isActive, monacoTheme }: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (isActive && editorRef.current) {
      // Trigger layout recalculation after becoming visible
      editorRef.current.layout()
    }
  }, [isActive])

  function handleMount(ed: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = ed
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave())
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme={monacoTheme}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        automaticLayout: true,
        padding: { top: 8 }
      }}
      onChange={v => onChange(v ?? '')}
      onMount={handleMount}
    />
  )
}
