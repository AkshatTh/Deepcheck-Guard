const mongoose = require('mongoose');

// Each document = one capability the Blue Team has learned
const DetectionRuleSchema = new mongoose.Schema({
  rule_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['keyword', 'tracking', 'domain', 'link', 'html', 'behavioral', 'credential', 'network'],
    required: true
  },
  score_contribution: { type: Number, default: 25 },
  level_contribution: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  learned_from_generation: { type: Number },
  learned_from_threat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ThreatSignature' },
  zero_day_preview: { type: String },
  catch_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DetectionRule', DetectionRuleSchema);