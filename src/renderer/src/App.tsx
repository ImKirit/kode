import { useState } from 'react'
import { useProject } from './hooks/useProject'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAutoFollow } from './hooks/useAutoFollow'
import { useTheme } from './hooks/useTheme'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { BottomPanel } from './components/layout/BottomPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const themeState = useTheme()

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

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel
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
            onToggleSidebar={layout.toggleSidebar}
            onToggleAiPanel={layout.toggleAiPanel}
            onToggleBottomPanel={layout.toggleBottomPanel}
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
      />
    </>
  )
}
