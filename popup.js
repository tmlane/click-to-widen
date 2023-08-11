document.getElementById('toggle').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: toggle
      });
  });
  
  function toggle() {
      chrome.runtime.sendMessage({action: 'toggle'});
  }
});
