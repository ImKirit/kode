import type { EditorConfig } from '../../hooks/useSettings'

interface EditorSettingsProps {
  config: EditorConfig
  onChange(config: EditorConfig): void
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      marginBottom: 12, marginTop: 20
    }}>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: '1px solid var(--kode-border-dim)'
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange(v: boolean): void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: value ? 'var(--kode-btn)' : 'var(--border)',
        position: 'relative', flexShrink: 0, transition: 'background 0.15s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: value ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
        transition: 'left 0.15s'
      }} />
    </button>
  )
}

function NumberStepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange(v: number): void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer',
          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        −
      </button>
      <span style={{
        width: 28, textAlign: 'center', fontSize: 13, fontWeight: 600,
        color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer',
          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        +
      </button>
    </div>
  )
}

function SegmentedControl<T extends string>({ value, options, labels, onChange }: {
  value: T; options: T[]; labels?: Record<T, string>; onChange(v: T): void
}) {
  return (
    <div style={{
      display: 'flex', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)', overflow: 'hidden'
    }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '3px 10px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: value === opt ? 'var(--kode-btn)' : 'var(--bg-input)',
            color: value === opt ? 'var(--kode-btn-fg)' : 'var(--text-secondary)',
            fontWeight: value === opt ? 600 : 400,
            borderRight: '1px solid var(--border)'
          }}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

export function EditorSettings({ config, onChange }: EditorSettingsProps) {
  function set<K extends keyof EditorConfig>(key: K, val: EditorConfig[K]) {
    onChange({ ...config, [key]: val })
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <SectionLabel>Font</SectionLabel>
      <Row label="Font Size">
        <NumberStepper value={config.fontSize} min={10} max={24} onChange={v => set('fontSize', v)} />
      </Row>
      <Row label="Tab Size">
        <SegmentedControl<number>
          value={config.tabSize}
          options={[2, 4]}
          labels={{ 2: '2', 4: '4' }}
          onChange={v => set('tabSize', v)}
        />
      </Row>

      <SectionLabel>Display</SectionLabel>
      <Row label="Minimap">
        <Toggle value={config.minimap} onChange={v => set('minimap', v)} />
      </Row>
      <Row label="Word Wrap">
        <Toggle value={config.wordWrap === 'on'} onChange={v => set('wordWrap', v ? 'on' : 'off')} />
      </Row>
      <Row label="Line Numbers">
        <SegmentedControl<'on' | 'off' | 'relative'>
          value={config.lineNumbers}
          options={['on', 'relative', 'off']}
          labels={{ on: 'On', relative: 'Relative', off: 'Off' }}
          onChange={v => set('lineNumbers', v)}
        />
      </Row>
    </div>
  )
}
