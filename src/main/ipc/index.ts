import { ipcMain } from 'electron'
import {
  readDirHandler,
  readFileHandler,
  writeFileHandler,
  openFolderHandler
} from './fs'
import { registerTerminalHandlers } from './terminal'
import { registerAiHandlers } from './ai'
import { registerSettingsHandlers, loadSettings } from './settings'
import { registerWatcherHandlers } from './watcher'
import { registerGitHandlers } from './git'
import { registerClaudeHandlers } from './claude'
import { registerMcpHandlers } from './mcp'
import { registerPluginHandlers } from './plugins'
import { registerSettingsExportImportHandlers } from './settingsExportImport'
import { registerChatHandlers } from './chat'
import { registerGithubHandlers } from './github'
import { registerDeployHandlers } from './deploy'
import { registerUsageHandlers } from './usage'
import { registerAuthHandlers } from './auth'
import { registerLiveServerHandlers } from './liveserver'
import { registerSchedulerHandlers } from './scheduler'
import { mcpManager } from '../mcp/McpManager'

export function registerIpcHandlers(): void {
  ipcMain.handle('fs:readDir', (_event, dirPath: string) => readDirHandler(dirPath))
  ipcMain.handle('fs:readFile', (_event, filePath: string) => readFileHandler(filePath))
  ipcMain.handle('fs:writeFile', (_event, filePath: string, content: string) =>
    writeFileHandler(filePath, content)
  )
  ipcMain.handle('fs:openFolder', () => openFolderHandler())
  registerTerminalHandlers()
  registerAiHandlers()
  registerSettingsHandlers()
  registerWatcherHandlers()
  registerGitHandlers()
  registerClaudeHandlers()
  registerMcpHandlers()
  registerPluginHandlers()
  registerSettingsExportImportHandlers()
  registerChatHandlers()
  registerGithubHandlers()
  registerDeployHandlers()
  registerUsageHandlers()
  registerAuthHandlers()
  registerLiveServerHandlers()
  registerSchedulerHandlers()

  // Connect any user-configured MCP servers from saved settings
  const savedSettings = loadSettings()
  if (savedSettings.mcpServers?.length) {
    mcpManager.connectAll(savedSettings.mcpServers).catch(e =>
      console.error('[MCP] Failed to connect saved servers:', e)
    )
  }
}
