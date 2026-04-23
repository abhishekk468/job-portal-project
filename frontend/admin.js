// ═══════════════════════════════════════════════
//  NexaJobs – Admin Dashboard JS
// ═══════════════════════════════════════════════

const API = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
// Support both admin-specific and main-site tokens
let adminToken = localStorage.getItem('nexajobs_admin_token')
              || localStorage.getItem('nexajobs_token')
              || null;
let adminUser = null;
let allAdminJobs = [];
let pendingDeleteId = null;
let currentAppsFilter = 'all';
let adminJobsPage = 1, adminAppsPage = 1;
const PAGE_SIZE = 10;

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (adminToken) {
    verifyAdminToken();
  }
});

async function verifyAdminToken() {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error('Invalid token');
    const data = await res.json();

    // STRICT role check — only admin or employer allowed
    if (data.user.role !== 'admin' && data.user.role !== 'employer') {
      showAccessDenied(data.user.name, data.user.role);
      return;
    }

    adminUser = data.user;
    showAdminApp();
  } catch {
    // Token invalid or expired — show login gate
    adminToken = null;
    localStorage.removeItem('nexajobs_admin_token');
  }
}

function showAccessDenied(name, role) {
  const gate = document.getElementById('loginGate');
  gate.innerHTML = `
    <div class="login-card glass-card" style="text-align:center">
      <div style="font-size:3.5rem;margin-bottom:16px">🚫</div>
      <h2 style="font-family:var(--font-display);margin-bottom:12px;color:#f87171">Access Denied</h2>
      <p style="color:var(--text-secondary);margin-bottom:8px">
        You are signed in as <strong>${name}</strong> with role <strong>${role}</strong>.
      </p>
      <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:28px">
        Only <strong>Admin</strong> or <strong>Employer</strong> accounts can access this panel.
      </p>
      <button class="btn btn-primary btn-full" onclick="forceAdminLogin()">
        Sign In with Admin Account
      </button>
      <a href="index.html" class="back-link" style="display:block;margin-top:16px">
        ← Back to Job Portal
      </a>
    </div>`;
}

function forceAdminLogin() {
  // Clear all tokens and show fresh login form
  localStorage.removeItem('nexajobs_admin_token');
  localStorage.removeItem('nexajobs_token');
  localStorage.removeItem('nexajobs_user');
  adminToken = null;
  location.reload();
}

// ─── Login ────────────────────────────────────
async function adminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('adminLoginBtn');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('adminEmail').value,
        password: document.getElementById('adminPassword').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.role !== 'admin' && data.user.role !== 'employer')
      throw new Error('Access denied: Admin or Employer role required');

    adminToken = data.token;
    adminUser = data.user;
    localStorage.setItem('nexajobs_admin_token', adminToken);
    showAdminApp();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Sign In to Admin'; btn.disabled = false;
  }
}

function adminLogout() {
  localStorage.removeItem('nexajobs_admin_token');
  adminToken = null; adminUser = null;
  document.getElementById('adminApp').classList.add('hidden');
  document.getElementById('loginGate').classList.remove('hidden');
  showToast('👋 Signed out', 'success');
}

function showAdminApp() {
  document.getElementById('loginGate').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  document.getElementById('adminUserInfo').innerHTML =
    `<strong>${adminUser.name}</strong><span>${adminUser.role}</span>`;
  loadDashboard();
  loadAdminJobs();
  loadApplications();
}

// ─── Tab Switching ────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
}

// ─── DASHBOARD ────────────────────────────────
async function loadDashboard() {
  try {
    const [jobStatsRes, appStatsRes, appsRes] = await Promise.all([
      fetch(`${API}/jobs/stats`),
      fetch(`${API}/applications/stats`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch(`${API}/applications?limit=5`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    ]);

    if (jobStatsRes.ok) {
      const { activeJobs, featuredJobs, categoryStats } = await jobStatsRes.json();
      document.getElementById('statActiveJobs').textContent = activeJobs;
      document.getElementById('statFeatured').textContent = featuredJobs;
      renderCategoryBars(categoryStats);
    }

    if (appStatsRes.ok) {
      const { stats, total } = await appStatsRes.json();
      document.getElementById('statTotalApps').textContent = total;
      const pending = stats.find(s => s._id === 'pending')?.count || 0;
      document.getElementById('statPending').textContent = pending;
      document.getElementById('pendingBadge').textContent = pending;
    }

    if (appsRes.ok) {
      const { applications } = await appsRes.json();
      renderRecentApps(applications);
    }
  } catch (err) {
    console.error('Dashboard load error:', err.message);
  }
}

function renderCategoryBars(stats) {
  const el = document.getElementById('categoryChart');
  if (!el || !stats?.length) { el.innerHTML = '<p style="color:var(--text-muted)">No data</p>'; return; }
  const max = Math.max(...stats.map(s => s.count));
  el.innerHTML = stats.map(s => `
    <div class="cat-bar-row">
      <span class="cat-name">${s._id}</span>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${(s.count / max * 100).toFixed(1)}%"></div>
      </div>
      <span class="cat-count">${s.count}</span>
    </div>`).join('');
}

function renderRecentApps(apps) {
  const el = document.getElementById('recentApps');
  if (!el) return;
  if (!apps?.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No applications yet.</p>'; return; }
  el.innerHTML = apps.map(a => `
    <div class="recent-item">
      <div class="recent-avatar">${a.name.charAt(0).toUpperCase()}</div>
      <div class="recent-info">
        <strong>${a.name}</strong>
        <span>${a.job?.title || 'Unknown Job'} @ ${a.job?.company || ''}</span>
      </div>
      <span class="status-badge status-${a.status}">${a.status}</span>
    </div>`).join('');
}

// ─── MANAGE JOBS ──────────────────────────────
async function loadAdminJobs(page = 1) {
  adminJobsPage = page;
  const tbody = document.getElementById('jobsTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="loading-row"><div class="spinner"></div></td></tr>`;

  try {
    const res = await fetch(`${API}/jobs?limit=100`);
    const data = await res.json();
    allAdminJobs = data.jobs || [];
    filterAdminJobs();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--danger)">Error loading jobs</td></tr>`;
  }
}

function filterAdminJobs() {
  const search = document.getElementById('jobSearchInput')?.value.toLowerCase() || '';
  const type = document.getElementById('jobTypeFilter')?.value || '';
  const cat = document.getElementById('jobCatFilter')?.value || '';

  let jobs = allAdminJobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search) || j.company.toLowerCase().includes(search);
    const matchType = !type || j.type === type;
    const matchCat = !cat || j.category === cat;
    return matchSearch && matchType && matchCat;
  });

  renderJobsTable(jobs);
}

function renderJobsTable(jobs) {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;

  if (!jobs.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--text-muted)">No jobs found.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td>
        <div class="td-title">${job.title}</div>
        <div class="td-sub">${job.featured ? '⭐ Featured' : ''}${job.urgent ? ' 🔥 Urgent' : ''}</div>
      </td>
      <td>${job.company}</td>
      <td><span class="type-pill">${job.type}</span></td>
      <td>${job.category}</td>
      <td><strong>${job.applicantsCount || 0}</strong></td>
      <td>
        <span class="status-dot ${job.active ? 'dot-active' : 'dot-inactive'}"></span>
        ${job.active ? 'Active' : 'Inactive'}
      </td>
      <td class="action-btns">
        <button class="icon-btn" title="Edit" onclick="editJob('${job._id}')">✏️</button>
        <button class="icon-btn icon-btn-danger" title="Delete" onclick="confirmDeleteJob('${job._id}', '${job.title.replace(/'/g, "\\'")}')">🗑️</button>
      </td>
    </tr>`).join('');
}

// ─── POST / EDIT JOB ─────────────────────────
async function submitJob(e) {
  e.preventDefault();
  const btn = document.getElementById('jobSubmitBtn');
  const editId = document.getElementById('editJobId').value;
  btn.textContent = editId ? '⏳ Updating...' : '⏳ Posting...'; btn.disabled = true;

  const payload = {
    title: document.getElementById('jTitle').value,
    company: document.getElementById('jCompany').value,
    location: document.getElementById('jLocation').value,
    type: document.getElementById('jType').value,
    category: document.getElementById('jCategory').value,
    salary: document.getElementById('jSalary').value,
    experience: document.getElementById('jExperience').value,
    description: document.getElementById('jDescription').value,
    requirements: document.getElementById('jRequirements').value.split('\n').filter(Boolean),
    responsibilities: document.getElementById('jResponsibilities').value.split('\n').filter(Boolean),
    skills: document.getElementById('jSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    companyColor: document.getElementById('jCompanyColor').value,
    featured: document.getElementById('jFeatured').checked,
    urgent: document.getElementById('jUrgent').checked,
    remote: document.getElementById('jRemote').checked,
    active: document.getElementById('jActive').checked,
    deadline: document.getElementById('jDeadline').value || undefined,
  };

  try {
    const url = editId ? `${API}/jobs/${editId}` : `${API}/jobs`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showToast(editId ? '✅ Job updated successfully!' : '🚀 Job posted successfully!', 'success');
    resetJobForm();
    switchTab('jobs');
    loadAdminJobs();
    loadDashboard();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.textContent = editId ? 'Update Job' : '🚀 Post Job'; btn.disabled = false;
  }
}

async function editJob(jobId) {
  try {
    const res = await fetch(`${API}/jobs/${jobId}`);
    const { job } = await res.json();

    document.getElementById('editJobId').value = job._id;
    document.getElementById('jTitle').value = job.title;
    document.getElementById('jCompany').value = job.company;
    document.getElementById('jLocation').value = job.location;
    document.getElementById('jType').value = job.type;
    document.getElementById('jCategory').value = job.category;
    document.getElementById('jSalary').value = job.salary || '';
    document.getElementById('jExperience').value = job.experience || '';
    document.getElementById('jDescription').value = job.description;
    document.getElementById('jRequirements').value = (job.requirements || []).join('\n');
    document.getElementById('jResponsibilities').value = (job.responsibilities || []).join('\n');
    document.getElementById('jSkills').value = (job.skills || []).join(', ');
    document.getElementById('jCompanyColor').value = job.companyColor || '';
    document.getElementById('jFeatured').checked = job.featured;
    document.getElementById('jUrgent').checked = job.urgent;
    document.getElementById('jRemote').checked = job.remote;
    document.getElementById('jActive').checked = job.active;
    if (job.deadline) document.getElementById('jDeadline').value = job.deadline.split('T')[0];

    document.getElementById('postJobTitle').innerHTML = 'Edit <span class="gradient-text">Job Listing</span>';
    document.getElementById('postJobSubtitle').textContent = `Editing: ${job.title} at ${job.company}`;
    document.getElementById('jobSubmitBtn').textContent = '💾 Update Job';

    switchTab('post-job');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showToast('❌ Failed to load job', 'error');
  }
}

function resetJobForm() {
  document.getElementById('jobForm').reset();
  document.getElementById('editJobId').value = '';
  document.getElementById('jActive').checked = true;
  document.getElementById('postJobTitle').innerHTML = 'Post a <span class="gradient-text">New Job</span>';
  document.getElementById('postJobSubtitle').textContent = 'Fill in the details to list a job on NexaJobs.';
  document.getElementById('jobSubmitBtn').textContent = '🚀 Post Job';
}

// ─── DELETE JOB ───────────────────────────────
function confirmDeleteJob(jobId, title) {
  pendingDeleteId = jobId;
  document.getElementById('confirmMsg').textContent = `Delete "${title}"? This cannot be undone.`;
  document.getElementById('confirmOverlay').classList.add('active');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  try {
    const res = await fetch(`${API}/jobs/${pendingDeleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error('Delete failed');
    showToast('🗑️ Job deleted', 'success');
    closeConfirm();
    loadAdminJobs();
    loadDashboard();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  pendingDeleteId = null;
}

// ─── APPLICATIONS ─────────────────────────────
async function loadApplications(status = 'all', page = 1) {
  adminAppsPage = page;
  const tbody = document.getElementById('appsTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><div class="spinner"></div></td></tr>`;

  try {
    const params = new URLSearchParams({ limit: 50 });
    if (status !== 'all') params.set('status', status);
    const res = await fetch(`${API}/applications?${params}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    renderAppsTable(data.applications || []);
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger)">Error loading applications</td></tr>`;
  }
}

function filterApplications(status, btn) {
  currentAppsFilter = status;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadApplications(status);
}

function renderAppsTable(apps) {
  const tbody = document.getElementById('appsTableBody');
  if (!tbody) return;

  if (!apps.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-muted)">No applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = apps.map(app => `
    <tr>
      <td>
        <div class="td-applicant">
          <div class="app-avatar">${app.name.charAt(0).toUpperCase()}</div>
          <strong>${app.name}</strong>
        </div>
      </td>
      <td><a href="mailto:${app.email}" class="email-link">${app.email}</a></td>
      <td>
        <div class="td-title">${app.job?.title || '—'}</div>
        <div class="td-sub">${app.job?.company || ''}</div>
      </td>
      <td>${formatDate(app.appliedAt)}</td>
      <td>
        <select class="status-select status-select-${app.status}" 
          onchange="updateAppStatus('${app._id}', this.value, this)">
          <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="reviewed" ${app.status === 'reviewed' ? 'selected' : ''}>👀 Reviewed</option>
          <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>✅ Shortlisted</option>
          <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
          <option value="hired" ${app.status === 'hired' ? 'selected' : ''}>🏆 Hired</option>
        </select>
      </td>
      <td>
        <button class="icon-btn" title="View details" onclick="viewApplication('${app._id}')">👁️</button>
      </td>
    </tr>`).join('');
}

async function updateAppStatus(appId, status, selectEl) {
  const prevClass = selectEl.className;
  selectEl.className = `status-select status-select-${status}`;
  try {
    const res = await fetch(`${API}/applications/${appId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Update failed');
    showToast(`✅ Status updated to "${status}"`, 'success');
    loadDashboard();
  } catch (err) {
    selectEl.className = prevClass;
    showToast('❌ Failed to update status', 'error');
  }
}

async function viewApplication(appId) {
  const overlay = document.getElementById('appModalOverlay');
  const content = document.getElementById('appModalContent');
  overlay.classList.add('active');
  content.innerHTML = `<div style="padding:40px;display:flex;justify-content:center"><div class="spinner"></div></div>`;

  try {
    // Find the app from loaded apps
    const res = await fetch(`${API}/applications?limit=200`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const app = data.applications?.find(a => a._id === appId);
    if (!app) throw new Error('Not found');

    content.innerHTML = `
      <h2 style="font-family:var(--font-display);margin-bottom:20px">Application Details</h2>
      <div class="app-detail-grid">
        <div class="detail-item"><span class="detail-label">Name</span><strong>${app.name}</strong></div>
        <div class="detail-item"><span class="detail-label">Email</span><a href="mailto:${app.email}">${app.email}</a></div>
        <div class="detail-item"><span class="detail-label">Phone</span><span>${app.phone || 'Not provided'}</span></div>
        <div class="detail-item"><span class="detail-label">Applied</span><span>${formatDate(app.appliedAt)}</span></div>
        <div class="detail-item"><span class="detail-label">Job</span><strong>${app.job?.title || '—'} @ ${app.job?.company || ''}</strong></div>
        <div class="detail-item"><span class="detail-label">Status</span><span class="status-badge status-${app.status}">${app.status}</span></div>
      </div>
      ${app.coverLetter ? `
        <div style="margin-top:24px">
          <h4 style="margin-bottom:12px;font-size:0.9rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Cover Letter</h4>
          <p style="color:var(--text-secondary);line-height:1.75;font-size:0.9rem;background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;border:1px solid var(--border-glass)">${app.coverLetter}</p>
        </div>` : ''}
      <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
        <a href="mailto:${app.email}" class="btn btn-primary">📧 Email Applicant</a>
        <button class="btn btn-ghost" onclick="closeAppModal()">Close</button>
      </div>`;
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger)">❌ ${err.message}</p>`;
  }
}

function closeAppModal() {
  document.getElementById('appModalOverlay').classList.remove('active');
}

document.getElementById('appModalOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'appModalOverlay') closeAppModal();
});
document.getElementById('confirmOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'confirmOverlay') closeConfirm();
});

// ─── Utilities ────────────────────────────────
function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
  const toast = document.createElement('div');
  toast.style.cssText = `background:rgba(15,15,30,0.97);border-left:4px solid ${colors[type]||colors.info};color:#fff;padding:14px 20px;border-radius:12px;font-size:0.9rem;font-family:'Inter',sans-serif;backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,0.5);max-width:340px;transform:translateX(120%);transition:transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275);cursor:pointer;`;
  toast.textContent = message;
  toast.onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 10);
  setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 400); }, 4000);
}
