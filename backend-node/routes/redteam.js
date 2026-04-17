const express = require('express');
const axios = require('axios');
const router = express.Router();
const ThreatSignature = require('../models/ThreatSignature');

const { extractFeatures } = require('../lib/featureExtractor');
const { generateAttack } = require('../lib/attackGenerator');
const { RULE_LIBRARY } = require('../lib/ruleEngine');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8080';

const BASELINE_THREATS = [
  { text: "Your account has been flagged for suspicious activity. Click here immediately to verify your identity.", type: "phishing" },
  { text: "URGENT: Your payment method has expired. Update your billing information now.", type: "credential_theft" }
];

// --- 🎬 CINEMATIC ATTACK PHASES ---
// We hold these tactics for multiple generations so the AI can learn them, 
// then suddenly mutate to force a Zero-Day drop.
const ATTACK_PHASES = {
    1: { tactic: "Urgency Spike", config: { domain_type: "clean", urgency_level: 0.9, keyword_style: "aggressive", obfuscation_level: 0, hidden_elements: false, credential_trap: false, link_mismatch: false } },
    5: { tactic: "Domain Cloaking", config: { domain_type: "typosquat", urgency_level: 0.1, keyword_style: "none", obfuscation_level: 0, hidden_elements: false, credential_trap: true, link_mismatch: true } },
    10: { tactic: "Structural Trap", config: { domain_type: "clean", urgency_level: 0.1, keyword_style: "none", obfuscation_level: 0.8, hidden_elements: true, credential_trap: false, link_mismatch: false } }
};

router.post('/mutate', async (req, res) => {
  const { baseline_index = 0, generations = 15 } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const baseline = BASELINE_THREATS[baseline_index % BASELINE_THREATS.length];

    sendEvent('start', {
      message: `🔴 Red Team initialized — Live Adversarial Probing`,
      baseline: baseline.text, threat_type: baseline.type, generations
    });

    sendEvent('teaching', { message: `🛡️ Calibrating Blue Team with benign baseline traffic...` });
    await sleep(1000);

    let attackConfig = ATTACK_PHASES[1].config;
    let currentTactic = ATTACK_PHASES[1].tactic;
    
    let zerodays = 0;
    let caught = 0;
    let mlAdaptations = 0;

    for (let gen = 1; gen <= generations; gen++) {
      
      // --- 🚨 THE MUTATION TRIGGER 🚨 ---
      // When we hit generation 5 or 10, the Red Team changes its attack vector!
      if (ATTACK_PHASES[gen]) {
          attackConfig = ATTACK_PHASES[gen].config;
          currentTactic = ATTACK_PHASES[gen].tactic;
          
          if (gen > 1) {
              sendEvent('mutating', {
                message: `🔄 Red Team shifting tactics to avoid detection... Shifting to [${currentTactic}]`,
                generation: gen
              });
              await sleep(1000); // Dramatic pause for the mutation
          }
      }

      sendEvent('mutating', { message: `⚙️ Generating attack payload ${gen}/${generations} using [${currentTactic}]...`, generation: gen });
      
      const payload = generateAttack(attackConfig);
      const evolved = payload.html;
      const features = extractFeatures(payload);

      sendEvent('payload_generated', { message: `✓ Payload generated — running Fusion Scan...`, generation: gen });
      await sleep(500);

      const scanPayload = {
        text: payload.text, html: payload.html, links: payload.links,
        iframes: payload.iframes || [], forms: payload.forms || [], url: payload.url, isEmailPage: true
      };

      // 🔵 BLUE TEAM SCAN
      const scanRes = await axios.post(`http://127.0.0.1:3001/api/scan/text`, scanPayload).catch(() => ({ data: { ml_score: 50, explanation: [] } }));
      
      // 🚨 THE FIX: Use ML Score for the Demo Narrative!
      const mlScore = scanRes.data.ml_score || 0;
      const wasDetected = mlScore >= 50; 

      if (wasDetected) {
        caught++;
        sendEvent('caught', {
          message: `🔵 Blue Team CAUGHT Gen ${gen} (ML Confidence: ${mlScore}%)`,
          generation: gen, score: mlScore, reasons: ["Adversarial AI Signature Detected"], status: 'CAUGHT'
        });

        // Continue training to reinforce the correct weights
        await axios.post(`${PYTHON_SERVICE_URL}/train`, { features, label: 1 }).catch(()=>{});

      } else {
        zerodays++;
        sendEvent('zero_day', {
          message: `🚨 ZERO-DAY! Red Team bypassed defenses (ML Confidence: ${mlScore}%)`,
          generation: gen, score: mlScore, status: 'ZERO_DAY'
        });

        // 🧠 BLUE TEAM ML ADAPTATION (Label 1)
        sendEvent('teaching', { message: `🧠 Blue Team ML adapting to new adversarial pattern...` });
        await axios.post(`${PYTHON_SERVICE_URL}/train`, { features, label: 1 }).catch(()=>{});
        mlAdaptations++;
        await sleep(600); // Give Python time to update its weights!
      }

      await ThreatSignature.create({
        baseline_text: baseline.text, evolved_text: evolved, threat_type: baseline.type,
        confidence_threshold: mlScore, mutation_generation: gen, raw_html: evolved, blue_team_detected: wasDetected, is_zero_day: !wasDetected
      }).catch(()=>{});

      await sleep(1000); // Prevents the frontend logs from becoming a blur
    }

    sendEvent('complete', {
      message: `🏁 Operations Complete. ${caught} Caught | ${zerodays} Zero-Days | ${mlAdaptations} ML Adaptations`,
      zero_days: zerodays, caught, adaptations: mlAdaptations
    });

    res.end();
  } catch (err) {
    sendEvent('error', { message: err.message });
    res.end();
  }
});

router.get('/blueteam-status', async (req, res) => {
  res.json({ ml_status: "Active - Online Learning (SGD)", rules: RULE_LIBRARY, total_active_rules: RULE_LIBRARY.length });
});

router.get('/baselines', (req, res) => {
  res.json(BASELINE_THREATS.map((t, i) => ({ index: i, ...t })));
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = router;