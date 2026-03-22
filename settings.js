document.getElementById('back-button').addEventListener('click', () => {
    window.location.href = 'popup.html';
});

document.getElementById('save-button').addEventListener('click', () => {
    const settings = {
        language: document.getElementById('lang-select').value,
        discardMediaConfirm: document.getElementById('discard-media').checked,
        autoDiscard: document.getElementById('auto-discard').checked,
        autoDelete: document.getElementById('auto-delete').checked,
        discardTime: parseInt(document.getElementById('discard-time').value, 10),
        deleteTime: parseInt(document.getElementById('delete-time').value, 10)
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ settings }, () => {
            console.log('Settings saved:', settings);
            window.location.href = 'popup.html';
        });
    } else {
        console.log('Settings saved (mock):', settings);
        // Use localStorage for mock environment so settings persist across reloads
        localStorage.setItem('sleepy_mock_settings', JSON.stringify({ settings }));
        window.location.href = 'popup.html';
    }
});

document.getElementById('shortcut-button').addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        // Find the extension ID dynamically
        const extensionId = chrome.runtime.id;
        chrome.tabs.create({ url: `chrome://extensions/shortcuts` });
        // It's not possible to directly link to a specific extension's shortcut on this page via URL hash/query in Chrome, 
        // but opening the page is the standard way.
    } else {
        console.log('Open shortcuts page (mock)');
        alert('This feature requires the extension environment.');
    }
});

// Load settings
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('settings', (data) => {
        applySettings(data);
    });
} else {
    // Default settings for preview, try loading from localStorage first
    console.log('Chrome storage not available, using mock storage');
    const mockDataStr = localStorage.getItem('sleepy_mock_settings');
    const mockData = mockDataStr ? JSON.parse(mockDataStr) : null;
    
    if (mockData && mockData.settings) {
        applySettings(mockData);
    } else {
        // Apply pure defaults if nothing in localStorage
        toggleSlider('auto-discard', 'discard-time');
        toggleSlider('auto-delete', 'delete-time');
        updateSliderText('discard-time', document.getElementById('discard-time').value);
        updateSliderText('delete-time', document.getElementById('delete-time').value);
    
        const discardTimeEl = document.getElementById('discard-time');
        const deleteTimeEl = document.getElementById('delete-time');
        if (discardTimeEl) updateSliderFill(discardTimeEl);
        if (deleteTimeEl) updateSliderFill(deleteTimeEl);
    }
}

function applySettings(data) {
    if (data.settings) {
        const s = data.settings;
        
        // Handle language
        const lang = s.language || 'en';
        document.getElementById('lang-select').value = lang;
        if (typeof window.applyLanguage === 'function') {
            window.applyLanguage(lang);
        }

        document.getElementById('discard-media').checked = !!s.discardMediaConfirm;
        document.getElementById('auto-discard').checked = !!s.autoDiscard;
        document.getElementById('auto-delete').checked = !!s.autoDelete;
        document.getElementById('discard-time').value = parseInt(s.discardTime, 10) || 360;
        document.getElementById('delete-time').value = parseInt(s.deleteTime, 10) || 20;

        updateSliderText('discard-time', s.discardTime);
        updateSliderText('delete-time', s.deleteTime);

        const discardTimeEl = document.getElementById('discard-time');
        const deleteTimeEl = document.getElementById('delete-time');
        if (discardTimeEl) updateSliderFill(discardTimeEl);
        if (deleteTimeEl) updateSliderFill(deleteTimeEl);
    }

    toggleSlider('auto-discard', 'discard-time');
    toggleSlider('auto-delete', 'delete-time');
}

function updateSliderText(id, value) {
    const slider = document.getElementById(id);
    const text = slider.parentElement.querySelector('.time-value');
    const val = parseInt(value, 10);
    
    if (id === 'discard-time') {
        // value is minutes
        const h = Math.floor(val / 60);
        const m = val % 60;
        
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        
        text.textContent = `${hh} h ${mm} min`;
    } else {
        // value is hours
        const h = val;
        const hh = h.toString().padStart(2, '0');
        
        text.textContent = `${hh} h`;
    }
}

function toggleSlider(checkboxId, sliderId) {
    const checkbox = document.getElementById(checkboxId);
    const slider = document.getElementById(sliderId);
    const sliderGroup = slider.parentElement;
    
    if (checkbox.checked) {
        sliderGroup.classList.remove('disabled');
        slider.disabled = false;
        slider.style.pointerEvents = 'auto'; // Restore pointer events
    } else {
        sliderGroup.classList.add('disabled');
        slider.disabled = true;
        slider.style.pointerEvents = 'none'; // Disable pointer events
    }
}

function updateSliderFill(el) {
    const val = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.background = `linear-gradient(to right, #EE6D9D ${val}%, #EAEDF1 ${val}%)`;
}

['discard-time', 'delete-time'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
        // Initialize fill
        updateSliderFill(el);
        
        el.addEventListener('input', (e) => {
            updateSliderText(id, e.target.value);
            updateSliderFill(e.target);
        });
    }
});

document.getElementById('auto-discard').addEventListener('change', () => {
    toggleSlider('auto-discard', 'discard-time');
});

document.getElementById('auto-delete').addEventListener('change', () => {
    toggleSlider('auto-delete', 'delete-time');
});

// Add language change listener for immediate preview
document.getElementById('lang-select').addEventListener('change', (e) => {
    if (typeof window.applyLanguage === 'function') {
        window.applyLanguage(e.target.value);
    }
});
