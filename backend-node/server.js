require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const threatRoutes = require('./routes/threats');
const scanRoutes = require('./routes/scan');
const redTeamRoutes = require('./routes/redteam');
const forensicsRoutes = require('./routes/forensics');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Large limit for base64 frames
app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/redteam', redTeamRoutes);
app.use('/api/forensics', forensicsRoutes);

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'deepcheck-guard-gateway', timestamp: new Date() });
});

// ── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── DB Connection ────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 DeepCheck Guard Gateway running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;