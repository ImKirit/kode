# M1: Core Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Electron app with Monaco editor, file tree, and fixed 3-panel layout that can open folders, navigate files, edit and save them.

**Architecture:** electron-vite scaffold (main/preload/renderer). Fixed CSS-grid layout (not GoldenLayout yet — that comes in M5): File Tree | Editor Area | AI placeholder, plus a resizable bottom panel. Monaco handles editing. IPC bridges FS operations from renderer to main.

**Tech Stack:** Electron 35, React 18, TypeScript 5, `@monaco-editor/react`, electron-vite, electron-forge, Tailwind CSS v3, Lucide React, Vitest + React Testing Library, jsdom

---

## File Structure

```
kode/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── tailwind.config.js / postcss.config.js
├── vite.config.ts                         # for Vitest (renderer tests)
├── resources/
│   ├── icon.svg                           # already created (placeholder)
│   └── icon.png                           # to be created in this plan
├── src/
│   ├── main/
│   │   ├── index.ts                       # entry: BrowserWindow + app lifecycle
│   │   └── ipc/
│   │       ├── index.ts                   # registers all handlers
│   │       └── fs.ts                      # readDir, readFile, writeFile, openFolder
│   ├── preload/
│   │   └── index.ts                       # contextBridge: exposes window.kode API
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── styles/
│           │   ├── globals.css            # CSS custom properties (full theme)
│           │   └── tailwind.css
│           ├── types/
│           │   └── index.ts               # FileEntry, OpenFile, ProjectState
│           ├── hooks/
│           │   ├── useProject.ts          # folder path, project name, open files
│           │   └── useFileTree.ts         # directory tree, expand/collapse
│           └── components/
│               ├── layout/
│               │   ├── AppLayout.tsx      # 3-col grid + bottom panel
│               │   ├── MenuBar.tsx        # top menu bar
│               │   └── ResizeHandle.tsx   # drag handle for panel resizing
│               ├── filetree/
│               │   ├── FileTree.tsx
│               │   └── FileTreeNode.tsx
│               ├── editor/
│               │   ├── EditorArea.tsx     # tab bar + monaco area
│               │   ├── EditorTab.tsx      # individual tab
│               │   └── MonacoEditor.tsx   # @monaco-editor/react wrapper
│               └── ai/
│                   └── AIChatPanel.tsx    # styled placeholder
└── tests/
    ├── setup.ts                           # vitest setup (jest-dom)
    ├── main/
    │   └── ipc/
    │       └── fs.test.ts
    └── renderer/
        ├── hooks/
        │   ├── useProject.test.ts
        │   └── useFileTree.test.ts
        └── components/
            └── editor/
                └── EditorTab.test.tsx
```

---

### Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `tailwind.config.js`, `postcss.config.js`
- Create: `vite.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Create all config files**

Write `package.json`:
```json
{
  "name": "kode",
  "version": "0.1.0",
  "description": "AI-native code editor",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.4.0",
    "@electron-forge/maker-squirrel": "^7.4.0",
    "@electron-forge/maker-zip": "^7.4.0",
    "@electron-forge/maker-deb": "^7.4.0",
    "@electron-forge/maker-rpm": "^7.4.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "electron": "^35.0.0",
    "electron-vite": "^2.3.0",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "lucide-react": "^0.400.0",
    "monaco-editor": "^0.50.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "forge": {
    "packagerConfig": {
      "icon": "resources/icon",
      "name": "Kode",
      "executableName": "kode"
    },
    "makers": [
      { "name": "@electron-forge/maker-squirrel", "config": {} },
      { "name": "@electron-forge/maker-zip", "platforms": ["darwin"] },
      { "name": "@electron-forge/maker-deb", "config": {} },
      { "name": "@electron-forge/maker-rpm", "config": {} }
    ]
  }
}
```

Write `electron.vite.config.ts`:
```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: { '@renderer': resolve('src/renderer/src') }
    },
    plugins: [react()]
  }
})
```

Write `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

Write `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["electron-vite/node", "node"]
  },
  "include": ["electron.vite.config.*", "src/main/**/*", "src/preload/**/*"]
}
```

Write `tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@renderer/*": ["src/renderer/src/*"] }
  },
  "include": ["src/renderer/src/**/*", "tests/renderer/**/*"]
}
```

Write `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
}
```

Write `postcss.config.js`:
```javascript
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

Write `vite.config.ts` (for Vitest renderer tests):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true
  },
  resolve: {
    alias: { '@renderer': resolve('src/renderer/src') }
  }
})
```

Write `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no peer-dep errors. Takes ~60s.

- [ ] **Step 3: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig*.json tailwind.config.js postcss.config.js vite.config.ts tests/setup.ts
git commit -m "chore: scaffold electron-vite project with React/TS and test setup"
```

---

### Task 2: Shared Types

**Files:**
- Create: `src/renderer/src/types/index.ts`

- [ ] **Step 1: Write failing test**

Create `tests/renderer/types.test.ts`:
```typescript
import type { FileEntry, OpenFile } from '@renderer/types'

test('FileEntry type has required fields', () => {
  const f: FileEntry = {
    name: 'index.ts',
    path: '/project/index.ts',
    type: 'file'
  }
  expect(f.name).toBe('index.ts')
})

test('OpenFile has dirty flag', () => {
  const f: OpenFile = {
    path: '/project/index.ts',
    name: 'index.ts',
    content: 'const x = 1',
    dirty: false,
    language: 'typescript'
  }
  expect(f.dirty).toBe(false)
})
```

- [ ] **Step 2: Run — expect compile fail**

```bash
npm test -- tests/renderer/types.test.ts
```

Expected: error — `Cannot find module '@renderer/types'`

- [ ] **Step 3: Write `src/renderer/src/types/index.ts`**

```typescript
export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileEntry[]
}

export interface OpenFile {
  path: string
  name: string
  content: string
  dirty: boolean
  language: string
}

export interface ProjectState {
  rootPath: string | null
  name: string
}

/** Detect Monaco language from file extension */
export function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown',
    html: 'html', css: 'css',
    py: 'python', rs: 'rust',
    go: 'go', java: 'java',
    cpp: 'cpp', c: 'c',
    sh: 'shell', yaml: 'yaml', yml: 'yaml'
  }
  return map[ext] ?? 'plaintext'
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/renderer/types.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/types/index.ts tests/renderer/types.test.ts
git commit -m "feat: add shared TypeScript types (FileEntry, OpenFile, ProjectState)"
```

---

### Task 3: Preload + IPC Bridge

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/main/ipc/fs.ts`
- Create: `src/main/ipc/index.ts`
- Create: `src/main/index.ts`
- Test: `tests/main/ipc/fs.test.ts`

- [ ] **Step 1: Write failing tests for FS IPC handlers**

Create `tests/main/ipc/fs.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// We test the handler logic in isolation — no Electron needed
import { readDirHandler, readFileHandler, writeFileHandler } from '../../../src/main/ipc/fs'

describe('readDirHandler', () => {
  it('returns FileEntry array for a real temp directory', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-test-'))
    await fs.writeFile(path.join(dir, 'hello.ts'), 'const x = 1')
    await fs.mkdir(path.join(dir, 'subdir'))

    const entries = await readDirHandler(dir)

    expect(entries.some(e => e.name === 'hello.ts' && e.type === 'file')).toBe(true)
    expect(entries.some(e => e.name === 'subdir' && e.type === 'directory')).toBe(true)

    await fs.rm(dir, { recursive: true })
  })
})

describe('readFileHandler', () => {
  it('returns file content as string', async () => {
    const tmp = path.join(os.tmpdir(), 'kode-test-read.ts')
    await fs.writeFile(tmp, 'const hello = "world"')
    const content = await readFileHandler(tmp)
    expect(content).toBe('const hello = "world"')
    await fs.unlink(tmp)
  })
})

describe('writeFileHandler', () => {
  it('writes content to disk and reads it back', async () => {
    const tmp = path.join(os.tmpdir(), 'kode-test-write.ts')
    await writeFileHandler(tmp, 'const x = 42')
    const content = await fs.readFile(tmp, 'utf-8')
    expect(content).toBe('const x = 42')
    await fs.unlink(tmp)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/main/ipc/fs.test.ts
```

Expected: `Cannot find module '../../../src/main/ipc/fs'`

- [ ] **Step 3: Write `src/main/ipc/fs.ts`**

```typescript
import { dialog } from 'electron'
import { promises as fs } from 'fs'
import type { FileEntry } from '../../renderer/src/types'

export async function readDirHandler(dirPath: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  return entries
    .filter(e => !e.name.startsWith('.'))
    .map(e => ({
      name: e.name,
      path: `${dirPath}/${e.name}`.replace(/\\/g, '/'),
      type: e.isDirectory() ? 'directory' : 'file'
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export async function readFileHandler(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

export async function writeFileHandler(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function openFolderHandler(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/main/ipc/fs.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Write `src/main/ipc/index.ts`**

```typescript
import { ipcMain } from 'electron'
import {
  readDirHandler,
  readFileHandler,
  writeFileHandler,
  openFolderHandler
} from './fs'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_event, dirPath: string) => readDirHandler(dirPath))
  ipcMain.handle('fs:readFile', (_event, filePath: string) => readFileHandler(filePath))
  ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) =>
    writeFileHandler(filePath, content)
  )
  ipcMain.handle('fs:openFolder', () => openFolderHandler())
}
```

- [ ] **Step 6: Write `src/preload/index.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { FileEntry } from '../renderer/src/types'

contextBridge.exposeInMainWorld('kode', {
  platform: process.platform,
  fs: {
    readDir: (dirPath: string): Promise<FileEntry[]> =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    openFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('fs:openFolder')
  },
  setTitle: (title: string): void => ipcRenderer.send('window:setTitle', title)
})
```

- [ ] **Step 7: Write `src/main/index.ts`**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  ipcMain.on('window:setTitle', (_event, title: string) => {
    win.setTitle(title)
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 8: Declare `window.kode` type in renderer**

Create `src/renderer/src/types/electron.d.ts`:
```typescript
import type { FileEntry } from '.'

declare global {
  interface Window {
    kode: {
      platform: string
      fs: {
        readDir(dirPath: string): Promise<FileEntry[]>
        readFile(filePath: string): Promise<string>
        writeFile(filePath: string, content: string): Promise<void>
        openFolder(): Promise<string | null>
      }
      setTitle(title: string): void
    }
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/main/ src/preload/ tests/main/ src/renderer/src/types/electron.d.ts
git commit -m "feat: add main process, preload IPC bridge, and FS handlers"
```

---

### Task 4: CSS Theme + Global Styles

**Files:**
- Create: `src/renderer/src/styles/globals.css`
- Create: `src/renderer/src/styles/tailwind.css`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`

- [ ] **Step 1: Write `src/renderer/src/styles/globals.css`**

```css
:root {
  --bg-primary:     #1e1e1e;
  --bg-secondary:   #252526;
  --bg-sidebar:     #1a1a1a;
  --bg-input:       #2a2a2a;
  --bg-button:      #2d2d2d;
  --bg-tab-active:  #1e1e1e;
  --bg-tab-inactive:#2d2d2d;

  --border:         #3a3a3a;
  --border-light:   #444444;

  --text-primary:   #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted:     #666666;

  --accent:         #ffffff;
  --accent-blue:    #0e9de8;
  --accent-green:   #4ec9b0;

  --font-editor:    'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-ui:        -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-ui:   13px;
  --font-size-editor: 14px;

  --scrollbar-width: 6px;
  --panel-resize-handle: 4px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: var(--font-size-ui);
}

::-webkit-scrollbar { width: var(--scrollbar-width); height: var(--scrollbar-width); }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #777; }

button {
  cursor: pointer;
  border: none;
  outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-size-ui);
}

input, textarea {
  font-family: var(--font-ui);
  font-size: var(--font-size-ui);
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border);
  outline: none;
}

input:focus, textarea:focus {
  border-color: var(--border-light);
}

/* App drag region for frameless titlebar */
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
```

- [ ] **Step 2: Write `src/renderer/src/styles/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Write `src/renderer/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kode</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/renderer/src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'
import './styles/tailwind.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/
git commit -m "feat: add renderer entry point and CSS custom property theme"
```

---

### Task 5: Project State Hook

**Files:**
- Create: `src/renderer/src/hooks/useProject.ts`
- Test: `tests/renderer/hooks/useProject.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/hooks/useProject.test.ts`:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useProject } from '@renderer/hooks/useProject'

// Mock window.kode
const mockKode = {
  fs: {
    openFolder: vi.fn(),
    readDir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn()
  },
  setTitle: vi.fn()
}
Object.defineProperty(window, 'kode', { value: mockKode, writable: true })

describe('useProject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts with no project open', () => {
    const { result } = renderHook(() => useProject())
    expect(result.current.project.rootPath).toBeNull()
    expect(result.current.openFiles).toHaveLength(0)
  })

  it('openFolder sets rootPath when user picks a folder', async () => {
    mockKode.fs.openFolder.mockResolvedValue('/home/user/myproject')
    mockKode.fs.readDir.mockResolvedValue([])

    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFolder())

    expect(result.current.project.rootPath).toBe('/home/user/myproject')
    expect(result.current.project.name).toBe('myproject')
  })

  it('openFolder does nothing when user cancels', async () => {
    mockKode.fs.openFolder.mockResolvedValue(null)
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFolder())
    expect(result.current.project.rootPath).toBeNull()
  })

  it('openFile adds file to openFiles list', async () => {
    mockKode.fs.readFile.mockResolvedValue('const x = 1')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    expect(result.current.openFiles).toHaveLength(1)
    expect(result.current.openFiles[0].path).toBe('/proj/index.ts')
    expect(result.current.activeFilePath).toBe('/proj/index.ts')
  })

  it('opening same file twice does not duplicate it', async () => {
    mockKode.fs.readFile.mockResolvedValue('x')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    await act(() => result.current.openFile('/proj/index.ts'))
    expect(result.current.openFiles).toHaveLength(1)
  })

  it('saveFile writes content and clears dirty flag', async () => {
    mockKode.fs.readFile.mockResolvedValue('original')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    act(() => result.current.updateFileContent('/proj/index.ts', 'modified'))
    expect(result.current.openFiles[0].dirty).toBe(true)
    await act(() => result.current.saveFile('/proj/index.ts'))
    expect(mockKode.fs.writeFile).toHaveBeenCalledWith('/proj/index.ts', 'modified')
    expect(result.current.openFiles[0].dirty).toBe(false)
  })

  it('closeFile removes it and sets next file as active', async () => {
    mockKode.fs.readFile.mockResolvedValue('')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/a.ts'))
    await act(() => result.current.openFile('/proj/b.ts'))
    act(() => result.current.closeFile('/proj/b.ts'))
    expect(result.current.openFiles).toHaveLength(1)
    expect(result.current.activeFilePath).toBe('/proj/a.ts')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/renderer/hooks/useProject.test.ts
```

Expected: `Cannot find module '@renderer/hooks/useProject'`

- [ ] **Step 3: Write `src/renderer/src/hooks/useProject.ts`**

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { OpenFile, ProjectState } from '../types'
import { languageFromPath } from '../types'

interface UseProject {
  project: ProjectState
  openFiles: OpenFile[]
  activeFilePath: string | null
  openFolder(): Promise<void>
  openFile(filePath: string): Promise<void>
  closeFile(filePath: string): void
  setActiveFile(filePath: string): void
  updateFileContent(filePath: string, content: string): void
  saveFile(filePath: string): Promise<void>
}

export function useProject(): UseProject {
  const [project, setProject] = useState<ProjectState>({ rootPath: null, name: '' })
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)

  // Update window title when project changes
  useEffect(() => {
    const title = project.name ? `Kode | ${project.name}` : 'Kode'
    window.kode.setTitle(title)
  }, [project.name])

  const openFolder = useCallback(async () => {
    const folderPath = await window.kode.fs.openFolder()
    if (!folderPath) return
    const name = folderPath.split(/[/\\]/).pop() ?? folderPath
    setProject({ rootPath: folderPath, name })
  }, [])

  const openFile = useCallback(async (filePath: string) => {
    setOpenFiles(prev => {
      if (prev.some(f => f.path === filePath)) return prev
      return prev // will be added after fetch
    })
    setActiveFilePath(filePath)
    const existing = openFiles.find(f => f.path === filePath)
    if (existing) return

    const content = await window.kode.fs.readFile(filePath)
    const name = filePath.split(/[/\\]/).pop() ?? filePath
    setOpenFiles(prev => {
      if (prev.some(f => f.path === filePath)) return prev
      return [...prev, { path: filePath, name, content, dirty: false, language: languageFromPath(filePath) }]
    })
  }, [openFiles])

  const closeFile = useCallback((filePath: string) => {
    setOpenFiles(prev => {
      const idx = prev.findIndex(f => f.path === filePath)
      const next = prev.filter(f => f.path !== filePath)
      setActiveFilePath(next.length > 0 ? (next[Math.max(0, idx - 1)]?.path ?? next[0].path) : null)
      return next
    })
  }, [])

  const updateFileContent = useCallback((filePath: string, content: string) => {
    setOpenFiles(prev =>
      prev.map(f => f.path === filePath ? { ...f, content, dirty: true } : f)
    )
  }, [])

  const saveFile = useCallback(async (filePath: string) => {
    const file = openFiles.find(f => f.path === filePath)
    if (!file) return
    await window.kode.fs.writeFile(filePath, file.content)
    setOpenFiles(prev =>
      prev.map(f => f.path === filePath ? { ...f, dirty: false } : f)
    )
  }, [openFiles])

  return {
    project, openFiles, activeFilePath,
    openFolder, openFile, closeFile, setActiveFile: setActiveFilePath,
    updateFileContent, saveFile
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/renderer/hooks/useProject.test.ts
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/hooks/useProject.ts tests/renderer/hooks/useProject.test.ts
git commit -m "feat: add useProject hook (open folder, file management, save)"
```

---

### Task 6: File Tree Hook

**Files:**
- Create: `src/renderer/src/hooks/useFileTree.ts`
- Test: `tests/renderer/hooks/useFileTree.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/hooks/useFileTree.test.ts`:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useFileTree } from '@renderer/hooks/useFileTree'
import type { FileEntry } from '@renderer/types'

const mockKode = {
  fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn() },
  setTitle: vi.fn()
}
Object.defineProperty(window, 'kode', { value: mockKode, writable: true })

const ENTRIES: FileEntry[] = [
  { name: 'src', path: '/proj/src', type: 'directory' },
  { name: 'README.md', path: '/proj/README.md', type: 'file' }
]

describe('useFileTree', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads root entries for a given path', async () => {
    mockKode.fs.readDir.mockResolvedValue(ENTRIES)
    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    expect(result.current.entries).toEqual(ENTRIES)
  })

  it('toggleExpanded marks a directory as expanded and loads children', async () => {
    mockKode.fs.readDir.mockResolvedValueOnce(ENTRIES)
    const children: FileEntry[] = [{ name: 'index.ts', path: '/proj/src/index.ts', type: 'file' }]
    mockKode.fs.readDir.mockResolvedValueOnce(children)

    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    await act(() => result.current.toggleExpanded('/proj/src'))

    expect(result.current.expanded.has('/proj/src')).toBe(true)
    expect(result.current.children['/proj/src']).toEqual(children)
  })

  it('toggleExpanded collapses an already-expanded directory', async () => {
    mockKode.fs.readDir.mockResolvedValue(ENTRIES)
    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    await act(() => result.current.toggleExpanded('/proj/src'))
    await act(() => result.current.toggleExpanded('/proj/src'))
    expect(result.current.expanded.has('/proj/src')).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/renderer/hooks/useFileTree.test.ts
```

Expected: `Cannot find module '@renderer/hooks/useFileTree'`

- [ ] **Step 3: Write `src/renderer/src/hooks/useFileTree.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { FileEntry } from '../types'

interface UseFileTree {
  entries: FileEntry[]
  expanded: Set<string>
  children: Record<string, FileEntry[]>
  loading: boolean
  toggleExpanded(path: string): Promise<void>
  refresh(): Promise<void>
}

export function useFileTree(rootPath: string | null): UseFileTree {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<Record<string, FileEntry[]>>({})
  const [loading, setLoading] = useState(false)

  const loadDir = useCallback(async (path: string): Promise<FileEntry[]> => {
    return window.kode.fs.readDir(path)
  }, [])

  useEffect(() => {
    if (!rootPath) { setEntries([]); return }
    setLoading(true)
    loadDir(rootPath).then(e => { setEntries(e); setLoading(false) })
  }, [rootPath, loadDir])

  const toggleExpanded = useCallback(async (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) { next.delete(path); return next }
      next.add(path)
      return next
    })
    if (!expanded.has(path) && !children[path]) {
      const kids = await loadDir(path)
      setChildren(prev => ({ ...prev, [path]: kids }))
    }
  }, [expanded, children, loadDir])

  const refresh = useCallback(async () => {
    if (!rootPath) return
    const e = await loadDir(rootPath)
    setEntries(e)
    // Re-fetch all expanded directories
    const updates: Record<string, FileEntry[]> = {}
    for (const p of expanded) {
      updates[p] = await loadDir(p)
    }
    setChildren(prev => ({ ...prev, ...updates }))
  }, [rootPath, expanded, loadDir])

  return { entries, expanded, children, loading, toggleExpanded, refresh }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/renderer/hooks/useFileTree.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/hooks/useFileTree.ts tests/renderer/hooks/useFileTree.test.ts
git commit -m "feat: add useFileTree hook with expand/collapse and lazy child loading"
```

---

### Task 7: EditorTab Component

**Files:**
- Create: `src/renderer/src/components/editor/EditorTab.tsx`
- Test: `tests/renderer/components/editor/EditorTab.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/renderer/components/editor/EditorTab.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorTab } from '@renderer/components/editor/EditorTab'

describe('EditorTab', () => {
  const base = { path: '/a/index.ts', name: 'index.ts', active: false, dirty: false }

  it('renders file name', () => {
    render(<EditorTab {...base} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('shows dirty indicator when dirty=true', () => {
    render(<EditorTab {...base} dirty={true} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('dirty-dot')).toBeInTheDocument()
  })

  it('does not show dirty indicator when dirty=false', () => {
    render(<EditorTab {...base} dirty={false} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByTestId('dirty-dot')).not.toBeInTheDocument()
  })

  it('calls onActivate when clicked', () => {
    const onActivate = vi.fn()
    render(<EditorTab {...base} onActivate={onActivate} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('index.ts'))
    expect(onActivate).toHaveBeenCalled()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<EditorTab {...base} onActivate={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/renderer/components/editor/EditorTab.test.tsx
```

Expected: `Cannot find module '@renderer/components/editor/EditorTab'`

- [ ] **Step 3: Write `src/renderer/src/components/editor/EditorTab.tsx`**

```typescript
import { X } from 'lucide-react'

interface EditorTabProps {
  path: string
  name: string
  active: boolean
  dirty: boolean
  onActivate(): void
  onClose(): void
}

export function EditorTab({ name, active, dirty, onActivate, onClose }: EditorTabProps) {
  return (
    <div
      onClick={onActivate}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        height: 35,
        background: active ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
        borderRight: '1px solid var(--border)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontSize: 13
      }}
    >
      {dirty && (
        <span
          data-testid="dirty-dot"
          style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: 'var(--text-secondary)',
            flexShrink: 0
          }}
        />
      )}
      <span>{name}</span>
      <button
        aria-label="close tab"
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          color: 'var(--text-muted)',
          padding: 2,
          borderRadius: 3,
          marginLeft: 4
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <X size={12} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- tests/renderer/components/editor/EditorTab.test.tsx
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/editor/EditorTab.tsx tests/renderer/components/editor/EditorTab.test.tsx
git commit -m "feat: add EditorTab component with dirty indicator and close button"
```

---

### Task 8: Monaco Editor Wrapper + EditorArea

**Files:**
- Create: `src/renderer/src/components/editor/MonacoEditor.tsx`
- Create: `src/renderer/src/components/editor/EditorArea.tsx`

- [ ] **Step 1: Write `src/renderer/src/components/editor/MonacoEditor.tsx`**

```typescript
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface MonacoEditorProps {
  content: string
  language: string
  filePath: string
  onChange(value: string): void
  onSave(): void
}

export function MonacoEditor({ content, language, onChange, onSave }: MonacoEditorProps) {
  function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    // Ctrl+S / Cmd+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave())
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: 'var(--font-editor)',
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        automaticLayout: true
      }}
      onChange={v => onChange(v ?? '')}
      onMount={handleMount}
    />
  )
}
```

- [ ] **Step 2: Write `src/renderer/src/components/editor/EditorArea.tsx`**

```typescript
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
        flexShrink: 0
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

      {/* Editor area */}
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
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 13
          }}>
            Open a file to start editing
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/editor/
git commit -m "feat: add Monaco editor wrapper and EditorArea with tab management"
```

---

### Task 9: FileTree Components

**Files:**
- Create: `src/renderer/src/components/filetree/FileTreeNode.tsx`
- Create: `src/renderer/src/components/filetree/FileTree.tsx`

- [ ] **Step 1: Write `src/renderer/src/components/filetree/FileTreeNode.tsx`**

```typescript
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

  return (
    <>
      <div
        onClick={() => entry.type === 'directory' ? onToggle(entry.path) : onOpenFile(entry.path)}
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
          borderRadius: 2
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {entry.type === 'directory' ? (
          <>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isExpanded ? <FolderOpen size={14} color="#e8c56d" /> : <Folder size={14} color="#e8c56d" />}
          </>
        ) : (
          <>
            <span style={{ width: 14 }} />
            <File size={14} color="var(--text-muted)" />
          </>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
```

- [ ] **Step 2: Write `src/renderer/src/components/filetree/FileTree.tsx`**

```typescript
import { FileTreeNode } from './FileTreeNode'
import { useFileTree } from '../../hooks/useFileTree'

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
        padding: 16,
        color: 'var(--text-muted)',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 1.6
      }}>
        No folder open.{'\n'}Use File &gt; Open Folder.
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
  }

  return (
    <div style={{ overflow: 'auto', height: '100%', paddingTop: 4 }}>
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/filetree/
git commit -m "feat: add FileTree and FileTreeNode components"
```

---

### Task 10: AI Chat Placeholder Panel

**Files:**
- Create: `src/renderer/src/components/ai/AIChatPanel.tsx`

- [ ] **Step 1: Write `src/renderer/src/components/ai/AIChatPanel.tsx`**

```typescript
import { Bot } from 'lucide-react'

export function AIChatPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)'
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        AI Agent
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text-muted)',
        padding: 24
      }}>
        <Bot size={32} strokeWidth={1} />
        <p style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          AI Agent panel coming in M3.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/ai/AIChatPanel.tsx
git commit -m "feat: add AI chat placeholder panel"
```

---

### Task 11: Menu Bar

**Files:**
- Create: `src/renderer/src/components/layout/MenuBar.tsx`

- [ ] **Step 1: Write `src/renderer/src/components/layout/MenuBar.tsx`**

```typescript
interface MenuBarProps {
  projectName: string
  onOpenFolder(): void
}

interface MenuItem {
  label: string
  items: { label: string; shortcut?: string; action?(): void; separator?: boolean }[]
}

export function MenuBar({ projectName, onOpenFolder }: MenuBarProps) {
  const menus: MenuItem[] = [
    {
      label: 'File',
      items: [
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: onOpenFolder },
        { label: '', separator: true },
        { label: 'Save', shortcut: 'Ctrl+S' },
        { label: 'Save All', shortcut: 'Ctrl+Shift+S' }
      ]
    },
    { label: 'Edit', items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { label: '', separator: true },
        { label: 'Find', shortcut: 'Ctrl+F' },
        { label: 'Replace', shortcut: 'Ctrl+H' }
    ]},
    { label: 'View', items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B' },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J' }
    ]},
    { label: 'Terminal', items: [
        { label: 'New Terminal', shortcut: 'Ctrl+`' }
    ]},
    { label: 'AI', items: [
        { label: 'New Agent Session' },
        { label: 'Manage Subscriptions' }
    ]},
    { label: 'Help', items: [
        { label: 'About Kode' }
    ]}
  ]

  return (
    <div
      className="drag-region"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 30,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        paddingLeft: window.kode.platform === 'darwin' ? 80 : 8,
        paddingRight: 12,
        gap: 0,
        flexShrink: 0,
        fontSize: 13
      }}
    >
      {menus.map(menu => (
        <div key={menu.label} className="no-drag" style={{ position: 'relative' }}>
          <MenuButton label={menu.label} items={menu.items} />
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {projectName && (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }} className="no-drag">
          {projectName}
        </span>
      )}
    </div>
  )
}

function MenuButton({ label, items }: { label: string; items: MenuItem['items'] }) {
  return (
    <div style={{ position: 'relative' }} className="menu-item-root">
      <button
        style={{
          padding: '0 10px',
          height: 30,
          background: 'none',
          color: 'var(--text-secondary)',
          fontSize: 13,
          borderRadius: 0
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        {label}
      </button>
    </div>
  )
}
```

> **Note:** Full dropdown functionality (mouse interactions, keyboard nav) will be enhanced in M11 (Settings + Customization). For M1, the menu bar is structural/visual.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/layout/MenuBar.tsx
git commit -m "feat: add menu bar component (structural, dropdowns in M11)"
```

---

### Task 12: App Layout + Root + First Launch

**Files:**
- Create: `src/renderer/src/components/layout/AppLayout.tsx`
- Create: `src/renderer/src/App.tsx`

- [ ] **Step 1: Write `src/renderer/src/components/layout/AppLayout.tsx`**

```typescript
import { useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

interface AppLayoutProps {
  menuBar: ReactNode
  sidebar: ReactNode
  editor: ReactNode
  aiPanel: ReactNode
  bottomPanel: ReactNode
}

export function AppLayout({ menuBar, sidebar, editor, aiPanel, bottomPanel }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [aiPanelWidth, setAiPanelWidth] = useState(360)
  const [bottomHeight, setBottomHeight] = useState(220)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [bottomVisible, setBottomVisible] = useState(true)

  const dragging = useRef<null | 'sidebar' | 'ai' | 'bottom'>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startVal = useRef(0)

  const onMouseDown = useCallback((handle: 'sidebar' | 'ai' | 'bottom', e: React.MouseEvent) => {
    dragging.current = handle
    startX.current = e.clientX
    startY.current = e.clientY
    startVal.current = handle === 'sidebar' ? sidebarWidth : handle === 'ai' ? aiPanelWidth : bottomHeight
    e.preventDefault()
  }, [sidebarWidth, aiPanelWidth, bottomHeight])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    if (dragging.current === 'sidebar') {
      setSidebarWidth(Math.max(140, Math.min(500, startVal.current + e.clientX - startX.current)))
    } else if (dragging.current === 'ai') {
      setAiPanelWidth(Math.max(200, Math.min(600, startVal.current - (e.clientX - startX.current))))
    } else if (dragging.current === 'bottom') {
      setBottomHeight(Math.max(80, Math.min(600, startVal.current - (e.clientY - startY.current))))
    }
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = null }, [])

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {menuBar}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarVisible && (
          <>
            <div style={{
              width: sidebarWidth,
              minWidth: sidebarWidth,
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {sidebar}
            </div>
            <div
              onMouseDown={e => onMouseDown('sidebar', e)}
              style={{
                width: 4,
                cursor: 'col-resize',
                background: 'transparent',
                flexShrink: 0,
                zIndex: 10
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            />
          </>
        )}

        {/* Main area: editor + bottom panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {editor}
          </div>

          {bottomVisible && (
            <>
              <div
                onMouseDown={e => onMouseDown('bottom', e)}
                style={{
                  height: 4,
                  cursor: 'row-resize',
                  background: 'transparent',
                  flexShrink: 0
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              />
              <div style={{
                height: bottomHeight,
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {bottomPanel}
              </div>
            </>
          )}
        </div>

        {/* AI panel */}
        <div
          onMouseDown={e => onMouseDown('ai', e)}
          style={{
            width: 4,
            cursor: 'col-resize',
            background: 'transparent',
            flexShrink: 0
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        />
        <div style={{
          width: aiPanelWidth,
          minWidth: aiPanelWidth,
          overflow: 'hidden'
        }}>
          {aiPanel}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/renderer/src/App.tsx`**

```typescript
import { useProject } from './hooks/useProject'
import { AppLayout } from './components/layout/AppLayout'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'

export function App() {
  const {
    project, openFiles, activeFilePath,
    openFolder, openFile, closeFile, setActiveFile,
    updateFileContent, saveFile
  } = useProject()

  return (
    <AppLayout
      menuBar={
        <MenuBar
          projectName={project.name}
          onOpenFolder={openFolder}
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
      aiPanel={<AIChatPanel />}
      bottomPanel={
        <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
          Terminal — coming in M2
        </div>
      }
    />
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass (≥ 18 tests across 4 test files)

- [ ] **Step 4: Run the app in dev mode**

```bash
npm run dev
```

Expected: Electron window opens, dark background, 3-panel layout visible. File &gt; Open Folder works, files load in tree, clicking a file opens it in Monaco, Ctrl+S saves.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/layout/ src/renderer/src/App.tsx
git commit -m "feat: wire up App with full 3-panel layout, file tree, and Monaco editor"
```

---

### Task 13: Placeholder Logo PNG + Final Cleanup

**Files:**
- Create: `resources/icon.png` (128x128 placeholder, generated from SVG)

- [ ] **Step 1: Generate PNG from SVG using sharp**

```bash
npm install --save-dev sharp
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('resources/icon.svg');
sharp(Buffer.from(svg)).resize(512, 512).png().toFile('resources/icon.png', (err) => {
  if (err) console.error(err); else console.log('icon.png created');
});
"
```

Expected: `resources/icon.png` created (512x512)

- [ ] **Step 2: Remove sharp from devDeps (one-time use)**

```bash
npm uninstall sharp
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass

- [ ] **Step 4: Final commit**

```bash
git add resources/icon.png src/renderer/assets/logo.svg
git commit -m "feat: add placeholder app icons and renderer logo asset"
```

---

## M1 Done

When all tasks are complete, `npm run dev` should produce:
- Electron window with title `Kode`
- Dark theme, 3-panel layout (file tree | Monaco | AI placeholder)
- Open Folder via menu works
- Files navigable and editable
- Ctrl+S saves
- Dirty dot on unsaved tabs
- Closing a tab removes it

**Next milestone:** M2 — Terminal (node-pty + xterm.js)
