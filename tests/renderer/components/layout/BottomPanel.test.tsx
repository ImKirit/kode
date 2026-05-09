import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomPanel } from '@renderer/components/layout/BottomPanel'

vi.mock('@renderer/components/terminal/TerminalPanel', () => ({
  TerminalPanel: () => <div data-testid="terminal-panel">Terminal</div>
}))

vi.mock('@renderer/components/git/ChangesView', () => ({
  ChangesView: ({ rootPath }: { rootPath: string | null }) => (
    <div data-testid="changes-view" data-rootpath={rootPath}>Changes</div>
  )
}))

describe('BottomPanel', () => {
  it('shows Terminal tab by default', () => {
    render(<BottomPanel rootPath="/project" />)
    expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('changes-view')).not.toBeInTheDocument()
  })

  it('switches to Changes tab when clicked', () => {
    render(<BottomPanel rootPath="/project" />)
    fireEvent.click(screen.getByRole('button', { name: /changes/i }))
    expect(screen.getByTestId('changes-view')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
  })

  it('switches back to Terminal tab', () => {
    render(<BottomPanel rootPath="/project" />)
    fireEvent.click(screen.getByRole('button', { name: /changes/i }))
    fireEvent.click(screen.getByRole('button', { name: /terminal/i }))
    expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()
  })

  it('passes rootPath to ChangesView', () => {
    render(<BottomPanel rootPath="/my/project" />)
    fireEvent.click(screen.getByRole('button', { name: /changes/i }))
    expect(screen.getByTestId('changes-view')).toHaveAttribute('data-rootpath', '/my/project')
  })

  it('Terminal button has aria-pressed=true by default', () => {
    render(<BottomPanel rootPath="/project" />)
    expect(screen.getByRole('button', { name: /terminal/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /changes/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('passes null rootPath to ChangesView', () => {
    render(<BottomPanel rootPath={null} />)
    fireEvent.click(screen.getByRole('button', { name: /changes/i }))
    expect(screen.getByTestId('changes-view')).not.toHaveAttribute('data-rootpath')
  })
})
