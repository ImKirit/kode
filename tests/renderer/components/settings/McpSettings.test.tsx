import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { McpSettings } from '../../../../src/renderer/src/components/settings/McpSettings'

const baseProps = {
  servers: [],
  permission: 'full' as const,
  onAddServer: vi.fn(),
  onRemoveServer: vi.fn(),
  onSetPermission: vi.fn()
}

describe('McpSettings', () => {
  it('shows built-in Filesystem server', () => {
    render(<McpSettings {...baseProps} />)
    expect(screen.getByText('Filesystem')).toBeTruthy()
  })

  it('shows built-in Shell server', () => {
    render(<McpSettings {...baseProps} />)
    expect(screen.getByText('Shell')).toBeTruthy()
  })

  it('shows Full Access button active when permission is full', () => {
    render(<McpSettings {...baseProps} permission="full" />)
    expect(screen.getByText('Full Access')).toBeTruthy()
  })

  it('shows Ask button', () => {
    render(<McpSettings {...baseProps} />)
    expect(screen.getByText('Ask')).toBeTruthy()
  })

  it('calls onSetPermission("ask") when Ask clicked', () => {
    const onSetPermission = vi.fn()
    render(<McpSettings {...baseProps} onSetPermission={onSetPermission} />)
    fireEvent.click(screen.getByText('Ask'))
    expect(onSetPermission).toHaveBeenCalledWith('ask')
  })

  it('renders custom server name in list', () => {
    render(<McpSettings {...baseProps} servers={[
      { id: 'srv1', name: 'My GitHub', type: 'stdio', command: 'npx', args: ['@github/mcp'] }
    ]} />)
    expect(screen.getByText('My GitHub')).toBeTruthy()
  })

  it('calls onRemoveServer when Remove clicked', () => {
    const onRemoveServer = vi.fn()
    render(<McpSettings {...baseProps}
      servers={[{ id: 'srv1', name: 'Test Server', type: 'stdio', command: 'echo' }]}
      onRemoveServer={onRemoveServer}
    />)
    fireEvent.click(screen.getByText('Remove'))
    expect(onRemoveServer).toHaveBeenCalledWith('srv1')
  })

  it('shows MCP integrations link text', () => {
    render(<McpSettings {...baseProps} />)
    expect(screen.getByText(/MCP integrations directory/i)).toBeTruthy()
  })

  it('shows ask AI instruction text', () => {
    render(<McpSettings {...baseProps} />)
    expect(screen.getByText(/ask the AI/i)).toBeTruthy()
  })
})
