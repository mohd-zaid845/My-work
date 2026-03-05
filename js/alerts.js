/**
 * alerts.js – SOS alert handling with a countdown + cancel mechanic.
 */
const Alerts = (() => {
  let _countdownTimer = null;
  let _animFrame      = null;
  const COUNTDOWN_S   = 3;

  // ── Initiate SOS ──────────────────────────────────────────────────────────
  function initiateSOS(userId) {
    if (_countdownTimer) return; // already running

    const sosCard    = document.getElementById('sos-countdown');
    const fill       = document.getElementById('countdown-fill');
    const secDisplay = document.getElementById('countdown-seconds');

    sosCard.classList.remove('hidden');
    document.getElementById('btn-sos').disabled = true;

    let remaining  = COUNTDOWN_S;
    const start    = performance.now();
    const duration = COUNTDOWN_S * 1000;

    secDisplay.textContent = remaining;
    fill.style.width       = '100%';

    function tick(now) {
      const elapsed = now - start;
      const ratio   = Math.max(0, 1 - elapsed / duration);
      fill.style.width = `${ratio * 100}%`;

      const secs = Math.ceil(ratio * COUNTDOWN_S);
      if (secs !== remaining) {
        remaining = secs;
        secDisplay.textContent = remaining;
      }

      if (elapsed >= duration) {
        _fireAlert(userId);
        return;
      }
      _animFrame = requestAnimationFrame(tick);
    }

    _animFrame = requestAnimationFrame(tick);
    const COUNTDOWN_BUFFER_MS = 50; // Small buffer to ensure the animation frame completes before firing
    _countdownTimer = setTimeout(() => _fireAlert(userId), duration + COUNTDOWN_BUFFER_MS);
  }

  // ── Cancel SOS ────────────────────────────────────────────────────────────
  function cancelSOS() {
    if (_animFrame)      { cancelAnimationFrame(_animFrame); _animFrame = null; }
    if (_countdownTimer) { clearTimeout(_countdownTimer); _countdownTimer = null; }
    _resetCountdownUI();
    App.showToast('SOS cancelled.', 'warning');
  }

  // ── Fire Alert ────────────────────────────────────────────────────────────
  function _fireAlert(userId) {
    if (_animFrame)      { cancelAnimationFrame(_animFrame); _animFrame = null; }
    if (_countdownTimer) { clearTimeout(_countdownTimer); _countdownTimer = null; }
    _resetCountdownUI();

    const contacts = Storage.getContacts(userId);
    const user     = Storage.getCurrentUser();

    // In a real app, this would call an API to send SMS/email.
    // Here we simulate the action and record the event.
    const locationStr = Storage.getUserData(userId, 'lastLocation', null);
    const detail = contacts.length > 0
      ? `SOS alert sent to: ${contacts.map(c => c.name).join(', ')}.`
      : 'SOS alert triggered (no contacts set — add some for real notifications).';

    Storage.addEvent(userId, {
      type: 'sos',
      title: '🚨 SOS Alert Sent',
      detail,
      location: locationStr,
    });

    // Bump SOS counter
    const count = Storage.getUserData(userId, 'sosCount', 0) + 1;
    Storage.setUserData(userId, 'sosCount', count);

    App.refreshDashboard();
    App.refreshHistory();
    App.showToast('🚨 SOS alert sent to your emergency contacts!', 'danger');

    // Simulate browser notification
    _sendBrowserNotification('🚨 SOS Activated', detail);
  }

  function _resetCountdownUI() {
    const sosCard = document.getElementById('sos-countdown');
    const btnSos  = document.getElementById('btn-sos');
    if (sosCard) sosCard.classList.add('hidden');
    if (btnSos)  btnSos.disabled = false;
  }

  // ── Browser Notification ──────────────────────────────────────────────────
  function _sendBrowserNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '' });
        }
      });
    }
  }

  // ── Request Notification Permission ───────────────────────────────────────
  function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  return { initiateSOS, cancelSOS, requestPermission };
})();
