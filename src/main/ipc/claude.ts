import { ipcMain } from 'electron'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'

export async function loadClaudeContext(rootPath: string): Promise<{ content: string | null }> {
  if (!rootPath || typeof rootPath !== 'string') return { content: null }
  try {
    const claudeMdPath = join(rootPath, '.claude', 'CLAUDE.md')
    const content = await fsp.readFile(claudeMdPath, 'utf-8')
    return { content }
  } catch {
    return { content: null }
  }
}

let registered = false

export function registerClaudeHandlers(): void {
  if (registered) return
  registered = true
  ipcMain.handle('claude:loadContext', (_event, rootPath: string) => loadClaudeContext(rootPath))
}

export function _resetRegistered(): void {
  registered = false
}
