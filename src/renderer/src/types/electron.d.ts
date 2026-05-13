import type { FileEntry } from '.'

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
  activeProvider: 'anthropic' | 'openai'
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
  }
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  keybindings?: Record<string, string>
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
        spawn(cols: number, rows: number): Promise<string>
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
        approveTool(callId: string): void
        denyTool(callId: string): void
      }
      git: {
        status(rootPath: string): Promise<FileStatus[]>
        diff(rootPath: string, filePath?: string, cached?: boolean): Promise<string>
        stage(rootPath: string, filePath: string): Promise<void>
        commit(rootPath: string, message: string): Promise<void>
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
    }
  }
}
