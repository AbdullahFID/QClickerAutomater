// background.js (With Daily Auto-Sleep/Wake Schedule)

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ extensionEnabled: true });
    console.log("Qlicker Automator: Default state set to ENABLED.");
    
    // Start the scheduler
    startDailyScheduler();
});

// ═══════════════════════════════════════════════════════════
// DAILY SCHEDULER - Sleep at 7:30 PM, Wake at 8:00 AM EST
// ═══════════════════════════════════════════════════════════
function startDailyScheduler() {
    console.log("📅 Daily scheduler started (7:30 PM sleep, 8:00 AM wake EST)");
    
    // Check every minute
    setInterval(() => {
        checkSchedule();
    }, 60000); // 1 minute
    
    // Also check immediately on startup
    checkSchedule();
}

function checkSchedule() {
    const now = new Date();
    
    // Convert to EST/EDT (America/New_York)
    const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    
    const currentTime = hours * 60 + minutes; // Minutes since midnight
    const sleepTime = 19 * 60 + 30; // 7:30 PM = 1170 minutes
    const wakeTime = 8 * 60; // 8:00 AM = 480 minutes
    
    chrome.storage.sync.get({ extensionEnabled: true }).then(({ extensionEnabled }) => {
        
        // ───────────────────────────────────────────────────────
        // SLEEP TIME: 7:30 PM EST
        // ───────────────────────────────────────────────────────
        if (currentTime === sleepTime && extensionEnabled) {
            console.log("😴 7:30 PM EST reached - Putting extension to sleep...");
            console.log("🗑️ Clearing all session state...");
            
            // Disable the extension
            chrome.storage.sync.set({ extensionEnabled: false });
            
            // Clear all state in all tabs
            chrome.tabs.query({ url: "https://qlicker.queensu.ca/*" }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            sessionStorage.clear();
                            console.log("💤 Extension disabled. All state cleared. Goodnight!");
                        }
                    }).catch(() => {}); // Ignore errors if tab is closed
                });
            });
            
            console.log("💤 Extension is now DISABLED until 8:00 AM EST tomorrow");
        }
        
        // ───────────────────────────────────────────────────────
        // WAKE TIME: 8:00 AM EST
        // ───────────────────────────────────────────────────────
        else if (currentTime === wakeTime && !extensionEnabled) {
            console.log("☀️ 8:00 AM EST reached - Waking up extension...");
            
            // Re-enable the extension
            chrome.storage.sync.set({ extensionEnabled: true });
            
            // Notify all tabs
            chrome.tabs.query({ url: "https://qlicker.queensu.ca/*" }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            console.log("☀️ Extension re-enabled. Good morning!");
                        }
                    }).catch(() => {});
                });
            });
            
            console.log("✅ Extension is now ENABLED and monitoring");
        }
    });
}

// ═══════════════════════════════════════════════════════════
// Track injected tabs with URLs
// ═══════════════════════════════════════════════════════════
const injectedTabUrls = new Map();

chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabUrls.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url?.startsWith("https://qlicker.queensu.ca/")) {
        return;
    }
    
    const lastInjectedUrl = injectedTabUrls.get(tabId);
    
    if (lastInjectedUrl === tab.url) {
        return;
    }
    
    console.log(`Qlicker page loaded: ${tab.url}. Injecting content script...`);
    
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
    }).then(() => {
        injectedTabUrls.set(tabId, tab.url);
        console.log(`Content script successfully injected in tab ${tabId}.`);
    }).catch((error) => {
        console.error(`Failed to inject content script in tab ${tabId}:`, error);
    });
});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
        injectedTabUrls.delete(details.tabId);
    }
});