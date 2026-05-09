import type { FileEntry } from '.'

export interface ProviderConfig {
  apiKey: string
  model: string
}

export interface AppSettings {
  activeProvider: 'anthropic' | 'openai'
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
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
      }
      ai: {
        sendMessage(
          messages: Array<{ role: 'user' | 'assistant'; content: string }>
        ): Promise<void>
        stop(): void
        onToken(cb: (text: string) => void): () => void
        onDone(cb: () => void): () => void
        onError(cb: (message: string) => void): () => void
        onRateLimit(cb: (retryAfterMs: number) => void): () => void
      }
      setTitle(title: string): void
    }
  }
}
