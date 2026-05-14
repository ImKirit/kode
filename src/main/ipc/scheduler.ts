import { ipcMain, BrowserWindow } from 'electron'

interface ScheduledMessage {
  id: string
  prompt: string
  triggerAt: number
  timer: ReturnType<typeof setTimeout>
}

const scheduled = new Map<string, ScheduledMessage>()
let registered = false

function fire(id: string, prompt: string): void {
  scheduled.delete(id)
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('scheduler:fire', prompt)
  }
}

export function _resetSchedulerRegistered(): void {
  registered = false
  for (const msg of scheduled.values()) clearTimeout(msg.timer)
  scheduled.clear()
}

export function registerSchedulerHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('scheduler:add', (_event, id: string, prompt: string, triggerAt: number): void => {
    if (scheduled.has(id)) {
      clearTimeout(scheduled.get(id)!.timer)
    }
    const delay = Math.max(0, triggerAt - Date.now())
    const timer = setTimeout(() => fire(id, prompt), delay)
    scheduled.set(id, { id, prompt, triggerAt, timer })
  })

  ipcMain.handle('scheduler:cancel', (_event, id: string): void => {
    const msg = scheduled.get(id)
    if (msg) {
      clearTimeout(msg.timer)
      scheduled.delete(id)
    }
  })

  ipcMain.handle('scheduler:list', (): Array<{ id: string; prompt: string; triggerAt: number }> => {
    return Array.from(scheduled.values()).map(({ id, prompt, triggerAt }) => ({ id, prompt, triggerAt }))
  })
}
