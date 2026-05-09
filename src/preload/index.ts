import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
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
  terminal: {
    spawn: (cols: number, rows: number): Promise<string> =>
      ipcRenderer.invoke('terminal:spawn', cols, rows),
    write: (termId: string, data: string): void =>
      ipcRenderer.send('terminal:write', termId, data),
    resize: (termId: string, cols: number, rows: number): void =>
      ipcRenderer.send('terminal:resize', termId, cols, rows),
    kill: (termId: string): void =>
      ipcRenderer.send('terminal:kill', termId),
    onData: (termId: string, cb: (data: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, id: string, data: string) => {
        if (id === termId) cb(data)
      }
      ipcRenderer.on('terminal:data', listener)
      return () => ipcRenderer.removeListener('terminal:data', listener)
    }
  },
  setTitle: (title: string): void => ipcRenderer.send('window:setTitle', title)
})
