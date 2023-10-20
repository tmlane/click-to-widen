let activeTabs = {};

chrome.action.onClicked.addListener(function(tab) {
  // Query the current status of the content script
  chrome.tabs.sendMessage(tab.id, { action: 'queryStatus' }, function(response) {
      if (response && response.status) {
          console.log('Deactivating');
          chrome.tabs.sendMessage(tab.id, { action: 'deactivate' });
          delete activeTabs[tab.id];
          chrome.action.setIcon({tabId: tab.id, path: {
            "16": "icon-24.png",
            "48": "icon-48.png",
            "128": "icon-96.png"
          }});
      } else {
          console.log('Activating');
          chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
          }, () => {
              activeTabs[tab.id] = true;
              chrome.tabs.sendMessage(tab.id, { action: 'activate' });
              chrome.action.setIcon({tabId: tab.id, path: {
                  "16": "active-icon-24.png",
                  "48": "active-icon-48.png",
                  "128": "active-icon-96.png"
              }});
          });
      }
  });
});
