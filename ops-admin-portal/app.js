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
  docPropertyId: document.getElementById('docPropertyId'),
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
  operatorUserSearch: document.getElementById('operatorUserSearch'),
  operatorGrantUserId: document.getElementById('operatorGrantUserId'),
  operatorUserResults: document.getElementById('operatorUserResults'),
  operatorUserSelected: document.getElementById('operatorUserSelected'),
  uploadFormError: document.getElementById('uploadFormError'),
  uploadSubmitBtn: document.getElementById('uploadSubmitBtn'),
  userSearch: document.getElementById('userSearch'),
  userFilter: document.getElementById('userFilter'),
  userCountLabel: document.getElementById('userCountLabel'),
  fileCountLabel: document.getElementById('fileCountLabel'),
  docFilterQuery: document.getElementById('docFilterQuery'),
  docFilterCategory: document.getElementById('docFilterCategory'),
  docFilterVisibility: document.getElementById('docFilterVisibility'),
  docFilterProperty: document.getElementById('docFilterProperty'),
  docFilterReset: document.getElementById('docFilterReset'),
  docPagination: document.getElementById('docPagination'),
  docPagePrev: document.getElementById('docPagePrev'),
  docPageNext: document.getElementById('docPageNext'),
  docPageLabel: document.getElementById('docPageLabel'),
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

// Current filter + page state for the document queue. Kept in one object so
// every filter change can reset the page in a single place — changing a filter
// while sitting on page 4 would otherwise ask the server for page 4 of a much
// smaller result set and render an empty table that looks like "no matches".
const docQueryState = {
  q: '',
  category: '',
  visibility: '',
  propertyId: '',
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

async function loadDocuments() {
  const params = new URLSearchParams();
  if (docQueryState.q) params.set('q', docQueryState.q);
  if (docQueryState.category) params.set('category', docQueryState.category);
  if (docQueryState.visibility) params.set('visibility', docQueryState.visibility);
  if (docQueryState.propertyId) params.set('propertyId', docQueryState.propertyId);
  params.set('page', String(docQueryState.page));
  params.set('pageSize', String(docQueryState.pageSize));

  const result = await apiFetch(`/api/ops/documents?${params.toString()}`);
  state.files = result.data || [];
  // Falls back to the row count when the server does not send a total, so an
  // older API build degrades to the previous behaviour instead of rendering
  // "showing 5 of 0".
  docQueryState.total = Number.isFinite(result.total) ? result.total : state.files.length;
  docQueryState.totalPages = Number.isFinite(result.totalPages) ? result.totalPages : 1;
}

// Fills the optional "Property" dropdown on the upload form. Reuses the
// existing /api/properties endpoint rather than adding an ops-specific one —
// the property list is the same data either way, and a second endpoint would be
// a second thing to keep in sync.
//
// Failure here is deliberately non-fatal: the property link is optional, so if
// the list can't load the admin can still upload a general document rather than
// being blocked entirely.
async function loadPropertyOptions() {
  if (!els.docPropertyId) return;
  try {
    const result = await apiFetch('/api/properties');
    const properties = result.data || [];
    const options = properties
      .map((p) => `<option value="${escapeAttr(p.PropertyID)}">${escapeHtml(p.PropertyName)}</option>`)
      .join('');
    els.docPropertyId.innerHTML =
      `<option value="">General — not property-specific</option>${options}`;

    // The queue's property FILTER is filled from the same fetch rather than a
    // second request. Its leading options differ from the upload form's on
    // purpose: here an empty value means "don't filter", and "general" is an
    // explicit choice meaning "documents tied to no property" — on the upload
    // form empty IS "no property". Same list, opposite meaning for the blank
    // option, which is worth stating because reusing the markup would have
    // quietly made the filter unable to express "general only".
    if (els.docFilterProperty) {
      els.docFilterProperty.innerHTML =
        `<option value="">All properties</option><option value="general">General — no property</option>${options}`;
    }
  } catch (error) {
    console.error('Could not load properties for the document form:', error);
  }
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
        <td colspan="6" class="helper">No users loaded. Check API connection or refresh after sign-in.</td>
      </tr>
    `;
    return;
  }

  els.userTableBody.innerHTML = filtered
    .map(
      (user) => `
      <tr>
        <td>
          <strong>${escapeHtml(user.name)}</strong><br />
          <span class="helper">${escapeHtml(user.notes)}</span>
        </td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.country)}</td>
        <td><span class="tag ${statusClass(user.status)}">${escapeHtml(user.status)}</span></td>
        <td><span class="tag">${escapeHtml(user.role)}</span></td>
        <td>
          <button class="ghost-btn portfolio-adjust-btn" data-userid="${escapeAttr(user.id)}" style="font-size:0.8rem;padding:4px 10px">
            Adjust
          </button>
        </td>
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
        <td><strong>${escapeHtml(intent.referenceCode || '—')}</strong></td>
        <td>${escapeHtml(intent.user?.name || '—')}<br /><span class="helper">${escapeHtml(intent.user?.email || '')}</span></td>
        <td>${escapeHtml(intent.propertyName || '—')}</td>
        <td>${formatMoney(intent.amount, intent.currency)}</td>
        <td><span class="tag">${escapeHtml(intent.workflowStatus || '—')}</span></td>
        <td>${escapeHtml(intent.proofStatus || '—')}</td>
      </tr>
    `,
    )
    .join('');
}

function renderFiles() {
  // Reports the TOTAL matching the current filters, not the number of rows on
  // screen. The old label said "12 documents" while showing a page of 12 out of
  // however many existed, which is exactly the silent-truncation problem this
  // pagination was added to remove — a label that confidently understates the
  // set is worse than no label.
  const { total, page, pageSize, totalPages } = docQueryState;
  const firstOnPage = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastOnPage = (page - 1) * pageSize + state.files.length;
  const filtersActive = Boolean(
    docQueryState.q || docQueryState.category || docQueryState.visibility || docQueryState.propertyId
  );

  els.fileCountLabel.textContent =
    total === 0
      ? (filtersActive ? 'No documents match these filters' : 'No documents uploaded yet')
      : total <= pageSize
        ? `${total} document${total === 1 ? '' : 's'}${filtersActive ? ' matching' : ''}`
        : `Showing ${firstOnPage}–${lastOnPage} of ${total}${filtersActive ? ' matching' : ''}`;

  if (els.docPagination) {
    els.docPagination.hidden = totalPages <= 1;
    els.docPageLabel.textContent = `Page ${page} of ${totalPages}`;
    els.docPagePrev.disabled = page <= 1;
    els.docPageNext.disabled = page >= totalPages;
  }

  els.fileTableBody.innerHTML = state.files.length
    ? state.files
        .map((file) => {
          const format = (file.OriginalFileName || '').split('.').pop().toUpperCase() || '—';
          const assignedName = [file.UserFirstName, file.UserLastName].filter(Boolean).join(' ') || file.UserEmail;
          const supersededTag = file.IsSuperseded ? ' <span class="tag suspended">Superseded</span>' : '';
          // Internal documents get the visually louder tag. The asymmetry is
          // intentional: an investor-visible document behaving as expected is
          // unremarkable, whereas an internal one sitting on someone's file is
          // the thing an admin needs to spot at a glance — including spotting
          // that something was filed internal when it should not have been.
          // Falls back to the visible label for any legacy row that predates
          // the column, which matches how migration 10 backfilled them.
          const visibilityTag = file.Visibility === 'operator_only'
            ? '<span class="tag suspended">Internal only</span>'
            : '<span class="helper">Investor-visible</span>';
          return `
      <tr>
        <td><strong>${escapeHtml(file.Label)}</strong>${supersededTag}</td>
        <td>${escapeHtml(format)}</td>
        <td>${escapeHtml(file.Category)}</td>
        <td>${file.PropertyName ? escapeHtml(file.PropertyName) : '<span class="helper">General</span>'}</td>
        <td>${visibilityTag}</td>
        <td>${escapeHtml(assignedName)}<br /><span class="helper">${escapeHtml(file.UserEmail)}</span></td>
        <td>${formatDate(file.CreatedAt)}</td>
        <td><button class="doc-download-btn" data-doc-id="${file.DocumentID}" data-doc-name="${escapeAttr(file.OriginalFileName)}">Download</button></td>
      </tr>
    `;
        })
        .join('')
    : `<tr><td colspan="8" class="helper">${
        filtersActive
          ? 'No documents match these filters. Try clearing them.'
          : 'No documents uploaded yet.'
      }</td></tr>`;
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
  applyOperatorRoleVisibility();
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

  // The credential check happens ONLY in this call, and only its failure may
  // ever produce "Invalid email or password". Everything after a successful
  // login — establishSession's /me call, refreshLiveData's panel loads — is
  // deliberately its own try/catch below, so a failure there can never be
  // misreported as a wrong password. See the incident note on
  // refreshLiveData(): that conflation is exactly what locked an
  // operations_admin out of a session whose credentials were never wrong.
  let loginResult;
  try {
    loginResult = await apiFetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch {
    rejectFailedAdminLogin();
    authEls.loginSubmitBtn.disabled = false;
    return;
  }

  try {
    await establishSession({ user: loginResult.data, token: loginResult.token });
    addAudit('Admin signed in', `${loginResult.data.Email} • just now`, 'Operations workspace unlocked.');
    renderAudit();
  } catch (error) {
    // The password was correct — apiFetch already proved that above. Getting
    // here means /api/admin/auth/me itself failed, which in practice means a
    // token that was rejected the instant it was issued (a boot-time
    // JWT_SECRET mismatch is the realistic cause, not a wrong password) — a
    // genuine "we cannot trust this session" case, so logging out is correct.
    // It must never again be able to mean "a data panel 403'd."
    console.error('Session could not be established after a successful login:', error);
    rejectFailedAdminLogin('Signed in, but your session could not be loaded. Please try again.');
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

  // Same split as handleLogin, for the same reason: /api/admin/auth/me is
  // what proves the stored token is still valid, and its failure is the only
  // thing on this path allowed to bounce back to login. refreshLiveData()
  // no longer throws for a role-based 403 (see the incident note on it), but
  // this stays split defensively — a future addition to the dashboard that
  // eagerly fetches something role-gated must not be able to silently start
  // logging people out again the way this one did on 03 Aug 2026.
  let me;
  try {
    me = await apiFetch('/api/admin/auth/me');
  } catch {
    returnToLogin();
    return;
  }

  authSession = { ...stored, user: me.data };
  saveAuthSession(authSession);
  updateAdminHeader();
  // Needed on this path too, not just after a fresh login — this is the
  // branch every page refresh takes, and without it a super admin who
  // reloaded lost the Operators tab until they logged out and back in.
  applyOperatorRoleVisibility();
  showAuthScreen('app');
  refreshIcons();

  try {
    await refreshLiveData();
  } catch (error) {
    // Should be unreachable now that refreshLiveData uses Promise.allSettled
    // internally — kept as a last line of defense so a genuinely unexpected
    // throw renders as a console error on an otherwise-working dashboard,
    // never as an unexplained bounce back to the login screen. A session that
    // /me already vouched for must not be discarded over a rendering problem.
    console.error('Dashboard data failed to load after session restore:', error);
  }
}

function bindWorkspaceEvents() {
  els.sidebarToggleBtn?.addEventListener('click', openMobileSidebar);
  els.sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  els.navTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    setActiveTab(button.dataset.tab);
    // Loaded on open rather than with the rest of the dashboard: only super
    // admins can read it, so fetching it up front would 403 for everyone else
    // on every login and fill their console with errors about a tab they
    // cannot see.
    if (button.dataset.tab === 'operators') reloadOperators();
  });

  // ── Operator access (F8) ──────────────────────────────────────────────────
  document.getElementById('refreshOperatorsBtn')?.addEventListener('click', reloadOperators);

  document.getElementById('operatorGrantBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('operatorGrantStatus');
    const userId = document.getElementById('operatorGrantUserId').value.trim();
    const role = document.getElementById('operatorGrantRole').value;
    const note = document.getElementById('operatorGrantNote').value.trim();

    if (!userId) {
      if (status) status.textContent = 'Search for a person by name or email, then pick them from the list.';
      return;
    }
    if (status) status.textContent = 'Saving...';
    try {
      await submitOperatorGrant(userId, role, note);
      if (status) status.textContent = 'Access updated.';
      // Reset the whole picker, not just the hidden id — otherwise the chip
      // keeps showing the person just actioned, which reads as "still
      // selected" and invites a second accidental grant.
      operatorUserPicker?.clear();
      document.getElementById('operatorGrantNote').value = '';
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  // Delegated, because the rows are re-rendered on every reload — listeners
  // bound directly to buttons would be discarded with the old markup.
  document.getElementById('operatorTableBody')?.addEventListener('click', async (event) => {
    const applyBtn = event.target.closest('.operator-apply-btn');
    const revokeBtn = event.target.closest('.operator-revoke-btn');
    const historyBtn = event.target.closest('.operator-history-btn');

    if (historyBtn) {
      await renderOperatorHistory(historyBtn.dataset.userid);
      return;
    }

    if (applyBtn) {
      const userId = applyBtn.dataset.userid;
      const select = document.querySelector(`.operator-role-select[data-userid="${CSS.escape(userId)}"]`);
      if (!select) return;
      try {
        await submitOperatorGrant(userId, select.value, 'Role changed from the Operators tab');
      } catch (error) {
        window.alert(error.message);
      }
      return;
    }

    if (revokeBtn) {
      const userId = revokeBtn.dataset.userid;
      // The server requires a reason and rejects an empty one; asking here
      // means the operator finds that out before the request, not after.
      const note = window.prompt('Why is this access being revoked? (required, and recorded permanently)');
      if (note === null) return;
      if (!note.trim()) {
        window.alert('A reason is required to revoke operator access.');
        return;
      }
      try {
        await apiFetch(`/api/ops/operators/${encodeURIComponent(userId)}/revoke`, {
          method: 'POST',
          body: JSON.stringify({ note: note.trim() }),
        });
        await reloadOperators();
      } catch (error) {
        window.alert(error.message);
      }
    }
  });

  els.userSearch.addEventListener('input', renderUsers);
  els.userFilter.addEventListener('change', renderUsers);

  // ── Document queue filters ────────────────────────────────────────────────
  // Unlike the Users filters just above, these re-query the server rather than
  // re-rendering a cached array, because the document list is paginated —
  // filtering client-side would only ever search the current page.
  let docFilterDebounce = null;

  async function reloadDocuments({ resetPage = true } = {}) {
    // Any filter change goes back to page 1. Staying on page 4 while narrowing
    // the results would request a page past the end and render an empty table
    // that reads as "no matches" when there are plenty on page 1.
    if (resetPage) docQueryState.page = 1;
    try {
      await loadDocuments();
      renderFiles();
    } catch (error) {
      console.error('Failed to load documents:', error);
      els.fileCountLabel.textContent = 'Could not load documents';
    }
  }

  els.docFilterQuery.addEventListener('input', () => {
    // Debounced for the same reason the user-assign search is: this fires a
    // real request per keystroke otherwise.
    clearTimeout(docFilterDebounce);
    docFilterDebounce = setTimeout(() => {
      docQueryState.q = els.docFilterQuery.value.trim();
      reloadDocuments();
    }, 250);
  });

  els.docFilterCategory.addEventListener('change', () => {
    docQueryState.category = els.docFilterCategory.value;
    reloadDocuments();
  });

  els.docFilterVisibility.addEventListener('change', () => {
    docQueryState.visibility = els.docFilterVisibility.value;
    reloadDocuments();
  });

  els.docFilterProperty.addEventListener('change', () => {
    docQueryState.propertyId = els.docFilterProperty.value;
    reloadDocuments();
  });

  els.docFilterReset.addEventListener('click', () => {
    els.docFilterQuery.value = '';
    els.docFilterCategory.value = '';
    els.docFilterVisibility.value = '';
    els.docFilterProperty.value = '';
    docQueryState.q = '';
    docQueryState.category = '';
    docQueryState.visibility = '';
    docQueryState.propertyId = '';
    reloadDocuments();
  });

  els.docPagePrev.addEventListener('click', () => {
    if (docQueryState.page <= 1) return;
    docQueryState.page -= 1;
    reloadDocuments({ resetPage: false });
  });

  els.docPageNext.addEventListener('click', () => {
    if (docQueryState.page >= docQueryState.totalPages) return;
    docQueryState.page += 1;
    reloadDocuments({ resetPage: false });
  });

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
        result.emailed
          ? `Created account for ${firstName} ${lastName} (${email}). Setup code emailed automatically.`
          : `Created account for ${firstName} ${lastName} (${email}). Setup email NOT sent (${result.emailFailureReason || 'unknown reason'}) — relay the code manually.`,
      );

      els.userForm.reset();

      // The setup code is the whole point of this flow — it's never shown
      // again after this, so this panel stays open until the admin
      // dismisses it themselves, unlike other success messages in this app
      // that auto-hide after a few seconds.
      //
      // It keeps being shown even when the email did go out. The admin has no
      // way to see into the investor's inbox, and "sent" is not "arrived" —
      // spam filters, typo'd addresses and full mailboxes all end here. The
      // code on screen is what turns those into a thirty-second fix instead
      // of a deleted-and-recreated account.
      //
      // textContent, not innerHTML — these are admin-typed values going into
      // the page, which is the exact shape of the bug this file has now had
      // five times (D.1, D.11).
      els.setupCodeSummary.textContent = result.emailed
        ? `${firstName} ${lastName} — ${email} · setup email sent`
        : `${firstName} ${lastName} — ${email} · EMAIL NOT SENT, share this code directly`;
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
                (u) => `<button type="button" data-user-id="${escapeAttr(u.UserID)}">${escapeHtml([u.FirstName, u.LastName].filter(Boolean).join(' '))} — ${escapeHtml(u.Email)}</button>`,
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
    // Empty string means "general" — sent as null rather than '' so the server
    // stores a real NULL instead of trying to coerce an empty string to an id.
    const propertyId = String(formData.get('propertyId') || '') || null;
    // No fallback value here on purpose. Defaulting an unanswered visibility to
    // 'investor_visible' would put the irreversible outcome one forgotten
    // dropdown away; defaulting to 'operator_only' would silently stop the
    // investor-facing feature working. So neither — it stays empty and the
    // check below refuses to submit.
    const visibility = String(formData.get('visibility') || '');
    const file = els.fileInput.files[0];

    if (!label) {
      els.uploadFormError.textContent = 'Document label is required.';
      return;
    }
    if (!visibility) {
      els.uploadFormError.textContent = 'Choose who can see this document.';
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
          propertyId: propertyId ? Number(propertyId) : null,
          visibility,
        }),
      });

      const propertyLabel = propertyId
        ? (els.docPropertyId.selectedOptions[0]?.textContent || `property #${propertyId}`)
        : 'General';
      const visibilityLabel = visibility === 'operator_only' ? 'INTERNAL ONLY' : 'investor-visible';

      addAudit(
        'Document assigned',
        `${authSession?.user?.Email || 'Ops'} • just now`,
        `${label} (${category}, ${propertyLabel}, ${visibilityLabel}) assigned to ${selectedDocUser?.Email || 'user #' + userId}.`,
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
      els.uploadFormSuccess.textContent = visibility === 'operator_only'
        ? `✓ "${label}" uploaded as INTERNAL ONLY — the investor will not see it.`
        : `✓ "${label}" uploaded and assigned. The investor can see it in their portal.`;
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

// Jurisdiction risk is computed by the SERVER (assessJurisdiction in server.js)
// and arrives on each queue row as `Jurisdiction`. This file no longer keeps its
// own copy of the country lists.
//
// Why that changed: the tier used to be derived here, in the browser, from lists
// that lived only in this file. That was tolerable while the tier was decorative.
// It is not tolerable now that a Prohibited tier actually blocks approval — a
// reviewer must be shown the same verdict the approval endpoint will enforce,
// and two copies of a compliance list are two things that can drift apart. The
// old local lists also had no Prohibited tier at all, so they classified Russia,
// Iran, North Korea and Syria as merely 'EDD' (i.e. approvable with extra
// paperwork), which is exactly the misclassification this replaces.
const DD_LABEL = {
  Prohibited: 'Cannot be onboarded',
  EDD: 'Enhanced Due Diligence',
  Medium: 'SDD + enhanced SoF',
  Unlisted: 'Manual compliance review',
  Standard: 'Standard Due Diligence',
};

// Reads the server's verdict. Deliberately FAILS CLOSED: if the assessment is
// missing or malformed — an older API build, a partial deploy, a shape change —
// this returns a tier that cannot be approved, rather than defaulting to
// something permissive. A missing compliance verdict is not evidence of low
// risk, and the server would refuse the approval anyway.
function getJurisdiction(user) {
  const j = user && user.Jurisdiction;
  if (!j || typeof j.tier !== 'string') {
    return {
      tier: 'Unknown',
      dd: 'Assessment unavailable',
      isEDD: false,
      canApprove: false,
      reason: 'No jurisdiction assessment returned by the server. Approval is blocked until this resolves — refresh, and check the API build if it persists.',
      triggeredBy: [],
    };
  }
  return {
    tier: j.tier,
    dd: DD_LABEL[j.tier] || 'Manual compliance review',
    isEDD: j.tier === 'EDD',
    canApprove: j.canApprove !== false,
    reason: j.reason || '',
    triggeredBy: Array.isArray(j.triggeredBy) ? j.triggeredBy : [],
  };
}

function tierClass(tier) {
  if (tier === 'Prohibited' || tier === 'Unknown') return 'tag suspended';
  if (tier === 'EDD') return 'tag suspended';
  if (tier === 'Medium' || tier === 'Unlisted') return 'tag pending';
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
    const risk = getJurisdiction(user);
    return `
      <tr class="kyc-row" data-userid="${escapeAttr(user.UserID)}">
        <td>
          <strong>${escapeHtml(user.FirstName)} ${escapeHtml(user.LastName)}</strong><br>
          <span class="helper">${escapeHtml(user.Email)}</span>
        </td>
        <td>${escapeHtml(user.CountryCode || '—')}</td>
        <td><span class="${tierClass(risk.tier)}">${escapeHtml(risk.tier)}</span></td>
        <td><span class="helper">${escapeHtml(risk.dd)}</span></td>
        <td>${formatDate(user.CreatedAt)}</td>
        <td>
          <button class="ghost-btn kyc-review-btn" data-userid="${escapeAttr(user.UserID)}" style="font-size:0.8rem;padding:4px 10px">
            Review
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

// Shared by all three drawers (KYC / bank requests / portfolio) — one
// backdrop element, shown/hidden alongside whichever drawer is open.
function showDrawerBackdrop() {
  document.getElementById('drawerBackdrop').classList.remove('hidden');
}
function hideDrawerBackdrop() {
  document.getElementById('drawerBackdrop').classList.add('hidden');
}

function openKycDrawer(userId) {
  const user = kycQueue.find((u) => String(u.UserID) === String(userId));
  if (!user) return;
  selectedKycUser = user;

  const risk = getJurisdiction(user);

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

  // Prohibited (or an unavailable assessment) blocks approval. Declining stays
  // available on purpose — the account still needs resolving, it just can never
  // be resolved as approved. The server enforces this independently; disabling
  // the button here is so the reviewer isn't invited to attempt something that
  // will be refused, not the control itself.
  const prohibitedWarning = document.getElementById('prohibitedWarning');
  const approveBtn = document.getElementById('kycApproveBtn');
  prohibitedWarning.classList.toggle('hidden', risk.canApprove);
  if (!risk.canApprove) {
    document.getElementById('prohibitedWarningText').textContent = risk.reason;
  }
  approveBtn.disabled = !risk.canApprove;
  approveBtn.title = risk.canApprove ? '' : risk.reason;

  document.getElementById('kycReviewerName').value = '';
  document.getElementById('kycNotes').value = '';
  // Reset to unselected every time the drawer opens, so a reason chosen for a
  // previous applicant can never carry over onto a different person.
  document.getElementById('kycDeclineReasonType').value = '';
  document.getElementById('kycFormError').classList.add('hidden');
  document.getElementById('kycFormError').textContent = '';

  document.getElementById('kycDrawer').classList.remove('hidden');
  showDrawerBackdrop();
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

// ── Operator access management (F8 / REQ-AUTH-09) ────────────────────────────
// super_admin only. Every render here escapes, without exception: this file has
// produced two real stored-XSS bugs (D.1, D.11) and every value below —
// operator names, emails, and free-text revocation notes — is attacker- or
// colleague-supplied text arriving from the server. Run `node test-escaping.mjs`
// after touching this section; it scans the source, not just the helpers.

let operatorList = [];
let selectedOperatorId = null;

const OPERATOR_ROLE_LABELS = {
  super_admin: 'Super admin',
  finance_admin: 'Finance admin',
  operations_admin: 'Operations admin',
};

// Reveals the Operators tab for super admins only. This is presentation, not
// authorisation — requireOperator(SUPER_ONLY) on the server is what actually
// stops anyone else, and it does so whether or not this ever runs.
// Also decides which dashboard panels refreshLiveData() is allowed to even
// attempt — see the comment there. The two must agree: showing a tab whose
// data-load is skipped renders an empty panel forever, and loading data for a
// hidden tab wastes a request that will 403 anyway.
function canOperatorSeeFinanceData() {
  const role = authSession?.user?.OperatorRole;
  return role === 'finance_admin' || role === 'super_admin';
}

function applyOperatorRoleVisibility() {
  const operatorsNav = document.getElementById('navOperators');
  if (operatorsNav) {
    const isSuper = authSession?.user?.OperatorRole === 'super_admin';
    operatorsNav.classList.toggle('hidden', !isSuper);
  }

  // Bank Requests holds the same data class as portfolio adjustments — where
  // an investor's money goes — and is finance_admin/super_admin only on the
  // server (D.23/F8). Hiding it for operations_admin isn't a security control
  // (the server already refuses the data); it stops that role from landing on
  // a tab that can only ever show "0 pending" or an error, and — before this
  // fix — from being logged out by it. See the incident note on
  // refreshLiveData for what "before this fix" actually did.
  const bankRequestsNav = document.getElementById('navBankRequests');
  if (bankRequestsNav) {
    bankRequestsNav.classList.toggle('hidden', !canOperatorSeeFinanceData());
  }
}

async function loadOperators() {
  const response = await apiFetch('/api/ops/operators');
  operatorList = Array.isArray(response.data) ? response.data : [];
}

function renderOperators() {
  const tbody = document.getElementById('operatorTableBody');
  const countLabel = document.getElementById('operatorCountLabel');
  if (!tbody) return;

  const active = operatorList.filter((o) => o.IsActive).length;
  if (countLabel) {
    countLabel.textContent = `${active} active, ${operatorList.length - active} revoked`;
  }

  if (operatorList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="helper" style="text-align:center;padding:24px">No operators found.</td></tr>`;
    return;
  }

  const selfId = authSession?.user?.UserID;

  tbody.innerHTML = operatorList.map((o) => {
    const isSelf = String(o.UserID) === String(selfId);
    const roleLabel = OPERATOR_ROLE_LABELS[o.Role] || o.Role;

    // Self gets no controls at all rather than controls that always fail: the
    // server rejects self-modification with a 409, and offering a button whose
    // only outcome is an error is the "convincing placeholder" pattern this
    // project has already been bitten by three times.
    // Reuses the portal's existing .tag pills rather than plain text, so this
    // table reads like the Users tab next to it. Super admin borrows the
    // "verified" (teal/green) treatment as the highest privilege, finance the
    // neutral grey, and a revoked grant the "suspended" red — the same visual
    // language those states already carry elsewhere in this portal.
    const roleTagClass = o.Role === 'super_admin' ? 'verified' : '';
    const revokeBtn = o.IsActive
      ? `<button class="ghost-btn btn-sm operator-revoke-btn" data-userid="${escapeAttr(o.UserID)}">Revoke</button>`
      : '';

    const actions = isSelf
      ? `<span class="tag">You</span>`
      : `<select class="field field-sm operator-role-select" data-userid="${escapeAttr(o.UserID)}">
           ${Object.entries(OPERATOR_ROLE_LABELS).map(([value, label]) => `
             <option value="${escapeAttr(value)}"${value === o.Role ? ' selected' : ''}>${escapeHtml(label)}</option>
           `).join('')}
         </select>
         <button class="ghost-btn btn-sm operator-apply-btn" data-userid="${escapeAttr(o.UserID)}">Apply</button>
         ${revokeBtn}`;

    return `
      <tr data-userid="${escapeAttr(o.UserID)}">
        <td>
          <strong>${escapeHtml(o.FirstName)} ${escapeHtml(o.LastName)}</strong><br>
          <span class="helper">${escapeHtml(o.Email)}</span>
        </td>
        <td><span class="tag ${roleTagClass}">${escapeHtml(roleLabel)}</span></td>
        <td><span class="tag ${o.IsActive ? 'verified' : 'suspended'}">${o.IsActive ? 'Active' : 'Revoked'}</span></td>
        <td>${formatDate(o.GrantedAt)}</td>
        <td>
          <div class="row-actions">
            ${actions}
            <button class="ghost-btn btn-sm operator-history-btn" data-userid="${escapeAttr(o.UserID)}">History</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

async function renderOperatorHistory(userId) {
  selectedOperatorId = userId;
  const label = document.getElementById('operatorHistoryLabel');
  const list = document.getElementById('operatorHistoryList');
  if (!list) return;

  const operator = operatorList.find((o) => String(o.UserID) === String(userId));
  if (label) {
    label.textContent = operator
      ? `Access history for ${operator.FirstName} ${operator.LastName} (${operator.Email})`
      : 'Access history';
  }

  try {
    const response = await apiFetch(`/api/ops/operators/${encodeURIComponent(userId)}/history`);
    const rows = Array.isArray(response.data) ? response.data : [];
    if (rows.length === 0) {
      list.innerHTML = `<p class="helper">No history recorded.</p>`;
      return;
    }
    list.innerHTML = rows.map((r) => {
      const what = r.Action === 'revoke'
        ? `Revoked (was ${escapeHtml(OPERATOR_ROLE_LABELS[r.PreviousRole] || r.PreviousRole || '—')})`
        : r.Action === 'role_change'
          ? `${escapeHtml(OPERATOR_ROLE_LABELS[r.PreviousRole] || r.PreviousRole || '—')} → ${escapeHtml(OPERATOR_ROLE_LABELS[r.Role] || r.Role || '—')}`
          : `Granted ${escapeHtml(OPERATOR_ROLE_LABELS[r.Role] || r.Role || '—')}`;
      // PerformedByEmail is null for system actions (the migration backfill and
      // the ADMIN_EMAILS bootstrap). Saying so beats rendering a blank.
      const who = r.PerformedByEmail ? escapeHtml(r.PerformedByEmail) : 'system';
      // Built here rather than as a ternary inside the template below. The
      // value is escaped either way, but test-escaping.mjs tokenises template
      // literals with a regex that cannot see through a nested backtick, so an
      // inline `${r.Note ? \`...\` : ''}` reaches the guard as the fragment
      // "r.Note ? `" — a tainted root with no visible escaper — and fails the
      // build. Keeping the guard able to read this file is worth more than the
      // one saved line, and a scanner that cannot parse a construct should not
      // be argued with by using that construct.
      const noteHtml = r.Note ? `<div class="helper">${escapeHtml(r.Note)}</div>` : '';
      return `
        <div class="audit-item">
          <div><strong>${what}</strong></div>
          <div class="helper">${formatDate(r.PerformedAt)} — by ${who}</div>
          ${noteHtml}
        </div>
      `;
    }).join('');
  } catch (error) {
    list.innerHTML = `<p class="helper">Could not load history: ${escapeHtml(error.message)}</p>`;
  }
}

async function reloadOperators() {
  try {
    await loadOperators();
    renderOperators();
    if (selectedOperatorId) await renderOperatorHistory(selectedOperatorId);
  } catch (error) {
    const tbody = document.getElementById('operatorTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="helper" style="text-align:center;padding:24px">${escapeHtml(error.message)}</td></tr>`;
    }
  }
}

/**
 * Wires a name/email search picker onto a hidden user-id field.
 *
 * Extracted rather than copy-pasted from the document-upload picker, because
 * the two fiddly parts — the debounce and the out-of-order response guard —
 * are exactly the bits that rot when duplicated: a fix applied to one copy and
 * not the other is invisible until someone types fast on a slow connection.
 *
 * The document picker still has its own inline copy; migrating it onto this is
 * a safe follow-up, deliberately not bundled into a UI fix so a working feature
 * isn't put at risk for tidiness.
 */
function attachUserSearch({ searchInput, hiddenInput, resultsEl, selectedEl }) {
  if (!searchInput || !hiddenInput || !resultsEl || !selectedEl) return null;

  let debounceTimer = null;
  let latestQuery = '';
  let selectedUser = null;

  function renderSelected() {
    if (!selectedUser) {
      selectedEl.hidden = true;
      selectedEl.innerHTML = '';
      searchInput.hidden = false;
      return;
    }
    const name = [selectedUser.FirstName, selectedUser.LastName].filter(Boolean).join(' ');
    selectedEl.hidden = false;
    // Shows the id alongside the name: the admin picked a person, but the
    // audit trail records a number, and seeing both here is what lets someone
    // reconcile the two later without a database query.
    selectedEl.innerHTML = `
      <span><strong>${escapeHtml(name)}</strong> — ${escapeHtml(selectedUser.Email)} <span class="helper">(ID ${escapeHtml(selectedUser.UserID)})</span></span>
      <button type="button" data-role="clear-user">Change</button>
    `;
    selectedEl.querySelector('[data-role="clear-user"]').addEventListener('click', () => api.clear(true));
    searchInput.hidden = true;
  }

  const api = {
    clear(focus = false) {
      selectedUser = null;
      hiddenInput.value = '';
      searchInput.value = '';
      resultsEl.innerHTML = '';
      renderSelected();
      if (focus) searchInput.focus();
    },
  };

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    latestQuery = query;
    clearTimeout(debounceTimer);
    if (query.length < 1) {
      resultsEl.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const result = await apiFetch(`/api/ops/users/search?q=${encodeURIComponent(query)}`);
        // A slower earlier request can resolve after a newer one. If the box no
        // longer holds what we searched for, drop this response rather than
        // show results for a query the admin has already moved past.
        if (latestQuery !== query) return;

        const matches = result.data || [];
        resultsEl.innerHTML = matches.length
          ? matches
              .map(
                (u) =>
                  `<button type="button" data-user-id="${escapeAttr(u.UserID)}">${escapeHtml([u.FirstName, u.LastName].filter(Boolean).join(' '))} — ${escapeHtml(u.Email)}</button>`,
              )
              .join('')
          : `<span class="helper">No matching users.</span>`;

        resultsEl.querySelectorAll('button[data-user-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const match = matches.find((u) => String(u.UserID) === btn.dataset.userId);
            if (!match) return;
            selectedUser = match;
            hiddenInput.value = match.UserID;
            resultsEl.innerHTML = '';
            renderSelected();
          });
        });
      } catch (error) {
        if (latestQuery !== query) return;
        resultsEl.innerHTML = `<span class="helper">Search failed: ${escapeHtml(error.message)}</span>`;
      }
    }, 120);
  });

  return api;
}

// Created once at load; the grant handler calls .clear() after a successful
// grant so the form is ready for the next person rather than still showing
// the one just actioned.
const operatorUserPicker = attachUserSearch({
  searchInput: els.operatorUserSearch,
  hiddenInput: els.operatorGrantUserId,
  resultsEl: els.operatorUserResults,
  selectedEl: els.operatorUserSelected,
});

async function submitOperatorGrant(userId, role, note) {
  await apiFetch('/api/ops/operators', {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId), role, note: note || undefined }),
  });
  await reloadOperators();
}

function closeKycDrawer() {
  selectedKycUser = null;
  document.getElementById('kycDrawer').classList.add('hidden');
  hideDrawerBackdrop();
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

  // The server requires a reason type on a decline and rejects one on an
  // approve, so send it only for declines and validate here first to give the
  // reviewer a useful message rather than a raw 400.
  const declineReasonType = document.getElementById('kycDeclineReasonType').value;
  if (action === 'decline' && !declineReasonType) {
    errorEl.textContent = 'Select a reason for the decline. This determines what the investor is told.';
    errorEl.classList.remove('hidden');
    return;
  }

  const approveBtn = document.getElementById('kycApproveBtn');
  const declineBtn = document.getElementById('kycDeclineBtn');
  approveBtn.disabled = true;
  declineBtn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    const payload = { action, reviewerName, notes };
    if (action === 'decline') payload.declineReasonType = declineReasonType;

    await apiFetch(`/api/ops/kyc-reviews/${selectedKycUser.UserID}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
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
    // Restore to the jurisdiction-correct state, NOT unconditionally enabled.
    // A blanket `approveBtn.disabled = false` here would re-enable approval on a
    // prohibited account the moment any decision attempt finished — including a
    // failed decline — leaving an enabled Approve button sitting directly under
    // a banner saying the account cannot be approved. The server refuses it
    // either way, so this is a UX correctness fix rather than a security one.
    declineBtn.disabled = false;
    approveBtn.disabled = selectedKycUser ? !getJurisdiction(selectedKycUser).canApprove : false;
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

// ── Bank detail change requests (C.1 item 6c) ────────────────────────────────
// Same table+drawer pattern as KYC review above, deliberately — an admin
// who already knows that screen shouldn't have to learn a new layout for
// this one. The proposed/prior values arrive already decrypted from the
// server (GET /api/ops/bank-detail-requests) — this file never handles
// encryption itself, that's entirely a server-side concern.
let bankRequestQueue = [];
let selectedBankRequest = null;

async function loadBankRequestQueue() {
  const result = await apiFetch('/api/ops/bank-detail-requests');
  bankRequestQueue = result.data || [];
}

function renderBankRequestQueue() {
  const countLabel = document.getElementById('bankRequestCountLabel');
  const tbody = document.getElementById('bankRequestTableBody');
  if (!countLabel || !tbody) return;

  countLabel.textContent = `${bankRequestQueue.length} pending`;

  if (bankRequestQueue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="helper" style="text-align:center;padding:24px">No pending bank detail requests.</td></tr>`;
    return;
  }

  tbody.innerHTML = bankRequestQueue.map((r) => `
      <tr class="kyc-row" data-requestid="${escapeAttr(r.RequestID)}">
        <td>
          <strong>${escapeHtml(r.FirstName)} ${escapeHtml(r.LastName)}</strong><br>
          <span class="helper">${escapeHtml(r.Email)}</span>
        </td>
        <td>${escapeHtml(r.ProposedValues?.bankName || '—')}</td>
        <td>${formatDate(r.CreatedAt)}</td>
        <td>
          <button class="ghost-btn bank-review-btn" data-requestid="${escapeAttr(r.RequestID)}" style="font-size:0.8rem;padding:4px 10px">
            Review
          </button>
        </td>
      </tr>
    `).join('');

  refreshIcons();
}

function openBankRequestDrawer(requestId) {
  const request = bankRequestQueue.find((r) => String(r.RequestID) === String(requestId));
  if (!request) return;
  selectedBankRequest = request;

  document.getElementById('bankDrawerName').textContent = `${request.FirstName} ${request.LastName}`;
  document.getElementById('bankDrawerEmail').textContent = request.Email;
  document.getElementById('bankDrawerStepUpAt').textContent = formatDate(request.StepUpVerifiedAt);

  const proposed = request.ProposedValues || {};
  document.getElementById('bankDrawerProposedHolder').textContent = proposed.accountHolderName || '—';
  document.getElementById('bankDrawerProposedBank').textContent = proposed.bankName || '—';
  document.getElementById('bankDrawerProposedNumber').textContent = proposed.accountNumber || '—';
  document.getElementById('bankDrawerProposedSwift').textContent = proposed.swiftBic || '—';
  document.getElementById('bankDrawerProposedCountry').textContent = proposed.countryCode || '—';

  const prior = request.PriorValues;
  const priorEmpty = document.getElementById('bankDrawerPriorEmpty');
  const priorGrid = document.getElementById('bankDrawerPriorGrid');
  if (prior && prior.accountNumber) {
    priorEmpty.classList.add('hidden');
    priorGrid.classList.remove('hidden');
    document.getElementById('bankDrawerPriorHolder').textContent = prior.accountHolderName || '—';
    document.getElementById('bankDrawerPriorBank').textContent = prior.bankName || '—';
    document.getElementById('bankDrawerPriorNumber').textContent = prior.accountNumber || '—';
  } else {
    priorEmpty.classList.remove('hidden');
    priorGrid.classList.add('hidden');
  }

  document.getElementById('bankRejectionNote').value = '';
  document.getElementById('bankFormError').classList.add('hidden');
  document.getElementById('bankFormError').textContent = '';

  document.getElementById('bankRequestDrawer').classList.remove('hidden');
  showDrawerBackdrop();
  refreshIcons();
}

function closeBankRequestDrawer() {
  selectedBankRequest = null;
  document.getElementById('bankRequestDrawer').classList.add('hidden');
  hideDrawerBackdrop();
}

async function submitBankRequestDecision(action) {
  if (!selectedBankRequest) return;

  const rejectionNote = document.getElementById('bankRejectionNote').value.trim();
  const errorEl = document.getElementById('bankFormError');

  if (action === 'reject' && !rejectionNote) {
    errorEl.textContent = 'A rejection note is required.';
    errorEl.classList.remove('hidden');
    return;
  }

  const verifyBtn = document.getElementById('bankVerifyBtn');
  const rejectBtn = document.getElementById('bankRejectBtn');
  verifyBtn.disabled = true;
  rejectBtn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    const path = action === 'verify'
      ? `/api/ops/bank-detail-requests/${selectedBankRequest.RequestID}/verify`
      : `/api/ops/bank-detail-requests/${selectedBankRequest.RequestID}/reject`;
    const body = action === 'verify' ? undefined : JSON.stringify({ rejectionNote });

    await apiFetch(path, { method: 'POST', body });

    const investorName = `${selectedBankRequest.FirstName} ${selectedBankRequest.LastName}`;
    addAudit(
      `Bank detail request ${action === 'verify' ? 'verified' : 'rejected'} — ${investorName}`,
      `${authSession?.user?.Email || 'Ops'} • just now`,
      action === 'verify' ? 'Applied to the live account.' : `Reason: ${rejectionNote}`,
    );

    closeBankRequestDrawer();
    await loadBankRequestQueue();
    renderBankRequestQueue();
    renderAudit();
    saveWorkspaceState();
  } catch (err) {
    errorEl.textContent = err.message || 'Decision could not be recorded. Try again.';
    errorEl.classList.remove('hidden');
  } finally {
    verifyBtn.disabled = false;
    rejectBtn.disabled = false;
  }
}

function bindBankRequestEvents() {
  document.getElementById('refreshBankRequestsBtn').addEventListener('click', async () => {
    await loadBankRequestQueue();
    renderBankRequestQueue();
  });

  document.getElementById('bankRequestTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.bank-review-btn');
    if (btn) openBankRequestDrawer(btn.dataset.requestid);
  });

  document.getElementById('bankDrawerCloseBtn').addEventListener('click', closeBankRequestDrawer);
  document.getElementById('bankVerifyBtn').addEventListener('click', () => submitBankRequestDecision('verify'));
  document.getElementById('bankRejectBtn').addEventListener('click', () => submitBankRequestDecision('reject'));
}

// ── Portfolio value adjustments (C.1 item 7) ─────────────────────────────────
// Deliberately append-only on the server — see server.js's comment on
// POST /api/ops/users/:userId/portfolio-adjustment. This file only ever
// calls that endpoint to add a new ledger row; there is no "edit" or
// "delete" action for an existing adjustment anywhere in this UI, on purpose.
let selectedPortfolioUserId = null;

function formatCurrency(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

async function openPortfolioDrawer(userId) {
  const user = state.apiUsers.find((u) => String(u.id) === String(userId));
  if (!user) return;

  selectedPortfolioUserId = userId;
  document.getElementById('portfolioDrawerName').textContent = user.name;
  document.getElementById('portfolioDrawerEmail').textContent = user.email;
  document.getElementById('portfolioDrawerCurrentValue').textContent = 'Loading…';
  document.getElementById('portfolioAdjustmentAmount').value = '';
  document.getElementById('portfolioAdjustmentReason').value = '';
  document.getElementById('portfolioFormError').classList.add('hidden');
  document.getElementById('portfolioDrawer').classList.remove('hidden');
  showDrawerBackdrop();
  refreshIcons();

  await loadPortfolioHistory(userId);
}

function closePortfolioDrawer() {
  selectedPortfolioUserId = null;
  document.getElementById('portfolioDrawer').classList.add('hidden');
  hideDrawerBackdrop();
}

async function loadPortfolioHistory(userId) {
  const emptyEl = document.getElementById('portfolioHistoryEmpty');
  const listEl = document.getElementById('portfolioHistoryList');

  try {
    const result = await apiFetch(`/api/ops/users/${userId}/portfolio-adjustments`);
    const history = result?.data || [];

    document.getElementById('portfolioDrawerCurrentValue').textContent = formatCurrency(result.currentPortfolioValue);

    if (history.length === 0) {
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      return;
    }

    listEl.innerHTML = history
      .map((h) => `
        <li class="kyc-history-item">
          <span class="kyc-history-action ${Number(h.Amount) >= 0 ? 'approve' : 'decline'}">
            ${Number(h.Amount) >= 0 ? '+' : ''}${formatCurrency(h.Amount)}
          </span>
          <span class="kyc-history-meta">by ${escapeHtml(h.CreatedByFirstName)} ${escapeHtml(h.CreatedByLastName)} (${escapeHtml(h.CreatedByEmail)}) • ${formatDate(h.CreatedAt)}</span>
          <span class="kyc-history-meta">${escapeHtml(h.Reason)}</span>
        </li>
      `)
      .join('');
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
  } catch (err) {
    document.getElementById('portfolioDrawerCurrentValue').textContent = '—';
    emptyEl.textContent = `Could not load history: ${err.message}`;
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
  }
}

async function submitPortfolioAdjustment() {
  if (!selectedPortfolioUserId) return;

  const amountInput = document.getElementById('portfolioAdjustmentAmount');
  const reasonInput = document.getElementById('portfolioAdjustmentReason');
  const errorEl = document.getElementById('portfolioFormError');

  const amount = Number(amountInput.value);
  const reason = reasonInput.value.trim();

  if (!amountInput.value || Number.isNaN(amount) || amount === 0) {
    errorEl.textContent = 'Enter a non-zero amount.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (!reason) {
    errorEl.textContent = 'A reason is required.';
    errorEl.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('portfolioSubmitBtn');
  submitBtn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    await apiFetch(`/api/ops/users/${selectedPortfolioUserId}/portfolio-adjustment`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });

    const user = state.apiUsers.find((u) => String(u.id) === String(selectedPortfolioUserId));
    addAudit(
      `Portfolio adjustment — ${user?.name || 'user'}`,
      `${authSession?.user?.Email || 'Ops'} • just now`,
      `${amount >= 0 ? '+' : ''}${formatCurrency(amount)} — ${reason}`,
    );

    amountInput.value = '';
    reasonInput.value = '';
    await loadPortfolioHistory(selectedPortfolioUserId);
    renderAudit();
    saveWorkspaceState();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not record the adjustment. Try again.';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
}

function bindPortfolioEvents() {
  document.getElementById('userTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.portfolio-adjust-btn');
    if (btn) openPortfolioDrawer(btn.dataset.userid);
  });

  document.getElementById('portfolioDrawerCloseBtn').addEventListener('click', closePortfolioDrawer);
  document.getElementById('portfolioSubmitBtn').addEventListener('click', submitPortfolioAdjustment);
}

/**
 * INCIDENT, 03 Aug 2026 — read this before changing what gets loaded here.
 *
 * F8 correctly gated GET /api/ops/bank-detail-requests to finance_admin /
 * super_admin. This function fetched it unconditionally for every operator
 * regardless of role, in the same Promise.all as everything else, with no
 * per-loader error handling. The result: the moment an operator was anything
 * other than finance/super, this function threw on login and on every page
 * load. Because establishSession() awaits this function with no try/catch of
 * its own, the throw reached handleLogin's catch block, which treats ANY
 * error — a wrong password or a permissions problem, no distinction — as
 * "Invalid email or password" and clears the session it had just created. An
 * operations_admin operator (Hafiz, demoted from super_admin as part of
 * routine role assignment) saw the dashboard render for an instant and was
 * then bounced straight back to a login screen telling him his password was
 * wrong. It was not. The role model was working exactly as designed; the
 * dashboard just couldn't survive being told no.
 *
 * Two independent fixes, both required:
 *
 * 1. Don't request data a role can't have. applyOperatorRoleVisibility()
 *    already hides the Bank Requests tab for non-finance roles — this
 *    function has to agree with that decision, or it fetches data behind a
 *    hidden tab that will only ever 403 and log noise server-side for no
 *    reason.
 * 2. Never let one panel's failure be fatal. Promise.allSettled, not
 *    Promise.all: a real network blip on the KYC queue must not prevent the
 *    Documents panel from rendering, and — the actual incident — must never
 *    propagate up to code that interprets "a dashboard fetch failed" as "this
 *    session is invalid, log out." Session validity is decided once, by the
 *    /api/admin/auth/me call in establishSession/bootstrapAuth. It is not
 *    re-decided by whatever the least-privileged panel on the page happens to
 *    return.
 */
async function refreshLiveData() {
  const loaders = [
    loadApiUsers(),
    loadInvestmentIntents(),
    loadKycQueue(),
    loadDocuments(),
    loadPropertyOptions(),
  ];
  if (canOperatorSeeFinanceData()) {
    loaders.push(loadBankRequestQueue());
  } else {
    // Empties the panel's data rather than leaving whatever the previous
    // session (possibly a different, higher-privileged one on a shared
    // machine) left behind in memory.
    bankRequestQueue = [];
  }

  const results = await Promise.allSettled(loaders);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      // Deliberately not surfaced to the operator as an error banner — a
      // failed panel renders as that panel being empty, which is honest
      // without being alarming. It IS logged, because "why is this panel
      // always empty" needs to be debuggable from the console.
      console.error('Failed to load a dashboard section:', result.reason);
    }
  });

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
  renderBankRequestQueue();
  renderAudit();
  saveWorkspaceState();
  refreshIcons();
}

authEls.loginForm.addEventListener('submit', handleLogin);
authEls.logoutBtn.addEventListener('click', handleLogout);

bindWorkspaceEvents();
bindKycEvents();
bindBankRequestEvents();
bindPortfolioEvents();

// Backdrop click closes whichever of the three drawers is currently open —
// harmless to call close on ones that aren't open, they're already hidden.
document.getElementById('drawerBackdrop').addEventListener('click', () => {
  closeKycDrawer();
  closeBankRequestDrawer();
  closePortfolioDrawer();
});

bootstrapAuth();