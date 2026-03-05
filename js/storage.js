/**
 * storage.js – thin wrapper around localStorage with a user-scoped namespace.
 */
const Storage = (() => {
  const PREFIX = 'safetrack_';

  function _key(userId, scope) {
    return `${PREFIX}${userId}_${scope}`;
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(`${PREFIX}users`) || '[]');
    } catch {
      return [];
    }
  }

  function saveUser(user) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(`${PREFIX}users`, JSON.stringify(users));
  }

  function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // ── Session ────────────────────────────────────────────────────────────────
  function setCurrentUserId(id) {
    if (id === null) {
      localStorage.removeItem(`${PREFIX}session`);
    } else {
      localStorage.setItem(`${PREFIX}session`, id);
    }
  }

  function getCurrentUserId() {
    return localStorage.getItem(`${PREFIX}session`) || null;
  }

  function getCurrentUser() {
    const id = getCurrentUserId();
    if (!id) return null;
    return getUsers().find(u => u.id === id) || null;
  }

  // ── Contacts ───────────────────────────────────────────────────────────────
  function getContacts(userId) {
    try {
      return JSON.parse(localStorage.getItem(_key(userId, 'contacts')) || '[]');
    } catch {
      return [];
    }
  }

  function saveContacts(userId, contacts) {
    localStorage.setItem(_key(userId, 'contacts'), JSON.stringify(contacts));
  }

  // ── Events / History ───────────────────────────────────────────────────────
  function getEvents(userId) {
    try {
      return JSON.parse(localStorage.getItem(_key(userId, 'events')) || '[]');
    } catch {
      return [];
    }
  }

  const MAX_EVENTS = 200;

  function addEvent(userId, event) {
    const events = getEvents(userId);
    events.unshift({ id: Date.now(), ...event, timestamp: new Date().toISOString() });
    // Keep at most MAX_EVENTS entries to avoid unbounded localStorage growth
    if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
    localStorage.setItem(_key(userId, 'events'), JSON.stringify(events));
    return events[0];
  }

  function clearEvents(userId) {
    localStorage.removeItem(_key(userId, 'events'));
  }

  // ── User Preferences / Status ──────────────────────────────────────────────
  function getUserData(userId, key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(_key(userId, key));
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  function setUserData(userId, key, value) {
    localStorage.setItem(_key(userId, key), JSON.stringify(value));
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportUserData(userId) {
    const user = getUsers().find(u => u.id === userId) || {};
    return {
      exportedAt: new Date().toISOString(),
      user: { name: user.name, email: user.email },
      contacts: getContacts(userId),
      events:   getEvents(userId),
    };
  }

  return {
    getUsers, saveUser, findUserByEmail,
    setCurrentUserId, getCurrentUserId, getCurrentUser,
    getContacts, saveContacts,
    getEvents, addEvent, clearEvents,
    getUserData, setUserData,
    exportUserData,
  };
})();
