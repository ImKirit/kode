import { useProject } from './hooks/useProject'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { TerminalPanel } from './components/terminal/TerminalPanel'

export function App() {
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

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel
  })

  return (
    <AppLayout
      layout={layout}
      menuBar={
        <MenuBar
          projectName={project.name}
          onOpenFolder={openFolder}
          onSave={() => activeFilePath && saveFile(activeFilePath)}
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
        />
      }
      aiPanel={<AIChatPanel />}
      bottomPanel={<TerminalPanel />}
    />
  )
}
