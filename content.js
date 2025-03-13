// Content script for Gmail page interactions
console.log('Gmail Manager content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REFRESH_PAGE') {
    window.location.reload();
    return true;
  }
}); 