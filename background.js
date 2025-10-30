// background.js (Fixed - Syntax errors corrected)

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ extensionEnabled: true });
    console.log("Qlicker Automator: Default state set to ENABLED.");
});

const injectedTabs = new Set();

// Clear tracking when tab is closed or navigated away
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act on complete page loads of Qlicker pages
    if (changeInfo.status !== 'complete' || !tab.url?.startsWith("https://qlicker.queensu.ca/")) {
        return;
    }
    
    if (injectedTabs.has(tabId)) {
        console.log(`Content script already injected in tab ${tabId}, skipping.`);
        return;
    }
    
    console.log(`Qlicker page loaded in tab ${tabId}. Injecting content script.`);
    
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
    }).then(() => {
        injectedTabs.add(tabId);
        console.log(`Content script successfully injected in tab ${tabId}.`);
    }).catch((error) => {
        console.error(`Failed to inject content script in tab ${tabId}:`, error);
    });
});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) { // Main frame navigation
        injectedTabs.delete(details.tabId);
    }
});