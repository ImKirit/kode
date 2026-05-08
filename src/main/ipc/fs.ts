import { dialog } from 'electron'
import { promises as fs } from 'fs'
import type { FileEntry } from '../../renderer/src/types'

export async function readDirHandler(dirPath: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  return entries
    .filter(e => !e.name.startsWith('.'))
    .map(e => ({
      name: e.name,
      path: `${dirPath}/${e.name}`.replace(/\\/g, '/'),
      type: (e.isDirectory() ? 'directory' : 'file') as 'file' | 'directory'
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export async function readFileHandler(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

export async function writeFileHandler(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function openFolderHandler(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
}
