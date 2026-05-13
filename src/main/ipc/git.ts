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

  ipcMain.handle('git:diff', async (_event, rootPath: string, filePath?: string, cached?: boolean): Promise<string> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const args = cached ? ['--cached'] : []
      if (filePath) args.push('--', filePath)
      return await git.diff(args)
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

  ipcMain.handle('git:statusFull', async (_event, rootPath: string) => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const status = await git.status()
      return {
        files: status.files.map(f => ({
          path: f.path,
          index: f.index,
          workingDir: f.working_dir,
          staged: f.index !== ' ' && f.index !== '?',
          modified: f.working_dir !== ' ' && f.working_dir !== ''
        })),
        ahead: status.ahead,
        behind: status.behind,
        current: status.current,
        tracking: status.tracking
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:stageAll', async (_event, rootPath: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.add('-A')
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:unstage', async (_event, rootPath: string, filePath: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.raw(['restore', '--staged', filePath])
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:push', async (_event, rootPath: string, remote?: string, branch?: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.push(remote ?? 'origin', branch)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:pull', async (_event, rootPath: string, remote?: string, branch?: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.pull(remote ?? 'origin', branch)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:log', async (_event, rootPath: string, maxCount = 20) => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const log = await git.log({ maxCount })
      return log.all.map(c => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date
      }))
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:branches', async (_event, rootPath: string) => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const b = await git.branch()
      return { all: b.all, current: b.current }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:currentBranch', async (_event, rootPath: string): Promise<string> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const b = await git.branch()
      return b.current
    } catch (e) {
      return 'main'
    }
  })

  ipcMain.handle('git:init', async (_event, rootPath: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      await git.init()
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:addRemote', async (_event, rootPath: string, remoteName: string, remoteUrl: string): Promise<void> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const remotes = await git.getRemotes()
      if (remotes.find(r => r.name === remoteName)) {
        await git.remote(['set-url', remoteName, remoteUrl])
      } else {
        await git.addRemote(remoteName, remoteUrl)
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  })

  ipcMain.handle('git:hasRemote', async (_event, rootPath: string): Promise<boolean> => {
    validateRootPath(rootPath)
    try {
      const git = simpleGit(rootPath)
      const remotes = await git.getRemotes()
      return remotes.length > 0
    } catch {
      return false
    }
  })
}
