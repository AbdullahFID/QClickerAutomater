// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggle-switch');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');

    chrome.storage.sync.get('extensionEnabled', ({ extensionEnabled }) => {
        const isEnabled = extensionEnabled ?? true;
        updateUI(isEnabled, false); 
    });

    toggleSwitch.addEventListener('click', () => {
        toggleSwitch.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggleSwitch.style.transform = 'scale(1)';
        }, 150);

        chrome.storage.sync.get('extensionEnabled', ({ extensionEnabled }) => {
            const newState = !extensionEnabled;
            
            chrome.storage.sync.set({ extensionEnabled: newState }, () => {
                updateUI(newState, true);
            });
        });
    });

    function updateUI(isEnabled, animate) {
        if (isEnabled) {
            toggleSwitch.classList.add('active');
            statusIndicator.classList.add('active');
            statusIndicator.classList.remove('inactive');
            
            if (animate) {
                statusText.style.opacity = '0';
                statusText.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    statusText.textContent = '🚀 Active';
                    statusText.style.opacity = '1';
                    statusText.style.transform = 'translateY(0)';
                }, 150);
            } else {
                statusText.textContent = '🚀 Active';
            }
            
            statusText.style.color = '#10b981';
            
        } else {
            toggleSwitch.classList.remove('active');
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            
            if (animate) {
                statusText.style.opacity = '0';
                statusText.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    statusText.textContent = '💤 Sleeping';
                    statusText.style.opacity = '1';
                    statusText.style.transform = 'translateY(0)';
                }, 150);
            } else {
                statusText.textContent = '💤 Sleeping';
            }
            
            statusText.style.color = '#9ca3af';
        }

        statusText.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
});