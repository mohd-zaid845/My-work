/**
 * app.js – Main application controller.
 */
const App = (() => {
  let _currentUserId = null;
  const TOAST_DISPLAY_DURATION_MS = 4000;

  // ── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    _bindAuthEvents();

    const savedUserId = Storage.getCurrentUserId();
    if (savedUserId && Storage.getCurrentUser()) {
      _currentUserId = savedUserId;
      _showApp();
    } else {
      _showAuth();
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  function _bindAuthEvents() {
    // Toggle between login / register
    document.getElementById('show-register').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('active');
      document.getElementById('register-form').classList.add('active');
    });
    document.getElementById('show-login').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('register-form').classList.remove('active');
      document.getElementById('login-form').classList.add('active');
    });

    document.getElementById('btn-login').addEventListener('click', _handleLogin);
    document.getElementById('btn-register').addEventListener('click', _handleRegister);

    document.getElementById('login-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleLogin();
    });
    document.getElementById('reg-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleRegister();
    });
  }

  function _handleLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');

    errorEl.classList.add('hidden');

    if (!email || !password) {
      _showFormError(errorEl, 'Please enter your email and password.');
      return;
    }

    const user = Storage.findUserByEmail(email);
    if (!user || user.passwordHash !== _hash(password)) {
      _showFormError(errorEl, 'Incorrect email or password.');
      return;
    }

    _currentUserId = user.id;
    Storage.setCurrentUserId(user.id);
    _showApp();
  }

  function _handleRegister() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const phone    = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl  = document.getElementById('reg-error');

    errorEl.classList.add('hidden');

    if (!name || !email || !password) {
      _showFormError(errorEl, 'Name, email and password are required.');
      return;
    }
    if (!_validEmail(email)) {
      _showFormError(errorEl, 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      _showFormError(errorEl, 'Password must be at least 8 characters.');
      return;
    }
    if (Storage.findUserByEmail(email)) {
      _showFormError(errorEl, 'An account with this email already exists.');
      return;
    }

    const user = {
      id:           String(Date.now()),
      name,
      email,
      phone,
      passwordHash: _hash(password),
      createdAt:    new Date().toISOString(),
    };
    Storage.saveUser(user);
    Storage.setCurrentUserId(user.id);

    Storage.addEvent(user.id, {
      type:   'status',
      title:  'Account created',
      detail: 'Welcome to SafeTrack!',
    });

    _currentUserId = user.id;
    _showApp();
    showToast(`Welcome, ${name}! Your account has been created.`, 'success');
  }

  // ── App Shell ─────────────────────────────────────────────────────────────
  function _showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  }

  function _showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    const user = Storage.getCurrentUser();
    if (user) {
      document.getElementById('user-name-display').textContent = user.name;
    }

    _bindAppEvents();
    refreshDashboard();
    Contacts.render(_currentUserId);
    refreshHistory();
    CheckIn.restoreSchedule(_currentUserId);
    Alerts.requestPermission();
    switchTab('dashboard');
  }

  // ── App Events ────────────────────────────────────────────────────────────
  function _bindAppEvents() {
    // Logout
    document.getElementById('btn-logout').addEventListener('click', _handleLogout);

    // Tab navigation (header)
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Tab navigation (mobile)
    document.querySelectorAll('.mobile-nav-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Dashboard – status buttons
    document.getElementById('btn-mark-safe').addEventListener('click', () => _updateStatus('safe'));
    document.getElementById('btn-mark-away').addEventListener('click', () => _updateStatus('away'));

    // SOS
    document.getElementById('btn-sos').addEventListener('click', () => {
      Alerts.initiateSOS(_currentUserId);
    });
    document.getElementById('btn-cancel-sos').addEventListener('click', () => {
      Alerts.cancelSOS();
    });

    // Check-in tab
    document.getElementById('btn-get-location').addEventListener('click', () => {
      CheckIn.detectLocation(_currentUserId);
    });
    document.getElementById('btn-submit-checkin').addEventListener('click', () => {
      CheckIn.submit(_currentUserId);
    });
    document.getElementById('btn-schedule-toggle').addEventListener('click', () => {
      CheckIn.toggleSchedule(_currentUserId);
    });

    // Contacts tab
    document.getElementById('btn-add-contact').addEventListener('click', () => {
      Contacts.add(_currentUserId);
    });
    document.getElementById('contact-phone').addEventListener('keydown', e => {
      if (e.key === 'Enter') Contacts.add(_currentUserId);
    });

    // History tab
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshHistory(btn.dataset.filter);
      });
    });
    document.getElementById('btn-export').addEventListener('click', _exportData);
    document.getElementById('btn-clear-history').addEventListener('click', _confirmClearHistory);

    // Modal
    document.getElementById('modal-cancel').addEventListener('click', _closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) _closeModal();
    });
  }

  function _handleLogout() {
    Storage.setCurrentUserId(null);
    _currentUserId = null;
    // Clear form fields
    ['login-email','login-password','reg-name','reg-email','reg-phone','reg-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('reg-error').classList.add('hidden');
    _showAuth();
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  function refreshDashboard() {
    if (!_currentUserId) return;
    const user = Storage.getCurrentUser();

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('dashboard-greeting');
    if (greetEl) greetEl.textContent = `${greeting}, ${user ? user.name : ''}!`;

    // Safety status
    const status = Storage.getUserData(_currentUserId, 'safetyStatus', 'safe');
    _renderStatusCard(status);

    // Stats
    const contacts  = Storage.getContacts(_currentUserId);
    const sosCount  = Storage.getUserData(_currentUserId, 'sosCount', 0);
    const locationStr = Storage.getUserData(_currentUserId, 'lastLocation', '—');

    const today = new Date().toDateString();
    const todayCheckins = Storage.getUserData(_currentUserId, 'todayCheckins', { date: today, count: 0 });
    const checkinCount  = todayCheckins.date === today ? todayCheckins.count : 0;

    _setText('stat-contacts', contacts.length);
    _setText('stat-checkins', checkinCount);
    _setText('stat-sos',      sosCount);
    _setText('stat-location', locationStr);

    // Recent activity (last 5 events)
    const events = Storage.getEvents(_currentUserId).slice(0, 5);
    const actList = document.getElementById('recent-activity');
    if (actList) {
      if (events.length === 0) {
        actList.innerHTML = '<li class="activity-empty">No recent activity yet.</li>';
      } else {
        actList.innerHTML = events.map(ev => `
          <li class="activity-item">
            <span class="activity-icon">${_eventIcon(ev.type)}</span>
            <div class="activity-body">
              <div class="activity-title">${_escHtml(ev.title)}</div>
              ${ev.detail ? `<div class="activity-note">${_escHtml(ev.detail)}</div>` : ''}
            </div>
            <span class="activity-time">${_relativeTime(ev.timestamp)}</span>
          </li>`).join('');
      }
    }
  }

  function _renderStatusCard(status) {
    const card   = document.getElementById('status-card');
    const icon   = document.getElementById('status-icon');
    const label  = document.getElementById('status-label');
    const desc   = document.getElementById('status-description');
    const metaEl = document.getElementById('last-checkin-time');

    const cfg = {
      safe:    { icon: '🟢', label: 'Safe',    desc: "You're currently marked as safe.",             cls: 'status-safe'    },
      caution: { icon: '🟡', label: 'Caution', desc: 'You indicated you need attention.',             cls: 'status-caution' },
      alert:   { icon: '🔴', label: 'Alert',   desc: 'You are in alert status. SOS may be active.',  cls: 'status-alert'   },
      away:    { icon: '⚪', label: 'Away',    desc: "You've checked out. Stay safe!",               cls: 'status-safe'    },
    };
    const c = cfg[status] || cfg.safe;

    card.className = `card status-card ${c.cls}`;
    if (icon)  icon.textContent  = c.icon;
    if (label) label.textContent = c.label;
    if (desc)  desc.textContent  = c.desc;

    const lastTime = Storage.getUserData(_currentUserId, 'lastCheckinTime', null);
    if (metaEl) {
      metaEl.textContent = lastTime
        ? `Last check-in: ${_relativeTime(lastTime)}`
        : 'No check-ins yet.';
    }
  }

  function _updateStatus(status) {
    Storage.setUserData(_currentUserId, 'safetyStatus', status);
    Storage.setUserData(_currentUserId, 'lastCheckinTime', new Date().toISOString());
    Storage.addEvent(_currentUserId, {
      type:   'status',
      title:  status === 'safe' ? 'Marked as Safe 🟢' : 'Checked Out ⚪',
      detail: '',
    });
    refreshDashboard();
    refreshHistory();
    showToast(status === 'safe' ? 'Marked as safe!' : 'Checked out.', 'success');
  }

  // ── History ───────────────────────────────────────────────────────────────
  function refreshHistory(filter = 'all') {
    if (!_currentUserId) return;
    let events = Storage.getEvents(_currentUserId);

    if (filter && filter !== 'all') {
      events = events.filter(ev => ev.type === filter);
    }

    const list = document.getElementById('history-list');
    if (!list) return;

    if (events.length === 0) {
      list.innerHTML = '<div class="history-empty">No history matching this filter.</div>';
      return;
    }

    list.innerHTML = events.map(ev => `
      <div class="history-item" data-type="${_escHtml(ev.type)}">
        <span class="history-icon">${_eventIcon(ev.type)}</span>
        <div class="history-body">
          <div class="history-title">
            ${_escHtml(ev.title)}
            ${ev.status ? `<span class="badge badge-${ev.status}">${_escHtml(ev.status)}</span>` : ''}
          </div>
          ${ev.detail ? `<div class="history-detail">${_escHtml(ev.detail)}</div>` : ''}
          ${ev.location ? `<div class="history-detail">📍 ${_escHtml(ev.location)}</div>` : ''}
        </div>
        <span class="history-time">${_formatDate(ev.timestamp)}</span>
      </div>`).join('');
  }

  // ── Tab Switching ─────────────────────────────────────────────────────────
  function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-tab').forEach(b => b.classList.remove('active'));

    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');

    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(b => b.classList.add('active'));

    // Refresh data for the activated tab
    if (tabName === 'dashboard') refreshDashboard();
    if (tabName === 'contacts')  Contacts.render(_currentUserId);
    if (tabName === 'history') {
      const activeFilter = document.querySelector('.filter-btn.active');
      refreshHistory(activeFilter ? activeFilter.dataset.filter : 'all');
    }
    if (tabName === 'checkin') Contacts.render(_currentUserId);
  }

  // ── Export & Clear ────────────────────────────────────────────────────────
  function _exportData() {
    const data = Storage.exportUserData(_currentUserId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `safetrack-export-${_exportDateStamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully.', 'success');
  }

  /** Returns a YYYY-MM-DD string for use in export filenames. */
  function _exportDateStamp() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function _confirmClearHistory() {
    showModal(
      'Clear History',
      'Are you sure you want to permanently delete all history? This cannot be undone.',
      () => {
        Storage.clearEvents(_currentUserId);
        refreshHistory();
        refreshDashboard();
        showToast('History cleared.', 'warning');
      }
    );
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function showModal(title, body, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent  = body;

    const confirmBtn = document.getElementById('modal-confirm');
    const newBtn     = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', () => {
      _closeModal();
      onConfirm();
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function _closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast${type !== 'info' ? ` toast-${type}` : ''}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, TOAST_DISPLAY_DURATION_MS);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function _validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function _showFormError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  /**
   * ⚠️  DEMO ONLY – FNV-1a is NOT a secure password hashing algorithm.
   * It is used here solely to avoid storing plaintext passwords in localStorage
   * during this client-side demo. In production you MUST:
   *   1. Send credentials over HTTPS to a server.
   *   2. Store passwords with a proper slow hash (bcrypt, Argon2, scrypt).
   *   3. Never store password hashes client-side.
   */
  function _hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (Math.imul(h, 0x01000193)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function _eventIcon(type) {
    const icons = {
      checkin:         '✅',
      sos:             '🚨',
      status:          '🔄',
      contact_added:   '👤',
      contact_removed: '❌',
      reminder:        '⏰',
    };
    return icons[type] || '📌';
  }

  function _relativeTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s <  60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function _formatDate(isoStr) {
    try {
      return new Date(isoStr).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  return { init, refreshDashboard, refreshHistory, switchTab, showToast, showModal };
})();

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
