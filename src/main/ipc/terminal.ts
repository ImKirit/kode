import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'

const terminals = new Map<string, pty.IPty>()

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:spawn', (event, cols: number, rows: number) => {
    const termId = crypto.randomUUID()
    const shell = process.platform === 'win32'
      ? 'powershell.exe'
      : (process.env['SHELL'] ?? '/bin/bash')
    const cwd = process.env['HOME'] ?? process.env['USERPROFILE'] ?? process.cwd()

    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: process.env as Record<string, string>,
      ...(process.platform === 'win32' ? { useConpty: true } : {})
    })

    terminals.set(termId, term)

    const win = BrowserWindow.fromWebContents(event.sender)
    term.onData(data => {
      win?.webContents.send('terminal:data', termId, data)
    })

    return termId
  })

  ipcMain.on('terminal:write', (_event, termId: string, data: string) => {
    terminals.get(termId)?.write(data)
  })

  ipcMain.on('terminal:resize', (_event, termId: string, cols: number, rows: number) => {
    terminals.get(termId)?.resize(cols, rows)
  })

  ipcMain.on('terminal:kill', (_event, termId: string) => {
    terminals.get(termId)?.kill()
    terminals.delete(termId)
  })
}

export function killAllTerminals(): void {
  terminals.forEach(term => term.kill())
  terminals.clear()
}
