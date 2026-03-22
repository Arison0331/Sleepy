const sleepActiveBtn = document.getElementById("sleep-active");
const openSettingsBtn = document.getElementById("open-settings");
const activeShortcutEl = document.getElementById("active-shortcut");

function sendSleepCommand(type) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({ type }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Message sent but background error:', chrome.runtime.lastError.message);
          return;
        }
        console.log('Command sent:', type, 'Response:', response);
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  } else {
    console.log("Mock command sent:", type);
  }
}

sleepActiveBtn.addEventListener("click", () => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('settings', (data) => {
      const settings = data.settings || {};
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.audible && settings.discardMediaConfirm) {
          // Instead of calling confirm() in popup context, tell background to handle it
          // the same way as the shortcut command (which injects/calls content-script)
          chrome.runtime.sendMessage({ type: "sleep-active-with-confirm" });
        } else {
          sendSleepCommand("sleep-active");
        }
      });
    });
  } else {
    sendSleepCommand("sleep-active");
  }
});

openSettingsBtn?.addEventListener("click", () => {
  window.location.href = "settings.html";
});

// Update shortcut tag dynamically
if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.getAll) {
  chrome.commands.getAll((commands) => {
    const activeCommand = commands.find(c => c.name === "sleep-active-tab");
    if (activeCommand && activeCommand.shortcut) {
      activeShortcutEl.textContent = activeCommand.shortcut;
    } else {
      activeShortcutEl.textContent = "Not set";
    }
  });
} else {
  activeShortcutEl.textContent = "⌘+Shift+S (Mock)";
}

// Apply language settings on load
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get('settings', (data) => {
    const lang = data.settings?.language || 'en';
    if (typeof window.applyLanguage === 'function') {
      window.applyLanguage(lang);
    }
  });
} else {
  // Mock environment language apply
  const mockDataStr = localStorage.getItem('sleepy_mock_settings');
  const mockData = mockDataStr ? JSON.parse(mockDataStr) : null;
  const lang = mockData?.settings?.language || 'en';
  if (typeof window.applyLanguage === 'function') {
    window.applyLanguage(lang);
  }
}
