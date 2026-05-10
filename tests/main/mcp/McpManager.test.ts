import { describe, it, expect, beforeEach } from 'vitest'
import { McpManager } from '../../../src/main/mcp/McpManager'

describe('McpManager', () => {
  let manager: McpManager

  beforeEach(() => {
    manager = new McpManager()
  })

  describe('listTools', () => {
    it('includes built-in filesystem tools', () => {
      const tools = manager.listTools()
      const names = tools.map(t => t.name)
      expect(names).toContain('read_file')
      expect(names).toContain('write_file')
      expect(names).toContain('list_directory')
      expect(names).toContain('search_files')
    })

    it('includes built-in shell tools', () => {
      const tools = manager.listTools()
      const names = tools.map(t => t.name)
      expect(names).toContain('run_shell')
    })

    it('has serverId on each tool', () => {
      const tools = manager.listTools()
      for (const tool of tools) {
        expect(tool.serverId).toBeTruthy()
      }
    })
  })

  describe('callTool', () => {
    it('routes run_shell to shell built-in', async () => {
      const result = await manager.callTool('__builtin_shell', 'run_shell', { command: 'echo test' })
      expect(result.isError).toBe(false)
      const parsed = JSON.parse(result.content)
      expect(parsed.stdout.trim()).toBe('test')
    })

    it('returns error for unknown server', async () => {
      const result = await manager.callTool('unknown_server', 'any_tool', {})
      expect(result.isError).toBe(true)
      expect(result.content).toMatch(/unknown server/i)
    })
  })

  describe('http servers are skipped', () => {
    it('does not connect http servers', async () => {
      await manager.connect({
        id: 'test-http',
        name: 'Test HTTP',
        type: 'http',
        url: 'http://localhost:9999/sse'
      })
      const tools = manager.listTools()
      const serverIds = new Set(tools.map(t => t.serverId))
      expect(serverIds.has('test-http')).toBe(false)
    })
  })

  describe('connectAll', () => {
    it('skips http servers without error', async () => {
      await expect(
        manager.connectAll([
          { id: 'h1', name: 'HTTP1', type: 'http', url: 'http://localhost:9998/sse' }
        ])
      ).resolves.not.toThrow()
    })
  })
})
