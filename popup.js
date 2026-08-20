const toggleBtn = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const modeInputs = document.querySelectorAll('input[name="mode"]');
const strengthInput = document.getElementById('strength');
const strengthValue = document.getElementById('strength-value');

let state = { activated: false, mode: 'widen', strength: 0.65 };

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.url && !/^chrome(-extension)?:\/\//.test(tab.url)) return tab;
  const wins = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  for (const w of wins) {
    const t = w.tabs?.find((x) => x.active);
    if (t && t.url && !/^chrome(-extension)?:\/\//.test(t.url)) return t;
  }
  return tab || null;
}

function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      void chrome.runtime.lastError;
      resolve(response);
    });
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return true;
  } catch {
    return false;
  }
}

async function sendWithInject(tabId, message) {
  let response = await sendToTab(tabId, message);
  if (response) return response;
  const injected = await ensureContentScript(tabId);
  if (!injected) return null;
  return await sendToTab(tabId, message);
}

function render() {
  for (const input of modeInputs) input.checked = input.value === state.mode;
  toggleBtn.textContent = state.activated ? 'Deactivate' : 'Activate';
  toggleBtn.classList.toggle('active', state.activated);
  statusText.textContent = state.activated ? `Active — ${state.mode}` : 'Inactive';
  statusDot.classList.toggle('on', state.activated);
  strengthInput.value = String(state.strength);
  strengthValue.textContent = `${Math.round(state.strength * 100)}%`;
  const isSpotlight = state.mode === 'spotlight';
  strengthInput.disabled = !isSpotlight;
  strengthInput.parentElement.classList.toggle('disabled', !isSpotlight);
}

async function init() {
  const stored = await chrome.storage.local.get({ mode: 'widen', strength: 0.65 });
  state.mode = stored.mode;
  state.strength = stored.strength;

  const tab = await getActiveTab();
  if (tab?.id) {
    const response = await sendWithInject(tab.id, { action: 'getState' });
    if (response) {
      state.activated = !!response.activated;
      if (response.activated) {
        state.mode = response.mode;
        state.strength = response.strength;
      }
    }
  }
  render();
}

for (const input of modeInputs) {
  input.addEventListener('change', async () => {
    state.mode = input.value;
    await chrome.storage.local.set({ mode: state.mode });
    render();
    if (state.activated) {
      const tab = await getActiveTab();
      if (tab?.id) await sendToTab(tab.id, { action: 'updateSettings', mode: state.mode });
    }
  });
}

let strengthSaveTimer = null;
strengthInput.addEventListener('input', async () => {
  state.strength = parseFloat(strengthInput.value);
  strengthValue.textContent = `${Math.round(state.strength * 100)}%`;
  if (state.activated) {
    const tab = await getActiveTab();
    if (tab?.id) sendToTab(tab.id, { action: 'updateSettings', strength: state.strength });
  }
  clearTimeout(strengthSaveTimer);
  strengthSaveTimer = setTimeout(() => {
    chrome.storage.local.set({ strength: state.strength });
  }, 150);
});

toggleBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    statusText.textContent = 'No page to run on';
    return;
  }

  if (state.activated) {
    const response = await sendToTab(tab.id, { action: 'deactivate' });
    if (response) state.activated = false;
  } else {
    const response = await sendWithInject(tab.id, {
      action: 'activate',
      mode: state.mode,
      strength: state.strength,
    });
    if (response) {
      state.activated = !!response.activated;
    } else {
      statusText.textContent = 'Cannot run on this page';
      return;
    }
  }
  render();
});

init();
