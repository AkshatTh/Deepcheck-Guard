import React, { useState, useEffect } from 'react';

const BlueteamEvolution = () => {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/redteam/blueteam-status', {
           headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            const data = await res.json();
            setStatus(data);
        }
      } catch (err) { console.error("Status fetch failed", err); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div style={{ color: 'var(--text-dim)', padding: '40px', fontFamily: 'var(--font-mono)' }}>LOADING ARCHITECTURE...</div>;

  return (
    <div style={localStyles.container}>
      {/* HEADER SECTION */}
      <header style={localStyles.header}>
        <div>
          <div style={localStyles.badge}>BLUE TEAM OPERATIONS</div>
          <h1 style={localStyles.mainTitle}>HYBRID DETECTION ENGINE</h1>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <p style={localStyles.labelSmall}>System Defense Posture</p>
          <div style={localStyles.postureBox}>
            <span style={localStyles.liveDot}></span>
            <span style={{ color: 'var(--green-primary)', fontWeight: 'bold' }}>ML Online Learning Active</span>
          </div>
          <p style={localStyles.levelLabel}>{status.total_active_rules} Static Rules Enforcing Baseline</p>
        </div>
      </header>

      <div style={localStyles.dashboardGrid}>
        {/* LEFT COLUMN: LIVE ANALYSIS */}
        <div style={localStyles.leftCol}>
          <section style={localStyles.panel}>
            <h3 style={localStyles.panelTitle}>LIVE FUSION ANALYSIS</h3>

            {!scanResult ? (
              <div style={localStyles.emptyState}>
                <div style={localStyles.pulseIcon}>◈</div>
                <p>MONITORING HYBRID TRAFFIC STREAMS...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ 
                  ...localStyles.resultBanner, 
                  borderColor: scanResult.threat ? 'var(--red-primary)' : 'var(--green-primary)',
                  background: scanResult.threat ? 'rgba(255, 51, 51, 0.05)' : 'rgba(0, 255, 170, 0.05)'
                }}>
                  <div>
                    <h4 style={{ color: scanResult.threat ? 'var(--red-primary)' : 'var(--green-primary)', margin: 0, fontSize: '20px' }}>
                      {scanResult.threat ? 'THREAT DETECTED' : 'CLEARANCE GRANTED'}
                    </h4>
                    <p style={localStyles.monoDetail}>{scanResult.ml_reason || 'ADVERSARIAL PATTERN MATCHED'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={localStyles.labelSmall}>Confidence</span>
                    <div style={localStyles.confidenceVal}>{scanResult.confidence}%</div>
                  </div>
                </div>

                <div style={localStyles.scoreGrid}>
                  <div style={localStyles.miniStat}>
                    <span style={localStyles.labelSmall}>Rule Engine Base</span>
                    <span style={localStyles.statVal}>{scanResult.rule_score}/100</span>
                  </div>
                  <div style={localStyles.miniStat}>
                    <span style={localStyles.labelSmall}>ML Neural Pattern</span>
                    <span style={{...localStyles.statVal, color: 'var(--blue-primary)'}}>{scanResult.ml_score}%</span>
                  </div>
                </div>

                <div style={localStyles.logBox}>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '10px', fontSize: '10px' }}>▶ SYSTEM FINDINGS</p>
                  {scanResult.explanation.map((item, idx) => (
                    <div key={idx} style={localStyles.logEntry}>- {item}</div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* RULES REPOSITORY */}
          <section style={localStyles.panel}>
             <h3 style={localStyles.panelTitle}>STATIC BASELINE DEFENSES</h3>
             <div style={localStyles.rulesGrid}>
                {status.rules.map((rule, idx) => (
                  <div key={idx} style={localStyles.ruleItem}>
                    <span style={localStyles.dot}></span> {rule.name}
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* RIGHT COLUMN: BRAIN METRICS */}
        <div style={localStyles.rightCol}>
          <section style={localStyles.panel}>
            <h3 style={localStyles.panelTitle}>NEURAL ARCHITECTURE</h3>
            <div style={localStyles.metricRow}>
              <span>Model Core</span>
              <span style={localStyles.metricVal}>SGDClassifier</span>
            </div>
            <div style={localStyles.metricRow}>
              <span>Input Vector</span>
              <span style={localStyles.metricVal}>15-Dim Numeric</span>
            </div>
            <div style={localStyles.metricRow}>
              <span>Learning State</span>
              <span style={{ ...localStyles.metricVal, color: 'var(--green-primary)' }}>ACTIVE</span>
            </div>
            <p style={localStyles.infoText}>
              Hybrid architecture active. Incremental learning enabled for adversarial pattern recognition. Red Team evasion data automatically triggers weight recalibration.
            </p>
          </section>

          {scanResult?.features_extracted && (
            <section style={localStyles.panel}>
               <h3 style={localStyles.panelTitle}>LIVE TELEMETRY MAP</h3>
               <div style={localStyles.telemetryGrid}>
                  {Object.entries(scanResult.features_extracted).map(([key, val]) => (
                    <div key={key} style={localStyles.telemetryItem}>
                      <span style={{ color: 'var(--text-dim)' }}>{key}</span>
                      <span style={{ color: 'var(--blue-primary)' }}>{val.toFixed(3)}</span>
                    </div>
                  ))}
               </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const localStyles = {
  container: { padding: '30px', fontFamily: 'var(--font-mono)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' },
  badge: { color: 'var(--blue-primary)', fontSize: '10px', letterSpacing: '2px', marginBottom: '8px' },
  mainTitle: { fontSize: '32px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' },
  labelSmall: { color: 'var(--text-dim)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' },
  postureBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0, 255, 170, 0.05)', border: '1px solid rgba(0, 255, 170, 0.2)', padding: '10px 15px', borderRadius: '4px', marginTop: '5px' },
  liveDot: { width: '8px', height: '8px', background: 'var(--green-primary)', borderRadius: '50%', boxShadow: '0 0 8px var(--green-glow)', animation: 'glow-pulse 2s infinite' },
  levelLabel: { color: 'var(--text-secondary)', fontSize: '10px', marginTop: '8px', fontStyle: 'italic' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' },
  panel: { background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '24px', borderRadius: '8px', marginBottom: '24px' },
  panelTitle: { fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '2px', marginBottom: '20px' },
  emptyState: { textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)', fontSize: '11px' },
  pulseIcon: { fontSize: '40px', marginBottom: '10px', animation: 'glow-pulse 2s infinite' },
  resultBanner: { padding: '20px', borderRadius: '6px', border: '1px solid', display: 'flex', justifyContent: 'space-between' },
  monoDetail: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', margin: '5px 0 0' },
  confidenceVal: { fontSize: '28px', fontWeight: 'bold' },
  scoreGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  miniStat: { background: 'var(--bg-void)', padding: '15px', border: '1px solid var(--border)', borderRadius: '6px' },
  statVal: { display: 'block', fontSize: '18px', color: 'var(--red-primary)', marginTop: '5px' },
  logBox: { background: '#000', padding: '15px', borderRadius: '6px', border: '1px solid var(--border)' },
  logEntry: { fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' },
  rulesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  ruleItem: { fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' },
  dot: { width: '4px', height: '4px', background: 'var(--blue-primary)', borderRadius: '50%' },
  metricRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' },
  metricVal: { color: 'var(--blue-primary)' },
  infoText: { fontSize: '11px', color: 'var(--text-dim)', marginTop: '15px', fontStyle: 'italic', lineHeight: '1.5' },
  telemetryGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  telemetryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }
};

export default BlueteamEvolution;