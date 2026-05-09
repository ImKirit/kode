import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { FileEntry } from '../renderer/src/types'
import type { AppSettings } from '../main/ipc/settings'

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
    },
    onExit: (termId: string, cb: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, id: string) => {
        if (id === termId) cb()
      }
      ipcRenderer.on('terminal:exit', listener)
      return () => ipcRenderer.removeListener('terminal:exit', listener)
    }
  },
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:get'),
    set: (settings: AppSettings): Promise<void> =>
      ipcRenderer.invoke('settings:set', settings)
  },
  ai: {
    sendMessage: (
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<void> =>
      ipcRenderer.invoke('ai:sendMessage', messages),
    stop: (): void =>
      ipcRenderer.send('ai:stop'),
    onToken: (cb: (text: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, text: string) => cb(text)
      ipcRenderer.on('ai:token', listener)
      return () => ipcRenderer.removeListener('ai:token', listener)
    },
    onDone: (cb: () => void): (() => void) => {
      const listener = (_event: IpcRendererEvent) => cb()
      ipcRenderer.on('ai:done', listener)
      return () => ipcRenderer.removeListener('ai:done', listener)
    },
    onError: (cb: (message: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, message: string) => cb(message)
      ipcRenderer.on('ai:error', listener)
      return () => ipcRenderer.removeListener('ai:error', listener)
    }
  },
  setTitle: (title: string): void => ipcRenderer.send('window:setTitle', title)
})
