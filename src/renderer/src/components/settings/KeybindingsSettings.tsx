import { useState, useEffect } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import {
  DEFAULT_KEYBINDINGS,
  ACTION_LABELS,
  formatKey,
  mergeKeybindings
} from '../../styles/keybindings'
import type { KeybindingAction } from '../../styles/keybindings'

interface KeybindingsSettingsProps {
  keybindings: Partial<Record<KeybindingAction, string>>
  onSetKeybinding(action: KeybindingAction, key: string): void
}

export function KeybindingsSettings({ keybindings, onSetKeybinding }: KeybindingsSettingsProps) {
  const [recordingAction, setRecordingAction] = useState<KeybindingAction | null>(null)
  const merged = mergeKeybindings(keybindings)

  useEffect(() => {
    if (!recordingAction) return

    function handler(e: KeyboardEvent) {
      e.preventDefault()
      if (e.key === 'Escape') {
        setRecordingAction(null)
        return
      }
      const key = formatKey(e)
      if (key && !['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        onSetKeybinding(recordingAction, key)
        setRecordingAction(null)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [recordingAction, onSetKeybinding])

  const actions = Object.keys(DEFAULT_KEYBINDINGS) as KeybindingAction[]

  return (
    <div>
      {recordingAction && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 12,
          background: 'var(--accent)',
          borderRadius: 6,
          fontSize: 12,
          color: '#fff',
          textAlign: 'center'
        }}>
          Press a key combination for "{ACTION_LABELS[recordingAction]}" — Esc to cancel
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Action
            </th>
            <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Keybinding
            </th>
            <th style={{ width: 60 }} />
          </tr>
        </thead>
        <tbody>
          {actions.map(action => {
            const current = merged[action]
            const isCustom = keybindings[action] != null && keybindings[action] !== ''
            const isRecording = recordingAction === action

            return (
              <tr key={action} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>
                  {ACTION_LABELS[action]}
                </td>
                <td style={{ padding: '8px 0' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: isRecording ? 'var(--accent)' : 'var(--bg-sidebar)',
                    border: `1px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: isRecording ? '#fff' : 'var(--text-primary)'
                  }}>
                    {current}
                  </span>
                </td>
                <td style={{ padding: '8px 0', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    data-flat
                    title="Edit"
                    onClick={() => setRecordingAction(action)}
                    style={{
                      width: 24, height: 24, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  {isCustom && (
                    <button
                      data-flat
                      title="Reset to default"
                      onClick={() => onSetKeybinding(action, '')}
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4
                      }}
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
