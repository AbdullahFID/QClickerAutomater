(function() {
    'use strict';
// content.js (Version 21 - FIXED - No Duplicate Functions)

let cachedEnabledState = true;
let lastStorageCheck = 0;
const STORAGE_CHECK_INTERVAL = 5000;

const currentUrl = window.location.href;
const watcherKey = `qlickerWatcher_${currentUrl.split('?')[0]}`;

if (window[watcherKey]) {
    console.log(`⚠️ Watcher already running for this URL`);
} else {
    window[watcherKey] = true;
    console.log("✅ Qlicker Automator: Smart Multi-Session Watcher initialized.");
    console.log(`📍 Monitoring URL: ${currentUrl}`);
    
    setTimeout(() => {
        console.log("🚀 Starting automation checks...");
        
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && changes.extensionEnabled) {
                cachedEnabledState = changes.extensionEnabled.newValue;
                console.log(`Automator state: ${cachedEnabledState ? 'ENABLED' : 'DISABLED'}`);
            }
        });
        
        chrome.storage.sync.get({ extensionEnabled: true }).then(({ extensionEnabled }) => {
            cachedEnabledState = extensionEnabled;
        });
        
        setInterval(runAutomation, 1500);
        
        setInterval(() => {
            if (!cachedEnabledState) return;
            const isClassActive = sessionStorage.getItem('qlickerClassActive') === 'true';
            const dashboardUrl = "https://qlicker.queensu.ca/student";
            if (isClassActive && window.location.href !== dashboardUrl) {
                console.log("⏰ 10-minute sync.");
                window.location.href = dashboardUrl;
            }
        }, 600000);
        
    }, 2000);
}

async function runAutomation() {
    try {
        const now = Date.now();
        
        if (now - lastStorageCheck > STORAGE_CHECK_INTERVAL) {
            const { extensionEnabled } = await chrome.storage.sync.get({ extensionEnabled: true });
            cachedEnabledState = extensionEnabled;
            lastStorageCheck = now;
            
            // If just disabled (sleep mode), clear local state
            if (!extensionEnabled) {
                const wasActive = sessionStorage.getItem('qlickerClassActive');
                if (wasActive) {
                    console.log("💤 Extension disabled. Clearing state...");
                    sessionStorage.clear();
                }
            }
        }
        
        if (!cachedEnabledState) {
            return;
        }
        
        checkAndAct();
    } catch (error) {
        if (error.message.includes("Extension context invalidated")) {
            console.log("⚠️ Context invalidated.");
            delete window[watcherKey];
        } else {
            console.error("❌ Error:", error);
        }
    }
}

function checkAndAct() {
    const dashboardUrl = "https://qlicker.queensu.ca/student";
    const now = Date.now();
    
    const isClassActive = sessionStorage.getItem('qlickerClassActive') === 'true';
    const classEndTime = parseInt(sessionStorage.getItem('qlickerClassEndTime') || '0');
    const sessionEntryTime = parseInt(sessionStorage.getItem('qlickerSessionEntryTime') || '0');
    const lastActiveSession = sessionStorage.getItem('qlickerLastActiveSession') || '';
    const lastActiveTime = parseInt(sessionStorage.getItem('qlickerLastActiveTime') || '0');
    const waitingForRetry = sessionStorage.getItem('qlickerWaitingForRetry') === 'true';
    const retryTime = parseInt(sessionStorage.getItem('qlickerRetryTime') || '0');

    if (isClassActive && now > classEndTime) {
        console.log("⏱️ 1-hour timer expired.");
        sessionStorage.clear();
        if (window.location.href !== dashboardUrl) {
            window.location.href = dashboardUrl;
        }
        return;
    }

    if (waitingForRetry) {
        if (now < retryTime) {
            return;
        } else {
            console.log("🔄 Cooldown complete.");
            sessionStorage.removeItem('qlickerWaitingForRetry');
            sessionStorage.removeItem('qlickerRetryTime');
            window.location.href = dashboardUrl;
            return;
        }
    }

    const answeringDisabled = document.querySelector('.ql-subs-loading');
    if (answeringDisabled && answeringDisabled.textContent.includes('Answering Disabled')) {
        console.log("🚫 ANSWERING DISABLED detected!");
        
        const currentCourse = document.querySelector('.ql-course-code')?.textContent.trim() || 'unknown';
        const currentSession = document.querySelector('.ql-session-name')?.textContent.trim() || 'unknown';
        const sessionId = `${currentCourse}|${currentSession}`;
        
        const submittedList = sessionStorage.getItem('qlickerSubmittedSessions') || '';
        if (!submittedList.includes(sessionId)) {
            const newList = submittedList ? `${submittedList}|${sessionId}` : sessionId;
            sessionStorage.setItem('qlickerSubmittedSessions', newList);
            console.log(`📝 Marked "${sessionId}" as disabled/stale`);
        }
        
        console.log("🔙 Returning to dashboard...");
        window.location.href = dashboardUrl;
        return;
    }

    const answerBlock = document.querySelector('.ql-answers');
    
    let submitButton = null;
    if (answerBlock) {
        submitButton = document.querySelector('button.submit-button') || 
                      document.querySelector('.submit-button') ||
                      document.querySelector('.bottom-buttons button');
    }

    if (answerBlock && submitButton) {
        const buttonText = submitButton.textContent.trim().toLowerCase();
        const timeSinceEntry = sessionEntryTime > 0 ? now - sessionEntryTime : 0;
        
        console.log(`\n🔍 IN SESSION`);
        console.log(`   Button: "${buttonText}"`);
        console.log(`   Time since entry: ${Math.round(timeSinceEntry/1000)}s`);
        
        if (buttonText === 'submit') {
            if (submitButton.disabled) {
                console.log("❓ Question detected. Selecting 'A'...");
                const firstAnswer = answerBlock.querySelector('.ql-answer-content-container:first-child');
                firstAnswer?.click();
            } else {
                console.log("✅ Submitting answer...");
                submitButton.click();
                
                const currentCourse = document.querySelector('.ql-course-code')?.textContent.trim() || 'unknown';
                const currentSession = document.querySelector('.ql-session-name')?.textContent.trim() || 'unknown';
                const sessionId = `${currentCourse}|${currentSession}`;
                
                sessionStorage.setItem('qlickerLastActiveSession', sessionId);
                sessionStorage.setItem('qlickerLastActiveTime', now.toString());
                console.log(`📌 Marked "${sessionId}" as last active`);
            }
        } else if (buttonText === 'submitted') {
            if (timeSinceEntry < 15000) {
                console.log(`⚠️ STALE - Submitted ${Math.round(timeSinceEntry/1000)}s after entry!`);
                
                const currentCourse = document.querySelector('.ql-course-code')?.textContent.trim() || 'unknown';
                const currentSession = document.querySelector('.ql-session-name')?.textContent.trim() || 'unknown';
                const sessionId = `${currentCourse}|${currentSession}`;
                
                const submittedList = sessionStorage.getItem('qlickerSubmittedSessions') || '';
                if (!submittedList.includes(sessionId)) {
                    const newList = submittedList ? `${submittedList}|${sessionId}` : sessionId;
                    sessionStorage.setItem('qlickerSubmittedSessions', newList);
                    console.log(`📝 Marked "${sessionId}" as stale`);
                }
                
                console.log("🔙 Returning to dashboard IMMEDIATELY...");
                window.location.href = dashboardUrl;
                return;
            } else {
                console.log(`⏳ Waiting for new question (${Math.round(timeSinceEntry/1000)}s elapsed)...`);
            }
        }
    } 
    else {
        const liveSessions = document.querySelectorAll('.ql-session-status.ql-running');
        
        if (liveSessions.length === 0) {
            return;
        }
        
        console.log(`\n📡 DASHBOARD - Found ${liveSessions.length} live session(s)`);
        
        const submittedList = sessionStorage.getItem('qlickerSubmittedSessions') || '';
        console.log(`📋 Stale list: ${submittedList || '(none)'}`);
        console.log(`🎯 Last active: ${lastActiveSession || '(none)'} at ${lastActiveTime > 0 ? new Date(lastActiveTime).toLocaleTimeString() : '(never)'}`);
        
        const sessionOptions = [];
        
        for (let liveStatus of liveSessions) {
            const sessionItem = liveStatus.closest('.ql-session-list-item');
            if (!sessionItem) continue;
            
            const sessionName = sessionItem.querySelector('.ql-session-name')?.textContent.trim() || '';
            const courseItem = sessionItem.closest('.ql-student-course-component');
            const courseName = courseItem?.querySelector('.ql-course-code')?.textContent.trim() || '';
            
            const sessionId = `${courseName}|${sessionName}`;
            const isStale = submittedList.includes(sessionId);
            const isLastActive = sessionId === lastActiveSession;
            const recencyBonus = isLastActive && (now - lastActiveTime < 1800000);
            
            sessionOptions.push({
                element: sessionItem,
                id: sessionId,
                course: courseName,
                name: sessionName,
                isStale: isStale,
                isLastActive: isLastActive,
                priority: recencyBonus ? 100 : (isStale ? 0 : 50)
            });
            
            let status = '';
            if (recencyBonus) status = '🔥 PRIORITY (last active)';
            else if (isStale) status = '⏭️ (stale)';
            else status = '✨ (fresh)';
            
            console.log(`  ${courseName} - ${sessionName} ${status}`);
        }
        
        sessionOptions.sort((a, b) => b.priority - a.priority);
        
        let selectedSession = sessionOptions.find(s => s.priority > 0);
        
        if (selectedSession) {
            console.log(`\n🎯 SELECTING: ${selectedSession.course} - ${selectedSession.name}`);
            if (selectedSession.priority === 100) {
                console.log(`   Reason: Last active session (priority)`);
            } else {
                console.log(`   Reason: Fresh session`);
            }
        } else {
            console.log(`\n⚠️ All ${sessionOptions.length} session(s) are stale!`);
            console.log("⏱️ Starting 1-minute cooldown...");
            sessionStorage.setItem('qlickerWaitingForRetry', 'true');
            sessionStorage.setItem('qlickerRetryTime', (now + 60000).toString());
            sessionStorage.removeItem('qlickerSubmittedSessions');
            console.log("🗑️ Cleared stale list for next attempt");
            return;
        }
        
        if (selectedSession) {
            if (!isClassActive) {
                console.log("🚀 Starting 1-hour timer...");
                sessionStorage.setItem('qlickerClassActive', 'true');
                sessionStorage.setItem('qlickerClassEndTime', (now + 3600000).toString());
            }
            
            sessionStorage.setItem('qlickerSessionEntryTime', now.toString());
            console.log(`⏱️ Entry time: ${now}\n`);
            
            selectedSession.element.click();
        }
    }
}
})();