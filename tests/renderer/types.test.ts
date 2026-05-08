import type { FileEntry, OpenFile, ProjectState } from '@renderer/types'
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

test('ProjectState has rootPath and name', () => {
  const s: ProjectState = { rootPath: '/home/user/project', name: 'project' }
  expect(s.rootPath).toBe('/home/user/project')
  expect(s.name).toBe('project')
})

test('ProjectState rootPath can be null', () => {
  const s: ProjectState = { rootPath: null, name: '' }
  expect(s.rootPath).toBeNull()
})

test('languageFromPath detects various languages', () => {
  expect(languageFromPath('app.js')).toBe('javascript')
  expect(languageFromPath('config.json')).toBe('json')
  expect(languageFromPath('main.py')).toBe('python')
  expect(languageFromPath('script.sh')).toBe('shell')
  expect(languageFromPath('deploy.yml')).toBe('yaml')
  expect(languageFromPath('style.css')).toBe('css')
})

test('languageFromPath handles no-extension files', () => {
  expect(languageFromPath('Makefile')).toBe('plaintext')
  expect(languageFromPath('Dockerfile')).toBe('plaintext')
})
