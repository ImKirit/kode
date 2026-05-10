import { ipcMain } from 'electron'
import { mcpManager } from '../mcp/McpManager'
import type { McpServerConfig } from '../mcp/types'

export function registerMcpHandlers(): void {
  ipcMain.handle('mcp:listTools', () => mcpManager.listTools())
  ipcMain.handle('mcp:connect', (_event, config: McpServerConfig) => mcpManager.connect(config))
  ipcMain.handle('mcp:disconnect', (_event, id: string) => mcpManager.disconnect(id))
}
