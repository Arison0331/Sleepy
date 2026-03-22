const STORAGE_KEY_STATUS = "lastSleepAction";
const STORAGE_KEY_TAB_ACTIVITY = "tabActivity";
const ALARM_NAME_CHECK_ACTIVITY = "checkActivity";

function logAction(action) {
  const payload = {
    action,
    timestamp: Date.now()
  };
  chrome.storage.local.set({ [STORAGE_KEY_STATUS]: payload });
}

function sleepTab(tabId) {
  if (!tabId) {
    return Promise.resolve();
  }
  return chrome.tabs.discard(tabId).catch((err) => {
    console.error("Failed to discard tab", tabId, err);
  });
}

async function pickNextTab(windowId, currentIndex, skipId) {
  const tabs = await chrome.tabs.query({ windowId });
  const sorted = tabs.sort((a, b) => a.index - b.index);
  const after = sorted.find(
    (t) => t.index > currentIndex && t.id !== skipId && !t.discarded
  );
  if (after) {
    return after;
  }
  return sorted.find((t) => t.id !== skipId && !t.discarded);
}

async function sleepActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && !tab.discarded) {
    const nextTab = await pickNextTab(tab.windowId, tab.index, tab.id);
    if (nextTab) {
      await chrome.tabs.update(nextTab.id, { active: true });
    }
    await sleepTab(tab.id);
    logAction(
      `Slept active tab: ${tab.title}${nextTab ? " → switched to another tab" : ""}`
    );
  } else {
    logAction("No active tab available to sleep");
  }
}

async function sleepInactiveTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const candidates = tabs.filter(
    (t) => !t.active && !t.discarded
  );
  await Promise.all(candidates.map((t) => sleepTab(t.id)));
  logAction(`Slept ${candidates.length} inactive tabs`);
}

// Auto discard logic
async function updateTabActivity(tabId) {
  const activity = {};
  activity[tabId] = Date.now();
  
  // Clean up old entries and save new one
  const data = await chrome.storage.local.get(STORAGE_KEY_TAB_ACTIVITY);
  const currentActivity = data[STORAGE_KEY_TAB_ACTIVITY] || {};
  
  // Verify tabs still exist
  const tabs = await chrome.tabs.query({});
  const validTabIds = new Set(tabs.map(t => t.id.toString()));
  
  const newActivity = {};
  for (const [id, time] of Object.entries(currentActivity)) {
    if (validTabIds.has(id)) {
      newActivity[id] = time;
    }
  }
  
  newActivity[tabId] = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY_TAB_ACTIVITY]: newActivity });
}

async function checkAndDiscardTabs() {
  const settingsData = await chrome.storage.local.get("settings");
  const settings = settingsData.settings || {};
  
  const autoDiscard = settings.autoDiscard;
  const autoDelete = settings.autoDelete;
  
  if (!autoDiscard && !autoDelete) {
    return;
  }
  
  // discardTime is now in minutes (5 to 720)
  // Default to 6 hours (360 minutes) if not set
  const discardTimeMinutes = settings.discardTime || 360;
  const discardTimeMs = discardTimeMinutes * 60 * 1000;
  
  // deleteTime is in hours (1 to 48)
  // Default to 20 hours if not set
  const deleteTimeHours = settings.deleteTime || 20;
  const deleteTimeMs = deleteTimeHours * 60 * 60 * 1000;
  
  const activityData = await chrome.storage.local.get(STORAGE_KEY_TAB_ACTIVITY);
  const activity = activityData[STORAGE_KEY_TAB_ACTIVITY] || {};
  const now = Date.now();
  
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.active || tab.audible) {
      continue;
    }
    
    // Check if media playing should prevent discard/delete
    if (settings.discardMediaConfirm && tab.audible) {
      continue;
    }

    const lastActive = activity[tab.id];
    if (!lastActive) continue;
    
    const inactiveDuration = now - lastActive;

    // Check for auto-delete first (must be unpinned)
    if (autoDelete && !tab.pinned && inactiveDuration > deleteTimeMs) {
      await chrome.tabs.remove(tab.id);
      console.log(`Auto deleted tab: ${tab.title} (inactive for >${deleteTimeHours} h)`);
      continue; // Skip discard check if deleted
    }

    // Check for auto-discard
    if (autoDiscard && !tab.discarded && inactiveDuration > discardTimeMs) {
      await sleepTab(tab.id);
      console.log(`Auto discarded tab: ${tab.title} (inactive for >${discardTimeMinutes} min)`);
    }
  }
}

let pendingConfirmTabId = null;

function handleCommand(command) {
  if (command === "sleep-active-tab") {
    handleSleepActiveWithConfirm();
  } else if (command === "sleep-all-inactive") {
    sleepInactiveTabs();
  }
}

async function handleSleepActiveWithConfirm() {
  const settingsData = await chrome.storage.local.get("settings");
  const settings = settingsData.settings || {};

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (settings.discardMediaConfirm && tab.audible) {
    pendingConfirmTabId = tab.id;
    try {
      chrome.tabs.sendMessage(tab.id, {
          type: 'show-confirm-dialog',
          title: settings.language === 'zh' ? 'Sleepy 提示' : 'Sleepy',
          message: settings.language === 'zh' ? '当前页面正在播放媒体，确定要释放它的内存吗？' : 'This page is playing media. Are you sure you want to free up its memory?'
        }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore the expected error when content script is not yet injected
          const _ = chrome.runtime.lastError.message;
          // If content script is not loaded, try to inject it dynamically
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-script.js']
          }).then(() => {
            // Retry sending message after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                  type: 'show-confirm-dialog',
                  title: settings.language === 'zh' ? 'Sleepy 提示' : 'Sleepy',
                  message: settings.language === 'zh' ? '当前页面正在播放媒体，确定要释放它的内存吗？' : 'This page is playing media. Are you sure you want to free up its memory?'
                });
            }, 100);
          }).catch(err => console.log("Failed to inject script:", err));
        }
      });
    } catch (e) {
      console.log("Error sending message to tab:", e);
    }
  } else {
    sleepActiveTab();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message?.type === "sleep-active-with-confirm") {
      handleSleepActiveWithConfirm();
      sendResponse({ status: "ok" });
      return true;
    }
    if (message?.type === "sleep-active") {
      sleepActiveTab().then(() => sendResponse({ status: "ok" }));
      return true;
    }
    if (message?.type === "sleep-inactive") {
      sleepInactiveTabs().then(() => sendResponse({ status: "ok" }));
      return true;
    }
    if (message?.type === "settings-updated") {
      checkAndDiscardTabs().then(() => sendResponse({ status: "ok" }));
      return true;
    }
    if (message?.type === "confirm-yes" && pendingConfirmTabId !== null) {
      const tabIdToSleep = pendingConfirmTabId;
      pendingConfirmTabId = null;
      
      // Get tab info to find next tab to switch to
      chrome.tabs.get(tabIdToSleep).then(async (tab) => {
        if (tab && !tab.discarded) {
          const nextTab = await pickNextTab(tab.windowId, tab.index, tab.id);
          if (nextTab) {
            await chrome.tabs.update(nextTab.id, { active: true });
          }
          await sleepTab(tab.id);
          logAction(
            `Slept active tab (confirmed): ${tab.title}${nextTab ? " → switched to another tab" : ""}`
          );
        }
      });
      
      sendResponse({ status: "ok" });
      return true;
    }
    if (message?.type === "confirm-no") {
      pendingConfirmTabId = null;
      sendResponse({ status: "cancelled" });
      return true;
    }
  } catch (e) {
    console.error('Error handling message:', e);
  }
  return false;
});

chrome.commands.onCommand.addListener(handleCommand);

// Activity tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTabActivity(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    await updateTabActivity(tabId);
  }
});

// Alarm for periodic check
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME_CHECK_ACTIVITY) {
    checkAndDiscardTabs();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  logAction("Extension installed");
  // Initialize activity tracking for current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      updateTabActivity(tabs[0].id);
    }
  });
  
  // Set up alarm
  chrome.alarms.create(ALARM_NAME_CHECK_ACTIVITY, {
    periodInMinutes: 1
  });
});
