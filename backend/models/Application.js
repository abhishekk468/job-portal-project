const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // For non-logged-in applicants
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  coverLetter: { type: String },
  resumeUrl: { type: String },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending',
  },
  notes: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

applicationSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Application', applicationSchema);
