// ═══════════════════════════════════════════════
//  NexaJobs – Frontend App  (connects to backend)
// ═══════════════════════════════════════════════

const API = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';

// ─── State ────────────────────────────────────────
let allJobs = [];
let filteredJobs = [];
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';
let currentUser = null;
let authToken = localStorage.getItem('nexajobs_token') || null;

// ─── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCounters();
  initCategoryCards();
  initFilterBtns();
  checkAuth();
  loadJobs();
  initAuthModal();
  initApplyModal();
});

// ─── Navbar ───────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });
}

// ─── Number Counters ──────────────────────────────
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = formatNumber(Math.floor(current));
  }, 16);
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M+';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K+';
  return n.toString();
}

// ─── Category Cards ───────────────────────────────
function initCategoryCards() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => filterByCategory(cat), 400);
    });
  });
}

function filterByCategory(category) {
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-filter="all"]')?.classList.add('active');
  loadJobs({ category });
}

// ─── Filter Bar ───────────────────────────────────
function initFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      const params = currentFilter === 'all' ? {} : { type: currentFilter };
      loadJobs(params);
    });
  });
}

// ─── Load Jobs from API ───────────────────────────
async function loadJobs(params = {}) {
  const grid = document.getElementById('jobsGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading jobs...</p></div>`;

  try {
    const query = new URLSearchParams({ page: currentPage, limit: 9, ...params });
    const res = await fetch(`${API}/jobs?${query}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    const data = await res.json();

    allJobs = data.jobs || [];
    filteredJobs = allJobs;
    totalPages = data.pagination?.pages || 1;

    renderJobs(filteredJobs);
    renderPagination(data.pagination);
  } catch (err) {
    grid.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Could not load jobs</h3>
        <p>Make sure the backend server is running on port 5000.</p>
        <p style="font-size:0.85rem;opacity:0.6">Error: ${err.message}</p>
        <button class="btn btn-primary" onclick="loadJobs()">Retry</button>
      </div>`;
  }
}

// ─── Render Jobs ──────────────────────────────────
function renderJobs(jobs) {
  const grid = document.getElementById('jobsGrid');
  if (!grid) return;

  if (jobs.length === 0) {
    grid.innerHTML = `
      <div class="no-jobs">
        <div class="no-jobs-icon">🔍</div>
        <h3>No jobs found</h3>
        <p>Try adjusting your search or filters.</p>
        <button class="btn btn-outline" onclick="resetFilters()">Clear Filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = jobs.map((job, i) => createJobCard(job, i)).join('');

  // Animate cards in
  grid.querySelectorAll('.job-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.07}s`;
    card.classList.add('animate-in');
  });
}

function createJobCard(job, index) {
  const initials = job.companyLogo || job.company.charAt(0).toUpperCase();
  const gradient = job.companyColor || 'linear-gradient(135deg, #667eea, #764ba2)';
  const daysAgo = getDaysAgo(job.createdAt);
  const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Open';
  
  return `
    <div class="job-card glass-card" data-id="${job._id}" onclick="openJobModal('${job._id}')">
      ${job.featured ? '<div class="job-badge badge-featured">⭐ Featured</div>' : ''}
      ${job.urgent ? '<div class="job-badge badge-urgent">🔥 Urgent</div>' : ''}
      
      <div class="job-card-header">
        <div class="company-logo-circle" style="background: ${gradient}">${initials}</div>
        <div class="job-meta">
          <h3 class="job-title">${job.title}</h3>
          <p class="job-company">${job.company}</p>
        </div>
        <button class="save-btn" onclick="event.stopPropagation(); toggleSave('${job._id}', this)" 
          title="Save job" aria-label="Save job">🔖</button>
      </div>
      
      <div class="job-tags">
        <span class="job-tag tag-type">${job.type}</span>
        <span class="job-tag tag-location">📍 ${job.location}</span>
        <span class="job-tag tag-category">${job.category}</span>
      </div>
      
      <p class="job-description">${job.description.slice(0, 120)}...</p>
      
      <div class="job-skills">
        ${(job.skills || []).slice(0, 4).map(s => `<span class="skill-pill">${s}</span>`).join('')}
      </div>
      
      <div class="job-card-footer">
        <div class="job-salary">💰 ${job.salary || 'Competitive'}</div>
        <div class="job-footer-right">
          <span class="job-time">⏱ ${daysAgo}</span>
          <button class="btn btn-primary btn-sm apply-btn" 
            onclick="event.stopPropagation(); openApplyModal('${job._id}', '${job.title}', '${job.company}')">
            Apply Now
          </button>
        </div>
      </div>
    </div>`;
}

function getDaysAgo(date) {
  if (!date) return 'Recently';
  const diff = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Pagination ───────────────────────────────────
function renderPagination(pagination) {
  let paginationEl = document.getElementById('pagination');
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.className = 'pagination';
    document.getElementById('jobsGrid')?.after(paginationEl);
  }

  if (!pagination || pagination.pages <= 1) { paginationEl.innerHTML = ''; return; }

  let html = '';
  if (pagination.page > 1)
    html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">← Prev</button>`;
  
  for (let i = 1; i <= pagination.pages; i++) {
    html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  
  if (pagination.page < pagination.pages)
    html += `<button class="page-btn" onclick="changePage(${pagination.page + 1})">Next →</button>`;

  paginationEl.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  loadJobs();
  document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Search ───────────────────────────────────────
function filterJobs() {
  const search = document.getElementById('searchInput')?.value.trim();
  const location = document.getElementById('locationSelect')?.value;
  const type = document.getElementById('typeSelect')?.value;
  currentPage = 1;
  const params = {};
  if (search) params.search = search;
  if (location) params.location = location;
  if (type) params.type = type;
  document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
  loadJobs(params);
}

function quickSearch(term) {
  const input = document.getElementById('searchInput');
  if (input) { input.value = term; }
  filterJobs();
}

function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  const locationSelect = document.getElementById('locationSelect');
  const typeSelect = document.getElementById('typeSelect');
  if (searchInput) searchInput.value = '';
  if (locationSelect) locationSelect.value = '';
  if (typeSelect) typeSelect.value = '';
  currentPage = 1;
  loadJobs();
}

// Allow Enter key in search
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') filterJobs();
  });
});

// ─── Job Detail Modal ─────────────────────────────
async function openJobModal(jobId) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  overlay.classList.add('active');
  content.innerHTML = `<div class="modal-loading"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`${API}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Job not found');
    const { job } = await res.json();
    const gradient = job.companyColor || 'linear-gradient(135deg, #667eea, #764ba2)';
    const initials = job.companyLogo || job.company.charAt(0);
    const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : 'Open';

    content.innerHTML = `
      <div class="modal-header" style="background: ${gradient}">
        <div class="modal-company-logo">${initials}</div>
        <div>
          <h2>${job.title}</h2>
          <p>${job.company} · ${job.location}</p>
        </div>
      </div>
      <div class="modal-body">
        <div class="modal-tags">
          <span class="job-tag tag-type">${job.type}</span>
          <span class="job-tag">${job.category}</span>
          ${job.remote ? '<span class="job-tag tag-remote">🌍 Remote OK</span>' : ''}
          ${job.urgent ? '<span class="job-tag badge-urgent">🔥 Urgent</span>' : ''}
        </div>
        <div class="modal-info-grid">
          <div class="info-item"><span class="info-label">💰 Salary</span><span>${job.salary || 'Competitive'}</span></div>
          <div class="info-item"><span class="info-label">💼 Experience</span><span>${job.experience || 'Not specified'}</span></div>
          <div class="info-item"><span class="info-label">👥 Applicants</span><span>${job.applicantsCount || 0} applied</span></div>
          <div class="info-item"><span class="info-label">📅 Deadline</span><span>${deadline}</span></div>
        </div>
        <div class="modal-section">
          <h4>📋 About This Role</h4>
          <p>${job.description}</p>
        </div>
        ${job.requirements?.length ? `
        <div class="modal-section">
          <h4>✅ Requirements</h4>
          <ul>${job.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>` : ''}
        ${job.responsibilities?.length ? `
        <div class="modal-section">
          <h4>🎯 Responsibilities</h4>
          <ul>${job.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>` : ''}
        ${job.skills?.length ? `
        <div class="modal-section">
          <h4>🛠 Skills</h4>
          <div class="modal-skills">${job.skills.map(s => `<span class="skill-pill">${s}</span>`).join('')}</div>
        </div>` : ''}
        <div class="modal-apply-btn">
          <button class="btn btn-primary btn-lg" onclick="openApplyModal('${job._id}', '${job.title}', '${job.company}'); closeModal()">
            🚀 Apply Now
          </button>
          <button class="btn btn-ghost btn-lg" onclick="closeModal()">Close</button>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="error-state"><p>⚠️ ${err.message}</p><button class="btn btn-outline" onclick="closeModal()">Close</button></div>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('active');
}

document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

// ─── Apply Modal ──────────────────────────────────
function initApplyModal() {
  const modal = document.getElementById('applyModalOverlay');
  modal?.addEventListener('click', (e) => {
    if (e.target.id === 'applyModalOverlay') closeApplyModal();
  });
}

function openApplyModal(jobId, title, company) {
  const overlay = document.getElementById('applyModalOverlay');
  if (!overlay) {
    createApplyModal();
  }
  
  const jobTitle = document.getElementById('applyJobTitle');
  const jobCompany = document.getElementById('applyJobCompany');
  const jobIdInput = document.getElementById('applyJobId');
  
  if (jobTitle) jobTitle.textContent = title;
  if (jobCompany) jobCompany.textContent = company;
  if (jobIdInput) jobIdInput.value = jobId;

  // Pre-fill if logged in
  if (currentUser) {
    const nameInput = document.getElementById('applyName');
    const emailInput = document.getElementById('applyEmail');
    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
  }

  document.getElementById('applyModalOverlay')?.classList.add('active');
  document.getElementById('applyForm')?.reset();
  if (currentUser) {
    document.getElementById('applyName').value = currentUser.name || '';
    document.getElementById('applyEmail').value = currentUser.email || '';
  }
}

function createApplyModal() {
  const modal = document.createElement('div');
  modal.id = 'applyModalOverlay';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal glass-card apply-modal">
      <button class="modal-close" onclick="closeApplyModal()">✕</button>
      <div class="apply-modal-header">
        <div class="apply-icon">🚀</div>
        <h2>Apply for <span id="applyJobTitle" class="gradient-text"></span></h2>
        <p>at <strong id="applyJobCompany"></strong></p>
      </div>
      <form id="applyForm" onsubmit="submitApplication(event)">
        <input type="hidden" id="applyJobId" />
        <div class="form-group">
          <label for="applyName">Full Name *</label>
          <input type="text" id="applyName" placeholder="Your full name" required />
        </div>
        <div class="form-group">
          <label for="applyEmail">Email Address *</label>
          <input type="email" id="applyEmail" placeholder="your@email.com" required />
        </div>
        <div class="form-group">
          <label for="applyPhone">Phone Number</label>
          <input type="tel" id="applyPhone" placeholder="+1 (555) 000-0000" />
        </div>
        <div class="form-group">
          <label for="applyCoverLetter">Cover Letter</label>
          <textarea id="applyCoverLetter" rows="4" placeholder="Tell the employer why you're the perfect fit..."></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg" id="applySubmitBtn">
            Submit Application
          </button>
          <button type="button" class="btn btn-ghost" onclick="closeApplyModal()">Cancel</button>
        </div>
      </form>
    </div>`;
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'applyModalOverlay') closeApplyModal();
  });
  document.body.appendChild(modal);
}

function closeApplyModal() {
  document.getElementById('applyModalOverlay')?.classList.remove('active');
}

async function submitApplication(e) {
  e.preventDefault();
  const btn = document.getElementById('applySubmitBtn');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  const payload = {
    jobId: document.getElementById('applyJobId').value,
    name: document.getElementById('applyName').value,
    email: document.getElementById('applyEmail').value,
    phone: document.getElementById('applyPhone')?.value || '',
    coverLetter: document.getElementById('applyCoverLetter')?.value || '',
  };

  try {
    const res = await fetch(`${API}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Submission failed');

    showToast('🎉 Application submitted successfully! Good luck!', 'success');
    closeApplyModal();
    loadJobs(); // refresh to update applicant count
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Submit Application';
    btn.disabled = false;
  }
}

// ─── Auth (Sign In / Register) ────────────────────
function initAuthModal() {
  updateAuthUI();
  document.getElementById('loginBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUser) { logout(); return; }
    openAuthModal('login');
  });
  document.getElementById('registerBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('register');
  });
}

function openAuthModal(mode = 'login') {
  let overlay = document.getElementById('authModalOverlay');
  if (!overlay) { createAuthModal(); overlay = document.getElementById('authModalOverlay'); }
  setAuthMode(mode);
  overlay.classList.add('active');
}

function createAuthModal() {
  const modal = document.createElement('div');
  modal.id = 'authModalOverlay';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal glass-card auth-modal">
      <button class="modal-close" onclick="closeAuthModal()">✕</button>
      <div class="auth-tabs">
        <button class="auth-tab active" id="loginTab" onclick="setAuthMode('login')">Sign In</button>
        <button class="auth-tab" id="registerTab" onclick="setAuthMode('register')">Register</button>
      </div>
      <div id="authContent"></div>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target.id === 'authModalOverlay') closeAuthModal(); });
  document.body.appendChild(modal);
}

function setAuthMode(mode) {
  document.getElementById('loginTab')?.classList.toggle('active', mode === 'login');
  document.getElementById('registerTab')?.classList.toggle('active', mode === 'register');
  const content = document.getElementById('authContent');
  if (!content) return;

  if (mode === 'login') {
    content.innerHTML = `
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" placeholder="your@email.com" required />
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" placeholder="••••••••" required />
        </div>
        <div class="auth-hint">💡 Try: admin@nexajobs.com / admin123</div>
        <button type="submit" class="btn btn-primary btn-lg" id="loginBtn2">Sign In</button>
        <p class="auth-switch">No account? <span onclick="setAuthMode('register')">Register free →</span></p>
      </form>`;
  } else {
    content.innerHTML = `
      <form id="registerForm" onsubmit="handleRegister(event)">
        <div class="form-group">
          <label for="regName">Full Name</label>
          <input type="text" id="regName" placeholder="Your full name" required />
        </div>
        <div class="form-group">
          <label for="regEmail">Email</label>
          <input type="email" id="regEmail" placeholder="your@email.com" required />
        </div>
        <div class="form-group">
          <label for="regPassword">Password</label>
          <input type="password" id="regPassword" placeholder="Min. 6 characters" required minlength="6" />
        </div>
        <div class="form-group">
          <label for="regRole">I am a...</label>
          <select id="regRole">
            <option value="seeker">Job Seeker</option>
            <option value="employer">Employer / HR</option>
            <option value="admin">System Admin</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" id="registerBtn2">Create Account</button>
        <p class="auth-switch">Have an account? <span onclick="setAuthMode('login')">Sign In →</span></p>
      </form>`;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn2');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('nexajobs_token', authToken);
    localStorage.setItem('nexajobs_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    showToast(`👋 Welcome back, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn2');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('nexajobs_token', authToken);
    localStorage.setItem('nexajobs_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    showToast(`🎉 Welcome to NexaJobs, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Create Account'; btn.disabled = false;
  }
}

function closeAuthModal() {
  document.getElementById('authModalOverlay')?.classList.remove('active');
}

function checkAuth() {
  const stored = localStorage.getItem('nexajobs_user');
  if (stored && authToken) {
    currentUser = JSON.parse(stored);
    updateAuthUI();
  }
}

function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const adminNavItem = document.getElementById('adminNavItem');
  if (!loginBtn || !registerBtn) return;

  if (currentUser) {
    loginBtn.textContent = `👋 ${currentUser.name.split(' ')[0]}`;
    loginBtn.title = 'Click to sign out';

    if (currentUser.role === 'admin' || currentUser.role === 'employer') {
      // Show admin link only for admin/employer
      if (adminNavItem) adminNavItem.style.display = 'list-item';
      registerBtn.textContent = '🔧 Admin Panel';
      registerBtn.href = 'admin.html';
      registerBtn.onclick = null;
    } else {
      // Regular user — hide admin link, keep Post a Job as register action
      if (adminNavItem) adminNavItem.style.display = 'none';
      registerBtn.textContent = 'Post a Job';
      registerBtn.href = '#';
    }
  } else {
    loginBtn.textContent = 'Sign In';
    registerBtn.textContent = 'Post a Job';
    registerBtn.href = '#';
    if (adminNavItem) adminNavItem.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('nexajobs_token');
  localStorage.removeItem('nexajobs_user');
  authToken = null;
  currentUser = null;
  updateAuthUI();
  showToast('👋 Signed out successfully', 'success');
}

// ─── Save Jobs ────────────────────────────────────
function toggleSave(jobId, btn) {
  const saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
  const idx = saved.indexOf(jobId);
  if (idx === -1) {
    saved.push(jobId);
    btn.textContent = '🔖';
    btn.style.opacity = '1';
    showToast('Job saved!', 'success');
  } else {
    saved.splice(idx, 1);
    btn.textContent = '🔖';
    btn.style.opacity = '0.5';
    showToast('Job removed from saved', 'success');
  }
  localStorage.setItem('savedJobs', JSON.stringify(saved));
}

// ─── Toast Notifications ──────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
  toast.style.cssText = `
    background: rgba(20,20,40,0.95);
    border-left: 4px solid ${colors[type] || colors.info};
    color: #fff;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    max-width: 340px;
    transform: translateX(120%);
    transition: transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275);
    cursor: pointer;`;
  toast.textContent = message;
  toast.onclick = () => toast.remove();
  container.appendChild(toast);

  setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 10);
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
