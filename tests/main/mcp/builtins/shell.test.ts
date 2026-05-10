import { describe, it, expect } from 'vitest'
import { callShellTool } from '../../../../src/main/mcp/builtins/shell'

describe('run_shell', () => {
  it('returns stdout on success', async () => {
    const result = await callShellTool('run_shell', { command: 'echo hello' })
    expect(result.isError).toBe(false)
    const parsed = JSON.parse(result.content)
    expect(parsed.stdout.trim()).toBe('hello')
    expect(parsed.exitCode).toBe(0)
  })

  it('returns isError true on non-zero exit', async () => {
    // Use a command that reliably fails cross-platform
    const result = await callShellTool('run_shell', { command: 'node -e "process.exit(1)"' })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content)
    expect(parsed.exitCode).not.toBe(0)
  })

  it('returns error for unknown tool', async () => {
    const result = await callShellTool('unknown', {})
    expect(result.isError).toBe(true)
  })
})
