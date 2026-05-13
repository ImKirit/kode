import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { FileEntry } from '../renderer/src/types'
import type { AppSettings } from '../main/ipc/settings'

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
  terminal: {
    spawn: (cols: number, rows: number): Promise<string> =>
      ipcRenderer.invoke('terminal:spawn', cols, rows),
    write: (termId: string, data: string): void =>
      ipcRenderer.send('terminal:write', termId, data),
    resize: (termId: string, cols: number, rows: number): void =>
      ipcRenderer.send('terminal:resize', termId, cols, rows),
    kill: (termId: string): void =>
      ipcRenderer.send('terminal:kill', termId),
    onData: (termId: string, cb: (data: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, id: string, data: string) => {
        if (id === termId) cb(data)
      }
      ipcRenderer.on('terminal:data', listener)
      return () => ipcRenderer.removeListener('terminal:data', listener)
    },
    onExit: (termId: string, cb: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, id: string) => {
        if (id === termId) cb()
      }
      ipcRenderer.on('terminal:exit', listener)
      return () => ipcRenderer.removeListener('terminal:exit', listener)
    }
  },
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:get'),
    set: (settings: AppSettings): Promise<void> =>
      ipcRenderer.invoke('settings:set', settings),
    export: (): Promise<{ ok: boolean; reason?: string }> =>
      ipcRenderer.invoke('settings:export'),
    import: (): Promise<{ ok: boolean; settings?: Partial<AppSettings>; reason?: string }> =>
      ipcRenderer.invoke('settings:import')
  },
  ai: {
    sendMessage: (
      messages: Array<{ role: 'user' | 'assistant'; content: string }>,
      systemPrompt?: string
    ): Promise<void> =>
      ipcRenderer.invoke('ai:sendMessage', messages, systemPrompt),
    stop: (): void =>
      ipcRenderer.send('ai:stop'),
    onToken: (cb: (text: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, text: string) => cb(text)
      ipcRenderer.on('ai:token', listener)
      return () => ipcRenderer.removeListener('ai:token', listener)
    },
    onDone: (cb: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent) => cb()
      ipcRenderer.on('ai:done', listener)
      return () => ipcRenderer.removeListener('ai:done', listener)
    },
    onError: (cb: (message: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, message: string) => cb(message)
      ipcRenderer.on('ai:error', listener)
      return () => ipcRenderer.removeListener('ai:error', listener)
    },
    onRateLimit: (cb: (retryAfterMs: number) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, ms: number) => cb(ms)
      ipcRenderer.on('ai:rateLimit', listener)
      return () => ipcRenderer.removeListener('ai:rateLimit', listener)
    },
    onToolCall: (cb: (e: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, e: unknown) => cb(e)
      ipcRenderer.on('ai:toolCall', listener)
      return () => ipcRenderer.removeListener('ai:toolCall', listener)
    },
    onToolResult: (cb: (e: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, e: unknown) => cb(e)
      ipcRenderer.on('ai:toolResult', listener)
      return () => ipcRenderer.removeListener('ai:toolResult', listener)
    },
    onToolApproval: (cb: (e: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, e: unknown) => cb(e)
      ipcRenderer.on('ai:toolApproval', listener)
      return () => ipcRenderer.removeListener('ai:toolApproval', listener)
    },
    approveTool: (callId: string): void =>
      ipcRenderer.send('ai:approveTool', callId),
    denyTool: (callId: string): void =>
      ipcRenderer.send('ai:denyTool', callId),
  },
  git: {
    status: (rootPath: string): Promise<Array<{ path: string; status: string }>> =>
      ipcRenderer.invoke('git:status', rootPath),
    diff: (rootPath: string, filePath?: string, cached?: boolean): Promise<string> =>
      ipcRenderer.invoke('git:diff', rootPath, filePath, cached),
    stage: (rootPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('git:stage', rootPath, filePath),
    commit: (rootPath: string, message: string): Promise<void> =>
      ipcRenderer.invoke('git:commit', rootPath, message)
  },
  setTitle: (title: string): void => ipcRenderer.send('window:setTitle', title),
  mcp: {
    listTools: (): Promise<unknown[]> =>
      ipcRenderer.invoke('mcp:listTools'),
    connect: (config: unknown): Promise<void> =>
      ipcRenderer.invoke('mcp:connect', config),
    disconnect: (id: string): Promise<void> =>
      ipcRenderer.invoke('mcp:disconnect', id),
  },
  claude: {
    loadContext: (rootPath: string): Promise<{ content: string | null }> =>
      ipcRenderer.invoke('claude:loadContext', rootPath),
  },
  plugins: {
    list: (): Promise<unknown[]> =>
      ipcRenderer.invoke('plugin:list'),
    search: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('plugin:search', query),
    install: (id: string): Promise<void> =>
      ipcRenderer.invoke('plugin:install', id),
    uninstall: (id: string): Promise<void> =>
      ipcRenderer.invoke('plugin:uninstall', id),
  },
  chat: {
    getSessions: (): Promise<unknown[]> =>
      ipcRenderer.invoke('chat:getSessions'),
    createSession: (id: string, name: string, provider: string, model: string): Promise<unknown> =>
      ipcRenderer.invoke('chat:createSession', id, name, provider, model),
    updateSession: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke('chat:updateSession', id, name),
    archiveSession: (id: string): Promise<void> =>
      ipcRenderer.invoke('chat:archiveSession', id),
    deleteSession: (id: string): Promise<void> =>
      ipcRenderer.invoke('chat:deleteSession', id),
    getMessages: (sessionId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('chat:getMessages', sessionId),
    addMessage: (id: string, sessionId: string, role: string, content: string, tokens?: number, cost?: number): Promise<unknown> =>
      ipcRenderer.invoke('chat:addMessage', id, sessionId, role, content, tokens, cost),
    search: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('chat:search', query),
    addFileChange: (id: string, sessionId: string, filePath: string, diff: string): Promise<void> =>
      ipcRenderer.invoke('chat:addFileChange', id, sessionId, filePath, diff),
  },
})
