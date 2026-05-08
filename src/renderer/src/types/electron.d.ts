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
