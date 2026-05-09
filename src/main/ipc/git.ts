import { ipcMain } from 'electron'
import simpleGit from 'simple-git'

export interface FileStatus {
  path: string
  status: string
}

let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function registerGitHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('git:status', async (_event, rootPath: string): Promise<FileStatus[]> => {
    const git = simpleGit(rootPath)
    const status = await git.status()
    return status.files.map(f => ({
      path: f.path,
      status: (f.working_dir !== ' ' && f.working_dir !== '' ? f.working_dir : f.index) || '?'
    }))
  })

  ipcMain.handle('git:diff', async (_event, rootPath: string, filePath?: string): Promise<string> => {
    const git = simpleGit(rootPath)
    return git.diff(filePath ? ['--', filePath] : [])
  })

  ipcMain.handle('git:stage', async (_event, rootPath: string, filePath: string): Promise<void> => {
    const git = simpleGit(rootPath)
    await git.add(filePath)
  })

  ipcMain.handle('git:commit', async (_event, rootPath: string, message: string): Promise<void> => {
    const git = simpleGit(rootPath)
    await git.commit(message)
  })
}
