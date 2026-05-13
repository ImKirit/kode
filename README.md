# Kode

An open-source, cross-platform, AI-native code editor built with Electron. Think VS Code meets Claude Code — full Monaco editing, first-class AI agent support with MCP, persistent chat history, and a completely customizable panel layout, without any lock-in.

---

## Features

- **Monaco Editor** — same editor engine as VS Code, with syntax highlighting, IntelliSense, and multi-tab support
- **AI Agent Panel** — stream responses token-by-token from Claude (Anthropic), OpenAI, GitHub Copilot, and Gemini
- **MCP Support** — auto-loads MCP servers from `.claude/` folders; connect any MCP server manually in Settings
- **Chat History** — all conversations persisted in SQLite; searchable threads sidebar, rename/archive/delete
- **Prompt Scheduler** — schedule prompts to run at a specific time, or auto-resume after rate limits
- **Auto Follow** — watch the AI write to files in real time as it edits them
- **Git Integration** — status, diff, stage, commit from within the editor (Changes tab in bottom panel)
- **Integrated Terminal** — real PTY terminal via node-pty + xterm.js, multiple instances
- **Plugin Marketplace** — extend Kode with npm-based plugins (`kode-plugin` keyword)
- **Full Theming** — light/dark/custom themes via CSS custom properties, importable/exportable as JSON
- **Keybindings** — customizable keyboard shortcuts with visual editor and reset
- **CLAUDE.md badge** — shows when a project has a `.claude/CLAUDE.md` context file loaded
- **Local-only** — no cloud sync, no telemetry, all data stored in SQLite on your machine

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 35 (electron-vite + electron-forge) |
| UI | React 18 + TypeScript 5 |
| Editor | Monaco Editor |
| Terminal | node-pty + xterm.js |
| AI | @anthropic-ai/sdk, openai, @modelcontextprotocol/sdk |
| Database | SQLite via better-sqlite3 |
| Styling | CSS custom properties + Tailwind CSS |
| Icons | Lucide React |
| Build | Vite (renderer) + esbuild (main) |
| Tests | Vitest + React Testing Library (383 tests) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install and Run

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
npm run make
```

This produces installers in `out/make/` for your platform.

### Test

```bash
npm test
```

---

## Project Structure

```
src/
  main/
    db/          # SQLite (ChatDB — sessions, messages, file changes)
    ipc/         # IPC handlers: fs, terminal, ai, settings, git, mcp, chat, plugins
    mcp/         # McpManager + built-in filesystem/shell servers
    plugins/     # PluginLoader (npm registry, install/uninstall)
  preload/       # contextBridge (exposes safe APIs from main to renderer)
  renderer/
    src/
      components/
        ai/      # AIChatPanel, ThreadsPanel, ChatMessage, ToolCallBlock, PermissionDialog
        editor/  # EditorArea, EditorTab, MonacoEditor wrapper
        filetree/ # FileTree, FileTreeNode
        layout/  # AppLayout, ActivityBar, MenuBar, BottomPanel
        plugins/ # PluginBrowser
        settings/ # SettingsPanel, AppearanceSettings, McpSettings, KeybindingsSettings
        terminal/ # Terminal
      hooks/     # useProject, useScheduler, useChatHistory, useSettings, useAutoFollow, ...
      styles/    # themes.ts, keybindings.ts, globals.css
      types/     # index.ts, electron.d.ts

tests/
  main/          # Main-process unit tests (real Node.js)
  renderer/      # Renderer component and hook tests (jsdom + RTL)
```

---

## Packaging

Place icon files in `resources/` before packaging:

- `resources/icon.png` — 512x512, Linux + fallback
- `resources/icon.ico` — Windows
- `resources/icon.icns` — macOS

Then run:

```bash
npm run make
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
