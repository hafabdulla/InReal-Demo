const AUTH_STORAGE_KEY = 'inreal_admin_session';
const WORKSPACE_STORAGE_KEY = 'inreal_ops_admin_workspace_v1';
const API_BASE_STORAGE_KEY = 'inreal_ops_api_base';
const ADMIN_LOGIN_ERROR = 'Invalid email or password';

const defaultState = {
  apiUsers: [],
  intents: [],
  files: [],
  queue: [
    { title: 'KYC approvals waiting', value: '—', detail: 'Sync users tab for live counts' },
    { title: 'Upload SLA', value: '—', detail: 'Document upload API coming next' },
    { title: 'Open incidents', value: '0', detail: 'No user-facing outage currently' },
  ],
  audit: [],
};

const authEls = {
  loading: document.getElementById('authLoading'),
  login: document.getElementById('authLogin'),
  appShell: document.getElementById('appShell'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  loginSubmitBtn: document.getElementById('loginSubmitBtn'),
  apiBaseInput: document.getElementById('apiBaseInput'),
  adminName: document.getElementById('adminName'),
  adminEmail: document.getElementById('adminEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
};

const els = {
  navTabs: document.getElementById('navTabs'),
  summaryCards: document.getElementById('summaryCards'),
  overviewGrid: document.getElementById('overviewGrid'),
  queueCards: document.getElementById('queueCards'),
  userTableBody: document.getElementById('userTableBody'),
  fileTableBody: document.getElementById('fileTableBody'),
  auditList: document.getElementById('auditList'),
  userForm: document.getElementById('userForm'),
  uploadForm: document.getElementById('uploadForm'),
  userSearch: document.getElementById('userSearch'),
  userFilter: document.getElementById('userFilter'),
  userCountLabel: document.getElementById('userCountLabel'),
  fileCountLabel: document.getElementById('fileCountLabel'),
  seedDemoBtn: document.getElementById('seedDemoBtn'),
  clearAuditBtn: document.getElementById('clearAuditBtn'),
  addQueueItemBtn: document.getElementById('addQueueItemBtn'),
  uploadDropzone: document.getElementById('uploadDropzone'),
  fileInput: document.getElementById('fileInput'),
  intentTableBody: document.getElementById('intentTableBody'),
  intentCountLabel: document.getElementById('intentCountLabel'),
  refreshIntentsBtn: document.getElementById('refreshIntentsBtn'),
};

let authSession = null;
let state = loadWorkspaceState();

function isLocalDev() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function getApiBase() {
  const fromStorage = localStorage.getItem(API_BASE_STORAGE_KEY);
  const fromConfig = window.INREAL_OPS_CONFIG?.apiBase;
  return String(fromStorage || fromConfig || 'http://localhost:5000').trim().replace(/\/$/, '');
}

function setApiBase(url) {
  const normalized = String(url || '').trim().replace(/\/$/, '');
  if (normalized) {
    localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  }
}

function loadWorkspaceState() {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      apiUsers: Array.isArray(parsed.apiUsers) ? parsed.apiUsers : [],
      intents: Array.isArray(parsed.intents) ? parsed.intents : [],
      files: Array.isArray(parsed.files) ? parsed.files : structuredClone(defaultState.files),
      queue: Array.isArray(parsed.queue) ? parsed.queue : structuredClone(defaultState.queue),
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveWorkspaceState() {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

function loadAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  authSession = null;
}

function showAuthScreen(screen) {
  authEls.loading.classList.toggle('hidden', screen !== 'loading');
  authEls.login.classList.toggle('hidden', screen !== 'login');
  authEls.appShell.classList.toggle('hidden', screen !== 'app');
}

function rejectFailedAdminLogin(message = ADMIN_LOGIN_ERROR) {
  clearAuthSession();
  showAuthScreen('login');
  setLoginError(message);
}

function returnToLogin() {
  clearAuthSession();
  showAuthScreen('login');
  setLoginError('');
}

function setLoginError(message) {
  if (!message) {
    authEls.loginError.textContent = '';
    authEls.loginError.classList.add('hidden');
    return;
  }
  authEls.loginError.textContent = message;
  authEls.loginError.classList.remove('hidden');
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authSession?.token) {
    headers.Authorization = `Bearer ${authSession.token}`;
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function mapApiUser(user) {
  const name = [user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Email;
  const kyc = user.KYCStatus || 'Pending';
  const status = kyc === 'Approved' ? 'Verified' : kyc === 'Rejected' ? 'Suspended' : 'Pending';

  return {
    id: String(user.UserID),
    name,
    email: user.Email,
    country: user.CountryCode || '—',
    status,
    role: user.Role || 'user',
    notes: `${user.AccreditationStatus || 'Unverified'} • ${user.Role || 'user'}`,
  };
}

function addAudit(title, meta, body) {
  state.audit.unshift({ title, meta, body });
  state.audit = state.audit.slice(0, 20);
  saveWorkspaceState();
}

function statusClass(status) {
  return String(status).toLowerCase();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateAdminHeader() {
  const user = authSession?.user;
  if (!user) return;
  const name = [user.FirstName, user.LastName].filter(Boolean).join(' ') || 'Operations';
  authEls.adminName.textContent = name;
  authEls.adminEmail.textContent = user.Email || '';
}

async function loadApiUsers() {
  const result = await apiFetch('/api/users');
  state.apiUsers = (result.data || []).map(mapApiUser);
  addAudit('Users synced', `${authSession.user.Email} • just now`, `Loaded ${state.apiUsers.length} users from the API.`);
}

async function loadInvestmentIntents() {
  const result = await apiFetch('/api/ops/investment-intents');
  state.intents = result.data || [];
  addAudit('Intents synced', `${authSession.user.Email} • just now`, `Loaded ${state.intents.length} investment intents.`);
}

async function refreshLiveData() {
  await Promise.all([loadApiUsers(), loadInvestmentIntents()]);
  render();
}

function renderSummary() {
  const verified = state.apiUsers.filter((user) => user.status === 'Verified').length;
  const pending = state.apiUsers.filter((user) => user.status === 'Pending').length;
  const reviewQueue = state.intents.filter((item) => item.workflowStatus === 'PendingOpsReview').length;

  els.summaryCards.innerHTML = `
    <div class="metric">
      <div class="label">Users</div>
      <div class="value">${state.apiUsers.length}</div>
      <div class="sub">${verified} verified, ${pending} pending</div>
    </div>
    <div class="metric">
      <div class="label">Intents queue</div>
      <div class="value">${state.intents.length}</div>
      <div class="sub">${reviewQueue} awaiting ops review</div>
    </div>
    <div class="metric">
      <div class="label">Local documents</div>
      <div class="value">${state.files.length}</div>
      <div class="sub">Metadata only until upload API ships</div>
    </div>
  `;
}

function renderOverview() {
  const pendingUsers = state.apiUsers.filter((user) => user.status === 'Pending').length;
  const suspendedUsers = state.apiUsers.filter((user) => user.status === 'Suspended').length;
  const pendingIntents = state.intents.filter((item) => item.workflowStatus === 'PendingOpsReview').length;

  els.overviewGrid.innerHTML = `
    <div class="info-card">
      <h4>Pending KYC</h4>
      <div class="big">${pendingUsers}</div>
      <p class="small">Users with non-approved KYC status in the live database.</p>
    </div>
    <div class="info-card">
      <h4>Suspended / rejected</h4>
      <div class="big">${suspendedUsers}</div>
      <p class="small">Accounts flagged for compliance follow-up.</p>
    </div>
    <div class="info-card">
      <h4>Intent reviews</h4>
      <div class="big">${pendingIntents}</div>
      <p class="small">Investment intents waiting for operations review.</p>
    </div>
  `;
}

function renderUsers() {
  const query = els.userSearch.value.trim().toLowerCase();
  const filter = els.userFilter.value;

  const filtered = state.apiUsers.filter((user) => {
    const matchesQuery = !query || [user.name, user.email, user.country, user.notes, user.role].join(' ').toLowerCase().includes(query);
    const matchesFilter = filter === 'all' || user.status.toLowerCase() === filter;
    return matchesQuery && matchesFilter;
  });

  els.userCountLabel.textContent = `${filtered.length} user${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    els.userTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="helper">No users loaded. Check API connection or refresh after sign-in.</td>
      </tr>
    `;
    return;
  }

  els.userTableBody.innerHTML = filtered
    .map(
      (user) => `
      <tr>
        <td>
          <strong>${user.name}</strong><br />
          <span class="helper">${user.notes}</span>
        </td>
        <td>${user.email}</td>
        <td>${user.country}</td>
        <td><span class="tag ${statusClass(user.status)}">${user.status}</span></td>
        <td><span class="tag">${user.role}</span></td>
      </tr>
    `,
    )
    .join('');
}

function renderIntents() {
  els.intentCountLabel.textContent = `${state.intents.length} intent${state.intents.length === 1 ? '' : 's'}`;

  if (state.intents.length === 0) {
    els.intentTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="helper">No investment intents in the queue.</td>
      </tr>
    `;
    return;
  }

  els.intentTableBody.innerHTML = state.intents
    .map(
      (intent) => `
      <tr>
        <td><strong>${intent.referenceCode || '—'}</strong></td>
        <td>${intent.user?.name || '—'}<br /><span class="helper">${intent.user?.email || ''}</span></td>
        <td>${intent.propertyName || '—'}</td>
        <td>${formatMoney(intent.amount, intent.currency)}</td>
        <td><span class="tag">${intent.workflowStatus || '—'}</span></td>
        <td>${intent.proofStatus || '—'}</td>
      </tr>
    `,
    )
    .join('');
}

function renderFiles() {
  els.fileCountLabel.textContent = `${state.files.length} file${state.files.length === 1 ? '' : 's'}`;

  els.fileTableBody.innerHTML = state.files.length
    ? state.files
        .map(
          (file) => `
      <tr>
        <td><strong>${file.label}</strong></td>
        <td>${String(file.type).toUpperCase()}</td>
        <td>${file.category}</td>
        <td>${file.assignedTo}</td>
        <td>${formatDate(file.createdAt)}</td>
      </tr>
    `,
        )
        .join('')
    : `<tr><td colspan="5" class="helper">No local document metadata yet.</td></tr>`;
}

function renderQueue() {
  els.queueCards.innerHTML = state.queue
    .map(
      (item) => `
      <div class="info-card">
        <h4>${item.title}</h4>
        <div class="big">${item.value}</div>
        <p class="small">${item.detail}</p>
      </div>
    `,
    )
    .join('');
}

function renderAudit() {
  els.auditList.innerHTML = state.audit.length
    ? state.audit
        .map(
          (item) => `
      <article class="audit-item">
        <div class="audit-top">
          <div>
            <h4>${item.title}</h4>
            <p class="audit-meta">${item.meta}</p>
          </div>
        </div>
        <p class="small">${item.body}</p>
      </article>
    `,
        )
        .join('')
    : `<p class="helper">Actions you take in this session will appear here.</p>`;
}

function render() {
  renderSummary();
  renderOverview();
  renderUsers();
  renderIntents();
  renderFiles();
  renderQueue();
  renderAudit();
  saveWorkspaceState();
  refreshIcons();
}

function setActiveTab(tab) {
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle('active', isActive);
    if (isActive && button.dataset.title) {
      const pageTitle = document.getElementById('pageTitle');
      if (pageTitle) pageTitle.textContent = button.dataset.title;
    }
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

async function establishSession(session) {
  authSession = session;
  saveAuthSession(session);

  const me = await apiFetch('/api/admin/auth/me');
  authSession = { ...session, user: me.data };
  saveAuthSession(authSession);

  updateAdminHeader();
  showAuthScreen('app');
  refreshIcons();
  await refreshLiveData();
  return true;
}

async function handleLogin(event) {
  event.preventDefault();
  setLoginError('');
  authEls.loginSubmitBtn.disabled = true;

  const formData = new FormData(authEls.loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const apiBase = String(authEls.apiBaseInput.value || '').trim();

  if (apiBase) setApiBase(apiBase);

  try {
    const result = await apiFetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await establishSession({ user: result.data, token: result.token });
    addAudit('Admin signed in', `${result.data.Email} • just now`, 'Operations workspace unlocked.');
    renderAudit();
  } catch {
    rejectFailedAdminLogin();
  } finally {
    authEls.loginSubmitBtn.disabled = false;
  }
}

function handleLogout() {
  const email = authSession?.user?.Email || 'Admin';
  clearAuthSession();
  showAuthScreen('login');
  setLoginError('');
}

async function bootstrapAuth() {
  const apiBaseField = document.getElementById('apiBaseField');
  if (apiBaseField) {
    apiBaseField.classList.toggle('hidden', !isLocalDev());
  }
  if (authEls.apiBaseInput) {
    authEls.apiBaseInput.value = getApiBase();
  }
  showAuthScreen('loading');

  const stored = loadAuthSession();
  if (!stored) {
    showAuthScreen('login');
    return;
  }

  authSession = stored;

  try {
    const me = await apiFetch('/api/admin/auth/me');
    authSession = { ...stored, user: me.data };
    saveAuthSession(authSession);
    updateAdminHeader();
    showAuthScreen('app');
    refreshIcons();
    await refreshLiveData();
  } catch {
    returnToLogin();
  }
}

function bindWorkspaceEvents() {
  els.navTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    setActiveTab(button.dataset.tab);
  });

  els.userSearch.addEventListener('input', renderUsers);
  els.userFilter.addEventListener('change', renderUsers);

  els.userForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addAudit(
      'User form (local only)',
      `${authSession?.user?.Email || 'Ops'} • just now`,
      'User create/update via API is not wired yet. Use Supabase or a future admin endpoint.',
    );
    els.userForm.reset();
    renderAudit();
  });

  els.uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(els.uploadForm);
    const fileName = els.fileInput.files[0]?.name || 'manual-entry.pdf';
    const file = {
      id: `FIL-${Math.floor(1000 + Math.random() * 9000)}`,
      label: String(formData.get('label') || fileName).trim(),
      category: String(formData.get('category') || 'KYC'),
      assignedTo: String(formData.get('assignedTo') || 'Ops Team').trim(),
      type: fileName.split('.').pop().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    state.files.unshift(file);
    addAudit('Document recorded (local)', `${authSession?.user?.Email || 'Ops'} • just now`, `${file.label} saved as local metadata only.`);
    els.uploadForm.reset();
    els.fileInput.value = '';
    render();
  });

  els.uploadDropzone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files.length) {
      addAudit('File staged', `${authSession?.user?.Email || 'Ops'} • just now`, `${els.fileInput.files.length} file(s) selected for metadata.`);
      renderAudit();
    }
  });

  els.seedDemoBtn.addEventListener('click', async () => {
    await refreshLiveData();
    addAudit('Live data refreshed', `${authSession?.user?.Email || 'Ops'} • just now`, 'Users and investment intents reloaded from API.');
    render();
  });

  els.refreshIntentsBtn.addEventListener('click', async () => {
    await loadInvestmentIntents();
    render();
  });

  els.clearAuditBtn.addEventListener('click', () => {
    state.audit = [];
    renderAudit();
    saveWorkspaceState();
  });

  els.addQueueItemBtn.addEventListener('click', () => {
    state.queue.unshift({
      title: 'New manual queue item',
      value: '1 item',
      detail: 'Placeholder task added from the operations workspace',
    });
    addAudit('Queue item added', `${authSession?.user?.Email || 'Ops'} • just now`, 'Local queue card created.');
    render();
  });
}

authEls.loginForm.addEventListener('submit', handleLogin);
authEls.logoutBtn.addEventListener('click', handleLogout);

bindWorkspaceEvents();
bootstrapAuth();
