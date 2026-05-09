import { ipcMain, BrowserWindow } from 'electron'
import chokidar, { FSWatcher } from 'chokidar'
import { promises as fs } from 'fs'

let watcher: FSWatcher | null = null
let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function stopWatcher(): void {
  watcher?.close()
  watcher = null
}

export function registerWatcherHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('fs:watchRoot', async (event, rootPath: string) => {
    watcher?.close()
    watcher = null

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (channel: string, ...args: unknown[]): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    }

    watcher = chokidar.watch(rootPath, {
      ignored: /(^|[/\\])(\.|node_modules)/,
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('change', async (filePath: string) => {
      const normalized = filePath.replace(/\\/g, '/')
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        send('fs:fileChange', normalized, content)
      } catch {
        // file deleted or binary — ignore
      }
    })
  })

  ipcMain.on('fs:unwatchRoot', () => {
    watcher?.close()
    watcher = null
  })
}
