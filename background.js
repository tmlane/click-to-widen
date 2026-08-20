const INACTIVE_ICON = {
  "16": "icon-24.png",
  "48": "icon-48.png",
  "128": "icon-96.png",
};
const ACTIVE_ICON = {
  "16": "active-icon-24.png",
  "48": "active-icon-48.png",
  "128": "active-icon-96.png",
};

const SETTINGS_MENU_ID = "ctw-settings";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    {
      id: SETTINGS_MENU_ID,
      title: "Settings…",
      contexts: ["action"],
    },
    () => void chrome.runtime.lastError,
  );
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== SETTINGS_MENU_ID) return;
  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 320,
    height: 420,
  });
});

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
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
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

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  const { mode = "widen", strength = 0.65 } = await chrome.storage.local.get({
    mode: "widen",
    strength: 0.65,
  });

  const state = await sendWithInject(tab.id, { action: "getState" });
  if (!state) return;

  if (state.activated) {
    await sendToTab(tab.id, { action: "deactivate" });
  } else {
    await sendToTab(tab.id, { action: "activate", mode, strength });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.action !== "stateChanged" || !sender.tab?.id) return;
  chrome.action.setIcon({
    tabId: sender.tab.id,
    path: message.activated ? ACTIVE_ICON : INACTIVE_ICON,
  });
});
