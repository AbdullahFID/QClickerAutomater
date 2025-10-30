// popup.js
// ═══════════════════════════════════════════════════════════════
// QLICKER AUTOMATOR - POPUP CONTROLLER
// Modern UI with smooth state management and animations
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // ───────────────────────────────────────────────────────────
    // DOM ELEMENT REFERENCES
    // ───────────────────────────────────────────────────────────
    const toggleSwitch = document.getElementById('toggle-switch');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');

    // ───────────────────────────────────────────────────────────
    // INITIALIZATION: Load saved state from Chrome storage
    // ───────────────────────────────────────────────────────────
    chrome.storage.sync.get('extensionEnabled', ({ extensionEnabled }) => {
        // Default to false if no previous state exists
        const isEnabled = extensionEnabled ?? false;
        updateUI(isEnabled, false); // false = skip animation on initial load
    });

    // ───────────────────────────────────────────────────────────
    // EVENT LISTENER: Toggle switch click handler
    // ───────────────────────────────────────────────────────────
    toggleSwitch.addEventListener('click', () => {
        // Add click ripple effect
        toggleSwitch.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggleSwitch.style.transform = 'scale(1)';
        }, 150);

        // Fetch current state, flip it, and persist
        chrome.storage.sync.get('extensionEnabled', ({ extensionEnabled }) => {
            const newState = !extensionEnabled;
            
            chrome.storage.sync.set({ extensionEnabled: newState }, () => {
                updateUI(newState, true); // true = animate the transition
            });
        });
    });

    // ───────────────────────────────────────────────────────────
    // UI UPDATE FUNCTION
    // Updates all visual elements based on automation state
    // @param {boolean} isEnabled - Whether automation is active
    // @param {boolean} animate - Whether to animate the transition
    // ───────────────────────────────────────────────────────────
    function updateUI(isEnabled, animate) {
        if (isEnabled) {
            // ━━━ ENABLED STATE ━━━
            toggleSwitch.classList.add('active');
            statusIndicator.classList.add('active');
            statusIndicator.classList.remove('inactive');
            
            // Animate status text change
            if (animate) {
                statusText.style.opacity = '0';
                statusText.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    statusText.textContent = '🚀 Running';
                    statusText.style.opacity = '1';
                    statusText.style.transform = 'translateY(0)';
                }, 150);
            } else {
                statusText.textContent = '🚀 Running';
            }
            
            statusText.style.color = '#10b981';
            
        } else {
            // ━━━ DISABLED STATE ━━━
            toggleSwitch.classList.remove('active');
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            
            // Animate status text change
            if (animate) {
                statusText.style.opacity = '0';
                statusText.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    statusText.textContent = '⏸️ Disabled';
                    statusText.style.opacity = '1';
                    statusText.style.transform = 'translateY(0)';
                }, 150);
            } else {
                statusText.textContent = '⏸️ Disabled';
            }
            
            statusText.style.color = '#9ca3af';
        }

        // Apply smooth transition to status text
        statusText.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
});