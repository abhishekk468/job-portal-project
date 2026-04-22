const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { authMiddleware } = require('./auth');

// GET /api/jobs — list all jobs with filters
router.get('/', async (req, res) => {
  try {
    const {
      search, location, type, category, featured, remote,
      page = 1, limit = 12, sort = '-createdAt',
    } = req.query;

    const query = { active: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
      ];
    }
    if (location && location !== 'All Locations') query.location = { $regex: location, $options: 'i' };
    if (type && type !== 'All Types') query.type = type;
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    if (remote === 'true') query.remote = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query).sort(sort).skip(skip).limit(parseInt(limit)).populate('postedBy', 'name company'),
      Job.countDocuments(query),
    ]);

    res.json({
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalJobs, activeJobs, featuredJobs, categoryStats] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ active: true }),
      Job.countDocuments({ featured: true }),
      Job.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({ totalJobs, activeJobs, featuredJobs, categoryStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/:id — single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name company');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/jobs — create job (admin/employer only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'employer')
      return res.status(403).json({ message: 'Only employers and admins can post jobs' });

    const job = new Job({ ...req.body, postedBy: req.user._id });
    await job.save();
    res.status(201).json({ job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/jobs/:id — update job
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role !== 'admin' && job.postedBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ job: updated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role !== 'admin' && job.postedBy?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
