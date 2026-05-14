import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'

const terminals = new Map<string, pty.IPty>()

// Issue 1: idempotency guard — ipcMain.handle throws if called twice for the same channel
let registered = false

/** Reset registration state. Intended for use in tests only. */
export function _resetRegistered(): void {
  registered = false
}

export function registerTerminalHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('terminal:spawn', (event, cols: number, rows: number, requestedCwd?: string) => {
    const termId = crypto.randomUUID()
    const shell = process.platform === 'win32'
      ? 'powershell.exe'
      : (process.env['SHELL'] ?? '/bin/bash')
    const fallback = process.env['HOME'] ?? process.env['USERPROFILE'] ?? process.cwd()
    const cwd = requestedCwd ?? fallback

    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: process.env as Record<string, string>,
      ...(process.platform === 'win32' ? { useConpty: true } : {})
    })

    terminals.set(termId, term)

    // Issue 3: look up the window dynamically so we never hold a stale reference
    term.onData(data => {
      const target = BrowserWindow.fromWebContents(event.sender)
      if (target && !target.isDestroyed()) {
        target.webContents.send('terminal:data', termId, data)
      }
    })

    // Issue 2: clean up the Map and notify the renderer when the shell exits on its own
    term.onExit(() => {
      terminals.delete(termId)
      const target = BrowserWindow.fromWebContents(event.sender)
      if (target && !target.isDestroyed()) {
        target.webContents.send('terminal:exit', termId)
      }
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
