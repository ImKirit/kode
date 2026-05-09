import { ipcMain } from 'electron'
import {
  readDirHandler,
  readFileHandler,
  writeFileHandler,
  openFolderHandler
} from './fs'
import { registerTerminalHandlers } from './terminal'
import { registerAiHandlers } from './ai'
import { registerSettingsHandlers } from './settings'
import { registerWatcherHandlers } from './watcher'
import { registerGitHandlers } from './git'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_event, dirPath: string) => readDirHandler(dirPath))
  ipcMain.handle('fs:readFile', (_event, filePath: string) => readFileHandler(filePath))
  ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) =>
    writeFileHandler(filePath, content)
  )
  ipcMain.handle('fs:openFolder', () => openFolderHandler())
  registerTerminalHandlers()
  registerAiHandlers()
  registerSettingsHandlers()
  registerWatcherHandlers()
  registerGitHandlers()
}
