let confirmCallback = null;

function createConfirmModal(title, message, onConfirm, onCancel) {
  const existingModal = document.getElementById('sleepy-confirm-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'sleepy-confirm-modal';
  overlay.innerHTML = `
    <div class="sleepy-modal-content">
      <div class="sleepy-modal-header">
        <span class="sleepy-modal-icon">💤</span>
        <span class="sleepy-modal-title">${title}</span>
      </div>
      <p class="sleepy-modal-message">${message}</p>
      <div class="sleepy-modal-buttons">
        <button class="sleepy-btn-cancel">Cancel</button>
        <button class="sleepy-btn-confirm">Confirm</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #sleepy-confirm-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      animation: sleepy-fadeIn 0.15s ease;
    }
    @keyframes sleepy-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sleepy-slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .sleepy-modal-content {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 20px;
      width: 280px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: sleepy-slideUp 0.15s ease;
    }
    .sleepy-modal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .sleepy-modal-icon {
      font-size: 20px;
    }
    .sleepy-modal-title {
      font-size: 16px;
      font-weight: 600;
      color: #636467;
    }
    .sleepy-modal-message {
      font-size: 14px;
      color: #636467;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }
    .sleepy-modal-buttons {
      display: flex;
      gap: 12px;
    }
    .sleepy-btn-cancel,
    .sleepy-btn-confirm {
      flex: 1;
      height: 36px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .sleepy-btn-cancel {
      background: #F6F8FA;
      color: #636467;
      border: 1px solid #DDE2E9;
    }
    .sleepy-btn-cancel:hover {
      background: #EAEDF1;
    }
    .sleepy-btn-cancel:active {
      background: #DDE2E9;
    }
    .sleepy-btn-confirm {
      background: linear-gradient(180deg, #F4F4F4 0%, #FEFEFE 100%);
      border: 3px solid transparent;
      background-origin: border-box;
      background-clip: padding-box, border-box;
      box-shadow: 0 0 0.225px 0.225px rgba(0, 0, 0, 0.07), 0 0 0.225px 0.675px rgba(0, 0, 0, 0.05), 0 2.698px 2.923px -1.349px rgba(0, 0, 0, 0.25), 0 0.899px 3.598px 0.899px rgba(0, 0, 0, 0.12), 0 0 0 4px #F2F2F2;
      color: #636467;
    }
    .sleepy-btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 0.225px 0.225px rgba(0, 0, 0, 0.07), 0 0 0.225px 0.675px rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 0.899px 3.598px 0.899px rgba(0, 0, 0, 0.12), 0 0 0 4px #F2F2F2;
    }
    .sleepy-btn-confirm:active {
      transform: translateY(0);
      box-shadow: 0 0 0.225px 0.225px rgba(0, 0, 0, 0.07), 0 0 0.225px 0.675px rgba(0, 0, 0, 0.05), 0 1px 2px -0.5px rgba(0, 0, 0, 0.15), 0 0.899px 3.598px 0.899px rgba(0, 0, 0, 0.08), 0 0 0 4px #F2F2F2;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const cancelBtn = overlay.querySelector('.sleepy-btn-cancel');
  const confirmBtn = overlay.querySelector('.sleepy-btn-confirm');

  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });

  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'show-confirm-dialog') {
    const confirmed = window.confirm(message.message || 'Are you sure?');
    try {
      if (confirmed) {
        chrome.runtime.sendMessage({ type: 'confirm-yes' });
      } else {
        chrome.runtime.sendMessage({ type: 'confirm-no' });
      }
    } catch (e) {
      console.log('Could not send confirmation response:', e.message);
    }
    sendResponse({ received: true });
    return true;
  }
});
