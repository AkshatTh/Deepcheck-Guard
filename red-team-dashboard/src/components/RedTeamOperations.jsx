import React, { useState, useEffect } from 'react';

const RedTeamOperations = () => {
  const [baselines, setBaselines] = useState([]);
  const [selectedBaseline, setSelectedBaseline] = useState(0);
  const [generations, setGenerations] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ caught: 0, zeroDays: 0, adaptations: 0 });

  useEffect(() => {
    fetch('http://localhost:3001/api/redteam/baselines', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        // SAFETY CHECK: Only set it if it's actually an array
        if (Array.isArray(data)) {
          setBaselines(data);
        } else {
          console.error("API did not return an array:", data);
          setBaselines([]); // Fallback to empty array
        }
      })
      .catch(err => console.error("Failed to load baselines", err));
  }, []);

  const startTraining = async () => {
    setIsRunning(true);
    setLogs([]);
    setStats({ caught: 0, zeroDays: 0, adaptations: 0 });

    try {
      const response = await fetch('http://localhost:3001/api/redteam/mutate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ baseline_index: selectedBaseline, generations })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep the last incomplete chunk

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = 'message';
          let dataObj = {};

          lines.forEach(line => {
            if (line.startsWith('event: ')) eventType = line.substring(7).trim();
            if (line.startsWith('data: ')) {
              try { dataObj = JSON.parse(line.substring(6).trim()); } catch (e) { }
            }
          });

          if (dataObj.message) {
            setLogs(prev => [...prev, { type: eventType, msg: dataObj.message, ...dataObj }]);

            // Update stats live
            if (eventType === 'caught') setStats(s => ({ ...s, caught: s.caught + 1 }));
            if (eventType === 'zero_day') setStats(s => ({ ...s, zeroDays: s.zeroDays + 1 }));
            if (eventType === 'teaching') setStats(s => ({ ...s, adaptations: s.adaptations + 1 }));
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', msg: "Connection to Mutation Engine lost." }]);
    }
    setIsRunning(false);
  };

  return (
    <div style={localStyles.container}>
      <header style={localStyles.header}>
        <div>
          <div style={localStyles.badge}>RED TEAM OPERATIONS</div>
          <h1 style={localStyles.mainTitle}>ADVERSARIAL MUTATION ENGINE</h1>
        </div>
      </header>

      <div style={localStyles.dashboardGrid}>
        {/* LEFT COL: CONFIG */}
        <div style={localStyles.leftCol}>
          <section style={localStyles.panel}>
            <h3 style={localStyles.panelTitle}>ATTACK CONFIGURATION</h3>

            <div style={localStyles.inputGroup}>
              <label style={localStyles.label}>Target Baseline Vector</label>
              <select
                style={localStyles.select}
                value={selectedBaseline}
                onChange={(e) => setSelectedBaseline(parseInt(e.target.value))}
                disabled={isRunning}
              >
                {baselines.map((b, i) => (
                  <option key={i} value={i}>[{b.type.toUpperCase()}] {b.text.substring(0, 40)}...</option>
                ))}
              </select>
            </div>

            <div style={localStyles.inputGroup}>
              <label style={localStyles.label}>Mutation Generations</label>
              <input
                type="number"
                min="1" max="50"
                style={localStyles.input}
                value={generations}
                onChange={(e) => setGenerations(parseInt(e.target.value))}
                disabled={isRunning}
              />
            </div>

            <button
              style={{ ...localStyles.button, background: isRunning ? 'var(--border)' : 'var(--red-primary)', color: isRunning ? 'var(--text-dim)' : '#fff' }}
              onClick={startTraining}
              disabled={isRunning}
            >
              {isRunning ? 'EXECUTING MUTATIONS...' : 'INITIATE ADVERSARIAL ATTACK'}
            </button>
          </section>

          <section style={localStyles.panel}>
            <h3 style={localStyles.panelTitle}>LIVE CAMPAIGN STATS</h3>
            <div style={localStyles.statsGrid}>
              <div style={localStyles.statBox}>
                <span style={localStyles.statLabel}>CAUGHT</span>
                <span style={{ ...localStyles.statValue, color: 'var(--blue-primary)' }}>{stats.caught}</span>
              </div>
              <div style={localStyles.statBox}>
                <span style={localStyles.statLabel}>ZERO-DAYS</span>
                <span style={{ ...localStyles.statValue, color: 'var(--red-primary)' }}>{stats.zeroDays}</span>
              </div>
              <div style={localStyles.statBox}>
                <span style={localStyles.statLabel}>ADAPTATIONS</span>
                <span style={{ ...localStyles.statValue, color: 'var(--green-primary)' }}>{stats.adaptations}</span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COL: TERMINAL */}
        <div style={localStyles.rightCol}>
          <section style={{ ...localStyles.panel, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={localStyles.panelTitle}>MUTATION TELEMETRY</h3>
            <div style={localStyles.terminal}>
              {logs.length === 0 && <p style={localStyles.terminalEmpty}>System idle. Awaiting attack initiation...</p>}
              {logs.map((log, i) => (
                <div key={i} style={{
                  ...localStyles.logLine,
                  color: log.type === 'zero_day' ? 'var(--red-primary)' :
                    log.type === 'caught' ? 'var(--blue-primary)' :
                      log.type === 'teaching' ? 'var(--green-primary)' : 'var(--text-secondary)'
                }}>
                  <span style={localStyles.logPrefix}>[{new Date().toISOString().substring(11, 19)}]</span> {log.msg}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const localStyles = {
  container: { padding: '30px', fontFamily: 'var(--font-mono)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' },
  badge: { color: 'var(--red-primary)', fontSize: '10px', letterSpacing: '2px', marginBottom: '8px' },
  mainTitle: { fontSize: '32px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' },
  panel: { background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '24px', borderRadius: '8px', marginBottom: '24px' },
  panelTitle: { fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '20px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' },
  select: { width: '100%', padding: '10px', background: 'var(--bg-void)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit', borderRadius: '4px' },
  input: { width: '100%', padding: '10px', background: 'var(--bg-void)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit', borderRadius: '4px' },
  button: { width: '100%', padding: '15px', border: 'none', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  statBox: { background: 'var(--bg-void)', border: '1px solid var(--border)', padding: '15px 10px', textAlign: 'center', borderRadius: '4px' },
  statLabel: { display: 'block', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '5px' },
  statValue: { fontSize: '24px', fontWeight: 'bold' },
  terminal: { background: '#000', border: '1px solid var(--border)', padding: '15px', flex: 1, overflowY: 'auto', borderRadius: '4px' },
  terminalEmpty: { color: 'var(--text-dim)', fontSize: '11px', fontStyle: 'italic' },
  logLine: { fontSize: '11px', marginBottom: '6px', lineHeight: '1.4' },
  logPrefix: { opacity: 0.5, marginRight: '8px' }
};

export default RedTeamOperations;