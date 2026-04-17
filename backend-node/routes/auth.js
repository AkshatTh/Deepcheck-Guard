const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Single admin user for hackathon demo
// In production: use a proper User model with MongoDB
const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // Pre-hash on startup for slight perf benefit
  passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'deepcheck2024', 10)
};

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, expiresIn }
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  if (username !== ADMIN.username) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, ADMIN.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, expiresIn: '12h', username });
});

/**
 * GET /api/auth/verify
 * Validates current token
 */
router.get('/verify', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(403).json({ valid: false });
  }
});

module.exports = router;
