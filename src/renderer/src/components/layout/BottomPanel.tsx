import { useState, CSSProperties } from 'react'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { ChangesView } from '../git/ChangesView'

type BottomTab = 'terminal' | 'changes'

interface BottomPanelProps {
  rootPath: string | null
}

export function BottomPanel({ rootPath }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')

  const tabStyle = (tab: BottomTab): CSSProperties => ({
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--kode-btn)' : '2px solid transparent',
    cursor: 'pointer',
    padding: '5px 16px',
    fontSize: 11,
    fontWeight: activeTab === tab ? 600 : 400,
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
    transition: 'color var(--transition-fast)'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        paddingLeft: 4
      }}>
        <button
          onClick={() => setActiveTab('terminal')}
          aria-pressed={activeTab === 'terminal'}
          aria-label="Terminal"
          style={tabStyle('terminal')}
        >
          Terminal
        </button>
        <button
          onClick={() => setActiveTab('changes')}
          aria-pressed={activeTab === 'changes'}
          aria-label="Changes"
          style={tabStyle('changes')}
        >
          Changes
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'terminal' ? <TerminalPanel /> : <ChangesView rootPath={rootPath} />}
      </div>
    </div>
  )
}
