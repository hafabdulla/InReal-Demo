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
    { title: 'Upload SLA', value: '—', detail: 'Document assignment is now API-backed' },
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
  sidebar: document.querySelector('.sidebar'),
  sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  navTabs: document.getElementById('navTabs'),
  summaryCards: document.getElementById('summaryCards'),
  overviewGrid: document.getElementById('overviewGrid'),
  queueCards: document.getElementById('queueCards'),
  userTableBody: document.getElementById('userTableBody'),
  fileTableBody: document.getElementById('fileTableBody'),
  auditList: document.getElementById('auditList'),
  userForm: document.getElementById('userForm'),
  createUserSubmitBtn: document.getElementById('createUserSubmitBtn'),
  createUserError: document.getElementById('createUserError'),
  setupCodePanel: document.getElementById('setupCodePanel'),
  setupCodeSummary: document.getElementById('setupCodeSummary'),
  setupCodeValue: document.getElementById('setupCodeValue'),
  copySetupCodeBtn: document.getElementById('copySetupCodeBtn'),
  dismissSetupCodeBtn: document.getElementById('dismissSetupCodeBtn'),
  closeSetupCodeBtn: document.getElementById('closeSetupCodeBtn'),
  uploadForm: document.getElementById('uploadForm'),
  dropzoneEmptyState: document.getElementById('dropzoneEmptyState'),
  dropzoneFileState: document.getElementById('dropzoneFileState'),
  dropzoneThumbnail: document.getElementById('dropzoneThumbnail'),
  dropzoneFileIcon: document.getElementById('dropzoneFileIcon'),
  dropzoneFileName: document.getElementById('dropzoneFileName'),
  dropzoneFileSize: document.getElementById('dropzoneFileSize'),
  uploadFormSuccess: document.getElementById('uploadFormSuccess'),
  docUserSearch: document.getElementById('docUserSearch'),
  docUserId: document.getElementById('docUserId'),
  docUserResults: document.getElementById('docUserResults'),
  docUserSelected: document.getElementById('docUserSelected'),
  uploadFormError: document.getElementById('uploadFormError'),
  uploadSubmitBtn: document.getElementById('uploadSubmitBtn'),
  userSearch: document.getElementById('userSearch'),
  userFilter: document.getElementById('userFilter'),
  userCountLabel: document.getElementById('userCountLabel'),
  fileCountLabel: document.getElementById('fileCountLabel'),
  seedDemoBtn: document.getElementById('seedDemoBtn'),
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
  // CORRECTION 09 July 2026: this originally correctly checked 'Approved' —
  // that IS the real value the KYC-decision flow writes to kyc_status. An
  // earlier pass mistakenly changed this to 'Verified' based on a mis-read
  // of the UPDATE statement's column order. Reverted back here.
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

async function loadDocuments() {
  const result = await apiFetch('/api/ops/documents');
  state.files = result.data || [];
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
      <div class="label">Assigned documents</div>
      <div class="value">${state.files.length}</div>
      <div class="sub">Uploaded and assigned via API</div>
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
  els.fileCountLabel.textContent = `${state.files.length} document${state.files.length === 1 ? '' : 's'}`;

  els.fileTableBody.innerHTML = state.files.length
    ? state.files
        .map((file) => {
          const format = (file.OriginalFileName || '').split('.').pop().toUpperCase() || '—';
          const assignedName = [file.UserFirstName, file.UserLastName].filter(Boolean).join(' ') || file.UserEmail;
          const supersededTag = file.IsSuperseded ? ' <span class="tag suspended">Superseded</span>' : '';
          return `
      <tr>
        <td><strong>${escapeHtml(file.Label)}</strong>${supersededTag}</td>
        <td>${escapeHtml(format)}</td>
        <td>${escapeHtml(file.Category)}</td>
        <td>${escapeHtml(assignedName)}<br /><span class="helper">${escapeHtml(file.UserEmail)}</span></td>
        <td>${formatDate(file.CreatedAt)}</td>
        <td><button class="doc-download-btn" data-doc-id="${file.DocumentID}" data-doc-name="${escapeAttr(file.OriginalFileName)}">Download</button></td>
      </tr>
    `;
        })
        .join('')
    : `<tr><td colspan="6" class="helper">No documents uploaded yet.</td></tr>`;
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
            <h4>${escapeHtml(item.title)}</h4>
            <p class="audit-meta">${escapeHtml(item.meta)}</p>
          </div>
        </div>
        <p class="small">${escapeHtml(item.body)}</p>
      </article>
    `,
        )
        .join('')
    : `<p class="helper">Actions you take in this session will appear here.</p>`;
}

function openMobileSidebar() {
  els.sidebar?.classList.add('mobile-open');
  els.sidebarBackdrop?.classList.add('visible');
}

function closeMobileSidebar() {
  els.sidebar?.classList.remove('mobile-open');
  els.sidebarBackdrop?.classList.remove('visible');
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
  // On mobile the sidebar is an overlay, not a permanent column — close it
  // once a destination is picked, same as most mobile nav drawers behave.
  closeMobileSidebar();
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
  els.sidebarToggleBtn?.addEventListener('click', openMobileSidebar);
  els.sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  els.navTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    setActiveTab(button.dataset.tab);
  });

  els.userSearch.addEventListener('input', renderUsers);
  els.userFilter.addEventListener('change', renderUsers);

  els.userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.createUserError.hidden = true;
    els.setupCodePanel.hidden = true;

    const formData = new FormData(els.userForm);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const countryCode = String(formData.get('countryCode') || '').trim().toUpperCase();
    const phoneCode = String(formData.get('phoneCode') || '').trim();
    const phone = String(formData.get('phone') || '').trim();

    if (!firstName || !lastName || !email || !countryCode || !phoneCode || !phone) {
      els.createUserError.textContent = 'All fields are required.';
      els.createUserError.hidden = false;
      return;
    }

    els.createUserSubmitBtn.disabled = true;
    els.createUserSubmitBtn.textContent = 'Creating…';

    try {
      const result = await apiFetch('/api/ops/users', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, countryCode, phoneCode, phone }),
      });

      addAudit(
        'Account created',
        `${authSession?.user?.Email || 'Ops'} • just now`,
        `Created account for ${firstName} ${lastName} (${email}). Setup code issued — relay it via the manual channel, not email.`,
      );

      els.userForm.reset();

      // The setup code is the whole point of this flow — it's never shown
      // again after this, so this panel stays open until the admin
      // dismisses it themselves, unlike other success messages in this app
      // that auto-hide after a few seconds.
      els.setupCodeSummary.textContent = `${firstName} ${lastName} — ${email}`;
      els.setupCodeValue.value = result.setupToken;
      els.setupCodePanel.hidden = false;

      await loadApiUsers();
      render();
    } catch (error) {
      els.createUserError.textContent = error.message || 'Could not create the account. Please try again.';
      els.createUserError.hidden = false;
    } finally {
      els.createUserSubmitBtn.disabled = false;
      els.createUserSubmitBtn.textContent = 'Create account';
    }
  });

  els.copySetupCodeBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.setupCodeValue.value);
      els.copySetupCodeBtn.textContent = 'Copied!';
      setTimeout(() => { els.copySetupCodeBtn.textContent = 'Copy code'; }, 2000);
    } catch {
      els.setupCodeValue.select();
    }
  });

  els.dismissSetupCodeBtn.addEventListener('click', () => {
    els.setupCodePanel.hidden = true;
    els.setupCodeValue.value = '';
  });

  els.closeSetupCodeBtn.addEventListener('click', () => {
    els.setupCodePanel.hidden = true;
    els.setupCodeValue.value = '';
  });

  // ── Document upload: user search picker ────────────────────────────────
  // Debounced search against /api/ops/documents' companion endpoint,
  // /api/ops/users/search — the server validates and returns matches;
  // the client only ever holds the userId the admin actually clicked on,
  // never types one in directly.
  let userSearchDebounce = null;
  let selectedDocUser = null;

  function renderDocUserSelected() {
    if (!selectedDocUser) {
      els.docUserSelected.hidden = true;
      els.docUserSelected.innerHTML = '';
      return;
    }
    const name = [selectedDocUser.FirstName, selectedDocUser.LastName].filter(Boolean).join(' ');
    els.docUserSelected.hidden = false;
    els.docUserSelected.innerHTML = `
      <span><strong>${escapeHtml(name)}</strong> — ${escapeHtml(selectedDocUser.Email)}</span>
      <button type="button" id="clearDocUserBtn">Change</button>
    `;
    document.getElementById('clearDocUserBtn').addEventListener('click', () => {
      selectedDocUser = null;
      els.docUserId.value = '';
      els.docUserSearch.value = '';
      els.docUserSearch.hidden = false;
      renderDocUserSelected();
      els.docUserSearch.focus();
    });
    els.docUserSearch.hidden = true;
  }

  let latestSearchQuery = '';

  els.docUserSearch.addEventListener('input', () => {
    const query = els.docUserSearch.value.trim();
    latestSearchQuery = query;
    clearTimeout(userSearchDebounce);
    if (query.length < 1) {
      els.docUserResults.innerHTML = '';
      return;
    }
    // 120ms debounce: fast enough to feel instant on a single keystroke,
    // still enough to avoid firing a request on every keystroke of a fast typer.
    userSearchDebounce = setTimeout(async () => {
      try {
        const result = await apiFetch(`/api/ops/users/search?q=${encodeURIComponent(query)}`);
        // Guard against out-of-order responses: with a fast 120ms debounce and
        // a 1-character minimum, a slower earlier request can resolve AFTER a
        // newer one if the network is uneven. If the box no longer contains
        // what we searched for, drop this response rather than show stale
        // results for a query the admin has already moved past.
        if (latestSearchQuery !== query) return;

        const matches = result.data || [];
        els.docUserResults.innerHTML = matches.length
          ? matches
              .map(
                (u) => `<button type="button" data-user-id="${u.UserID}">${escapeHtml([u.FirstName, u.LastName].filter(Boolean).join(' '))} — ${escapeHtml(u.Email)}</button>`,
              )
              .join('')
          : `<span class="helper">No matching users.</span>`;

        els.docUserResults.querySelectorAll('button[data-user-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const match = matches.find((u) => String(u.UserID) === btn.dataset.userId);
            if (!match) return;
            selectedDocUser = match;
            els.docUserId.value = match.UserID;
            els.docUserResults.innerHTML = '';
            renderDocUserSelected();
          });
        });
      } catch (error) {
        if (latestSearchQuery !== query) return;
        els.docUserResults.innerHTML = `<span class="helper">Search failed: ${escapeHtml(error.message)}</span>`;
      }
    }, 120);
  });

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function showDropzonePreview(file) {
    els.dropzoneEmptyState.hidden = true;
    els.dropzoneFileState.hidden = false;
    els.dropzoneFileName.textContent = file.name;
    els.dropzoneFileSize.textContent = formatFileSize(file.size);

    const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || /\.(jpe?g|png)$/i.test(file.name);
    if (isImage) {
      const objectUrl = URL.createObjectURL(file);
      els.dropzoneThumbnail.src = objectUrl;
      els.dropzoneThumbnail.hidden = false;
      els.dropzoneFileIcon.hidden = true;
      // Release the object URL once the image has actually loaded it, rather
      // than immediately — revoking too early can blank the thumbnail before
      // the browser finishes painting it.
      els.dropzoneThumbnail.onload = () => URL.revokeObjectURL(objectUrl);
    } else {
      els.dropzoneThumbnail.hidden = true;
      els.dropzoneFileIcon.hidden = false;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function resetDropzonePreview() {
    els.dropzoneEmptyState.hidden = false;
    els.dropzoneFileState.hidden = true;
    els.dropzoneThumbnail.src = '';
    els.dropzoneFileName.textContent = '';
    els.dropzoneFileSize.textContent = '';
  }


  els.uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.uploadFormError.textContent = '';

    const formData = new FormData(els.uploadForm);
    const label = String(formData.get('label') || '').trim();
    const category = String(formData.get('category') || '');
    const userId = els.docUserId.value;
    const file = els.fileInput.files[0];

    if (!label) {
      els.uploadFormError.textContent = 'Document label is required.';
      return;
    }
    if (!userId) {
      els.uploadFormError.textContent = 'Search for and select a user to assign this document to.';
      return;
    }
    if (!file) {
      els.uploadFormError.textContent = 'Choose a file to upload (PDF, JPG, or PNG).';
      return;
    }

    els.uploadSubmitBtn.disabled = true;
    els.uploadSubmitBtn.textContent = 'Uploading…';

    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.readAsDataURL(file);
      });

      await apiFetch('/api/ops/documents', {
        method: 'POST',
        body: JSON.stringify({
          userId: Number(userId),
          category,
          label,
          fileBase64,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

      addAudit(
        'Document assigned',
        `${authSession?.user?.Email || 'Ops'} • just now`,
        `${label} (${category}) assigned to ${selectedDocUser?.Email || 'user #' + userId}.`,
      );

      els.uploadForm.reset();
      els.fileInput.value = '';
      resetDropzonePreview();
      selectedDocUser = null;
      els.docUserId.value = '';
      els.docUserSearch.hidden = false;
      renderDocUserSelected();

      // A silently-updated table further down the page is easy to miss,
      // especially on mobile where it's scrolled out of view — show an
      // explicit, unmissable confirmation right next to the button that was
      // just pressed, not just an audit-log entry the admin has to go look for.
      els.uploadFormSuccess.textContent = `✓ "${label}" uploaded and assigned successfully.`;
      els.uploadFormSuccess.hidden = false;
      setTimeout(() => { els.uploadFormSuccess.hidden = true; }, 5000);

      await loadDocuments();
      render();
    } catch (error) {
      els.uploadFormSuccess.hidden = true;
      els.uploadFormError.textContent = error.message || 'Upload failed. Please try again.';
    } finally {
      els.uploadSubmitBtn.disabled = false;
      els.uploadSubmitBtn.textContent = 'Upload & assign';
    }
  });

  // NOTE: uploadDropzone is a <label> wrapping the (hidden) fileInput, so
  // clicking anywhere in it already opens the file picker natively — that's
  // standard label/input behavior, no JS needed. There used to be an extra
  // manual `els.fileInput.click()` here too, which meant every tap fired the
  // file picker TWICE (once from the native label behavior, once from this
  // listener). Desktop browsers mostly ignore a redundant second click while
  // a file dialog is already open; several mobile browsers instead treat it
  // as "cancel the picker in progress," which reset the selection before the
  // user could finish choosing a file — exactly the "Choose a file to
  // upload" error reported on mobile despite a file clearly being picked.
  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files.length) {
      const file = els.fileInput.files[0];
      showDropzonePreview(file);
      els.uploadFormError.textContent = '';
      addAudit('File staged', `${authSession?.user?.Email || 'Ops'} • just now`, `${file.name} ready to upload.`);
      renderAudit();
    } else {
      resetDropzonePreview();
    }
  });

  // ── Document download ───────────────────────────────────────────────────
  // Files are never served from a public/static path — every download is a
  // fresh, authenticated fetch that includes the admin's bearer token, same
  // as every other admin API call. We fetch as a blob and trigger a save
  // rather than navigating directly, since a plain link/window.open would
  // not carry the Authorization header.
  els.fileTableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('.doc-download-btn');
    if (!button) return;
    const documentId = button.dataset.docId;
    const fileName = button.dataset.docName || `document-${documentId}`;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '…';
    try {
      const response = await fetch(`${getApiBase()}/api/ops/documents/${documentId}/file`, {
        headers: { Authorization: `Bearer ${authSession?.token || ''}` },
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      addAudit('Download failed', `${authSession?.user?.Email || 'Ops'} • just now`, error.message);
      renderAudit();
    } finally {
      button.disabled = false;
      button.textContent = originalText;
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

  // NOTE: Audit Clear button intentionally removed (HC-9, PRD v1.2).
  // The audit log is append-only — no surface can clear it.

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

// ── KYC Review ───────────────────────────────────────────────────────────────

// Risk tier derived from Appendix A of the Compliance Manual.
// EDD = FATF grey-list or elevated risk indicators.
// Excluded countries are already blocked at signup (server.js).
const EDD_COUNTRY_CODES = new Set([
  'LB','TR','AL','BH','BF','BI','CM','CD','HT','IR','KH','KG','LA','LY','ML',
  'MA','MM','MZ','NI','NG','KP','PK','PA','PH','RU','SN','SS','SY','TZ','TT',
  'UG','VN','YE','ZW','BY','AF','IQ','SD','SO','VE','ZA','KE',
]);

const MEDIUM_COUNTRY_CODES = new Set([
  'DZ','AD','AO','AR','AM','AZ','BD','BJ','BT','BO','BA','BN','BG','KH',
  'CO','EG','GH','GE','GT','ID','JO','KZ','KG','MV','MX','MD','MN','ME',
  'MA','NA','NP','MK','PE','SM','RS','LK','TH','TN','UA','UZ',
]);

function getCountryRisk(countryCode) {
  const code = String(countryCode || '').toUpperCase();
  if (EDD_COUNTRY_CODES.has(code)) return { tier: 'EDD', dd: 'Enhanced Due Diligence', isEDD: true };
  if (MEDIUM_COUNTRY_CODES.has(code)) return { tier: 'Medium', dd: 'SDD + enhanced SoF', isEDD: false };
  return { tier: 'Low', dd: 'Standard Due Diligence', isEDD: false };
}

function tierClass(tier) {
  if (tier === 'EDD') return 'tag suspended';
  if (tier === 'Medium') return 'tag pending';
  return 'tag verified';
}

let kycQueue = [];
let selectedKycUser = null;

async function loadKycQueue() {
  const result = await apiFetch('/api/ops/kyc-reviews');
  kycQueue = result.data || [];
  addAudit('KYC queue loaded', `${authSession?.user?.Email || 'Ops'} • just now`, `${kycQueue.length} participant(s) awaiting review.`);
}

function renderKycQueue() {
  const countLabel = document.getElementById('kycCountLabel');
  const tbody = document.getElementById('kycTableBody');
  if (!countLabel || !tbody) return;

  countLabel.textContent = `${kycQueue.length} pending`;

  if (kycQueue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="helper" style="text-align:center;padding:24px">No participants awaiting KYC review.</td></tr>`;
    return;
  }

  tbody.innerHTML = kycQueue.map((user) => {
    const risk = getCountryRisk(user.CountryCode);
    return `
      <tr class="kyc-row" data-userid="${user.UserID}">
        <td>
          <strong>${user.FirstName} ${user.LastName}</strong><br>
          <span class="helper">${user.Email}</span>
        </td>
        <td>${user.CountryCode || '—'}</td>
        <td><span class="${tierClass(risk.tier)}">${risk.tier}</span></td>
        <td><span class="helper">${risk.dd}</span></td>
        <td>${formatDate(user.CreatedAt)}</td>
        <td>
          <button class="ghost-btn kyc-review-btn" data-userid="${user.UserID}" style="font-size:0.8rem;padding:4px 10px">
            Review
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

function openKycDrawer(userId) {
  const user = kycQueue.find((u) => String(u.UserID) === String(userId));
  if (!user) return;
  selectedKycUser = user;

  const risk = getCountryRisk(user.CountryCode);

  document.getElementById('kycDrawerName').textContent = `${user.FirstName} ${user.LastName}`;
  document.getElementById('kycDrawerEmail').textContent = user.Email;
  document.getElementById('kycDrawerCountry').textContent = user.CountryCode || '—';
  document.getElementById('kycDrawerUserId').textContent = `#${user.UserID}`;
  document.getElementById('kycDrawerPhone').textContent = user.PhoneNumber || '—';
  document.getElementById('kycDrawerJoined').textContent = formatDate(user.CreatedAt);

  const tierEl = document.getElementById('kycDrawerTier');
  tierEl.innerHTML = `<span class="${tierClass(risk.tier)}">${risk.tier}</span>`;

  document.getElementById('kycDrawerDD').textContent = risk.dd;

  const eddWarning = document.getElementById('eddWarning');
  eddWarning.classList.toggle('hidden', !risk.isEDD);

  document.getElementById('kycReviewerName').value = '';
  document.getElementById('kycNotes').value = '';
  document.getElementById('kycFormError').classList.add('hidden');
  document.getElementById('kycFormError').textContent = '';

  document.getElementById('kycDrawer').classList.remove('hidden');
  refreshIcons();

  loadKycHistory(user.UserID);
}

// Pulls the durable decision trail from the server (kyc_decisions table via
// GET /api/ops/kyc-reviews/:userId/history) — this is the actual record of past
// approve/decline actions, independent of this browser's localStorage.
async function loadKycHistory(userId) {
  const emptyEl = document.getElementById('kycHistoryEmpty');
  const listEl = document.getElementById('kycHistoryList');

  emptyEl.textContent = 'Loading history…';
  emptyEl.classList.remove('hidden');
  listEl.classList.add('hidden');
  listEl.innerHTML = '';

  try {
    const result = await apiFetch(`/api/ops/kyc-reviews/${userId}/history`);
    const decisions = result?.data || [];

    if (decisions.length === 0) {
      emptyEl.textContent = 'No prior decisions on record for this user.';
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      return;
    }

    listEl.innerHTML = decisions
      .map((d) => `
        <li class="kyc-history-item">
          <span class="kyc-history-action ${d.Action}">${d.Action === 'approve' ? 'Approved' : 'Declined'}</span>
          <span class="kyc-history-meta">by ${escapeHtml(d.ReviewerName)} (${escapeHtml(d.AdminEmail)}) • ${formatDate(d.DecidedAt)}</span>
          ${d.Notes ? `<span class="kyc-history-meta">${escapeHtml(d.Notes)}</span>` : ''}
        </li>
      `)
      .join('');
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
  } catch (err) {
    emptyEl.textContent = 'Could not load decision history.';
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

// escapeHtml() only escapes what's unsafe in a text node (&, <, >) — it does
// NOT escape quote characters, because a quote is harmless between two tags.
// But it's NOT safe to reuse inside an HTML attribute value like
// `data-x="${...}"`: a `"` in the value closes the attribute early and lets
// anything after it be parsed as new attributes/event handlers (e.g.
// `onmouseover=...`). This wraps escapeHtml and additionally escapes quotes,
// for the specific case of interpolating into an attribute.
function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function closeKycDrawer() {
  selectedKycUser = null;
  document.getElementById('kycDrawer').classList.add('hidden');
}

async function submitKycDecision(action) {
  if (!selectedKycUser) return;

  const reviewerName = document.getElementById('kycReviewerName').value.trim();
  const notes = document.getElementById('kycNotes').value.trim();
  const errorEl = document.getElementById('kycFormError');

  if (!reviewerName) {
    errorEl.textContent = 'Reviewer name is required before recording a decision.';
    errorEl.classList.remove('hidden');
    return;
  }

  const approveBtn = document.getElementById('kycApproveBtn');
  const declineBtn = document.getElementById('kycDeclineBtn');
  approveBtn.disabled = true;
  declineBtn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    await apiFetch(`/api/ops/kyc-reviews/${selectedKycUser.UserID}/decision`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewerName, notes }),
    });

    const userName = `${selectedKycUser.FirstName} ${selectedKycUser.LastName}`;
    addAudit(
      `KYC ${action}d — ${userName}`,
      `${authSession?.user?.Email || 'Ops'} • just now`,
      `Reviewer: ${reviewerName}. ${notes ? `Notes: ${notes}` : 'No additional notes.'}`,
    );

    closeKycDrawer();
    await loadKycQueue();
    await loadApiUsers();
    renderKycQueue();
    renderUsers();
    renderSummary();
    renderOverview();
    renderAudit();
    saveWorkspaceState();
  } catch (err) {
    errorEl.textContent = err.message || 'Decision could not be recorded. Try again.';
    errorEl.classList.remove('hidden');
  } finally {
    approveBtn.disabled = false;
    declineBtn.disabled = false;
  }
}

function bindKycEvents() {
  document.getElementById('refreshKycBtn').addEventListener('click', async () => {
    await loadKycQueue();
    renderKycQueue();
  });

  document.getElementById('kycTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.kyc-review-btn');
    if (btn) openKycDrawer(btn.dataset.userid);
  });

  document.getElementById('kycDrawerCloseBtn').addEventListener('click', closeKycDrawer);
  document.getElementById('kycApproveBtn').addEventListener('click', () => submitKycDecision('approve'));
  document.getElementById('kycDeclineBtn').addEventListener('click', () => submitKycDecision('decline'));
}

async function refreshLiveData() {
  await Promise.all([loadApiUsers(), loadInvestmentIntents(), loadKycQueue(), loadDocuments()]);
  render();
}

function render() {
  renderSummary();
  renderOverview();
  renderUsers();
  renderIntents();
  renderFiles();
  renderQueue();
  renderKycQueue();
  renderAudit();
  saveWorkspaceState();
  refreshIcons();
}

authEls.loginForm.addEventListener('submit', handleLogin);
authEls.logoutBtn.addEventListener('click', handleLogout);

bindWorkspaceEvents();
bindKycEvents();
bootstrapAuth();