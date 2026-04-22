const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true },
  type: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Remote', 'Contract', 'Internship'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Technology', 'Design', 'Finance', 'Marketing', 'Healthcare', 'Education', 'Engineering', 'Sales'],
    required: true,
  },
  salary: { type: String, default: 'Competitive' },
  salaryMin: { type: Number },
  salaryMax: { type: Number },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  skills: [{ type: String }],
  experience: { type: String, default: 'Not specified' },
  companyLogo: { type: String, default: '' },
  companyColor: { type: String, default: 'linear-gradient(135deg, #667eea, #764ba2)' },
  featured: { type: Boolean, default: false },
  urgent: { type: Boolean, default: false },
  remote: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  applicantsCount: { type: Number, default: 0 },
  deadline: { type: Date },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

jobSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

// Text search index
jobSchema.index({ title: 'text', company: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
