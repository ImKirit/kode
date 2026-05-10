import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { McpTool, McpToolResult, McpServerConfig } from './types'
import { FILESYSTEM_SERVER_ID, filesystemTools, callFilesystemTool } from './builtins/filesystem'
import { SHELL_SERVER_ID, shellTools, callShellTool } from './builtins/shell'

interface ConnectedServer {
  config: McpServerConfig
  client: Client
  tools: McpTool[]
}

export class McpManager {
  private servers = new Map<string, ConnectedServer>()

  async connect(config: McpServerConfig): Promise<void> {
    // HTTP servers are handled by Anthropic API server-side — skip local connection
    if (config.type === 'http') return

    if (this.servers.has(config.id)) {
      await this.disconnect(config.id)
    }

    const transport = new StdioClientTransport({
      command: config.command!,
      args: config.args ?? [],
      env: config.env
        ? ({ ...process.env, ...config.env } as Record<string, string>)
        : undefined
    })

    const client = new Client({ name: 'kode', version: '1.0.0' }, { capabilities: {} })
    await client.connect(transport)

    const { tools: rawTools } = await client.listTools()
    const tools: McpTool[] = rawTools.map(t => ({
      serverId: config.id,
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema as McpTool['inputSchema']) ?? { type: 'object' }
    }))

    this.servers.set(config.id, { config, client, tools })
  }

  async disconnect(id: string): Promise<void> {
    const server = this.servers.get(id)
    if (!server) return
    try {
      await server.client.close()
    } catch {
      // ignore close errors
    }
    this.servers.delete(id)
  }

  async connectAll(configs: McpServerConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        await this.connect(config)
      } catch (e) {
        console.error(`[McpManager] Failed to connect ${config.id}:`, e)
      }
    }
  }

  listTools(): McpTool[] {
    const sdkTools = Array.from(this.servers.values()).flatMap(s => s.tools)
    return [...filesystemTools, ...shellTools, ...sdkTools]
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<McpToolResult> {
    if (serverId === FILESYSTEM_SERVER_ID) {
      return callFilesystemTool(toolName, args)
    }
    if (serverId === SHELL_SERVER_ID) {
      return callShellTool(toolName, args)
    }

    const server = this.servers.get(serverId)
    if (!server) {
      return { content: `Unknown server: ${serverId}`, isError: true }
    }

    try {
      const result = await server.client.callTool({ name: toolName, arguments: args })
      const content = (result.content as Array<{ type: string; text?: string }>)
        .map(c => (c.type === 'text' ? c.text ?? '' : ''))
        .join('\n')
      return { content, isError: result.isError === true }
    } catch (e) {
      return { content: String(e), isError: true }
    }
  }
}

export const mcpManager = new McpManager()
