import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

const API = 'http://localhost:3001/api'

const TYPE_COLORS = {
  phishing: { bg: 'rgba(255,34,68,0.12)', color: '#ff6677', border: 'rgba(255,34,68,0.25)' },
  social_engineering: { bg: 'rgba(240,192,64,0.12)', color: '#f0c040', border: 'rgba(240,192,64,0.25)' },
  credential_theft: { bg: 'rgba(200,100,255,0.12)', color: '#cc77ff', border: 'rgba(200,100,255,0.25)' },
  impersonation: { bg: 'rgba(100,180,255,0.12)', color: '#60aaff', border: 'rgba(100,180,255,0.25)' },
  urgency_manipulation: { bg: 'rgba(255,140,60,0.12)', color: '#ff8c3c', border: 'rgba(255,140,60,0.25)' },
}

export default function ThreatLedger({ refreshTrigger }) {
  const { token } = useAuth()
  const [threats, setThreats] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [threatRes, statsRes] = await Promise.all([
        fetch(`${API}/threats?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/threats/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const threatData = await threatRes.json()
      const statsData = await statsRes.json()
      setThreats(threatData.threats || [])
      setStats(statsData)
    } catch (e) {
      console.error('Failed to load threats:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [refreshTrigger])

  const deleteTheat = async (id) => {
    await fetch(`${API}/threats/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchData()
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '12px' }}>
      Loading Threat Ledger...
    </div>
  )

  return (
    <div style={styles.wrapper}>
      {/* Stats row */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statPill}>
            <span style={{ color: 'var(--red-primary)' }}>{stats.total}</span>
            <span style={styles.statLabel}>TOTAL VARIANTS</span>
          </div>
          {stats.byType?.map(t => {
            const c = TYPE_COLORS[t._id] || TYPE_COLORS.phishing
            return (
              <div key={t._id} style={{ ...styles.statPill, background: c.bg, border: `1px solid ${c.border}` }}>
                <span style={{ color: c.color }}>{t.count}</span>
                <span style={styles.statLabel}>{t._id?.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['TYPE', 'EVOLVED PAYLOAD', 'GEN', 'CONF.', 'CREATED', 'ACTION'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threats.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-dim)', padding: '32px' }}>
                  No threats in ledger yet. Run the mutation engine to populate.
                </td>
              </tr>
            )}
            {threats.map(t => {
              const c = TYPE_COLORS[t.threat_type] || TYPE_COLORS.phishing
              const isExpanded = expanded === t._id
              return (
                <>
                  <tr
                    key={t._id}
                    style={{ ...styles.tr, cursor: 'pointer' }}
                    onClick={() => setExpanded(isExpanded ? null : t._id)}
                  >
                    <td style={styles.td}>
                      <span style={{ ...styles.typeBadge, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {t.threat_type?.replace(/_/g, '_')}
                      </span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: '320px' }}>
                      <div style={styles.payloadPreview}>
                        {t.evolved_text?.substring(0, 80)}{t.evolved_text?.length > 80 ? '...' : ''}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>G{t.mutation_generation}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: 'var(--green-primary)', fontFamily: 'var(--font-mono)' }}>{t.confidence_threshold}%</span>
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.deleteBtn}
                        onClick={(e) => { e.stopPropagation(); deleteTheat(t._id) }}
                      >✕</button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${t._id}-expanded`}>
                      <td colSpan={6} style={styles.expandedTd}>
                        <div style={styles.expandedContent}>
                          <div style={styles.expandedSection}>
                            <div style={styles.expandedLabel}>BASELINE PAYLOAD</div>
                            <div style={styles.expandedText}>{t.baseline_text}</div>
                          </div>
                          <div style={styles.expandedSection}>
                            <div style={{ ...styles.expandedLabel, color: 'var(--amber)' }}>EVOLVED ZERO-DAY PAYLOAD</div>
                            <div style={{ ...styles.expandedText, color: 'var(--amber)' }}>{t.evolved_text}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '16px' },
  statsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  statPill: {
    background: 'var(--red-dim)',
    border: '1px solid var(--border-accent)',
    borderRadius: '4px',
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  statLabel: { fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' },
  tableWrapper: { overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    color: 'var(--text-dim)',
    fontSize: '10px',
    letterSpacing: '1.5px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s',
  },
  td: { padding: '12px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)' },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  payloadPreview: { color: 'var(--text-primary)', fontSize: '12px', lineHeight: 1.4 },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,34,68,0.2)',
    color: 'var(--red-primary)',
    borderRadius: '3px',
    padding: '3px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.15s',
  },
  expandedTd: { padding: 0 },
  expandedContent: {
    background: 'rgba(240,192,64,0.03)',
    borderTop: '1px solid rgba(240,192,64,0.1)',
    padding: '16px 24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  expandedSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  expandedLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    letterSpacing: '2px',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  expandedText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    background: 'var(--bg-card)',
    padding: '10px 14px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
  },
}
