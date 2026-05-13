import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['tests/main/**', 'node']
    ],
    setupFiles: ['./tests/setup.ts'],
    globals: true
  },
  resolve: {
    alias: { '@renderer': resolve('src/renderer/src') }
  }
})
