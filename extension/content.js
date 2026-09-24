/**
 * TTD FastFill - Content Script v2.0
 * Injects floating action HUD on TTD portal and simulator.
 * Features:
 * - 1-Click Autonomous "RUN" pipeline
 * - Live Abort button & Esc hotkey support
 * - Dynamic Status Feedback with Audio Chimes
 */

(async function () {
  'use strict';

  if (document.getElementById('ttd-fastfill-hud')) return;

  // Check master bot switch
  let data = await chrome.storage.local.get([
    'ttd_bot_enabled',
    'ttd_profiles',
    'ttd_active_profile',
    'ttd_general',
    'ttd_settings'
  ]);

  let isEnabled = data.ttd_bot_enabled !== false;

  // Create floating HUD
  const hud = document.createElement('div');
  hud.id = 'ttd-fastfill-hud';
  hud.style.display = isEnabled ? 'block' : 'none';

  function refreshHudContent(storageData) {
    const activeKey = storageData.ttd_active_profile || 'default';
    const profileList = (storageData.ttd_profiles && storageData.ttd_profiles[activeKey]) || [];
    const goingDevotees = profileList.filter(d => d.active !== false);

    hud.innerHTML = `
      <div class="ttd-hud-header" id="ttd-hud-drag">
        <div class="ttd-hud-title">
          <span>🕉️</span>
          <span>TTD FastFill v2.0</span>
        </div>
        <div class="ttd-hud-controls">
          <button class="ttd-hud-btn-icon" id="ttd-hud-min-btn" title="Minimize / Expand">_</button>
        </div>
      </div>
      <div class="ttd-hud-body">
        <div class="ttd-hud-profile-row">
          <span>Pool: <b>${activeKey}</b></span>
          <span class="ttd-hud-badge" id="ttd-hud-count-badge">${goingDevotees.length} Going</span>
        </div>

        <button class="ttd-btn-primary" id="ttd-hud-fill-btn">
          <span>⚡</span> <span>RUN AUTONOMOUS (Alt+F)</span>
        </button>

        <button class="ttd-btn-abort" id="ttd-hud-abort-btn" style="display:none;">
          <span>🛑</span> <span>ABORT (Esc)</span>
        </button>

        <div class="ttd-hud-status" id="ttd-hud-status">
          Ready. Press <b>RUN</b> or <b>Alt+F</b>.
        </div>
      </div>
    `;

    // Wire buttons
    const minBtn = document.getElementById('ttd-hud-min-btn');
    minBtn?.addEventListener('click', () => {
      hud.classList.toggle('minimized');
      minBtn.textContent = hud.classList.contains('minimized') ? '▲' : '_';
    });

    const fillBtn = document.getElementById('ttd-hud-fill-btn');
    fillBtn?.addEventListener('click', triggerRun);

    const abortBtn = document.getElementById('ttd-hud-abort-btn');
    abortBtn?.addEventListener('click', () => {
      if (window.TTDFastFillCore) window.TTDFastFillCore.abort();
    });

    setupDraggable(document.getElementById('ttd-hud-drag'));
  }

  refreshHudContent(data);
  document.body.appendChild(hud);

  function setupDraggable(dragHeader) {
    if (!dragHeader) return;
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    dragHeader.addEventListener('mousedown', (e) => {
      if (e.target.id === 'ttd-hud-min-btn') return;
      isDragging = true;
      offsetX = e.clientX - hud.getBoundingClientRect().left;
      offsetY = e.clientY - hud.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      hud.style.right = 'auto';
      hud.style.bottom = 'auto';
      hud.style.left = `${Math.max(10, Math.min(window.innerWidth - 330, e.clientX - offsetX))}px`;
      hud.style.top = `${Math.max(10, Math.min(window.innerHeight - 60, e.clientY - offsetY))}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Trigger Autonomous Run
  async function triggerRun() {
    const latest = await chrome.storage.local.get([
      'ttd_bot_enabled',
      'ttd_profiles',
      'ttd_active_profile',
      'ttd_general',
      'ttd_settings'
    ]);

    if (latest.ttd_bot_enabled === false) {
      alert('⚠️ TTD FastFill is currently paused. Enable it in the extension popup.');
      return;
    }

    const fillBtn = document.getElementById('ttd-hud-fill-btn');
    const abortBtn = document.getElementById('ttd-hud-abort-btn');
    const statusEl = document.getElementById('ttd-hud-status');

    if (fillBtn) fillBtn.style.display = 'none';
    if (abortBtn) abortBtn.style.display = 'flex';

    if (statusEl) {
      statusEl.className = 'ttd-hud-status';
      statusEl.textContent = '🚀 Autonomous execution in progress...';
    }

    const activeKey = latest.ttd_active_profile || 'default';
    const allDevotees = (latest.ttd_profiles && latest.ttd_profiles[activeKey]) || [];
    const activeDevotees = allDevotees.filter(d => d.active !== false);

    if (activeDevotees.length === 0) {
      if (statusEl) {
        statusEl.className = 'ttd-hud-status error';
        statusEl.textContent = '⚠️ No devotees toggled "Going".';
      }
      if (fillBtn) fillBtn.style.display = 'flex';
      if (abortBtn) abortBtn.style.display = 'none';
      return;
    }

    const res = await window.TTDFastFillCore.executeAutonomousRun(
      activeDevotees,
      latest.ttd_general || {},
      latest.ttd_settings || { autoCheckAgreements: true, autoClickContinue: true }
    );

    if (fillBtn) fillBtn.style.display = 'flex';
    if (abortBtn) abortBtn.style.display = 'none';

    if (statusEl) {
      if (res.aborted) {
        statusEl.className = 'ttd-hud-status error';
        statusEl.textContent = '🛑 Halted by Emergency Abort (Esc).';
      } else if (res.success) {
        statusEl.className = 'ttd-hud-status success';
        statusEl.textContent = `✅ Filled ${res.pilgrimsFilled} devotee(s) in ${res.timeTakenMs}ms!`;
      } else {
        statusEl.className = 'ttd-hud-status error';
        statusEl.textContent = `⚠️ Error: ${res.errors.join(', ')}`;
      }
    }
  }

  // Hotkey: Alt + F to run
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      triggerRun();
    }
  });

  // Popup updates
  chrome.runtime.onMessage?.addListener((msg) => {
    if (msg.action === 'BOT_STATE_CHANGED' || msg.action === 'PROFILE_UPDATED') {
      chrome.storage.local.get([
        'ttd_bot_enabled',
        'ttd_profiles',
        'ttd_active_profile',
        'ttd_general',
        'ttd_settings'
      ]).then((res) => {
        hud.style.display = res.ttd_bot_enabled !== false ? 'block' : 'none';
        refreshHudContent(res);
      });
    }
  });
})();
