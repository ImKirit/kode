import { useState, useEffect } from 'react'
import { X, Lock, Globe } from 'lucide-react'

interface CreateRepoDialogProps {
  onClose(): void
  onCreate(repo: { id: number; name: string; fullName: string; private: boolean; cloneUrl: string; description: string | null }): void
}

export function CreateRepoDialog({ onClose, onCreate }: CreateRepoDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [autoInit, setAutoInit] = useState(true)
  const [gitignoreTemplate, setGitignoreTemplate] = useState<string | null>(null)
  const [license, setLicense] = useState<string | null>(null)
  const [templates, setTemplates] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.kode.github.getGitignoreTemplates().then(setTemplates).catch(() => {})
  }, [])

  const nameError = name && !/^[a-zA-Z0-9._-]+$/.test(name)

  async function handleCreate() {
    if (!name.trim() || nameError) return
    setCreating(true)
    setError(null)
    try {
      const repo = await window.kode.github.createRepo({
        name: name.trim(),
        description,
        private: isPrivate,
        autoInit,
        gitignoreTemplate,
        license
      })
      onCreate(repo as Parameters<typeof onCreate>[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }} />
      <div
        role="dialog"
        aria-label="Create repository"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 440, background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          zIndex: 1101, overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Create new repository</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Repository name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-project"
              style={{
                width: '100%', boxSizing: 'border-box', background: 'var(--bg-input)',
                border: `1px solid ${nameError ? '#f87171' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 13,
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
              }}
            />
            {nameError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Only letters, numbers, -, _ and . allowed</div>}
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description..."
              style={{
                width: '100%', boxSizing: 'border-box', background: 'var(--bg-input)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Visibility */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Visibility</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ value: false, icon: <Globe size={14} />, label: 'Public' }, { value: true, icon: <Lock size={14} />, label: 'Private' }].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setIsPrivate(opt.value)}
                  style={{
                    flex: 1, padding: '8px 12px', border: `2px solid ${isPrivate === opt.value ? 'var(--kode-btn)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', background: isPrivate === opt.value ? 'var(--kode-selection)' : 'var(--bg-input)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 12, color: isPrivate === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isPrivate === opt.value ? 600 : 400
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Init options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={autoInit} onChange={e => setAutoInit(e.target.checked)} />
              Initialize with README
            </label>
          </div>

          {/* .gitignore template */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>.gitignore template</label>
            <select
              value={gitignoreTemplate ?? ''}
              onChange={e => setGitignoreTemplate(e.target.value || null)}
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12,
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer'
              }}
            >
              <option value="">None</option>
              {templates.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 16px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !!nameError || creating}
            style={{
              background: !name.trim() || !!nameError ? 'var(--border)' : 'var(--kode-btn)',
              border: 'none', borderRadius: 'var(--radius-sm)', padding: '7px 16px',
              fontSize: 12, color: !name.trim() || !!nameError ? 'var(--text-muted)' : 'var(--kode-btn-fg)',
              cursor: 'pointer', fontWeight: 500
            }}
          >
            {creating ? 'Creating...' : 'Create repository'}
          </button>
        </div>
      </div>
    </>
  )
}
