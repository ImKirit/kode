# M9: MCP + .claude Folder Loader — Design Spec

**Date:** 2026-05-10
**Status:** Approved

---

## Goal

Add Model Context Protocol (MCP) support to Kode's AI chat and load `.claude/CLAUDE.md` from the open project as a system prompt. The AI can call tools exposed by MCP servers during conversations. Kode ships two built-in servers (filesystem and shell) and lets users configure additional servers globally in Settings.

---

## User-Facing Features

1. **CLAUDE.md system prompt** — When a project is open and contains `.claude/CLAUDE.md`, that file's content is automatically prepended as the system prompt for every AI conversation. The AI panel shows a `CLAUDE.md` badge when active.

2. **Built-in MCP tools** — Available out of the box, no configuration required:
   - `read_file` — read a file's content
   - `write_file` — write content to a file
   - `list_directory` — list files in a directory
   - `search_files` — glob pattern file search
   - `run_shell` — run a shell command, return stdout/stderr

3. **Custom MCP servers** — Users add servers in Settings > MCP:
   - **stdio**: Kode spawns a subprocess (e.g. `npx -y @modelcontextprotocol/server-github`)
   - **http**: Remote SSE server passed natively to the Anthropic API

4. **Tool call UI** — When the AI calls a tool, a collapsible block appears inline in the chat showing the tool name, arguments, and result. Status: pending → success / error / denied.

5. **Permission system** — Two modes, configurable globally in Settings > MCP:
   - **Full**: Tools execute immediately, no prompting.
   - **Ask**: A dialog appears before each tool call; user clicks Allow or Deny.

---

## Architecture

```
Renderer                          Main Process
────────────────────────────────  ───────────────────────────────────────────
useClaudeContext ──IPC──────────► claude:loadContext → read .claude/CLAUDE.md
useAIChat        ──IPC──────────► ai:sendMessage (with system + tools)
                                       │
                                  McpManager.listTools()  ◄── built-ins + SDK servers
                                       │
                                  Anthropic SDK stream()
                                       │
                                  tool_use blocks? ──► McpManager.callTool()
                                       │                        │
                                  ai:toolApproval ──IPC──► renderer (Ask mode)
                                  ai:toolCall / ai:toolResult ──IPC──► renderer
                                       │
                                  loop until no tool_use
                                       │
                                  ai:done
```

---

## Data Model

### Extended AppSettings (`src/main/ipc/settings.ts`)

```typescript
export interface McpServerConfig {
  id: string                        // stable uuid, generated on creation
  name: string                      // user-defined display name
  type: 'stdio' | 'http'
  command?: string                  // stdio only: executable path or name
  args?: string[]                   // stdio only: command arguments
  env?: Record<string, string>      // stdio only: extra environment variables
  url?: string                      // http only: SSE endpoint URL
}

// Added to AppSettings:
mcpServers: McpServerConfig[]       // user-defined servers (not built-ins)
mcpPermission: 'ask' | 'full'       // default: 'full'
```

Default values added to `DEFAULT_SETTINGS`:
```typescript
mcpServers: [],
mcpPermission: 'full'
```

---

## New Files

### `src/main/mcp/McpManager.ts`

Main process singleton. Manages server connections and tool routing.

```typescript
interface McpTool {
  serverId: string
  name: string
  description: string
  inputSchema: object
}

interface McpToolResult {
  content: string
  isError: boolean
}

class McpManager {
  // Connect a user-configured server via SDK
  async connect(config: McpServerConfig): Promise<void>
  // Disconnect and kill subprocess
  async disconnect(id: string): Promise<void>
  // Connect all from settings
  async connectAll(configs: McpServerConfig[]): Promise<void>
  // Aggregate tools from built-ins + all connected servers
  listTools(): McpTool[]
  // Route call to correct server or built-in
  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult>
}

export const mcpManager = new McpManager()
```

Built-in server IDs: `__builtin_filesystem`, `__builtin_shell` — registered in constructor, always present in `listTools()`.

For stdio servers: uses `@modelcontextprotocol/sdk` `Client` + `StdioClientTransport`. McpManager calls these locally and handles the full tool_use/tool_result loop.

For http servers: passed directly to the Anthropic API as `mcp_servers` parameter. Anthropic connects to the server server-side and handles tool execution transparently — no tool_use blocks appear in the local stream, no local round-trip. This means the permission system and tool call UI do NOT apply to http servers (Anthropic executes them silently). Http server configs are stored in settings and injected into the API call, but McpManager does not connect to them locally.

### `src/main/mcp/builtins/filesystem.ts`

In-process virtual server. Implements 4 tools with Node.js `fs` module.

```typescript
export const FILESYSTEM_SERVER_ID = '__builtin_filesystem'

export const filesystemTools: McpTool[] = [
  { serverId: FILESYSTEM_SERVER_ID, name: 'read_file', description: 'Read the full content of a file', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { serverId: FILESYSTEM_SERVER_ID, name: 'write_file', description: 'Write content to a file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { serverId: FILESYSTEM_SERVER_ID, name: 'list_directory', description: 'List files in a directory', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { serverId: FILESYSTEM_SERVER_ID, name: 'search_files', description: 'Search files by glob pattern', inputSchema: { type: 'object', properties: { rootPath: { type: 'string' }, pattern: { type: 'string' } }, required: ['rootPath', 'pattern'] } },
]

export async function callFilesystemTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>
```

Security: all paths validated to be absolute. `read_file` / `list_directory` / `search_files` are read-only. `write_file` writes to disk (no restriction beyond valid path — same as the existing `fs:writeFile` IPC handler).

### `src/main/mcp/builtins/shell.ts`

In-process virtual server. Spawns a subprocess with `node:child_process.exec`.

```typescript
export const SHELL_SERVER_ID = '__builtin_shell'

export const shellTools: McpTool[] = [
  { serverId: SHELL_SERVER_ID, name: 'run_shell', description: 'Run a shell command and return stdout and stderr', inputSchema: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string' } }, required: ['command'] } }
]

export async function callShellTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>
```

Timeout: 30 seconds. Returns `{ stdout, stderr, exitCode }` as JSON string in `content`. `isError: true` if exit code !== 0 or timeout.

### `src/main/ipc/claude.ts`

```typescript
export function registerClaudeHandlers(): void
// IPC: 'claude:loadContext'
// Args: rootPath: string
// Returns: { content: string | null }
// Reads <rootPath>/.claude/CLAUDE.md — returns null if not found or rootPath is empty
```

Validates `rootPath` is a non-empty string. Does not throw — returns `{ content: null }` on any error.

### `src/renderer/src/hooks/useClaudeContext.ts`

```typescript
interface UseClaudeContextResult {
  systemPrompt: string | null
  hasContext: boolean
}

export function useClaudeContext(rootPath: string | null): UseClaudeContextResult
```

- Calls `window.kode.claude.loadContext(rootPath)` whenever `rootPath` changes
- Returns `{ systemPrompt: content, hasContext: content !== null }`
- Used in `App.tsx`, `systemPrompt` passed to `AIChatPanel` which passes it to `useAIChat`

### `src/renderer/src/components/settings/McpSettings.tsx`

```typescript
interface McpSettingsProps {
  servers: McpServerConfig[]
  permission: 'ask' | 'full'
  onAddServer(config: Omit<McpServerConfig, 'id'>): void
  onRemoveServer(id: string): void
  onSetPermission(value: 'ask' | 'full'): void
}
```

Sections:
1. **Permission** — toggle row: "Full access" / "Ask before each tool call"
2. **Built-in servers** — static list (Filesystem, Shell) — always enabled, not removable
3. **Custom servers** — scrollable list, each row: name + type badge + Remove button
4. **Add Server** — "Add server" button expands inline form: name → type (stdio/http) → conditional fields → Save / Cancel

### `src/renderer/src/components/ai/ToolCallBlock.tsx`

```typescript
interface ToolCallBlockProps {
  toolName: string
  serverId: string
  args: Record<string, unknown>
  status: 'pending' | 'success' | 'error' | 'denied'
  result?: string
}
```

Collapsible. Header: `▶ tool_name (server)` with status indicator. Expanded body: args as formatted JSON, result below. Uses `var(--bg-sidebar)` background, `var(--radius-md)` border radius, monospace font for args/result.

### `src/renderer/src/components/ai/PermissionDialog.tsx`

```typescript
interface PermissionDialogProps {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
  onAllow(): void
  onDeny(): void
}
```

Modal dialog (same style as SettingsPanel). Shows tool name + server + args preview. Two buttons: "Allow" (accent) + "Deny" (flat). Keyboard: Enter = Allow, Escape = Deny.

---

## Modified Files

### `src/main/ipc/ai.ts` — Tool_use loop

The `ai:sendMessage` handler is extended significantly:

1. On invocation: load settings, load MCP tools from `mcpManager.listTools()`
2. Build Anthropic `tools` array from McpTool list
3. Include `system` param if systemPrompt provided
4. Stream with tools. New event handling:
   - Accumulate `tool_use` blocks from the stream (they arrive as content blocks)
   - When stream ends: if `stop_reason === 'tool_use'`, enter tool loop:
     a. For each tool_use block:
        - If `mcpPermission === 'ask'`: send `ai:toolApproval` to renderer, await `ai:approveTool` / `ai:denyTool` response
        - If denied: send `ai:toolResult` with denied status, skip execution
        - If approved (or Full mode): send `ai:toolCall` to renderer, call `mcpManager.callTool()`, send `ai:toolResult`
     b. Build `tool_result` message, add to messages array
     c. Stream again (loop)
5. When `stop_reason === 'end_turn'` or no tool_use: send `ai:done`

IPC signature extended:
```typescript
ipcMain.handle('ai:sendMessage', async (event, messages, systemPrompt?: string) => { ... })
```

New IPC events sent from main → renderer:
```
ai:toolCall    → { callId, toolName, serverId, args }
ai:toolResult  → { callId, result, isError }
ai:toolApproval→ { callId, toolName, serverId, args }
```

New IPC from renderer → main (one-shot responses):
```
ai:approveTool → callId: string
ai:denyTool    → callId: string
```

### `src/preload/index.ts` — New bridges

```typescript
window.kode.mcp = {
  listTools(): Promise<McpTool[]>
}
window.kode.claude = {
  loadContext(rootPath: string): Promise<{ content: string | null }>
}
// Extended window.kode.ai:
window.kode.ai.onToolCall(cb: (e: ToolCallEvent) => void): () => void
window.kode.ai.onToolResult(cb: (e: ToolResultEvent) => void): () => void
window.kode.ai.onToolApproval(cb: (e: ToolApprovalRequest) => void): () => void
window.kode.ai.approveTool(callId: string): void
window.kode.ai.denyTool(callId: string): void
```

### `src/renderer/src/hooks/useAIChat.ts` — Tool events

Extended to accept `systemPrompt?: string` parameter passed to `ai:sendMessage`.

New state:
```typescript
pendingApproval: ToolApprovalRequest | null
```

`sendMessage(text, systemPrompt?)` — passes systemPrompt through.

Handlers for `onToolCall`, `onToolResult`, `onToolApproval`:
- `onToolCall` → adds/updates tool call block on the current assistant message
- `onToolResult` → updates block status to success/error
- `onToolApproval` → sets `pendingApproval` state (triggers PermissionDialog)

`approveTool(callId)` / `denyTool(callId)` → calls preload bridge, clears `pendingApproval`.

Messages now carry:
```typescript
interface ToolCallEntry {
  callId: string
  toolName: string
  serverId: string
  args: Record<string, unknown>
  status: 'pending' | 'success' | 'error' | 'denied'
  result?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallEntry[]
}
```

### `src/renderer/src/components/ai/AIChatPanel.tsx`

- Accepts `systemPrompt?: string` + `hasClaudeContext?: boolean` props
- Passes `systemPrompt` to `useAIChat`
- Shows `CLAUDE.md` badge in header when `hasClaudeContext` is true — small pill with monospace text, `var(--accent)` background

### `src/renderer/src/components/settings/SettingsPanel.tsx`

- Adds `'mcp'` to `SettingsTab` type
- Adds `McpSettings` tab in sidebar
- Accepts new props for MCP: `servers`, `permission`, `onAddServer`, `onRemoveServer`, `onSetPermission`

### `src/renderer/src/App.tsx`

- Calls `useClaudeContext(project.rootPath)`
- Passes `systemPrompt` + `hasContext` to `AIChatPanel`
- Adds MCP-related props to `SettingsPanel` (wired to `useSettings`)

### `src/renderer/src/hooks/useSettings.ts`

Extended to expose:
- `mcpServers: McpServerConfig[]`
- `mcpPermission: 'ask' | 'full'`
- `addMcpServer(config: Omit<McpServerConfig, 'id'>): void` — generates a uuid, calls `settings.set()`, then calls `window.kode.mcp.connect(newConfig)` to connect immediately
- `removeMcpServer(id: string): void` — calls `settings.set()`, then calls `window.kode.mcp.disconnect(id)`
- `setMcpPermission(value: 'ask' | 'full'): void` — calls `settings.set()`

All mutations call `window.kode.settings.set()` to persist, same pattern as existing `setProviderKey`.

---

## Test Plan

| Test file | What it covers |
|-----------|----------------|
| `tests/main/mcp/builtins/filesystem.test.ts` | read_file, write_file, list_directory, search_files — happy path + error cases |
| `tests/main/mcp/builtins/shell.test.ts` | run_shell success, non-zero exit, timeout |
| `tests/main/mcp/McpManager.test.ts` | listTools includes built-ins, callTool routes correctly, connect/disconnect lifecycle |
| `tests/main/ipc/claude.test.ts` | loadContext returns content when file exists, null when missing, null on empty rootPath |
| `tests/renderer/hooks/useClaudeContext.test.ts` | hasContext true/false, re-fetches on rootPath change |
| `tests/renderer/components/settings/McpSettings.test.tsx` | renders servers list, Add Server form, permission toggle, remove button |
| `tests/renderer/components/ai/ToolCallBlock.test.tsx` | renders pending/success/error/denied states, collapse/expand |
| `tests/renderer/components/ai/PermissionDialog.test.tsx` | renders tool name + args, Allow calls onAllow, Deny calls onDeny, Escape = deny |

---

## Out of Scope for M9

- Per-project MCP server config (`.claude/mcp.json`) — global only for now
- OAuth-based MCP authentication
- MCP server logs/debugging panel
- Custom slash commands from `.claude/commands/`
- MCP server marketplace / discovery

---

## Dependencies to Install

```bash
npm install @modelcontextprotocol/sdk
```
