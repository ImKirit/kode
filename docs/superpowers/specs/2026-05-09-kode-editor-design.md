# Kode — AI-Native Code Editor: Architecture Spec

**Date:** 2026-05-09
**Status:** Approved

---

## 1. What We're Building

Kode is a cross-platform desktop code editor built with Electron. It combines a full Monaco-based code editor with first-class AI agent support, an account-based subscription system (OAuth, no raw API spending required), a flexible panel docking system, a built-in scheduler, and a plugin marketplace. Target audience: developers who want Cursor-level AI integration with full customization and no lock-in.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron (via electron-vite, packaged with electron-forge) |
| UI framework | React 18 + TypeScript |
| Code editor | Monaco Editor |
| Terminal | node-pty + xterm.js |
| Panel docking | GoldenLayout v2 |
| Database | SQLite via better-sqlite3 |
| Styling | CSS custom properties (theming) + Tailwind CSS (layout) |
| Icons | Lucide React (no emojis anywhere) |
| Build | Vite (renderer) + esbuild (main process) |

---

## 3. Process Architecture

```
Main Process (Node.js)
├── Window management
├── File system access (open folder, read/write files)
├── Terminal spawning (node-pty)
├── MCP server lifecycle management
├── SQLite (chat history, settings, scheduled prompts)
├── OAuth token storage (OS keychain via keytar)
├── Scheduler (cron-style, runs scheduled prompts)
└── IPC bridge → Renderer

Renderer Process (React)
├── GoldenLayout panel system
├── Monaco Editor instances
├── AI Chat Panel (per session)
├── Terminal panel (xterm.js)
├── File Tree
├── Git integration (isomorphic-git or shell commands)
└── All UI components
```

**IPC channels (main ↔ renderer):**
- `fs:readFile`, `fs:writeFile`, `fs:readDir`, `fs:watchDir`
- `terminal:spawn`, `terminal:write`, `terminal:resize`, `terminal:kill`
- `ai:stream` (streams AI tokens back to renderer)
- `auth:oauthLogin`, `auth:logout`, `auth:getToken`
- `mcp:start`, `mcp:stop`, `mcp:list`
- `scheduler:add`, `scheduler:remove`, `scheduler:list`
- `git:status`, `git:diff`, `git:commit`, `git:push`, `git:pull`
- `settings:get`, `settings:set`

---

## 4. Panel System (GoldenLayout v2)

All panels are registered as GoldenLayout components. The default layout is:

```
┌──────────────────────────────────────────────────────┐
│  Menu Bar                                            │
├──────────┬──────────────────────────┬────────────────┤
│          │  Top Tabs:               │                │
│  File    │  Chat | Changes |        │   AI Chat      │
│  Tree    │  Console | Code          │   Panel        │
│  (220px) │                          │   (360px)      │
│          │  Monaco Editor           │                │
├──────────┴──────────────────────────┴────────────────┤
│  Bottom Panel Tabs: Terminal | Console | Problems    │
│  (240px default)                                     │
└──────────────────────────────────────────────────────┘
```

**Panel capabilities:**
- Any panel can be dragged to a new position (docked left/right/top/bottom)
- Dropping onto a tab bar creates a new tab group
- Dropping onto a panel body splits it
- Dragging outside the window creates a floating window
- Layout state persisted per project in SQLite

**Registered panel types:**
- `FileTree` — file explorer
- `MonacoEditor` — code editor (one per open file, managed by tab system)
- `AIChat` — AI conversation panel
- `Terminal` — xterm.js terminal instance
- `ConsoleOutput` — agent command output (never cleared on tab switch)
- `ChangesView` — git-style diff of AI session changes
- `GitPanel` — source control panel
- `SchedulerPanel` — scheduled prompts manager
- `PluginBrowser` — plugin marketplace
- `SettingsPanel` — settings UI

---

## 5. AI System

### Account Auth (OAuth — primary)

Each provider has an OAuth flow launched in a native browser window (not a webview). Token stored in OS keychain via `keytar`.

| Provider | Auth Method |
|----------|------------|
| Claude (Anthropic) | Anthropic OAuth — same flow as Claude Code |
| OpenAI / ChatGPT | OpenAI OAuth |
| GitHub Copilot | GitHub OAuth |
| Gemini | Google OAuth |
| Any provider | API key fallback (always available) |

Multiple accounts per provider are supported (stored separately, appear as separate agent sessions).

### Streaming

All AI responses stream token-by-token via IPC. The renderer displays them word-by-word. Code blocks render progressively. The token counter, cost indicator, and context bar update in real time.

### Agent Sessions

Each session has:
- Unique ID + display name (editable)
- Provider + model + account reference
- Conversation history (SQLite)
- Permission mode: Always Ask / Auto Approve / YOLO
- Effort setting: off / low / medium / high / max
- Plan Mode toggle
- Auto Follow toggle
- Auto-resume-on-limit toggle
- Queue next prompt (optional follow-up after completion)

### Session Tabs

Each AI session exposes four tabs in the main editor area:
1. **Chat** — conversation view
2. **Changes** — diff of all file edits made this session
3. **Console** — terminal output from agent commands (persists across tab switches)
4. **Code** — active editor view

### Real-Time File Streaming (M7 — Auto Follow)

When Auto Follow is on: as the AI writes to a file, the Code tab opens that file and shows characters appearing live. Implemented by watching the file system write buffer and streaming partial content to Monaco.

---

## 6. Scheduling System

Stored in SQLite table `scheduled_prompts`:
```sql
id, session_id, prompt_text, scheduled_at, status, created_at
```

The main process runs a scheduler loop (checks every 30 seconds). On trigger:
- Activates the target session
- Sends the prompt as if the user typed it
- Results stream normally

**Auto-resume on limit reset:**
- When an AI response contains a rate-limit / usage-limit signal, the session records `limit_hit_at` and `limit_type` (hourly/weekly)
- Scheduler monitors for limit reset (provider-specific timing heuristics)
- Sends `"Continue exactly where you left off."` automatically
- Toggleable per session

---

## 7. Terminal

- `node-pty` spawns real PTY processes (bash/zsh/PowerShell/cmd depending on OS)
- `xterm.js` renders the terminal in the renderer
- Multiple terminal instances, each in their own GoldenLayout panel tab
- Terminal content is never cleared when switching tabs (xterm buffer preserved)
- Agent's console output is a separate read-only terminal-style view

---

## 8. File System & Editor

- **Open Folder**: loads directory tree, stores root in project state
- **File Tree**: virtual tree from `fs.readdir` recursive, with file-type icons (Lucide)
- **Monaco**: one editor instance per file, tabs managed by a tab controller component
- **Auto-save**: configurable (default: save on focus loss)
- **Last opened file**: restored on next launch (stored in project settings in SQLite)
- **Watch**: `chokidar` watches the open folder for external changes, refreshes tree

---

## 9. Git Integration

Use `simple-git` (Node.js wrapper around system git):
- Status, diff, stage, commit, push, pull, fetch
- `ChangesView` panel shows per-session diffs (tracked by recording file state at session start)
- GitHub sidebar: repo info, recent commits list, commit message input

---

## 10. MCP + .claude Loader

On project open:
1. Scan `<project>/.claude/` and `~/.claude/` for MCP configs
2. Parse `mcp.json` / `settings.json`
3. Start configured MCP servers as child processes
4. Register tools/resources with all active AI sessions
5. Also loads skills (slash commands) and `CLAUDE.md` context files

---

## 11. Plugin System

Plugins are npm packages with a `kode-plugin` keyword. API surface:

```typescript
interface KodePlugin {
  id: string
  name: string
  activate(context: PluginContext): void
  deactivate(): void
}

interface PluginContext {
  panels: PanelRegistry      // register new panel types
  commands: CommandRegistry  // register commands/shortcuts
  providers: AIProviderRegistry // register new AI providers
  themes: ThemeRegistry      // register themes
  fs: FileSystemAPI          // read/write access
  ipc: IPCBridge             // communicate with main process
}
```

Plugin marketplace is a GoldenLayout panel that fetches from a registry (npm search by keyword + curated list). Plugins installed to `~/.kode/plugins/`.

---

## 12. Settings & Themes

Settings stored in SQLite + exported as JSON. Two access modes:
1. **GUI panel** — visual settings editor
2. **JSON file** — `~/.kode/settings.json` (watched for changes, hot-reloaded)

Theme is a set of CSS custom properties applied to `:root`. Users can edit the full theme object. Themes are importable/exportable as JSON files.

Default theme variables defined in the spec (backgrounds, borders, text, accents).

Keybindings stored as JSON, editable in a keybinding editor panel. All actions are registered commands with default bindings.

---

## 13. Chat History

SQLite schema:
```sql
sessions(id, name, provider, model, account_id, created_at, updated_at, archived)
messages(id, session_id, role, content, tokens, cost, created_at)
file_changes(id, session_id, file_path, diff, created_at)
```

Accessible from left sidebar "Threads" section. Full-text search across message content. Sessions can be renamed, archived, deleted.

---

## 14. Build Order (Milestones)

| # | Milestone | Key Deliverables |
|---|-----------|-----------------|
| M1 | Core Shell | Electron + React + Monaco + File Tree + Save/Open |
| M2 | Terminal | node-pty + xterm.js, multi-tab |
| M3 | AI Chat MVP | Streaming chat, Claude API, session management |
| M4 | Account System | OAuth per provider, multi-account, model selector |
| M5 | Panel Docking | GoldenLayout integration, all panels dockable |
| M6 | Scheduling | Schedule prompts, queue, auto-resume on limit |
| M7 | Auto Follow | Real-time file streaming, animated cursor |
| M8 | Git + Changes | simple-git, ChangesView diff panel |
| M9 | MCP Loader | .claude scan, MCP server lifecycle |
| M10 | Plugin System | Plugin API, marketplace panel |
| M11 | Settings + Themes | Full JSON settings, theme editor, keybindings |
| M12 | Chat History | SQLite history, search, archive |
| M13 | Polish | README, MIT license, CONTRIBUTING.md, installers |

---

## 15. Cross-Platform Notes

- macOS: traffic light window controls, native keychain via keytar, Cmd shortcuts
- Windows: standard min/max/close, Windows Credential Manager via keytar, Ctrl shortcuts
- Linux: native window controls, libsecret via keytar, Ctrl shortcuts
- PTY shell: bash/zsh (mac/linux), PowerShell/cmd (windows) — auto-detected

---

## 16. What's Explicitly Out of Scope

- Cloud sync of settings/history (local only)
- Collaborative editing (multiplayer)
- Web version (Electron only)
- Built-in AI model hosting (provider-as-a-service only)
