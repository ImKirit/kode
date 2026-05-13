import { useState } from 'react'
import { useProject } from './hooks/useProject'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoFollow } from './hooks/useAutoFollow'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { useClaudeContext } from './hooks/useClaudeContext'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { BottomPanel } from './components/layout/BottomPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { PluginBrowser } from './components/plugins/PluginBrowser'

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pluginBrowserOpen, setPluginBrowserOpen] = useState(false)

  const themeState = useTheme()
  const { settings, addMcpServer, removeMcpServer, setMcpPermission, setKeybinding } = useSettings()

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

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel,
    onSaveFile: () => activeFilePath && saveFile(activeFilePath),
    onOpenFolder: openFolder,
    onOpenSettings: () => setSettingsOpen(true),
    keybindings: settings?.keybindings
  })

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
            aiPanelVisible={layout.aiPanelVisible}
            bottomPanelVisible={layout.bottomPanelVisible}
            pluginBrowserOpen={pluginBrowserOpen}
            onToggleSidebar={layout.toggleSidebar}
            onToggleAiPanel={layout.toggleAiPanel}
            onToggleBottomPanel={layout.toggleBottomPanel}
            onTogglePluginBrowser={() => setPluginBrowserOpen(v => !v)}
          />
        }
        sidebar={
          <FileTree
            rootPath={project.rootPath}
            activeFilePath={activeFilePath}
            onOpenFile={openFile}
          />
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
          />
        }
        aiPanel={
          <AIChatPanel
            autoFollowEnabled={autoFollow.enabled}
            onToggleAutoFollow={autoFollow.toggle}
            systemPrompt={systemPrompt ?? undefined}
            hasClaudeContext={hasContext}
          />
        }
        bottomPanel={<BottomPanel rootPath={project.rootPath} />}
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
              <PluginBrowser />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
