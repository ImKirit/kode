import { ipcMain } from 'electron'
import { getChatDB } from '../db/ChatDB'

export function registerChatHandlers(): void {
  ipcMain.handle('chat:getSessions', () => getChatDB().getSessions())

  ipcMain.handle('chat:createSession', (_e, id: string, name: string, provider: string, model: string) =>
    getChatDB().createSession(id, name, provider, model)
  )

  ipcMain.handle('chat:updateSession', (_e, id: string, name: string) => {
    getChatDB().updateSession(id, name)
  })

  ipcMain.handle('chat:archiveSession', (_e, id: string) => {
    getChatDB().archiveSession(id)
  })

  ipcMain.handle('chat:deleteSession', (_e, id: string) => {
    getChatDB().deleteSession(id)
  })

  ipcMain.handle('chat:getMessages', (_e, sessionId: string) =>
    getChatDB().getMessages(sessionId)
  )

  ipcMain.handle('chat:addMessage', (_e, id: string, sessionId: string, role: string, content: string, tokens?: number, cost?: number) =>
    getChatDB().addMessage(id, sessionId, role, content, tokens, cost)
  )

  ipcMain.handle('chat:search', (_e, query: string) =>
    getChatDB().searchSessions(query)
  )

  ipcMain.handle('chat:addFileChange', (_e, id: string, sessionId: string, filePath: string, diff: string) => {
    getChatDB().addFileChange(id, sessionId, filePath, diff)
  })
}
