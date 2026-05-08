import { contextBridge, ipcRenderer } from 'electron'
import type { FileEntry } from '../renderer/src/types'

contextBridge.exposeInMainWorld('kode', {
  platform: process.platform,
  fs: {
    readDir: (dirPath: string): Promise<FileEntry[]> =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    openFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('fs:openFolder')
  },
  setTitle: (title: string): void => ipcRenderer.send('window:setTitle', title)
})
