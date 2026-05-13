import { ipcMain, app } from 'electron'
import { join } from 'node:path'
import { PluginLoader } from '../plugins/PluginLoader'

let loader: PluginLoader | null = null
let registered = false

function getLoader(): PluginLoader {
  if (!loader) {
    const pluginsDir = join(app.getPath('home'), '.kode', 'plugins')
    loader = new PluginLoader(pluginsDir)
  }
  return loader
}

export function _resetRegistered(): void {
  registered = false
  loader = null
}

export function registerPluginHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('plugin:list', () => getLoader().list())
  ipcMain.handle('plugin:search', (_event, query: string) => getLoader().search(query))
  ipcMain.handle('plugin:install', (_event, id: string) => getLoader().install(id))
  ipcMain.handle('plugin:uninstall', (_event, id: string) => getLoader().uninstall(id))
}
