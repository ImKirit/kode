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

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  json: 'json', md: 'markdown',
  html: 'html', css: 'css',
  scss: 'scss', less: 'less',
  py: 'python', rs: 'rust',
  go: 'go', java: 'java',
  cpp: 'cpp', c: 'c',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  ps1: 'powershell', bat: 'bat', cmd: 'bat',
  yaml: 'yaml', yml: 'yaml',
  toml: 'ini', ini: 'ini',
  xml: 'xml', svg: 'xml',
  sql: 'sql',
  rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin'
}

/** Detect Monaco language identifier from file extension */
export function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_MAP[ext] ?? 'plaintext'
}
