import { useState, useEffect, useCallback } from 'react'
import { Server, CheckCircle, XCircle, Play, Download } from 'lucide-react'

interface DeployConfig {
  ip: string
  user: string
  keyPath: string
  workDir: string
}

export function DeploySettings() {
  const [config, setConfig] = useState<DeployConfig>({ ip: '', user: 'root', keyPath: '', workDir: '~/kode-deploy' })
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; info?: string; error?: string } | null>(null)
  const [settingUp, setSettingUp] = useState(false)
  const [setupOutput, setSetupOutput] = useState<string | null>(null)
  const [command, setCommand] = useState('')
  const [executing, setExecuting] = useState(false)
  const [execOutput, setExecOutput] = useState<string | null>(null)

  useEffect(() => {
    window.kode.deploy.getConfig().then(c => {
      if (c) setConfig(c)
    }).catch(() => {})
  }, [])

  const handleSave = useCallback(async () => {
    await window.kode.deploy.setConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setTestResult(null)
  }, [config])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    const result = await window.kode.deploy.testConnection()
    setTestResult(result)
    setTesting(false)
  }, [])

  const handleSetup = useCallback(async () => {
    setSettingUp(true)
    setSetupOutput(null)
    const result = await window.kode.deploy.setup()
    setSetupOutput(result.output ?? result.error ?? 'Done')
    setSettingUp(false)
  }, [])

  const handleExecute = useCallback(async () => {
    if (!command.trim()) return
    setExecuting(true)
    setExecOutput(null)
    const result = await window.kode.deploy.execute(command.trim())
    setExecOutput(result.output ?? result.error ?? '')
    setExecuting(false)
  }, [command])

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Server size={16} style={{ color: 'var(--text-secondary)' }} />
        <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          SSH Server
        </h3>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Configure a remote server for deployment. Your tasks can continue running on the server even after you shut down your PC.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <Field label="IP Address / Hostname">
          <input
            value={config.ip}
            onChange={e => setConfig(c => ({ ...c, ip: e.target.value }))}
            placeholder="192.168.1.100 or myserver.com"
            style={inputStyle}
          />
        </Field>

        <Field label="SSH User">
          <input
            value={config.user}
            onChange={e => setConfig(c => ({ ...c, user: e.target.value }))}
            placeholder="root"
            style={inputStyle}
          />
        </Field>

        <Field label="SSH Key Path (optional)">
          <input
            value={config.keyPath}
            onChange={e => setConfig(c => ({ ...c, keyPath: e.target.value }))}
            placeholder="~/.ssh/id_rsa or leave empty for default"
            style={inputStyle}
          />
        </Field>

        <Field label="Remote Work Directory">
          <input
            value={config.workDir}
            onChange={e => setConfig(c => ({ ...c, workDir: e.target.value }))}
            placeholder="~/kode-deploy"
            style={inputStyle}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={handleSave}
          style={{
            background: 'var(--kode-btn)', border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '7px 16px', fontSize: 12, color: 'var(--kode-btn-fg)', cursor: 'pointer', fontWeight: 500
          }}
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !config.ip}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            padding: '7px 14px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer'
          }}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
          background: testResult.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${testResult.ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: testResult.info ? 6 : 0 }}>
            {testResult.ok
              ? <CheckCircle size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
              : <XCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
            }
            <span style={{ fontSize: 12, color: testResult.ok ? '#4ade80' : '#f87171', fontWeight: 500 }}>
              {testResult.ok ? 'Connection successful' : 'Connection failed'}
            </span>
          </div>
          {(testResult.info ?? testResult.error) && (
            <pre style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'monospace' }}>
              {testResult.info ?? testResult.error}
            </pre>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>First-time Server Setup</span>
          <button
            onClick={handleSetup}
            disabled={settingUp || !config.ip}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer'
            }}
          >
            <Download size={12} />
            {settingUp ? 'Setting up...' : 'Run Setup'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Installs Node.js, Git and creates the work directory. Safe to run multiple times.
        </p>
        {setupOutput && (
          <pre style={{
            marginTop: 10, padding: '8px 10px', background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)',
            whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto', fontFamily: 'monospace'
          }}>
            {setupOutput}
          </pre>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Remote Command</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleExecute() }}
            placeholder="e.g. node server.js &"
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
          />
          <button
            onClick={handleExecute}
            disabled={executing || !command.trim() || !config.ip}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--kode-btn)', border: 'none', borderRadius: 'var(--radius-sm)',
              padding: '7px 12px', fontSize: 12, color: 'var(--kode-btn-fg)', cursor: 'pointer', flexShrink: 0
            }}
          >
            <Play size={12} />
            {executing ? 'Running...' : 'Run'}
          </button>
        </div>
        {execOutput !== null && (
          <pre style={{
            marginTop: 8, padding: '8px 10px', background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)',
            whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto', fontFamily: 'monospace'
          }}>
            {execOutput || '(no output)'}
          </pre>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '7px 10px', fontSize: 12,
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
