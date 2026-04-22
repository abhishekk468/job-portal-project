const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['seeker', 'employer', 'admin'], default: 'seeker' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  phone: { type: String, default: '' },
  skills: [{ type: String }],
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  resumeUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before save (Mongoose 9: async without next)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
