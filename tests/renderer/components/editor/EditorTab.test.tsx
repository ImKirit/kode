import { render, screen, fireEvent } from '@testing-library/react'
import { EditorTab } from '@renderer/components/editor/EditorTab'

describe('EditorTab', () => {
  const base = { path: '/a/index.ts', name: 'index.ts', active: false, dirty: false }

  it('renders file name', () => {
    render(<EditorTab {...base} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('shows dirty indicator when dirty=true', () => {
    render(<EditorTab {...base} dirty={true} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('dirty-dot')).toBeInTheDocument()
  })

  it('does not show dirty indicator when dirty=false', () => {
    render(<EditorTab {...base} dirty={false} onActivate={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByTestId('dirty-dot')).not.toBeInTheDocument()
  })

  it('calls onActivate when clicked', () => {
    const onActivate = vi.fn()
    render(<EditorTab {...base} onActivate={onActivate} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('index.ts'))
    expect(onActivate).toHaveBeenCalled()
  })

  it('calls onClose when close button clicked without triggering onActivate', () => {
    const onActivate = vi.fn()
    const onClose = vi.fn()
    render(<EditorTab {...base} onActivate={onActivate} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onActivate).not.toHaveBeenCalled()
  })
})
