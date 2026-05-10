import { exec } from 'node:child_process'
import type { McpTool, McpToolResult } from '../types'

export const SHELL_SERVER_ID = '__builtin_shell'

export const shellTools: McpTool[] = [
  {
    serverId: SHELL_SERVER_ID,
    name: 'run_shell',
    description: 'Run a shell command and return stdout and stderr',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' }
      },
      required: ['command']
    }
  }
]

const TIMEOUT_MS = 30_000

export async function callShellTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  if (name !== 'run_shell') {
    return { content: `Unknown tool: ${name}`, isError: true }
  }

  const command = args.command as string
  const cwd = (args.cwd as string | undefined) ?? undefined

  return new Promise(resolve => {
    exec(command, { cwd, timeout: TIMEOUT_MS }, (error, stdout, stderr) => {
      const exitCode = (error as NodeJS.ErrnoException | null)?.code ?? 0
      const killed = (error as NodeJS.ErrnoException & { killed?: boolean } | null)?.killed ?? false
      if (killed) {
        resolve({
          content: JSON.stringify({ stdout: '', stderr: 'Command timed out', exitCode: -1 }),
          isError: true
        })
        return
      }
      const numericExit = typeof exitCode === 'number' ? exitCode : (exitCode ? 1 : 0)
      resolve({
        content: JSON.stringify({ stdout, stderr, exitCode: numericExit }),
        isError: numericExit !== 0
      })
    })
  })
}
