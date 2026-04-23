const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Routes ───────────────────────────────────────────────────
const { router: authRouter } = require('./routes/auth');
const jobsRouter = require('./routes/jobs');
const applicationsRouter = require('./routes/applications');

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '🚀 NexaJobs API is running', timestamp: new Date() });
});

// Serve index.html for all non-API routes (SPA fallback) — Express 5 wildcard syntax
// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Connect DB & Start ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexajobs';

console.log('📡 Attempting to connect to MongoDB...');
console.log('🔗 URI:', MONGODB_URI.split('@')[1] ? 'mongodb+srv://***@' + MONGODB_URI.split('@')[1] : 'Local DB');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully');

    // Auto-seed if empty
    const Job = require('./models/Job');
    const count = await Job.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding sample jobs...');
      const { seedJobs } = require('./seed');
      await seedJobs();
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 NexaJobs Server running on http://localhost:${PORT}`);
      console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend:   http://localhost:${PORT}`);
      console.log(`🔧 Admin:      http://localhost:${PORT}/admin.html\n`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('💡 Make sure MongoDB is running: mongod');
    process.exit(1);
  });
