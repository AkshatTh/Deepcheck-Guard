// DeepCheck Guard — Popup Script

const toggleBtn = document.getElementById('toggle-btn');
const statusText = document.getElementById('status-text');
const threatsCount = document.getElementById('threats-count');
const framesCount = document.getElementById('frames-count');

// Load current state
chrome.storage.local.get(['enabled', 'totalThreatsBlocked', 'totalFramesScanned'], (data) => {
  updateUI(data.enabled !== false, data.totalThreatsBlocked || 0, data.totalFramesScanned || 0);
});

toggleBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_SHIELD' }, (res) => {
    updateUI(res.enabled, null, null);
    // Notify active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHIELD_TOGGLED', enabled: res.enabled });
      }
    });
  });
});

function updateUI(enabled, threats, frames) {
  toggleBtn.className = 'toggle ' + (enabled ? 'on' : '');
  statusText.textContent = enabled ? 'Shield Active' : 'Shield Disabled';
  if (threats !== null) threatsCount.textContent = threats;
  if (frames !== null) framesCount.textContent = frames;
}
