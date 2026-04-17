import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.grid} />
      <div style={styles.container}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>◈</div>
          <div style={styles.logoText}>DEEPCHECK GUARD</div>
          <div style={styles.logoSub}>RED TEAM COMMAND CENTER</div>
          <div style={styles.classifiedBadge}>⚠ RESTRICTED ACCESS</div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>OPERATOR ID</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>AUTH TOKEN</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          {error && <div style={styles.error}>⚠ {error}</div>}

          <button
            type="submit"
            style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
          </button>
        </form>

        <div style={styles.footer}>
          DeepCheck Guard v1.0 · Hackathon Build · All activity logged
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    background: 'var(--bg-void)',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,34,68,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,34,68,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  container: {
    width: '360px',
    animation: 'fade-up 0.4s ease',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    fontSize: '48px',
    color: 'var(--red-primary)',
    marginBottom: '12px',
    display: 'block',
    textShadow: '0 0 24px var(--red-glow)',
    animation: 'text-flicker 8s infinite',
  },
  logoText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '20px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  logoSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '3px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
  },
  classifiedBadge: {
    display: 'inline-block',
    background: 'var(--red-dim)',
    border: '1px solid var(--border-accent)',
    color: 'var(--red-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '2px',
    padding: '4px 12px',
    borderRadius: '2px',
  },
  form: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'var(--text-secondary)',
  },
  input: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--red-primary)',
    background: 'var(--red-dim)',
    border: '1px solid var(--border-accent)',
    borderRadius: '4px',
    padding: '8px 12px',
  },
  btn: {
    background: 'var(--red-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    letterSpacing: '2px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    boxShadow: '0 0 16px var(--red-glow)',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
  },
}
