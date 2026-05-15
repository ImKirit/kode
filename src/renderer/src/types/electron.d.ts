import type { FileEntry } from '.'

export type ProviderId = 'anthropic' | 'openai' | 'kode' | 'copilot'

export interface FileStatus {
  path: string
  status: string
}

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface McpServerConfig {
  id: string
  name: string
  type: 'stdio' | 'http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface McpTool {
  serverId: string
  name: string
  description: string
  inputSchema: { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
}

export interface ToolCallEvent {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
}

export interface ToolResultEvent {
  callId: string
  result: string
  isError: boolean
}

export interface ToolApprovalRequest {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
}

export interface ChatSession {
  id: string
  name: string
  provider: string
  model: string
  created_at: number
  updated_at: number
  archived: number
}

export interface ChatMessage {
  id: string
  session_id: string
  role: string
  content: string
  tokens: number | null
  cost: number | null
  created_at: number
}

export interface SearchResult {
  session: ChatSession
  snippet: string
}

export interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  installed: boolean
}

export interface PluginSearchResult {
  id: string
  name: string
  description: string
  version: string
  downloads?: number
}

export interface AppSettings {
  activeProvider: ProviderId
  providers: Record<ProviderId, ProviderConfig>
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  keybindings?: Record<string, string>
  editor?: {
    fontSize: number
    tabSize: number
    wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
    minimap: boolean
    lineNumbers: 'on' | 'off' | 'relative'
    formatOnSave: boolean
  }
}

declare global {
  interface Window {
    kode: {
      platform: string
      fs: {
        readDir(dirPath: string): Promise<FileEntry[]>
        readFile(filePath: string): Promise<string>
        writeFile(filePath: string, content: string): Promise<void>
        openFolder(): Promise<string | null>
        watchRoot(rootPath: string): Promise<void>
        unwatchRoot(): void
        onFileChange(cb: (filePath: string, content: string) => void): () => void
      }
      terminal: {
        spawn(cols: number, rows: number, cwd?: string): Promise<string>
        write(termId: string, data: string): void
        resize(termId: string, cols: number, rows: number): void
        kill(termId: string): void
        onData(termId: string, cb: (data: string) => void): () => void
        onExit(termId: string, cb: () => void): () => void
      }
      settings: {
        get(): Promise<AppSettings>
        set(settings: AppSettings): Promise<void>
        export(): Promise<{ ok: boolean; reason?: string }>
        import(): Promise<{ ok: boolean; settings?: Partial<AppSettings>; reason?: string }>
      }
      ai: {
        sendMessage(
          messages: Array<{ role: 'user' | 'assistant'; content: string }>,
          systemPrompt?: string
        ): Promise<void>
        stop(): void
        onToken(cb: (text: string) => void): () => void
        onDone(cb: () => void): () => void
        onError(cb: (message: string) => void): () => void
        onRateLimit(cb: (retryAfterMs: number) => void): () => void
        onToolCall(cb: (e: ToolCallEvent) => void): () => void
        onToolResult(cb: (e: ToolResultEvent) => void): () => void
        onToolApproval(cb: (e: ToolApprovalRequest) => void): () => void
        onUsage(cb: (e: { inputTokens: number; outputTokens: number }) => void): () => void
        approveTool(callId: string): void
        denyTool(callId: string): void
      }
      git: {
        status(rootPath: string): Promise<FileStatus[]>
        statusFull(rootPath: string): Promise<{
          files: Array<{ path: string; index: string; workingDir: string; staged: boolean; modified: boolean }>
          ahead: number; behind: number; current: string | null; tracking: string | null
        }>
        diff(rootPath: string, filePath?: string, cached?: boolean): Promise<string>
        stage(rootPath: string, filePath: string): Promise<void>
        stageAll(rootPath: string): Promise<void>
        unstage(rootPath: string, filePath: string): Promise<void>
        commit(rootPath: string, message: string): Promise<void>
        push(rootPath: string, remote?: string, branch?: string): Promise<void>
        pull(rootPath: string, remote?: string, branch?: string): Promise<void>
        log(rootPath: string, maxCount?: number): Promise<Array<{ hash: string; message: string; author: string; date: string }>>
        branches(rootPath: string): Promise<{ all: string[]; current: string }>
        currentBranch(rootPath: string): Promise<string>
        init(rootPath: string): Promise<void>
        addRemote(rootPath: string, remoteName: string, remoteUrl: string): Promise<void>
        hasRemote(rootPath: string): Promise<boolean>
      }
      github: {
        hasToken(): Promise<boolean>
        setToken(token: string): Promise<void>
        clearToken(): Promise<void>
        validateToken(token: string): Promise<{ valid: boolean; user?: { login: string; name: string | null; avatarUrl: string; publicRepos: number }; error?: string }>
        getUser(): Promise<{ login: string; name: string | null; avatarUrl: string; publicRepos: number } | null>
        listRepos(): Promise<Array<{ id: number; name: string; fullName: string; private: boolean; cloneUrl: string; htmlUrl: string; description: string | null; updatedAt: string }>>
        createRepo(opts: { name: string; description: string; private: boolean; autoInit: boolean; gitignoreTemplate: string | null; license: string | null }): Promise<{ id: number; name: string; fullName: string; private: boolean; cloneUrl: string; htmlUrl: string; description: string | null; updatedAt: string }>
        getGitignoreTemplates(): Promise<string[]>
        getLinkedRepo(folderPath: string): Promise<{ owner: string; repo: string; fullName: string; cloneUrl: string; private: boolean } | null>
        setLinkedRepo(folderPath: string, repo: { owner: string; repo: string; fullName: string; cloneUrl: string; private: boolean }): Promise<void>
        unlinkRepo(folderPath: string): Promise<void>
        startDeviceFlow(): Promise<{ deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number } | { error: string }>
        pollDeviceToken(deviceCode: string): Promise<{ ok: boolean; token?: string; error?: string }>
        openDevicePage(uri: string): Promise<void>
      }
      deploy: {
        getConfig(): Promise<{ ip: string; user: string; keyPath: string; workDir: string } | null>
        setConfig(config: { ip: string; user: string; keyPath: string; workDir: string }): Promise<void>
        testConnection(): Promise<{ ok: boolean; error?: string; info?: string }>
        setup(): Promise<{ ok: boolean; output?: string; error?: string }>
        execute(command: string): Promise<{ ok: boolean; output?: string; error?: string }>
      }
      usage: {
        add(count: number): Promise<void>
        getStats(): Promise<{ today: number; week: number; allTime: number; byDay: Record<string, number> }>
      }
      auth: {
        getSession(): Promise<{ token: string; email: string; name?: string; plan?: string } | null>
        login(email: string, password: string): Promise<{ ok: boolean; error?: string; email?: string; name?: string; plan?: string }>
        signup(email: string, password: string): Promise<{ ok: boolean; error?: string; email?: string; name?: string; plan?: string }>
        logout(): Promise<void>
        getToken(): Promise<string | null>
      }
      liveServer: {
        start(rootPath: string, port?: number): Promise<{ ok: boolean; port?: number; error?: string }>
        stop(): Promise<void>
        status(): Promise<{ running: boolean; port?: number; rootPath?: string }>
        openInBrowser(): Promise<void>
        onReload(cb: () => void): () => void
      }
      scheduler: {
        add(id: string, prompt: string, triggerAt: number): Promise<void>
        cancel(id: string): Promise<void>
        list(): Promise<Array<{ id: string; prompt: string; triggerAt: number }>>
        onFire(cb: (prompt: string) => void): () => void
      }
      shell: {
        openExternal(url: string): Promise<void>
      }
      setTitle(title: string): void
      mcp: {
        listTools(): Promise<McpTool[]>
        connect(config: McpServerConfig): Promise<void>
        disconnect(id: string): Promise<void>
      }
      claude: {
        loadContext(rootPath: string): Promise<{ content: string | null }>
      }
      plugins: {
        list(): Promise<PluginMeta[]>
        search(query: string): Promise<PluginSearchResult[]>
        install(id: string): Promise<void>
        uninstall(id: string): Promise<void>
      }
      chat: {
        getSessions(): Promise<ChatSession[]>
        createSession(id: string, name: string, provider: string, model: string): Promise<ChatSession>
        updateSession(id: string, name: string): Promise<void>
        archiveSession(id: string): Promise<void>
        deleteSession(id: string): Promise<void>
        getMessages(sessionId: string): Promise<ChatMessage[]>
        addMessage(id: string, sessionId: string, role: string, content: string, tokens?: number, cost?: number): Promise<ChatMessage>
        search(query: string): Promise<SearchResult[]>
        addFileChange(id: string, sessionId: string, filePath: string, diff: string): Promise<void>
      }
    }
  }
}
