const express = require('express');
const router = express.Router();
const ThreatSignature = require('../models/ThreatSignature');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/threats
 * Returns all active threat signatures (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const threats = await ThreatSignature.find({ active: true })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ThreatSignature.countDocuments({ active: true });

    res.json({ threats, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/threats/stats
 * Returns threat statistics for the dashboard
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const total = await ThreatSignature.countDocuments();
    const byType = await ThreatSignature.aggregate([
      { $group: { _id: '$threat_type', count: { $sum: 1 } } }
    ]);
    const recent = await ThreatSignature.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('evolved_text threat_type created_at');

    res.json({ total, byType, recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/threats/:id
 * Deactivates a threat signature
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await ThreatSignature.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
