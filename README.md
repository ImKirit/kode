# Kode

An open-source, cross-platform, AI-native code editor built with Electron. Think VS Code meets Cursor — full Monaco editing, first-class AI agent support, and a completely customizable dockable panel layout, without any lock-in.

---

## Features

- **Monaco Editor** — same editor engine as VS Code, with syntax highlighting, IntelliSense, and multi-tab support
- **AI Agent Panels** — stream responses token-by-token from Claude, OpenAI, GitHub Copilot, and Gemini
- **OAuth Login** — sign in with your existing provider account (no raw API keys required)
- **Dockable Panels** — drag, split, float, and rearrange every panel freely (GoldenLayout)
- **Integrated Terminal** — real PTY terminal via node-pty and xterm.js, multi-instance
- **Prompt Scheduler** — schedule prompts to run at a specific time or auto-resume after rate limits
- **Auto Follow** — watch the AI write to files in real time as it edits them
- **Git Integration** — status, diff, stage, commit, push, pull from within the editor
- **MCP Support** — loads MCP servers from `.claude/` folders automatically
- **Plugin Marketplace** — extend Kode with npm-based plugins
- **Full Theming** — CSS custom property themes, importable/exportable as JSON
- **Local-only** — no cloud sync, no telemetry, all data stored in SQLite on your machine

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 35 (electron-vite + electron-forge) |
| UI | React 18 + TypeScript 5 |
| Editor | Monaco Editor |
| Terminal | node-pty + xterm.js |
| Panel docking | GoldenLayout v2 |
| Database | SQLite via better-sqlite3 |
| Styling | CSS custom properties + Tailwind CSS |
| Icons | Lucide React |
| Build | Vite (renderer) + esbuild (main) |
| Tests | Vitest + React Testing Library |

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

### Build

```bash
npm run build
npm run make
```

### Test

```bash
npm test
```

---

## Project Structure

```
src/
  main/          # Electron main process (IPC, file system, terminal, auth)
  preload/       # Context bridge (exposes safe APIs to renderer)
  renderer/      # React app (UI, editor, panels, hooks)
    src/
      components/
        editor/    # MonacoEditor, EditorArea, EditorTab
        filetree/  # FileTree, FileTreeNode
        layout/    # AppLayout, MenuBar
        ai/        # AIChatPanel (and future AI panels)
      hooks/       # useProject, useFileTree
      styles/      # globals.css (CSS custom properties theme)
      types/       # TypeScript types + electron.d.ts
tests/
  main/          # Main process unit tests
  renderer/      # Renderer component and hook tests
docs/
  superpowers/
    specs/       # Architecture specs
    plans/       # Implementation plans per milestone
```

---

## Logo / Icon

Place your app icon files in `resources/` before packaging:

- `resources/icon.png` — 512x512, used on Linux and as fallback
- `resources/icon.ico` — Windows taskbar and installer
- `resources/icon.icns` — macOS Dock

---

## License

MIT
