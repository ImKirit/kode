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
    spawn: (cols: number, rows: number, cwd?: string): Promise<string> =>
      ipcRenderer.invoke('terminal:spawn', cols, rows, cwd),
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
    onUsage: (cb: (e: { inputTokens: number; outputTokens: number }) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, e: { inputTokens: number; outputTokens: number }) => cb(e)
      ipcRenderer.on('ai:usage', listener)
      return () => ipcRenderer.removeListener('ai:usage', listener)
    },
    approveTool: (callId: string): void =>
      ipcRenderer.send('ai:approveTool', callId),
    denyTool: (callId: string): void =>
      ipcRenderer.send('ai:denyTool', callId),
  },
  git: {
    status: (rootPath: string): Promise<Array<{ path: string; status: string }>> =>
      ipcRenderer.invoke('git:status', rootPath),
    statusFull: (rootPath: string): Promise<{
      files: Array<{ path: string; index: string; workingDir: string; staged: boolean; modified: boolean }>
      ahead: number; behind: number; current: string | null; tracking: string | null
    }> => ipcRenderer.invoke('git:statusFull', rootPath),
    diff: (rootPath: string, filePath?: string, cached?: boolean): Promise<string> =>
      ipcRenderer.invoke('git:diff', rootPath, filePath, cached),
    stage: (rootPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('git:stage', rootPath, filePath),
    stageAll: (rootPath: string): Promise<void> =>
      ipcRenderer.invoke('git:stageAll', rootPath),
    unstage: (rootPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('git:unstage', rootPath, filePath),
    commit: (rootPath: string, message: string): Promise<void> =>
      ipcRenderer.invoke('git:commit', rootPath, message),
    push: (rootPath: string, remote?: string, branch?: string): Promise<void> =>
      ipcRenderer.invoke('git:push', rootPath, remote, branch),
    pull: (rootPath: string, remote?: string, branch?: string): Promise<void> =>
      ipcRenderer.invoke('git:pull', rootPath, remote, branch),
    log: (rootPath: string, maxCount?: number): Promise<Array<{ hash: string; message: string; author: string; date: string }>> =>
      ipcRenderer.invoke('git:log', rootPath, maxCount),
    branches: (rootPath: string): Promise<{ all: string[]; current: string }> =>
      ipcRenderer.invoke('git:branches', rootPath),
    currentBranch: (rootPath: string): Promise<string> =>
      ipcRenderer.invoke('git:currentBranch', rootPath),
    init: (rootPath: string): Promise<void> =>
      ipcRenderer.invoke('git:init', rootPath),
    addRemote: (rootPath: string, remoteName: string, remoteUrl: string): Promise<void> =>
      ipcRenderer.invoke('git:addRemote', rootPath, remoteName, remoteUrl),
    hasRemote: (rootPath: string): Promise<boolean> =>
      ipcRenderer.invoke('git:hasRemote', rootPath),
  },
  github: {
    hasToken: (): Promise<boolean> =>
      ipcRenderer.invoke('github:hasToken'),
    setToken: (token: string): Promise<void> =>
      ipcRenderer.invoke('github:setToken', token),
    clearToken: (): Promise<void> =>
      ipcRenderer.invoke('github:clearToken'),
    validateToken: (token: string): Promise<{ valid: boolean; user?: { login: string; name: string | null; avatarUrl: string; publicRepos: number }; error?: string }> =>
      ipcRenderer.invoke('github:validateToken', token),
    getUser: (): Promise<{ login: string; name: string | null; avatarUrl: string; publicRepos: number } | null> =>
      ipcRenderer.invoke('github:getUser'),
    listRepos: (): Promise<Array<{ id: number; name: string; fullName: string; private: boolean; cloneUrl: string; htmlUrl: string; description: string | null; updatedAt: string }>> =>
      ipcRenderer.invoke('github:listRepos'),
    createRepo: (opts: { name: string; description: string; private: boolean; autoInit: boolean; gitignoreTemplate: string | null; license: string | null }) =>
      ipcRenderer.invoke('github:createRepo', opts),
    getGitignoreTemplates: (): Promise<string[]> =>
      ipcRenderer.invoke('github:getGitignoreTemplates'),
    getLinkedRepo: (folderPath: string): Promise<{ owner: string; repo: string; fullName: string; cloneUrl: string; private: boolean } | null> =>
      ipcRenderer.invoke('github:getLinkedRepo', folderPath),
    setLinkedRepo: (folderPath: string, repo: { owner: string; repo: string; fullName: string; cloneUrl: string; private: boolean }): Promise<void> =>
      ipcRenderer.invoke('github:setLinkedRepo', folderPath, repo),
    unlinkRepo: (folderPath: string): Promise<void> =>
      ipcRenderer.invoke('github:unlinkRepo', folderPath),
    startDeviceFlow: (): Promise<{ deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number } | { error: string }> =>
      ipcRenderer.invoke('github:startDeviceFlow'),
    pollDeviceToken: (deviceCode: string): Promise<{ ok: boolean; token?: string; error?: string }> =>
      ipcRenderer.invoke('github:pollDeviceToken', deviceCode),
    openDevicePage: (uri: string): Promise<void> =>
      ipcRenderer.invoke('github:openDevicePage', uri),
  },
  liveServer: {
    start: (rootPath: string, port?: number): Promise<{ ok: boolean; port?: number; error?: string }> =>
      ipcRenderer.invoke('liveserver:start', rootPath, port),
    stop: (): Promise<void> =>
      ipcRenderer.invoke('liveserver:stop'),
    status: (): Promise<{ running: boolean; port?: number; rootPath?: string }> =>
      ipcRenderer.invoke('liveserver:status'),
    onReload: (cb: () => void): (() => void) => {
      const listener = () => cb()
      ipcRenderer.on('liveserver:reload', listener)
      return () => ipcRenderer.removeListener('liveserver:reload', listener)
    }
  },
  scheduler: {
    add: (id: string, prompt: string, triggerAt: number): Promise<void> =>
      ipcRenderer.invoke('scheduler:add', id, prompt, triggerAt),
    cancel: (id: string): Promise<void> =>
      ipcRenderer.invoke('scheduler:cancel', id),
    list: (): Promise<Array<{ id: string; prompt: string; triggerAt: number }>> =>
      ipcRenderer.invoke('scheduler:list'),
    onFire: (cb: (prompt: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, prompt: string) => cb(prompt)
      ipcRenderer.on('scheduler:fire', listener)
      return () => ipcRenderer.removeListener('scheduler:fire', listener)
    }
  },
  deploy: {
    getConfig: (): Promise<{ ip: string; user: string; keyPath: string; workDir: string } | null> =>
      ipcRenderer.invoke('deploy:getConfig'),
    setConfig: (config: { ip: string; user: string; keyPath: string; workDir: string }): Promise<void> =>
      ipcRenderer.invoke('deploy:setConfig', config),
    testConnection: (): Promise<{ ok: boolean; error?: string; info?: string }> =>
      ipcRenderer.invoke('deploy:testConnection'),
    setup: (): Promise<{ ok: boolean; output?: string; error?: string }> =>
      ipcRenderer.invoke('deploy:setup'),
    execute: (command: string): Promise<{ ok: boolean; output?: string; error?: string }> =>
      ipcRenderer.invoke('deploy:execute', command),
  },
  usage: {
    add: (count: number): Promise<void> =>
      ipcRenderer.invoke('usage:add', count),
    getStats: (): Promise<{ today: number; week: number; allTime: number; byDay: Record<string, number> }> =>
      ipcRenderer.invoke('usage:getStats'),
  },
  auth: {
    getSession: (): Promise<{ token: string; email: string; name?: string; plan?: string } | null> =>
      ipcRenderer.invoke('auth:getSession'),
    login: (email: string, password: string): Promise<{ ok: boolean; error?: string; email?: string; name?: string; plan?: string }> =>
      ipcRenderer.invoke('auth:login', email, password),
    signup: (email: string, password: string): Promise<{ ok: boolean; error?: string; email?: string; name?: string; plan?: string }> =>
      ipcRenderer.invoke('auth:signup', email, password),
    logout: (): Promise<void> =>
      ipcRenderer.invoke('auth:logout'),
    getToken: (): Promise<string | null> =>
      ipcRenderer.invoke('auth:getToken'),
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
