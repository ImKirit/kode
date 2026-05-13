import { describe, it, expect } from 'vitest'
import {
  formatKey,
  matchesKey,
  mergeKeybindings,
  DEFAULT_KEYBINDINGS,
  ACTION_LABELS
} from '../../../src/renderer/src/styles/keybindings'

function makeEvent(key: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
    metaKey: false
  } as KeyboardEvent
}

describe('formatKey', () => {
  it('formats Ctrl+B', () => {
    expect(formatKey(makeEvent('b', { ctrl: true }))).toBe('Ctrl+B')
  })

  it('formats Ctrl+Shift+A', () => {
    expect(formatKey(makeEvent('A', { ctrl: true, shift: true }))).toBe('Ctrl+Shift+A')
  })

  it('formats plain letter', () => {
    expect(formatKey(makeEvent('s'))).toBe('S')
  })

  it('formats special key Escape', () => {
    expect(formatKey(makeEvent('Escape'))).toBe('Escape')
  })

  it('ignores modifier-only events', () => {
    expect(formatKey(makeEvent('Shift', { shift: true }))).toBe('Shift')
  })
})

describe('matchesKey', () => {
  it('matches Ctrl+B', () => {
    expect(matchesKey(makeEvent('b', { ctrl: true }), 'Ctrl+B')).toBe(true)
  })

  it('does not match different modifier', () => {
    expect(matchesKey(makeEvent('b', { ctrl: true }), 'Ctrl+Shift+B')).toBe(false)
  })

  it('does not match different key', () => {
    expect(matchesKey(makeEvent('c', { ctrl: true }), 'Ctrl+B')).toBe(false)
  })
})

describe('mergeKeybindings', () => {
  it('returns defaults when no overrides', () => {
    const kb = mergeKeybindings()
    expect(kb.toggleSidebar).toBe('Ctrl+B')
    expect(kb.saveFile).toBe('Ctrl+S')
  })

  it('applies overrides on top of defaults', () => {
    const kb = mergeKeybindings({ toggleSidebar: 'Ctrl+E' })
    expect(kb.toggleSidebar).toBe('Ctrl+E')
    expect(kb.saveFile).toBe('Ctrl+S') // untouched
  })

  it('handles undefined overrides gracefully', () => {
    expect(() => mergeKeybindings(undefined)).not.toThrow()
  })
})

describe('DEFAULT_KEYBINDINGS', () => {
  it('has toggleSidebar as Ctrl+B', () => {
    expect(DEFAULT_KEYBINDINGS.toggleSidebar).toBe('Ctrl+B')
  })

  it('has toggleBottomPanel as Ctrl+J', () => {
    expect(DEFAULT_KEYBINDINGS.toggleBottomPanel).toBe('Ctrl+J')
  })
})

describe('ACTION_LABELS', () => {
  it('has a label for every action in DEFAULT_KEYBINDINGS', () => {
    for (const action of Object.keys(DEFAULT_KEYBINDINGS)) {
      expect(ACTION_LABELS[action as keyof typeof ACTION_LABELS]).toBeTruthy()
    }
  })
})
