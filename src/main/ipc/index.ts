import { ipcMain } from 'electron'
import {
  readDirHandler,
  readFileHandler,
  writeFileHandler,
  openFolderHandler
} from './fs'
import { registerTerminalHandlers } from './terminal'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_event, dirPath: string) => readDirHandler(dirPath))
  ipcMain.handle('fs:readFile', (_event, filePath: string) => readFileHandler(filePath))
  ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) =>
    writeFileHandler(filePath, content)
  )
  ipcMain.handle('fs:openFolder', () => openFolderHandler())
  registerTerminalHandlers()
}
