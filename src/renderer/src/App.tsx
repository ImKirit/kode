import { useProject } from './hooks/useProject'
import { AppLayout } from './components/layout/AppLayout'
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

  return (
    <AppLayout
      menuBar={
        <MenuBar
          projectName={project.name}
          onOpenFolder={openFolder}
          onSave={() => activeFilePath && saveFile(activeFilePath)}
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
