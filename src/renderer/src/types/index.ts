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

/** Detect Monaco language identifier from file extension */
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
