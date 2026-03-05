/**
 * checkin.js – Safety check-in logic and scheduled reminders.
 */
const CheckIn = (() => {
  let _scheduleIntervalId = null;
  let _scheduleActive     = false;

  const GEOLOCATION_TIMEOUT_MS  = 10000; // Max time to wait for a position fix
  const GEOLOCATION_MAX_AGE_MS  = 60000; // Accept a cached position up to 60 s old
  function detectLocation(userId) {
    const btn     = document.getElementById('btn-get-location');
    const textEl  = document.getElementById('location-text');
    const coordEl = document.getElementById('location-coords');

    if (!navigator.geolocation) {
      textEl.textContent = 'Geolocation is not supported by your browser.';
      textEl.className   = 'location-text';
      return;
    }

    btn.disabled      = true;
    btn.textContent   = 'Detecting…';
    textEl.textContent = 'Detecting your location…';
    textEl.className   = 'location-text muted';
    coordEl.textContent = '';

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const locStr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        textEl.textContent  = '📍 Location captured';
        textEl.className    = 'location-text';
        coordEl.textContent = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`;

        Storage.setUserData(userId, 'lastLocation', locStr);
        Storage.setUserData(userId, 'lastLocationFull', {
          lat: latitude, lon: longitude, accuracy, capturedAt: new Date().toISOString(),
        });

        // Update dashboard stat
        const statEl = document.getElementById('stat-location');
        if (statEl) statEl.textContent = locStr;

        btn.disabled    = false;
        btn.textContent = 'Detect Location';
      },
      err => {
        textEl.textContent = `Location unavailable: ${err.message}`;
        textEl.className   = 'location-text';
        coordEl.textContent = '';
        btn.disabled    = false;
        btn.textContent = 'Detect Location';
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS }
    );
  }

  // ── Submit Check-In ───────────────────────────────────────────────────────
  function submit(userId) {
    const statusEl  = document.getElementById('checkin-status');
    const noteEl    = document.getElementById('checkin-note');
    const successEl = document.getElementById('checkin-success');

    const status = statusEl.value;
    const note   = noteEl.value.trim();
    const locationStr = Storage.getUserData(userId, 'lastLocation', null);

    // Collect selected contacts
    const checkedBoxes  = document.querySelectorAll('#contact-checkboxes input[type="checkbox"]:checked');
    const notifiedNames = [];
    checkedBoxes.forEach(cb => {
      // Use the data-name attribute for a robust, whitespace-independent lookup
      if (cb.dataset.name) notifiedNames.push(cb.dataset.name);
    });

    const statusLabels = { safe: 'Safe 🟢', caution: 'Needs Attention 🟡', alert: 'Alert 🔴' };
    const label = statusLabels[status] || status;

    const detail = [
      note ? `"${note}"` : null,
      locationStr ? `📍 ${locationStr}` : null,
      notifiedNames.length ? `Notified: ${notifiedNames.join(', ')}` : null,
    ].filter(Boolean).join(' · ');

    const event = Storage.addEvent(userId, {
      type:    'checkin',
      status,
      title:   `Check-in: ${label}`,
      detail:  detail || 'No additional details.',
      location: locationStr,
    });

    // Update safety status
    Storage.setUserData(userId, 'safetyStatus', status);
    Storage.setUserData(userId, 'lastCheckinTime', event.timestamp);

    // Increment today counter
    _incrementTodayCheckins(userId);

    // Reset form
    noteEl.value = '';
    statusEl.value = 'safe';

    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 3000);

    App.refreshDashboard();
    App.refreshHistory();
    App.showToast(`Check-in submitted: ${label}`, 'success');
  }

  function _incrementTodayCheckins(userId) {
    const today = new Date().toDateString();
    const stored = Storage.getUserData(userId, 'todayCheckins', { date: today, count: 0 });
    if (stored.date !== today) {
      Storage.setUserData(userId, 'todayCheckins', { date: today, count: 1 });
    } else {
      Storage.setUserData(userId, 'todayCheckins', { date: today, count: stored.count + 1 });
    }
  }

  // ── Scheduled Reminders ───────────────────────────────────────────────────
  function toggleSchedule(userId) {
    const btn       = document.getElementById('btn-schedule-toggle');
    const statusEl  = document.getElementById('schedule-status');
    const intervalSel = document.getElementById('schedule-interval');

    if (_scheduleActive) {
      // Disable
      clearInterval(_scheduleIntervalId);
      _scheduleIntervalId = null;
      _scheduleActive     = false;

      Storage.setUserData(userId, 'scheduleActive', false);

      btn.textContent  = 'Enable Reminders';
      btn.className    = 'btn btn-outline btn-full';
      statusEl.textContent = '';
      App.showToast('Check-in reminders disabled.', 'warning');
    } else {
      // Enable
      const minutes = parseInt(intervalSel.value, 10);
      _scheduleActive = true;

      Storage.setUserData(userId, 'scheduleActive', true);
      Storage.setUserData(userId, 'scheduleInterval', minutes);

      btn.textContent = 'Disable Reminders';
      btn.className   = 'btn btn-warning btn-full';
      statusEl.textContent = `Reminders every ${minutes} minutes.`;

      _scheduleIntervalId = setInterval(() => {
        _sendReminder(userId, minutes);
      }, minutes * 60 * 1000);

      App.showToast(`Check-in reminders set for every ${minutes} minutes.`, 'success');
    }
  }

  function _sendReminder(userId, minutes) {
    App.showToast(`⏰ Reminder: Please check in! (every ${minutes} min)`, 'warning');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ SafeTrack Reminder', {
        body: `Time for your ${minutes}-minute safety check-in!`,
      });
    }
    Storage.addEvent(userId, {
      type:   'reminder',
      title:  '⏰ Check-in reminder sent',
      detail: `Scheduled reminder every ${minutes} minutes.`,
    });
    App.refreshHistory();
  }

  // Restore schedule state on load
  function restoreSchedule(userId) {
    const active   = Storage.getUserData(userId, 'scheduleActive', false);
    const minutes  = Storage.getUserData(userId, 'scheduleInterval', 30);
    const btn      = document.getElementById('btn-schedule-toggle');
    const statusEl = document.getElementById('schedule-status');
    const sel      = document.getElementById('schedule-interval');

    if (active && btn) {
      _scheduleActive = true;
      if (sel) sel.value = String(minutes);
      btn.textContent  = 'Disable Reminders';
      btn.className    = 'btn btn-warning btn-full';
      if (statusEl) statusEl.textContent = `Reminders every ${minutes} minutes.`;

      _scheduleIntervalId = setInterval(() => {
        _sendReminder(userId, minutes);
      }, minutes * 60 * 1000);
    }
  }

  return { detectLocation, submit, toggleSchedule, restoreSchedule };
})();
