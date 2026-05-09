import { ipcMain } from 'electron'
import simpleGit from 'simple-git'

export interface FileStatus {
  path: string
  status: string
}

function validateRootPath(rootPath: unknown): asserts rootPath is string {
  if (typeof rootPath !== 'string' || rootPath.trim() === '') {
    throw new Error('rootPath must be a non-empty string')
  }
}

let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function registerGitHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('git:status', async (_event, rootPath: string): Promise<FileStatus[]> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const status = await git.status()
      return status.files.map(f => ({
        path: f.path,
        status: (f.working_dir !== ' ' && f.working_dir !== '' ? f.working_dir : f.index) || '?'
      }))
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:diff', async (_event, rootPath: string, filePath?: string): Promise<string> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      return git.diff(filePath ? ['--', filePath] : [])
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:stage', async (_event, rootPath: string, filePath: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.add(filePath)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:commit', async (_event, rootPath: string, message: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.commit(message)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })
}
