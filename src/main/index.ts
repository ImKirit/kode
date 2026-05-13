import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { killAllTerminals } from './ipc/terminal'
import { stopWatcher } from './ipc/watcher'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(__dirname, '../../resources/icon.ico')

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f3f3f3',
    icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow = win

  win.on('closed', () => { mainWindow = null })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerIpcHandlers()

  // Register once — uses mainWindow reference, not captured win
  ipcMain.on('window:setTitle', (_event, title: string) => {
    mainWindow?.setTitle(title)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  killAllTerminals()
  stopWatcher()
})
