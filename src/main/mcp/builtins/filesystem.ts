import { promises as fsp } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import type { McpTool, McpToolResult } from '../types'

export const FILESYSTEM_SERVER_ID = '__builtin_filesystem'

export const filesystemTools: McpTool[] = [
  {
    serverId: FILESYSTEM_SERVER_ID,
    name: 'read_file',
    description: 'Read the full content of a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    serverId: FILESYSTEM_SERVER_ID,
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
  },
  {
    serverId: FILESYSTEM_SERVER_ID,
    name: 'list_directory',
    description: 'List files in a directory',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    serverId: FILESYSTEM_SERVER_ID,
    name: 'search_files',
    description: 'Search files by glob pattern',
    inputSchema: { type: 'object', properties: { rootPath: { type: 'string' }, pattern: { type: 'string' } }, required: ['rootPath', 'pattern'] }
  }
]

function requireAbsolute(path: string): string | null {
  if (!isAbsolute(path)) return 'Path must be absolute'
  return null
}

async function globWalk(dir: string, pattern: string): Promise<string[]> {
  // Convert glob pattern to regex: ** = any path segments, * = any filename chars
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DSTAR___/g, '.*')
  const regex = new RegExp('^' + regexStr + '$')

  const results: string[] = []

  async function walk(current: string, relative: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof fsp.readdir>>
    try {
      entries = await fsp.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(join(current, entry.name), rel)
      } else if (regex.test(rel)) {
        results.push(rel)
      }
    }
  }

  await walk(dir, '')
  return results
}

export async function callFilesystemTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  try {
    if (name === 'read_file') {
      const path = args.path as string
      const err = requireAbsolute(path)
      if (err) return { content: err, isError: true }
      const content = await fsp.readFile(path, 'utf-8')
      return { content, isError: false }
    }

    if (name === 'write_file') {
      const path = args.path as string
      const content = args.content as string
      const err = requireAbsolute(path)
      if (err) return { content: err, isError: true }
      await fsp.writeFile(path, content, 'utf-8')
      return { content: 'Written successfully', isError: false }
    }

    if (name === 'list_directory') {
      const path = args.path as string
      const err = requireAbsolute(path)
      if (err) return { content: err, isError: true }
      const entries = await fsp.readdir(path, { withFileTypes: true })
      const lines = entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name))
      return { content: lines.join('\n'), isError: false }
    }

    if (name === 'search_files') {
      const rootPath = args.rootPath as string
      const pattern = args.pattern as string
      const errR = requireAbsolute(rootPath)
      if (errR) return { content: errR, isError: true }
      const matches = await globWalk(rootPath, pattern)
      return { content: matches.join('\n'), isError: false }
    }

    return { content: `Unknown tool: ${name}`, isError: true }
  } catch (e) {
    return { content: String(e), isError: true }
  }
}
