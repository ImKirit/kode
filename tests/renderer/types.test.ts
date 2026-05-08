import type { FileEntry, OpenFile } from '@renderer/types'
import { languageFromPath } from '@renderer/types'

test('FileEntry type has required fields', () => {
  const f: FileEntry = {
    name: 'index.ts',
    path: '/project/index.ts',
    type: 'file'
  }
  expect(f.name).toBe('index.ts')
})

test('OpenFile has dirty flag', () => {
  const f: OpenFile = {
    path: '/project/index.ts',
    name: 'index.ts',
    content: 'const x = 1',
    dirty: false,
    language: 'typescript'
  }
  expect(f.dirty).toBe(false)
})

test('languageFromPath detects TypeScript', () => {
  expect(languageFromPath('index.ts')).toBe('typescript')
  expect(languageFromPath('App.tsx')).toBe('typescript')
})

test('languageFromPath falls back to plaintext', () => {
  expect(languageFromPath('Makefile')).toBe('plaintext')
})
