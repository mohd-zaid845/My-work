/**
 * contacts.js – Emergency contacts management.
 */
const Contacts = (() => {
  // ── Render ─────────────────────────────────────────────────────────────────
  function render(userId) {
    const contacts = Storage.getContacts(userId);
    const list = document.getElementById('contacts-list');
    const countBadge = document.getElementById('contacts-count');
    const checkboxes = document.getElementById('contact-checkboxes');

    if (countBadge) countBadge.textContent = contacts.length;

    // Main list
    if (list) {
      if (contacts.length === 0) {
        list.innerHTML = '<li class="contacts-empty">No emergency contacts yet. Add one above.</li>';
      } else {
        list.innerHTML = contacts.map(c => _contactCard(c)).join('');
        list.querySelectorAll('.btn-delete-contact').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = Number(btn.dataset.id);
            remove(userId, id);
          });
        });
      }
    }

    // Checkboxes in check-in tab
    if (checkboxes) {
      if (contacts.length === 0) {
        checkboxes.innerHTML =
          '<p class="muted">No contacts added yet. <a href="#" data-goto-contacts>Add contacts →</a></p>';
        const link = checkboxes.querySelector('[data-goto-contacts]');
        if (link) {
          link.addEventListener('click', e => {
            e.preventDefault();
            App.switchTab('contacts');
          });
        }
      } else {
        checkboxes.innerHTML = contacts.map(c => `
          <label class="contact-checkbox-item">
            <input type="checkbox" value="${c.id}" data-name="${_escHtml(c.name)}" checked />
            ${_escHtml(c.name)}
            <span class="contact-relation">${_escHtml(c.relation)}</span>
          </label>
        `).join('');
      }
    }
  }

  function _contactCard(c) {
    const initials = c.name.trim().split(' ').filter(w => w).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return `
      <li class="contact-card">
        <div class="contact-avatar">${_escHtml(initials)}</div>
        <div class="contact-info">
          <div class="contact-name">
            ${_escHtml(c.name)}
            <span class="contact-relation">${_escHtml(c.relation)}</span>
          </div>
          <div class="contact-meta">
            ${c.phone ? '📞 ' + _escHtml(c.phone) : ''}
            ${c.phone && c.email ? ' &nbsp;·&nbsp; ' : ''}
            ${c.email ? '✉️ ' + _escHtml(c.email) : ''}
          </div>
        </div>
        <div class="contact-actions">
          <button class="btn btn-danger-outline btn-sm btn-delete-contact" data-id="${c.id}" title="Remove contact">✕</button>
        </div>
      </li>`;
  }

  // ── Add ────────────────────────────────────────────────────────────────────
  function add(userId) {
    const nameEl     = document.getElementById('contact-name');
    const phoneEl    = document.getElementById('contact-phone');
    const emailEl    = document.getElementById('contact-email');
    const relationEl = document.getElementById('contact-relation');
    const errorEl    = document.getElementById('contact-error');

    const name     = nameEl.value.trim();
    const phone    = phoneEl.value.trim();
    const email    = emailEl.value.trim();
    const relation = relationEl.value;

    // Validation
    if (!name) {
      _showError(errorEl, 'Name is required.');
      return;
    }
    if (!phone && !email) {
      _showError(errorEl, 'Please provide at least a phone number or email.');
      return;
    }
    if (email && !_validEmail(email)) {
      _showError(errorEl, 'Please enter a valid email address.');
      return;
    }

    errorEl.classList.add('hidden');

    const contacts = Storage.getContacts(userId);
    contacts.push({ id: Date.now(), name, phone, email, relation });
    Storage.saveContacts(userId, contacts);

    // Clear form
    nameEl.value  = '';
    phoneEl.value = '';
    emailEl.value = '';

    Storage.addEvent(userId, {
      type: 'contact_added',
      title: 'Contact added',
      detail: `Added ${name} as emergency contact.`,
    });

    render(userId);
    App.refreshDashboard();
    App.showToast(`${name} added as emergency contact.`, 'success');
  }

  // ── Remove ─────────────────────────────────────────────────────────────────
  function remove(userId, contactId) {
    const contacts  = Storage.getContacts(userId);
    const contact   = contacts.find(c => c.id === contactId);
    const updated   = contacts.filter(c => c.id !== contactId);
    Storage.saveContacts(userId, updated);

    if (contact) {
      Storage.addEvent(userId, {
        type: 'contact_removed',
        title: 'Contact removed',
        detail: `Removed ${contact.name} from emergency contacts.`,
      });
    }

    render(userId);
    App.refreshDashboard();
    App.showToast('Contact removed.', 'warning');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function _showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { render, add, remove };
})();
