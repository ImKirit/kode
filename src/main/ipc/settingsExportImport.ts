import { ipcMain, dialog } from 'electron'
import { writeFile, readFile } from 'node:fs/promises'
import { loadSettings } from './settings'
import type { AppSettings } from './settings'

export function registerSettingsExportImportHandlers(): void {
  ipcMain.handle('settings:export', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Settings',
      defaultPath: 'kode-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) {
      return { ok: false, reason: 'canceled' }
    }

    const settings = loadSettings()
    // Export non-sensitive fields only (exclude API keys)
    const exportable = {
      activeProvider: settings.activeProvider,
      mcpServers: settings.mcpServers,
      mcpPermission: settings.mcpPermission,
      keybindings: settings.keybindings ?? {}
    }

    await writeFile(result.filePath, JSON.stringify(exportable, null, 2), 'utf-8')
    return { ok: true }
  })

  ipcMain.handle('settings:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, reason: 'canceled' }
    }

    try {
      const raw = await readFile(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return {
        ok: true,
        settings: {
          activeProvider: parsed.activeProvider,
          mcpServers: parsed.mcpServers ?? [],
          mcpPermission: parsed.mcpPermission ?? 'full',
          keybindings: parsed.keybindings ?? {}
        }
      }
    } catch {
      return { ok: false, reason: 'Invalid JSON file' }
    }
  })
}
