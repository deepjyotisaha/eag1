// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Manager extension installed');
});

// Handle authentication errors
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_ERROR') {
    chrome.identity.removeCachedAuthToken(
      { token: request.token },
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }
}); 