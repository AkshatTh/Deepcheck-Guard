const mongoose = require('mongoose');

const ThreatSignatureSchema = new mongoose.Schema({
  baseline_text: { type: String, required: true, trim: true },
  evolved_text: { type: String, required: true, trim: true },
  threat_type: {
    type: String,
    enum: ['phishing', 'social_engineering', 'credential_theft', 'impersonation', 'urgency_manipulation'],
    default: 'phishing'
  },
  confidence_threshold: { type: Number, min: 0, max: 100, default: 75 },
  mutation_generation: { type: Number, default: 1 },
  keywords_avoided: { type: [String], default: [] },
  attack_vectors: { type: [String], default: [] },
  contains_malicious_links: { type: Boolean, default: false },
  contains_tracking: { type: Boolean, default: false },
  raw_html: { type: String, default: '' },

  // Adversarial loop fields
  blue_team_detected: { type: Boolean, default: null },
  blue_team_confidence: { type: Number, default: null },
  blue_team_reasons: { type: [String], default: [] },
  is_zero_day: { type: Boolean, default: false },
  evasion_techniques: { type: [String], default: [] },

  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

ThreatSignatureSchema.index({ evolved_text: 'text', baseline_text: 'text' });

module.exports = mongoose.model('ThreatSignature', ThreatSignatureSchema);