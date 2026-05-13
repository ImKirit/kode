import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from '@renderer/components/settings/SettingsPanel'

const mockSetTheme = vi.fn()
const mockSetCustomColors = vi.fn()
const mockOnClose = vi.fn()

const defaultProps = {
  open: true,
  onClose: mockOnClose,
  theme: 'light' as const,
  customPrimary: '#f5f5f5',
  customAccent: '#0e9de8',
  onSetTheme: mockSetTheme,
  onSetCustomColors: mockSetCustomColors
}

beforeEach(() => {
  mockSetTheme.mockClear()
  mockSetCustomColors.mockClear()
  mockOnClose.mockClear()
})

describe('SettingsPanel', () => {
  it('renders nothing when open=false', () => {
    render(<SettingsPanel {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open=true', () => {
    render(<SettingsPanel {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    render(<SettingsPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /close settings/i }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSetTheme("dark") when Dark button clicked', () => {
    render(<SettingsPanel {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('shows custom color pickers when Custom theme selected', () => {
    render(<SettingsPanel {...defaultProps} theme="custom" />)
    expect(screen.getByLabelText(/background hex/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accent hex/i)).toBeInTheDocument()
  })
})
