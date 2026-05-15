# Kode

An AI-native desktop code editor built with Electron, React, and Monaco. Full VS Code editing experience with a deeply integrated AI agent, MCP tool support, persistent chat history, and a clean panel layout.

---

## Features

- **Monaco Editor** — syntax highlighting, IntelliSense, Emmet, bracket pair colorization, format on save
- **AI Chat** — streaming responses from Claude, OpenAI, or the Kode provider; MCP tools with inline approval UI
- **MCP Support** — connect any MCP server; auto-loads from `.claude/` project context files
- **Chat History** — all sessions persisted in SQLite; searchable, renameable, archivable threads
- **Prompt Scheduler** — schedule prompts at a specific time; auto-resume after rate limits
- **Auto Follow** — watch file changes stream in as the AI edits them
- **Git** — stage/unstage, view diffs, commit; optional AI-generated conventional commit messages
- **Terminal** — real PTY terminal via node-pty + xterm.js, multiple instances, opens at project root
- **Live Server** — one-click local dev server with hot reload
- **File tree** — right-click context menu: new file, new folder, inline rename (VS Code-style), delete
- **Session restore** — reopens your last project and open files on launch
- **Multi-window** — File > New Window opens a fresh editor instance
- **Plugin system** — toggleable built-ins (Format on Save, AI Commit Messages); external marketplace coming soon
- **GitHub integration** — device flow OAuth, repo linking, push/pull
- **SSH Deploy** — deploy to a remote server over SSH
- **Theming** — light / dark / custom themes via CSS custom properties; importable/exportable as JSON
- **Keybindings** — fully customizable keyboard shortcuts

---

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 35 + electron-vite + electron-forge |
| Renderer | React 18, TypeScript 5, Vite |
| Editor | Monaco Editor |
| Terminal | node-pty + xterm.js |
| AI | @anthropic-ai/sdk, openai, @modelcontextprotocol/sdk |
| DB | SQLite via better-sqlite3 |
| Styling | CSS custom properties + Tailwind CSS |
| Icons | Lucide React |
| Tests | Vitest + React Testing Library |

---

## Getting Started

```bash
npm install
npm run dev
```

`predev` rebuilds native modules (`better-sqlite3`, `node-pty`) against the Electron ABI automatically.

### Tests

```bash
npm test                        # full suite
npx vitest run tests/renderer   # renderer only, no ABI rebuild needed
```

### Build

```bash
npm run build   # compile
npm run make    # package for current platform → out/make/
```

---

## Project Structure

```
src/
  main/
    db/       SQLite (chat sessions, messages, usage stats)
    ipc/      IPC handlers: fs, terminal, ai, git, mcp, chat, plugins, deploy, auth…
    mcp/      McpManager
    plugins/  PluginLoader
  preload/    contextBridge — exposes window.kode API to renderer
  renderer/
    src/
      components/
        ai/       AIChatPanel, ThreadsPanel, ToolCallBlock, PermissionDialog
        editor/   EditorArea, EditorTab, MonacoEditor
        filetree/ FileTree, FileTreeNode
        git/      GitPanel, ChangesView
        layout/   AppLayout, ActivityBar, MenuBar, BottomPanel
        settings/ SettingsPanel + all settings tabs
      hooks/      useProject, useChatHistory, useSettings, useAutoFollow, useGit…
      types/      index.ts, electron.d.ts
tests/
  main/       Main-process tests (Node.js env)
  renderer/   Component and hook tests (jsdom + RTL)
```

---

## License

[MIT](LICENSE)
