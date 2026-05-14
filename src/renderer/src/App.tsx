import { useState, useCallback } from 'react'
import { useProject } from './hooks/useProject'
import { DEFAULT_EDITOR_CONFIG } from './hooks/useSettings'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoFollow } from './hooks/useAutoFollow'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { useClaudeContext } from './hooks/useClaudeContext'
import { useChatHistory } from './hooks/useChatHistory'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { ThreadsPanel } from './components/ai/ThreadsPanel'
import { BottomPanel } from './components/layout/BottomPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { PluginBrowser } from './components/plugins/PluginBrowser'

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pluginBrowserOpen, setPluginBrowserOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState<'files' | 'threads'>('files')

  const themeState = useTheme()
  const { settings, addMcpServer, removeMcpServer, setMcpPermission, setKeybinding, setEditorConfig } = useSettings()

  const {
    project,
    openFiles,
    activeFilePath,
    openFolder,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile
  } = useProject()

  const layout = usePanelLayout()

  const autoFollow = useAutoFollow({
    rootPath: project.rootPath,
    openFiles,
    openFile,
    updateFileContent,
    setActiveFile
  })

  const { systemPrompt, hasContext } = useClaudeContext(project.rootPath ?? null)

  const chatHistory = useChatHistory()

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel,
    onSaveFile: () => activeFilePath && saveFile(activeFilePath),
    onOpenFolder: openFolder,
    onOpenSettings: () => setSettingsOpen(true),
    keybindings: settings?.keybindings
  })

  const handleToggleSidebar = useCallback(() => {
    if (sidebarView !== 'files') {
      setSidebarView('files')
      if (!layout.sidebarVisible) layout.toggleSidebar()
    } else {
      layout.toggleSidebar()
    }
  }, [sidebarView, layout])

  const handleShowThreads = useCallback(() => {
    if (sidebarView !== 'threads') {
      setSidebarView('threads')
      if (!layout.sidebarVisible) layout.toggleSidebar()
    } else {
      layout.toggleSidebar()
    }
  }, [sidebarView, layout])

  const activeProvider = settings?.activeProvider ?? 'anthropic'
  const activeModel = settings?.providers[activeProvider]?.model ?? ''

  const handleNewThread = useCallback(async () => {
    const session = await chatHistory.createSession(
      'New Thread',
      activeProvider,
      activeModel
    )
    chatHistory.setCurrentSessionId(session.id)
  }, [chatHistory, activeProvider, activeModel])

  return (
    <>
      <AppLayout
        layout={layout}
        menuBar={
          <MenuBar
            projectName={project.name}
            onOpenFolder={openFolder}
            onSave={() => activeFilePath && saveFile(activeFilePath)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        }
        activityBar={
          <ActivityBar
            sidebarVisible={layout.sidebarVisible}
            sidebarView={sidebarView}
            aiPanelVisible={layout.aiPanelVisible}
            bottomPanelVisible={layout.bottomPanelVisible}
            pluginBrowserOpen={pluginBrowserOpen}
            onToggleSidebar={handleToggleSidebar}
            onShowThreads={handleShowThreads}
            onToggleAiPanel={layout.toggleAiPanel}
            onToggleBottomPanel={layout.toggleBottomPanel}
            onTogglePluginBrowser={() => setPluginBrowserOpen(v => !v)}
          />
        }
        sidebar={
          sidebarView === 'threads' ? (
            <ThreadsPanel
              sessions={chatHistory.sessions}
              currentSessionId={chatHistory.currentSessionId}
              searchResults={chatHistory.searchResults}
              searchQuery={chatHistory.searchQuery}
              onSelect={chatHistory.setCurrentSessionId}
              onNew={handleNewThread}
              onRename={chatHistory.renameSession}
              onArchive={chatHistory.archiveSession}
              onDelete={chatHistory.deleteSession}
              onSearch={chatHistory.search}
              onClearSearch={chatHistory.clearSearch}
            />
          ) : (
            <FileTree
              rootPath={project.rootPath}
              activeFilePath={activeFilePath}
              onOpenFile={openFile}
            />
          )
        }
        editor={
          <EditorArea
            openFiles={openFiles}
            activeFilePath={activeFilePath}
            onActivate={setActiveFile}
            onClose={closeFile}
            onContentChange={updateFileContent}
            onSave={saveFile}
            monacoTheme={themeState.monacoTheme}
            editorConfig={settings?.editor ?? DEFAULT_EDITOR_CONFIG}
          />
        }
        aiPanel={
          <AIChatPanel
            autoFollowEnabled={autoFollow.enabled}
            onToggleAutoFollow={autoFollow.toggle}
            systemPrompt={systemPrompt ?? undefined}
            hasClaudeContext={hasContext}
            currentSessionId={chatHistory.currentSessionId}
            onCreateSession={chatHistory.createSession}
            onSetSessionId={chatHistory.setCurrentSessionId}
            onSaveMessage={chatHistory.saveMessage}
            activeProvider={activeProvider}
            activeModel={activeModel}
          />
        }
        bottomPanel={<BottomPanel rootPath={project.rootPath} />}
        statusBar={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 12px',
            gap: 16,
            fontSize: 11,
            color: 'rgba(255,255,255,0.65)'
          }}>
            <span>main</span>
            <div style={{ flex: 1 }} />
            {project.name && <span>{project.name}</span>}
          </div>
        }
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={themeState.theme}
        customPrimary={themeState.customPrimary}
        customAccent={themeState.customAccent}
        onSetTheme={themeState.setTheme}
        onSetCustomColors={themeState.setCustomColors}
        mcpServers={settings?.mcpServers ?? []}
        mcpPermission={settings?.mcpPermission ?? 'full'}
        onAddMcpServer={addMcpServer}
        onRemoveMcpServer={removeMcpServer}
        onSetMcpPermission={setMcpPermission}
        keybindings={settings?.keybindings}
        onSetKeybinding={setKeybinding}
        editorConfig={settings?.editor ?? DEFAULT_EDITOR_CONFIG}
        onSetEditorConfig={setEditorConfig}
        currentFolder={project.rootPath}
      />

      {pluginBrowserOpen && (
        <div
          onClick={() => setPluginBrowserOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 520,
              maxHeight: '80vh',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Plugin Marketplace</span>
              <button
                data-flat
                onClick={() => setPluginBrowserOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <PluginBrowser rootPath={project.rootPath} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
