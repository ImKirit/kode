# M7: Auto Follow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Watch the open project folder for file changes and — when Auto Follow is enabled — automatically open or update the changed file in Monaco, with the toggle persisted to localStorage.

**Architecture:** A new `src/main/ipc/watcher.ts` module uses chokidar to watch the project root; file change events are pushed to the renderer via `fs:fileChange` IPC. A new `useAutoFollow` renderer hook manages the enabled toggle and calls `openFile`/`updateFileContent` from `useProject`. A button in `AIChatPanel` surfaces the toggle.

**Tech Stack:** chokidar v3, Electron IPC, React hooks, Vitest + @testing-library/react.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/main/ipc/watcher.ts` | Create | chokidar watcher, `registerWatcherHandlers`, `stopWatcher` |
| `src/main/ipc/index.ts` | Modify | call `registerWatcherHandlers()` |
| `src/main/index.ts` | Modify | call `stopWatcher()` on before-quit |
| `src/preload/index.ts` | Modify | expose `window.kode.fs.watchRoot`, `unwatchRoot`, `onFileChange` |
| `src/renderer/src/types/electron.d.ts` | Modify | add watcher methods to Window.kode.fs |
| `src/renderer/src/hooks/useAutoFollow.ts` | Create | enabled toggle (localStorage), watch/unwatch, file change → openFile/updateFileContent |
| `src/renderer/src/components/ai/AIChatPanel.tsx` | Modify | add `autoFollowEnabled` + `onToggleAutoFollow` props + Eye toggle button |
| `src/renderer/src/App.tsx` | Modify | call `useAutoFollow`, wire to AIChatPanel |
| `tests/main/ipc/watcher.test.ts` | Create | 6 tests |
| `tests/renderer/hooks/useAutoFollow.test.ts` | Create | 9 tests |
| `tests/renderer/components/ai/AIChatPanel.test.tsx` | Modify | 2 new tests + pass new props to all existing renders |

---

### Task 1: Watcher IPC — main process + preload + types

**Files:**
- Create: `src/main/ipc/watcher.ts`
- Modify: `src/main/ipc/index.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/types/electron.d.ts`
- Create: `tests/main/ipc/watcher.test.ts`

- [ ] **Step 1: Install chokidar**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npm install chokidar@^3.6.0
```

Expected: package installed, no errors. If electron-vite bundling later fails for chokidar, add it to `external` in `electron.vite.config.ts`. Chokidar v3 ships its own TypeScript types — no `@types/chokidar` needed.

- [ ] **Step 2: Write the failing tests**

Create `tests/main/ipc/watcher.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockWatcherOn, mockWatcherClose, mockChokidarWatch, mockReadFile,
  mockWebContentsSend, mockFromWebContents, getHandle, getOn } = vi.hoisted(() => {
  const handles: Record<string, (...args: unknown[]) => unknown> = {}
  const ons: Record<string, (...args: unknown[]) => unknown> = {}

  const mockWatcherOn = vi.fn().mockReturnThis()
  const mockWatcherClose = vi.fn()
  const mockChokidarWatch = vi.fn(() => ({ on: mockWatcherOn, close: mockWatcherClose }))
  const mockReadFile = vi.fn().mockResolvedValue('file content')
  const mockWebContentsSend = vi.fn()
  const mockFromWebContents = vi.fn(() => ({
    isDestroyed: () => false,
    webContents: { send: mockWebContentsSend }
  }))

  return {
    mockWatcherOn, mockWatcherClose, mockChokidarWatch, mockReadFile,
    mockWebContentsSend, mockFromWebContents,
    getHandle: (ch: string) => handles[ch],
    getOn: (ch: string) => ons[ch]
  }
})

vi.mock('chokidar', () => ({ watch: mockChokidarWatch }))
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, promises: { ...actual.promises, readFile: mockReadFile } }
})
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => {
      // captured via closure in getHandle — need to expose
    }),
    on: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => {
      // captured via closure in getOn
    })
  },
  BrowserWindow: { fromWebContents: mockFromWebContents }
}))

// Re-define to actually capture handles
const handles: Record<string, (...args: unknown[]) => unknown> = {}
const ons: Record<string, (...args: unknown[]) => unknown> = {}
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => { handles[ch] = handler }),
    on: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => { ons[ch] = handler })
  },
  BrowserWindow: { fromWebContents: mockFromWebContents }
}))

describe('registerWatcherHandlers', () => {
  beforeEach(() => {
    vi.resetModules()
    mockChokidarWatch.mockClear()
    mockWatcherOn.mockClear()
    mockWatcherClose.mockClear()
    mockWebContentsSend.mockClear()
    mockReadFile.mockClear()
    Object.keys(handles).forEach(k => delete handles[k])
    Object.keys(ons).forEach(k => delete ons[k])
  })

  it('registers fs:watchRoot handle', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    expect(handles['fs:watchRoot']).toBeDefined()
  })

  it('is idempotent — second call does not re-register', async () => {
    const { ipcMain } = await import('electron')
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    registerWatcherHandlers()
    expect(ipcMain.handle).toHaveBeenCalledTimes(1)
  })

  it('calls chokidar.watch with the provided rootPath', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/my/project')
    expect(mockChokidarWatch).toHaveBeenCalledWith('/my/project', expect.objectContaining({
      ignoreInitial: true,
      persistent: true
    }))
  })

  it('closes existing watcher before starting a new one', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project-a')
    await handles['fs:watchRoot']!({ sender: {} }, '/project-b')
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
    expect(mockChokidarWatch).toHaveBeenCalledTimes(2)
  })

  it('stopWatcher closes the active watcher', async () => {
    const { registerWatcherHandlers, stopWatcher, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project')
    stopWatcher()
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
  })

  it('fs:unwatchRoot closes the watcher', async () => {
    const { registerWatcherHandlers, _resetRegistered } = await import('../../../src/main/ipc/watcher')
    _resetRegistered()
    registerWatcherHandlers()
    await handles['fs:watchRoot']!({ sender: {} }, '/project')
    ons['fs:unwatchRoot']!()
    expect(mockWatcherClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run tests/main/ipc/watcher.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/main/ipc/watcher'`

- [ ] **Step 4: Create watcher.ts**

Create `src/main/ipc/watcher.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import chokidar, { FSWatcher } from 'chokidar'
import { promises as fs } from 'fs'
import path from 'path'

let watcher: FSWatcher | null = null
let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function stopWatcher(): void {
  watcher?.close()
  watcher = null
}

export function registerWatcherHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('fs:watchRoot', async (event, rootPath: string) => {
    watcher?.close()
    watcher = null

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (channel: string, ...args: unknown[]): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    }

    watcher = chokidar.watch(rootPath, {
      ignored: /(^|[/\\])(\.|node_modules)/,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('change', async (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/')
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        send('fs:fileChange', normalized, content)
      } catch {
        // file may have been deleted or is binary — ignore
      }
    })
  })

  ipcMain.on('fs:unwatchRoot', () => {
    watcher?.close()
    watcher = null
  })
}
```

- [ ] **Step 5: Register in index.ts**

Modify `src/main/ipc/index.ts` — add import and call:

```typescript
import { ipcMain } from 'electron'
import {
  readDirHandler,
  readFileHandler,
  writeFileHandler,
  openFolderHandler
} from './fs'
import { registerTerminalHandlers } from './terminal'
import { registerAiHandlers } from './ai'
import { registerSettingsHandlers } from './settings'
import { registerWatcherHandlers } from './watcher'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_event, dirPath: string) => readDirHandler(dirPath))
  ipcMain.handle('fs:readFile', (_event, filePath: string) => readFileHandler(filePath))
  ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) =>
    writeFileHandler(filePath, content)
  )
  ipcMain.handle('fs:openFolder', () => openFolderHandler())
  registerTerminalHandlers()
  registerAiHandlers()
  registerSettingsHandlers()
  registerWatcherHandlers()
}
```

- [ ] **Step 6: Call stopWatcher in main/index.ts**

Modify `src/main/index.ts` — add import and call in before-quit:

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { killAllTerminals } from './ipc/terminal'
import { stopWatcher } from './ipc/watcher'

// ... (rest of file unchanged except before-quit)

app.on('before-quit', () => {
  killAllTerminals()
  stopWatcher()
})
```

- [ ] **Step 7: Expose in preload/index.ts**

Add three methods to the `fs` object in `src/preload/index.ts`:

```typescript
fs: {
  readDir: (dirPath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('fs:openFolder'),
  watchRoot: (rootPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:watchRoot', rootPath),
  unwatchRoot: (): void =>
    ipcRenderer.send('fs:unwatchRoot'),
  onFileChange: (cb: (filePath: string, content: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, filePath: string, content: string) => cb(filePath, content)
    ipcRenderer.on('fs:fileChange', listener)
    return () => ipcRenderer.removeListener('fs:fileChange', listener)
  }
},
```

- [ ] **Step 8: Add types to electron.d.ts**

Modify `src/renderer/src/types/electron.d.ts` — add three methods to `Window.kode.fs`:

```typescript
fs: {
  readDir(dirPath: string): Promise<FileEntry[]>
  readFile(filePath: string): Promise<string>
  writeFile(filePath: string, content: string): Promise<void>
  openFolder(): Promise<string | null>
  watchRoot(rootPath: string): Promise<void>
  unwatchRoot(): void
  onFileChange(cb: (filePath: string, content: string) => void): () => void
}
```

- [ ] **Step 9: Run tests — verify 6 pass**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run tests/main/ipc/watcher.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 10: Run full suite — no regressions**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run
```

Expected: all previously passing tests still pass (168 + 6 = 174).

- [ ] **Step 11: Commit**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
git add src/main/ipc/watcher.ts src/main/ipc/index.ts src/main/index.ts src/preload/index.ts src/renderer/src/types/electron.d.ts tests/main/ipc/watcher.test.ts package.json package-lock.json
git commit -m "feat(m7): watcher IPC — chokidar file change events + preload + types

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: useAutoFollow hook

**Files:**
- Create: `src/renderer/src/hooks/useAutoFollow.ts`
- Create: `tests/renderer/hooks/useAutoFollow.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/hooks/useAutoFollow.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoFollow } from '@renderer/hooks/useAutoFollow'

const mockWatchRoot = vi.fn().mockResolvedValue(undefined)
const mockUnwatchRoot = vi.fn()
let fileChangeCb: ((filePath: string, content: string) => void) | null = null

const mockOpenFile = vi.fn().mockResolvedValue(undefined)
const mockUpdateFileContent = vi.fn()
const mockSetActiveFile = vi.fn()

beforeEach(() => {
  mockWatchRoot.mockClear()
  mockUnwatchRoot.mockClear()
  mockOpenFile.mockClear()
  mockUpdateFileContent.mockClear()
  mockSetActiveFile.mockClear()
  fileChangeCb = null
  localStorage.clear()

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: {
        readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn(),
        watchRoot: mockWatchRoot,
        unwatchRoot: mockUnwatchRoot,
        onFileChange: (cb: (filePath: string, content: string) => void) => {
          fileChangeCb = cb
          return () => { fileChangeCb = null }
        }
      },
      terminal: {
        spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {})
      },
      settings: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
      ai: {
        sendMessage: vi.fn(), stop: vi.fn(),
        onToken: vi.fn().mockReturnValue(() => {}),
        onDone: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        onRateLimit: vi.fn().mockReturnValue(() => {})
      },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

const defaultDeps = () => ({
  rootPath: '/my/project',
  openFiles: [],
  openFile: mockOpenFile,
  updateFileContent: mockUpdateFileContent,
  setActiveFile: mockSetActiveFile
})

describe('useAutoFollow', () => {
  it('initial state: enabled is false', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    expect(result.current.enabled).toBe(false)
  })

  it('toggle() enables auto follow', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    expect(result.current.enabled).toBe(true)
  })

  it('toggle() twice returns to false', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    act(() => { result.current.toggle() })
    expect(result.current.enabled).toBe(false)
  })

  it('persists enabled to localStorage', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    expect(localStorage.getItem('kode.autoFollow')).toBe('true')
  })

  it('restores enabled from localStorage on mount', () => {
    localStorage.setItem('kode.autoFollow', 'true')
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    expect(result.current.enabled).toBe(true)
  })

  it('calls watchRoot when enabled becomes true with a rootPath', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    expect(mockWatchRoot).toHaveBeenCalledWith('/my/project')
  })

  it('calls unwatchRoot when enabled becomes false', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    await act(async () => { result.current.toggle() })
    expect(mockUnwatchRoot).toHaveBeenCalled()
  })

  it('onFileChange opens file when not already open', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    await act(async () => { fileChangeCb?.('/my/project/foo.ts', 'new content') })
    expect(mockOpenFile).toHaveBeenCalledWith('/my/project/foo.ts')
    expect(mockUpdateFileContent).not.toHaveBeenCalled()
  })

  it('onFileChange updates content when file is already open', async () => {
    const deps = {
      ...defaultDeps(),
      openFiles: [{ path: '/my/project/foo.ts', name: 'foo.ts', content: 'old', dirty: false, language: 'typescript' }]
    }
    const { result } = renderHook(() => useAutoFollow(deps))
    await act(async () => { result.current.toggle() })
    await act(async () => { fileChangeCb?.('/my/project/foo.ts', 'new content') })
    expect(mockUpdateFileContent).toHaveBeenCalledWith('/my/project/foo.ts', 'new content')
    expect(mockSetActiveFile).toHaveBeenCalledWith('/my/project/foo.ts')
    expect(mockOpenFile).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run tests/renderer/hooks/useAutoFollow.test.ts
```

Expected: FAIL — `Cannot find module '@renderer/hooks/useAutoFollow'`

- [ ] **Step 3: Implement useAutoFollow.ts**

Create `src/renderer/src/hooks/useAutoFollow.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { OpenFile } from '../types'

const STORAGE_KEY = 'kode.autoFollow'

interface UseAutoFollowDeps {
  rootPath: string | null
  openFiles: OpenFile[]
  openFile(path: string): Promise<void>
  updateFileContent(path: string, content: string): void
  setActiveFile(path: string): void
}

interface UseAutoFollowResult {
  enabled: boolean
  toggle(): void
}

export function useAutoFollow({
  rootPath,
  openFiles,
  openFile,
  updateFileContent,
  setActiveFile
}: UseAutoFollowDeps): UseAutoFollowResult {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'false')
    } catch {
      return false
    }
  })

  const enabledRef = useRef(enabled)
  const openFilesRef = useRef(openFiles)
  const openFileRef = useRef(openFile)
  const updateFileContentRef = useRef(updateFileContent)
  const setActiveFileRef = useRef(setActiveFile)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { openFilesRef.current = openFiles }, [openFiles])
  useEffect(() => { openFileRef.current = openFile }, [openFile])
  useEffect(() => { updateFileContentRef.current = updateFileContent }, [updateFileContent])
  useEffect(() => { setActiveFileRef.current = setActiveFile }, [setActiveFile])

  // Watch / unwatch when enabled or rootPath changes
  useEffect(() => {
    if (enabled && rootPath) {
      window.kode.fs.watchRoot(rootPath)
    } else {
      window.kode.fs.unwatchRoot()
    }
  }, [enabled, rootPath])

  // Subscribe to file change events (once on mount)
  useEffect(() => {
    const cleanup = window.kode.fs.onFileChange((filePath, content) => {
      if (!enabledRef.current) return
      const isOpen = openFilesRef.current.some(f => f.path === filePath)
      if (isOpen) {
        updateFileContentRef.current(filePath, content)
        setActiveFileRef.current(filePath)
      } else {
        openFileRef.current(filePath)
      }
    })
    return cleanup
  }, [])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { enabled, toggle }
}
```

- [ ] **Step 4: Run tests — verify 9 pass**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run tests/renderer/hooks/useAutoFollow.test.ts
```

Expected: 9 tests PASS.

- [ ] **Step 5: Run full suite — no regressions**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run
```

Expected: 174 + 9 = 183 tests passing.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
git add src/renderer/src/hooks/useAutoFollow.ts tests/renderer/hooks/useAutoFollow.test.ts
git commit -m "feat(m7): useAutoFollow hook — toggle, watch/unwatch, file change → open/update

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Wire Auto Follow in App + AIChatPanel toggle button

**Files:**
- Modify: `src/renderer/src/components/ai/AIChatPanel.tsx`
- Modify: `src/renderer/src/App.tsx`
- Modify: `tests/renderer/components/ai/AIChatPanel.test.tsx`

- [ ] **Step 1: Read current files before editing**

Read these files to confirm current state before modifying:
- `src/renderer/src/components/ai/AIChatPanel.tsx`
- `src/renderer/src/App.tsx`
- `tests/renderer/components/ai/AIChatPanel.test.tsx`

- [ ] **Step 2: Add props to AIChatPanel.tsx**

Add `autoFollowEnabled: boolean` and `onToggleAutoFollow(): void` props to `AIChatPanel`. Add an Eye toggle button in the header next to the Settings button.

Replace `src/renderer/src/components/ai/AIChatPanel.tsx` with:

```typescript
import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings, Eye } from 'lucide-react'
import { useScheduler } from '../../hooks/useScheduler'
import { useSettings } from '../../hooks/useSettings'
import { ChatMessage } from './ChatMessage'
import { ProviderSettings } from './ProviderSettings'
import { QueueDisplay } from './QueueDisplay'

interface AIChatPanelProps {
  autoFollowEnabled: boolean
  onToggleAutoFollow(): void
}

export function AIChatPanel({ autoFollowEnabled, onToggleAutoFollow }: AIChatPanelProps) {
  const {
    messages, isStreaming, error, retryCountdown, queue,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue
  } = useScheduler()
  const { settings, setActiveProvider, setProviderKey, setProviderModel } = useSettings()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = messagesEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    sendOrEnqueue(input)
    setInput('')
  }, [input, sendOrEnqueue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const isBlocked = isStreaming || retryCountdown !== null
  const activeModel = settings?.providers[settings.activeProvider]?.model ?? ''
  const modelLabel = activeModel.split('-').slice(0, 3).join('-')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 0 14px',
        height: 35,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          AI Agent
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeModel && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 5px'
            }}>
              {modelLabel}
            </span>
          )}
          <button
            onClick={onToggleAutoFollow}
            aria-label="Auto Follow"
            aria-pressed={autoFollowEnabled}
            title={autoFollowEnabled ? 'Auto Follow: on' : 'Auto Follow: off'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: autoFollowEnabled ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => setShowSettings(v => !v)}
            aria-label="Settings"
            title="Provider settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings size={13} />
          </button>
          <button
            onClick={clearMessages}
            title="Clear conversation"
            aria-label="Clear"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Provider settings panel (collapsible) */}
      {showSettings && settings && (
        <ProviderSettings
          settings={settings}
          onSetActiveProvider={setActiveProvider}
          onSetProviderKey={setProviderKey}
          onSetProviderModel={setProviderModel}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 4px',
        minHeight: 0
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 12,
            opacity: 0.6
          }}>
            Start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={`${msg.role}-${i}`}
            role={msg.role}
            content={msg.content}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <div style={{
            padding: '6px 10px',
            marginBottom: 8,
            background: 'rgba(220, 80, 80, 0.12)',
            border: '1px solid rgba(220, 80, 80, 0.3)',
            borderRadius: 6,
            fontSize: 12,
            color: '#f87171'
          }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Queue + retry countdown */}
      <QueueDisplay
        queue={queue}
        retryCountdown={retryCountdown}
        onRemove={removeFromQueue}
        onClearQueue={clearQueue}
      />

      {/* Input area */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        <textarea
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto'
          }}
        />
        {isBlocked ? (
          <button
            onClick={stop}
            aria-label="Stop"
            style={{
              background: 'rgba(220, 80, 80, 0.15)',
              border: '1px solid rgba(220, 80, 80, 0.4)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#f87171',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            aria-label="Send"
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire useAutoFollow in App.tsx**

Replace `src/renderer/src/App.tsx` with:

```typescript
import { useProject } from './hooks/useProject'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoFollow } from './hooks/useAutoFollow'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { TerminalPanel } from './components/terminal/TerminalPanel'

export function App() {
  const {
    project,
    openFiles,
    activeFilePath,
    openFolder,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile
  } = useProject()

  const layout = usePanelLayout()

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel
  })

  const autoFollow = useAutoFollow({
    rootPath: project.rootPath,
    openFiles,
    openFile,
    updateFileContent,
    setActiveFile
  })

  return (
    <AppLayout
      layout={layout}
      menuBar={
        <MenuBar
          projectName={project.name}
          onOpenFolder={openFolder}
          onSave={() => activeFilePath && saveFile(activeFilePath)}
        />
      }
      activityBar={
        <ActivityBar
          sidebarVisible={layout.sidebarVisible}
          aiPanelVisible={layout.aiPanelVisible}
          bottomPanelVisible={layout.bottomPanelVisible}
          onToggleSidebar={layout.toggleSidebar}
          onToggleAiPanel={layout.toggleAiPanel}
          onToggleBottomPanel={layout.toggleBottomPanel}
        />
      }
      sidebar={
        <FileTree
          rootPath={project.rootPath}
          activeFilePath={activeFilePath}
          onOpenFile={openFile}
        />
      }
      editor={
        <EditorArea
          openFiles={openFiles}
          activeFilePath={activeFilePath}
          onActivate={setActiveFile}
          onClose={closeFile}
          onContentChange={updateFileContent}
          onSave={saveFile}
        />
      }
      aiPanel={
        <AIChatPanel
          autoFollowEnabled={autoFollow.enabled}
          onToggleAutoFollow={autoFollow.toggle}
        />
      }
      bottomPanel={<TerminalPanel />}
    />
  )
}
```

- [ ] **Step 4: Update AIChatPanel.test.tsx**

Read `tests/renderer/components/ai/AIChatPanel.test.tsx` first, then:

1. Add `mockOnToggleAutoFollow = vi.fn()` to the hoisted mocks
2. Add default props: `const defaultProps = { autoFollowEnabled: false, onToggleAutoFollow: mockOnToggleAutoFollow }`
3. Update every `render(<AIChatPanel />)` call to `render(<AIChatPanel {...defaultProps} />)`
4. Add these 2 new tests:

```typescript
it('renders Auto Follow button with aria-pressed=false when disabled', () => {
  render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
  const btn = screen.getByRole('button', { name: 'Auto Follow' })
  expect(btn).toBeInTheDocument()
  expect(btn).toHaveAttribute('aria-pressed', 'false')
})

it('calls onToggleAutoFollow when Auto Follow button is clicked', () => {
  render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
  fireEvent.click(screen.getByRole('button', { name: 'Auto Follow' }))
  expect(mockOnToggleAutoFollow).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 5: Run AIChatPanel tests — verify they pass**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run tests/renderer/components/ai/AIChatPanel.test.tsx
```

Expected: 20 tests PASS (18 existing + 2 new).

- [ ] **Step 6: Run full suite — all tests pass**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
npx vitest run
```

Expected: 183 + 2 = 185 tests passing (all 22 test files, no regressions).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/borad/OneDrive/Dokumente/kirit/Big Projects/Kode/Kode/kode"
git add src/renderer/src/components/ai/AIChatPanel.tsx src/renderer/src/App.tsx tests/renderer/components/ai/AIChatPanel.test.tsx
git commit -m "feat(m7): wire Auto Follow toggle in AIChatPanel + App

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All three M7 spec requirements covered: file watcher (chokidar), auto-open/update in Monaco, toggle UI
- [x] **No placeholders:** All steps have exact code; no "TBD" or "similar to above"
- [x] **Type consistency:** `OpenFile` type used consistently; `watchRoot`/`unwatchRoot`/`onFileChange` names match across watcher.ts, preload, types, and hook
- [x] **chokidar v3** used for CJS compat with electron-vite main process bundling
- [x] **Idempotency guard** on `registerWatcherHandlers` follows established pattern (terminal.ts, ai.ts, settings.ts)
- [x] **`_resetRegistered()`** export follows established pattern for test isolation
- [x] **Ref pattern** in `useAutoFollow` mirrors `useScheduler` / `useAIChat` to avoid stale closures
- [x] **`stopWatcher()`** called in `before-quit` to clean up cleanly (same pattern as `killAllTerminals`)
