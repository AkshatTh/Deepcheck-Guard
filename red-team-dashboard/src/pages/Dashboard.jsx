import { useState } from 'react'
import { useAuth } from '../AuthContext'
import RedTeamOperations from '../components/RedTeamOperations'
import ThreatLedger from '../components/ThreatLedger'
import BlueteamEvolution from '../components/BlueteamEvolution'

const NAV_TABS = [
  { id: 'console', label: '▶ MUTATION ENGINE' },
  { id: 'evolution', label: '🔵 BLUE TEAM' },
  { id: 'ledger', label: '⬡ THREAT LEDGER' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('console')
  const [ledgerRefresh, setLedgerRefresh] = useState(0)
  const [liveEvents, setLiveEvents] = useState([])

  const handleMutationEvent = (event) => {
    setLiveEvents(prev => [...prev, event])
    if (event.type === 'rule_unlocked' || event.type === 'complete') {
      setLedgerRefresh(n => n + 1)
    }
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoGlyph}>◈</div>
          <div>
            <div style={styles.logoName}>DEEPCHECK</div>
            <div style={styles.logoSub}>RED TEAM OPS</div>
          </div>
        </div>

        <div style={styles.threatIndicator}>
          <div style={styles.threatDot} />
          <div>
            <div style={styles.threatLabel}>ENGINE STATUS</div>
            <div style={styles.threatValue}>ARMED</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.navBtn, ...(activeTab === tab.id ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.operatorBadge}>
            <span style={styles.operatorIcon}>◉</span>
            <div>
              <div style={styles.operatorName}>{user?.username?.toUpperCase()}</div>
              <div style={styles.operatorRole}>ADMIN OPERATOR</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>LOGOUT</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.pageTitle}>
              {activeTab === 'console' && '▶ ADVERSARIAL MUTATION ENGINE'}
              {activeTab === 'evolution' && '🔵 BLUE TEAM EVOLUTION'}
              {activeTab === 'ledger' && '⬡ PREDICTIVE THREAT LEDGER'}
            </div>
            <div style={styles.pageSubtitle}>
              {activeTab === 'console' && 'Red Team attacks → Blue Team learns → Zero-days found → Blue Team grows'}
              {activeTab === 'evolution' && 'Watch the Blue Team grow from Level 0 to Expert in real-time'}
              {activeTab === 'ledger' && 'All threat signatures — caught and zero-days'}
            </div>
          </div>
          <div style={styles.topbarBadge}>
            <span style={styles.liveDot} />
            LIVE SYSTEM
          </div>
        </div>

        <div style={styles.content}>
          {activeTab === 'console' && (
            <RedTeamOperations
              onMutationComplete={() => setLedgerRefresh(n => n + 1)}
              onEvent={handleMutationEvent}
            />
          )}
          {activeTab === 'evolution' && (
            <BlueteamEvolution liveEvents={liveEvents} />
          )}
          {activeTab === 'ledger' && (
            <ThreatLedger refreshTrigger={ledgerRefresh} />
          )}
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' },
  sidebar: {
    background: 'var(--bg-panel)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '20px 0',
    position: 'sticky', top: 0, height: '100vh',
  },
  sidebarLogo: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '24px',
  },
  logoGlyph: { fontSize: '28px', color: 'var(--red-primary)', textShadow: '0 0 16px var(--red-glow)', lineHeight: 1 },
  logoName: { fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--text-primary)' },
  logoSub: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', color: 'var(--red-primary)' },
  threatIndicator: {
    display: 'flex', alignItems: 'center', gap: '10px',
    margin: '0 20px 24px', padding: '10px 14px',
    background: 'var(--red-dim)', border: '1px solid var(--border-accent)', borderRadius: '6px',
  },
  threatDot: {
    width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red-primary)',
    boxShadow: '0 0 8px var(--red-glow)', animation: 'glow-pulse 2s infinite', flexShrink: 0,
  },
  threatLabel: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1.5px', color: 'var(--text-dim)' },
  threatValue: { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red-primary)', fontWeight: 'bold' },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px', flex: 1 },
  navBtn: {
    background: 'transparent',
    // Replace border: 'none' with specific properties
    borderTop: 'none',
    borderBottom: 'none',
    borderRight: 'none',
    borderLeft: '2px solid transparent', // Start with a transparent left border
    borderRadius: '6px',
    // Use specific padding to avoid shorthand collision
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingRight: '12px',
    paddingLeft: '12px',
    textAlign: 'left',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '1px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  navBtnActive: {
    background: 'var(--red-dim)',
    color: 'var(--red-primary)',
    borderLeft: '2px solid var(--red-primary)', // Now this just updates the existing property
    paddingLeft: '10px', // Updates the existing specific padding
  },
  sidebarFooter: { padding: '16px 20px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  operatorBadge: { display: 'flex', alignItems: 'center', gap: '10px' },
  operatorIcon: { fontSize: '20px', color: 'var(--green-primary)' },
  operatorName: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '1px' },
  operatorRole: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' },
  logoutBtn: {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '7px',
    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-dim)', cursor: 'pointer',
  },
  main: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-void)' },
  topbar: {
    padding: '20px 28px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 10,
  },
  topbarLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  pageTitle: { fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--text-primary)' },
  pageSubtitle: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.5px' },
  topbarBadge: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '2px', color: 'var(--green-primary)',
    background: 'rgba(0,255,170,0.06)', border: '1px solid rgba(0,255,170,0.15)', padding: '6px 14px', borderRadius: '4px',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-primary)',
    boxShadow: '0 0 6px var(--green-glow)', display: 'inline-block',
  },
  content: { flex: 1, padding: '24px 28px', overflow: 'auto' },
}