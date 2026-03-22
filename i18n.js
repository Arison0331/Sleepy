const i18n = {
  en: {
    language: "Language",
    settings_title: "Setting",
    save: "Save",
    shortcut: "Shortcut",
    media_confirm: "When media is playing on the page, a second confirmation is required to free up memory",
    auto_discard: "Free up memory when tab is inactive for more than a certain time",
    auto_delete: "If it's been inactive for more than a certain time, delete the tab (Except for pinned tabs)",
    free_up: "Free up",
    not_set: "Not set",
    confirm_title: "Sleepy",
    confirm_message: "This page is playing media. Are you sure you want to free up its memory?",
    popup_desc: "One-click to free up the current tab memory usage"
  },
  zh: {
    language: "语言",
    settings_title: "设置",
    save: "保存",
    shortcut: "快捷键",
    media_confirm: "当页面有媒体播放时，需要二次确认才能释放内存",
    auto_discard: "当页签不活跃超过一定时间后，自动释放内存",
    auto_delete: "当页签释放内存超过一定时间后，自动删除页签（固定页签除外）",
    free_up: "释放",
    not_set: "未设置",
    confirm_title: "Sleepy 提示",
    confirm_message: "当前页面正在播放媒体，确定要释放它的内存吗？",
    popup_desc: "一键释放当前标签页内存"
  }
};

function applyLanguage(lang) {
  const texts = i18n[lang] || i18n.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) {
      if (el.tagName === 'INPUT' && el.type === 'button') {
        el.value = texts[key];
      } else {
        el.textContent = texts[key];
      }
    }
  });
  
  // Set html lang attribute
  document.documentElement.lang = lang;
}

// Export for other scripts if needed, or attach to window
window.i18n = i18n;
window.applyLanguage = applyLanguage;
