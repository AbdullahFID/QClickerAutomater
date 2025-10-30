// content.js (Version 11 - Fixed Scope Issue)
let cachedEnabledState = true;
let lastStorageCheck = 0;
const STORAGE_CHECK_INTERVAL = 5000; // Check storage every 5s instead of every 1.5s
if (window.qlickerWatcherRunning) {
    console.log("Qlicker Watcher is already running.");
} else {
    window.qlickerWatcherRunning = true;
    console.log("Qlicker Automator: Persistent Watcher initialized.");
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.extensionEnabled) {
            cachedEnabledState = changes.extensionEnabled.newValue;
            console.log(`Automator state changed to: ${cachedEnabledState ? 'ENABLED' : 'DISABLED'}`);
        }
    });
    chrome.storage.sync.get({ extensionEnabled: true }).then(({ extensionEnabled }) => {
        cachedEnabledState = extensionEnabled;
    });
    
    setInterval(runAutomation, 1500);
}

async function runAutomation() {
    try {
        const now = Date.now();
        if (now - lastStorageCheck > STORAGE_CHECK_INTERVAL) {
            const { extensionEnabled } = await chrome.storage.sync.get({ extensionEnabled: true });
            cachedEnabledState = extensionEnabled;
            lastStorageCheck = now;
        }
        
        if (!cachedEnabledState) {
            return; 
        }
        
        checkAndAct();
    } catch (error) {
        if (error.message.includes("Extension context invalidated")) {
            console.log("Context invalidated (recovering...).");
            window.qlickerWatcherRunning = false; // Allow re-initialization
        } else {
            console.error("Qlicker Automator Error:", error);
        }
    }
}

function checkAndAct() {
    const dashboardUrl = "https://qlicker.queensu.ca/student";
    const now = Date.now();
    const isClassActive = sessionStorage.getItem('qlickerClassActive') === 'true';
    const classEndTime = parseInt(sessionStorage.getItem('qlickerClassEndTime') || '0');
    const nextDashboardCheck = parseInt(sessionStorage.getItem('qlickerNextDashboardCheck') || '0');

    if (isClassActive && now > classEndTime) {
        console.log("LECTURE ENDED (1-hour timer). Returning to dashboard.");
        sessionStorage.clear();
        window.location.href = dashboardUrl;
        return;
    }

    if (nextDashboardCheck > 0 && now > nextDashboardCheck) {
        console.log("10-minute check. Returning to dashboard.");
        sessionStorage.removeItem('qlickerNextDashboardCheck');
        window.location.href = dashboardUrl;
        return;
    }

    const answerBlock = document.querySelector('.ql-answers');
    const submitButton = answerBlock?.querySelector('button.submit-button');

    if (answerBlock && submitButton) {
        if (nextDashboardCheck > 0) sessionStorage.removeItem('qlickerNextDashboardCheck');
        
        const buttonText = submitButton.textContent.trim().toLowerCase();
        
        if (buttonText === 'submit') {
            if (submitButton.disabled) {
                console.log("Question detected. Selecting 'A'...");
                const firstAnswer = answerBlock.querySelector('.ql-answer-content-container:first-child');
                firstAnswer?.click();
            } else {
                console.log("Submitting answer...");
                submitButton.click();
                console.log("Setting 10-minute timer for re-sync.");
                sessionStorage.setItem('qlickerNextDashboardCheck', (now + 600000).toString());
            }
        }
    } 
    else {
        const liveStatus = document.querySelector('.ql-session-status.ql-running');
        
        if (liveStatus) {
            if (!isClassActive) {
                console.log("New LIVE session found. Entering and starting 1-hour timer...");
                sessionStorage.setItem('qlickerClassActive', 'true');
                sessionStorage.setItem('qlickerClassEndTime', (now + 3600000).toString());
            } else {
                console.log("State is active, but on dashboard. Re-entering LIVE session...");
            }

            const liveBox = liveStatus.closest('.ql-session-list-item');
            if (liveBox) {
                sessionStorage.removeItem('qlickerNextDashboardCheck');
                liveBox.click();
            }
        }
    }
}