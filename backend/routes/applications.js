const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const { authMiddleware } = require('./auth');

// POST /api/applications — apply for a job (public)
router.post('/', async (req, res) => {
  try {
    const { jobId, name, email, phone, coverLetter } = req.body;
    if (!jobId || !name || !email)
      return res.status(400).json({ message: 'Job ID, name, and email are required' });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Check for duplicate application
    const existing = await Application.findOne({ job: jobId, email });
    if (existing)
      return res.status(409).json({ message: 'You have already applied for this job' });

    const application = new Application({ job: jobId, name, email, phone, coverLetter });
    await application.save();

    // Increment applicants count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

    res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/applications — get all applications (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'employer')
      return res.status(403).json({ message: 'Not authorized' });

    const { status, jobId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (jobId) query.job = jobId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [applications, total] = await Promise.all([
      Application.find(query)
        .sort('-appliedAt')
        .skip(skip)
        .limit(parseInt(limit))
        .populate('job', 'title company location'),
      Application.countDocuments(query),
    ]);

    res.json({
      applications,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/applications/:id/status — update status (admin/employer)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'employer')
      return res.status(403).json({ message: 'Not authorized' });

    const { status, notes } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, notes, updatedAt: new Date() },
      { new: true }
    ).populate('job', 'title company');

    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json({ application });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/applications/stats — application statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only' });

    const stats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const total = await Application.countDocuments();
    res.json({ stats, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
