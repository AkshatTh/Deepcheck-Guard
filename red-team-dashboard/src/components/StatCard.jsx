export default function StatCard({ value, label, accent = 'red', sublabel }) {
  const colors = {
    red: { value: 'var(--red-primary)', glow: 'var(--red-glow)', bg: 'var(--red-dim)', border: 'var(--border-accent)' },
    green: { value: 'var(--green-primary)', glow: 'var(--green-glow)', bg: 'rgba(0,255,170,0.06)', border: 'rgba(0,255,170,0.2)' },
    amber: { value: 'var(--amber)', glow: 'rgba(240,192,64,0.3)', bg: 'var(--amber-dim)', border: 'rgba(240,192,64,0.2)' },
  }
  const c = colors[accent] || colors.red

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${c.value}, transparent)`,
        opacity: 0.6,
      }} />
      <div style={{
        fontSize: '36px', fontWeight: '700', color: c.value,
        fontFamily: 'var(--font-mono)',
        textShadow: `0 0 12px ${c.glow}`,
        lineHeight: 1,
        marginBottom: '6px',
      }}>{value}</div>
      <div style={{
        fontSize: '10px', letterSpacing: '2px',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
      }}>{label}</div>
      {sublabel && (
        <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}
