interface QueueDisplayProps {
  queue: string[]
  retryCountdown: number | null
  onRemove(index: number): void
  onClearQueue(): void
}

export function QueueDisplay({ queue, retryCountdown, onRemove, onClearQueue }: QueueDisplayProps) {
  if (queue.length === 0 && retryCountdown === null) return null

  return (
    <div
      data-testid="queue-display"
      style={{
        borderTop: '1px solid var(--border)',
        padding: '6px 12px',
        background: 'var(--bg-primary)',
        flexShrink: 0
      }}
    >
      {retryCountdown !== null && (
        <div
          data-testid="retry-countdown"
          style={{
            fontSize: 11,
            color: '#f59e0b',
            marginBottom: queue.length > 0 ? 6 : 0,
            padding: '2px 0'
          }}
        >
          Rate limited — retrying in {retryCountdown}s
        </div>
      )}

      {queue.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4
          }}>
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Queued ({queue.length})
            </span>
            <button
              onClick={onClearQueue}
              aria-label="Clear queue"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                color: 'var(--text-muted)',
                padding: '1px 4px'
              }}
            >
              Clear all
            </button>
          </div>

          {queue.map((text, i) => (
            <div
              key={i}
              data-testid={`queue-item-${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
            >
              <span style={{
                flex: 1,
                fontSize: 11,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {text}
              </span>
              <button
                onClick={() => onRemove(i)}
                aria-label={`Remove queued prompt ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '1px 3px',
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
