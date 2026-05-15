import { useEffect, useRef } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { emmetHTML, emmetCSS } from 'emmet-monaco-es'
import type { EditorConfig } from '../../hooks/useSettings'
import { DEFAULT_EDITOR_CONFIG } from '../../hooks/useSettings'

interface MonacoEditorProps {
  content: string
  language: string
  filePath: string
  isActive: boolean
  monacoTheme: string
  editorConfig?: EditorConfig
  onChange(value: string): void
  onSave(): void
}

export function MonacoEditor({ content, language, onChange, onSave, isActive, monacoTheme, editorConfig }: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const cfg = editorConfig ?? DEFAULT_EDITOR_CONFIG

  // Refs so closures inside handleMount always read the latest values
  const cfgRef = useRef(cfg)
  useEffect(() => { cfgRef.current = cfg }, [cfg])

  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.layout()
    }
  }, [isActive])

  function handleMount(ed: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = ed
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (cfgRef.current.formatOnSave) {
        await ed.getAction('editor.action.formatDocument')?.run()
      }
      onSaveRef.current()
    })
    emmetHTML(monaco, ['html', 'handlebars', 'razor', 'erb'])
    emmetCSS(monaco, ['css', 'scss', 'less', 'sass'])
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme={monacoTheme}
      loading={<div style={{ height: '100%', background: 'var(--bg-primary)' }} />}
      options={{
        fontSize: cfg.fontSize,
        tabSize: cfg.tabSize,
        wordWrap: cfg.wordWrap,
        minimap: { enabled: cfg.minimap, scale: 1 },
        lineNumbers: cfg.lineNumbers,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        renderLineHighlight: 'gutter',
        bracketPairColorization: { enabled: cfg.bracketPairColorization ?? true },
        guides: { bracketPairs: cfg.bracketPairColorization ?? true },
        smoothScrolling: cfg.smoothScrolling ?? true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        inlineSuggest: { enabled: true },
        suggest: { preview: true }
      }}
      onChange={v => {
        onChange(v ?? '')
        if (cfgRef.current.autoSave) {
          if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
          autoSaveTimer.current = setTimeout(() => onSaveRef.current(), 1000)
        }
      }}
      onMount={handleMount}
    />
  )
}
