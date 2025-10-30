// background.js (Fixed - Proper Re-injection)

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ extensionEnabled: true });
    console.log("Qlicker Automator: Default state set to ENABLED.");
});

// ═══════════════════════════════════════════════════════════
// Track injected tabs with URLs (not just tab IDs)
// ═══════════════════════════════════════════════════════════
const injectedTabUrls = new Map(); // tabId -> last injected URL

chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabUrls.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act on complete page loads of Qlicker pages
    if (changeInfo.status !== 'complete' || !tab.url?.startsWith("https://qlicker.queensu.ca/")) {
        return;
    }
    
    // ───────────────────────────────────────────────────────
    // Check if we've already injected into THIS SPECIFIC URL
    // ───────────────────────────────────────────────────────
    const lastInjectedUrl = injectedTabUrls.get(tabId);
    
    if (lastInjectedUrl === tab.url) {
        console.log(`Content script already injected for ${tab.url}, skipping.`);
        return;
    }
    
    console.log(`Qlicker page loaded: ${tab.url}. Injecting content script...`);
    
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
    }).then(() => {
        injectedTabUrls.set(tabId, tab.url); // Store URL, not just tab ID
        console.log(`Content script successfully injected in tab ${tabId}.`);
    }).catch((error) => {
        console.error(`Failed to inject content script in tab ${tabId}:`, error);
    });
});

// ═══════════════════════════════════════════════════════════
// Clean up on navigation
// ═══════════════════════════════════════════════════════════
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
        // Clear the stored URL so we can re-inject on next load
        injectedTabUrls.delete(details.tabId);
    }
});