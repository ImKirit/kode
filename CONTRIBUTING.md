# Contributing to Kode

Thanks for your interest in contributing!

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone https://github.com/ImKirit/kode.git
cd kode
npm install
npm run dev
```

## Development

The project uses [electron-vite](https://electron-vite.org/) for hot-reloading during development.

- `npm run dev` — start the app with HMR
- `npm test` — run the full test suite
- `npm run build` — compile for production

## Project Layout

```
src/
  main/          # Electron main process: IPC handlers, file I/O, terminal, AI, MCP, SQLite
  preload/       # contextBridge — exposes safe APIs from main to renderer
  renderer/      # React 18 + TypeScript app
    src/
      components/ # UI components
      hooks/      # React hooks (useProject, useScheduler, useChatHistory, …)
      styles/     # CSS custom properties theming
      types/      # electron.d.ts global type declarations

tests/
  main/          # Main-process unit tests (Vitest, real Node.js)
  renderer/      # Renderer tests (Vitest + jsdom + React Testing Library)
```

## Code Style

- TypeScript everywhere — no `any` if avoidable
- No comments unless the WHY is non-obvious
- No emojis in UI or code
- CSS custom properties for theming — no hardcoded hex colors in component styles
- Lucide React for all icons

## Testing

All changes should maintain or increase test coverage:

```bash
npm test            # run all tests
npx vitest run --reporter verbose  # verbose output
```

Tests live next to source in `tests/`. Main-process code tests run in Node.js. Renderer tests run in jsdom.

## Pull Requests

1. Fork and create a feature branch from `main`
2. Run `npm test` — all 383 tests must pass
3. Run `npx tsc --noEmit` — no TypeScript errors
4. Open a PR against `main` with a clear description

## License

By contributing you agree your code will be licensed under the [MIT License](LICENSE).
