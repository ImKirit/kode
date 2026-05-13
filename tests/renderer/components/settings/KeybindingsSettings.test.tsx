import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeybindingsSettings } from '../../../../src/renderer/src/components/settings/KeybindingsSettings'
import { DEFAULT_KEYBINDINGS } from '../../../../src/renderer/src/styles/keybindings'

describe('KeybindingsSettings', () => {
  it('renders all action labels', () => {
    render(<KeybindingsSettings keybindings={{}} onSetKeybinding={vi.fn()} />)
    expect(screen.getByText('Toggle Sidebar')).toBeTruthy()
    expect(screen.getByText('Toggle Terminal')).toBeTruthy()
    expect(screen.getByText('Toggle AI Panel')).toBeTruthy()
    expect(screen.getByText('Save File')).toBeTruthy()
  })

  it('shows default keybindings', () => {
    render(<KeybindingsSettings keybindings={{}} onSetKeybinding={vi.fn()} />)
    expect(screen.getByText(DEFAULT_KEYBINDINGS.toggleSidebar)).toBeTruthy()
    expect(screen.getByText(DEFAULT_KEYBINDINGS.saveFile)).toBeTruthy()
  })

  it('shows custom override when provided', () => {
    render(
      <KeybindingsSettings
        keybindings={{ toggleSidebar: 'Ctrl+E' }}
        onSetKeybinding={vi.fn()}
      />
    )
    expect(screen.getByText('Ctrl+E')).toBeTruthy()
  })

  it('enters recording mode when row clicked', () => {
    render(<KeybindingsSettings keybindings={{}} onSetKeybinding={vi.fn()} />)
    const editBtn = screen.getAllByTitle('Edit')[0]
    fireEvent.click(editBtn)
    expect(screen.getByText(/Press a key/i)).toBeTruthy()
  })

  it('calls onSetKeybinding with recorded key', () => {
    const onSetKeybinding = vi.fn()
    render(<KeybindingsSettings keybindings={{}} onSetKeybinding={onSetKeybinding} />)
    fireEvent.click(screen.getAllByTitle('Edit')[0])
    fireEvent.keyDown(document, { key: 'E', ctrlKey: true })
    expect(onSetKeybinding).toHaveBeenCalledWith(
      expect.any(String),
      'Ctrl+E'
    )
  })

  it('cancels recording on Escape', () => {
    render(<KeybindingsSettings keybindings={{}} onSetKeybinding={vi.fn()} />)
    fireEvent.click(screen.getAllByTitle('Edit')[0])
    expect(screen.getByText(/Press a key/i)).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText(/Press a key/i)).toBeNull()
  })

  it('shows Reset button for overridden binding', () => {
    render(
      <KeybindingsSettings
        keybindings={{ toggleSidebar: 'Ctrl+E' }}
        onSetKeybinding={vi.fn()}
      />
    )
    expect(screen.getByTitle('Reset to default')).toBeTruthy()
  })

  it('calls onSetKeybinding with empty string on Reset', () => {
    const onSetKeybinding = vi.fn()
    render(
      <KeybindingsSettings
        keybindings={{ toggleSidebar: 'Ctrl+E' }}
        onSetKeybinding={onSetKeybinding}
      />
    )
    fireEvent.click(screen.getByTitle('Reset to default'))
    expect(onSetKeybinding).toHaveBeenCalledWith('toggleSidebar', '')
  })
})
