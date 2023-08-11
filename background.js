let activeTabs = {};

chrome.action.onClicked.addListener(function(tab) {
  console.log('deactivated clicked')
    if (activeTabs[tab.id]) {
      console.log('Deactivating')
        chrome.tabs.sendMessage(tab.id, { action: 'deactivate' });
        delete activeTabs[tab.id];
        chrome.action.setIcon({tabId: tab.id, path: {
          "16": "icon-24.png",
          "48": "icon-48.png",
          "128": "icon-96.png"
        }});
    } else {
      console.log('deactivated')
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        }, () => {
          console.log('Activating');
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
