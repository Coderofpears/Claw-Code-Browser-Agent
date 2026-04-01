// src/content/index.js — Content Script: DOM serialization & action execution

const SENSITIVE_SELECTORS = [
  'button:contains("Purchase")',
  'button:contains("Buy")',
  'button:contains("Delete")',
  'button:contains("Remove")',
  'button:contains("Confirm")',
  'button:contains("Pay")',
  'input[type="password"]',
  'input[type="credit-card"]',
];

const SENSITIVE_KEYWORDS = ['purchase', 'buy', 'delete', 'remove', 'confirm', 'pay', 'checkout', 'submit payment'];

let actionLog = [];
let autonomousMode = false;
let actionCounter = 0;
const MAX_ACTIONS_PER_GOAL = 50;

function serializeDOM() {
  const elements = [];
  const interactive = document.querySelectorAll(
    'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"], [contenteditable="true"]'
  );

  interactive.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const isSensitive = isSensitiveElement(el);
    elements.push({
      id: index,
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      text: el.textContent?.trim().slice(0, 100) || '',
      placeholder: el.placeholder || '',
      value: el.value || '',
      href: el.href || null,
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      name: el.name || '',
      id: el.id || null,
      classes: el.className?.toString().slice(0, 100) || '',
      isSensitive,
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
  });

  return {
    url: window.location.href,
    title: document.title,
    elements,
    timestamp: Date.now(),
  };
}

function isSensitiveElement(el) {
  const text = (el.textContent || '').toLowerCase();
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  const name = (el.name || '').toLowerCase();
  const allText = `${text} ${ariaLabel} ${name}`;

  if (el.tagName === 'INPUT' && el.type === 'password') return true;

  return SENSITIVE_KEYWORDS.some((keyword) => allText.includes(keyword));
}

async function executeAction(action) {
  const { type, elementId, value, requiresConfirmation } = action;
  const element = document.querySelectorAll(
    'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"], [contenteditable="true"]'
  )[elementId];

  if (!element) {
    return { success: false, error: `Element with id ${elementId} not found` };
  }

  if (requiresConfirmation || isSensitiveElement(element)) {
    const confirmed = await requestHumanConfirmation(action, element);
    if (!confirmed) {
      return { success: false, error: 'Action rejected by user' };
    }
  }

  try {
    switch (type) {
      case 'click':
        element.click();
        break;
      case 'type':
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      case 'select':
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      case 'hover':
        element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        break;
      case 'scroll':
        window.scrollBy({ top: value || 300, behavior: 'smooth' });
        break;
      case 'wait':
        await new Promise((resolve) => setTimeout(resolve, value || 2000));
        break;
      case 'navigate':
        window.location.href = value;
        break;
      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }

    actionCounter++;
    const logEntry = {
      id: actionCounter,
      type,
      element: element.textContent?.trim().slice(0, 50) || element.tagName,
      timestamp: new Date().toISOString(),
      success: true,
    };
    actionLog.push(logEntry);
    notifyBackground('actionExecuted', logEntry);

    return { success: true, action: logEntry };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function requestHumanConfirmation(action, element) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'agent-confirmation-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white; padding: 24px; border-radius: 12px;
      max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    dialog.innerHTML = `
      <h3 style="margin: 0 0 12px; color: #dc2626;">⚠️ Sensitive Action Detected</h3>
      <p style="margin: 0 0 16px; color: #374151;">
        The agent wants to <strong>${action.type}</strong> on:
        <br><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 8px;">
          ${element.textContent?.trim().slice(0, 100) || element.tagName}
        </code>
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="agent-deny" style="padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">Deny</button>
        <button id="agent-allow" style="padding: 8px 16px; border: none; border-radius: 6px; background: #dc2626; color: white; cursor: pointer;">Allow</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('agent-allow').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    document.getElementById('agent-deny').onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}

function notifyBackground(type, data) {
  window.postMessage(
    { source: 'agent-content-script', type, data },
    '*'
  );
}

window.addEventListener('message', (event) => {
  if (event.data?.source !== 'agent-background') return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SERIALIZE_DOM':
      notifyBackground('DOM_SNAPSHOT', serializeDOM());
      break;
    case 'EXECUTE_ACTION':
      executeAction(payload).then((result) => {
        notifyBackground('ACTION_RESULT', result);
      });
      break;
    case 'SET_AUTONOMOUS_MODE':
      autonomousMode = payload;
      notifyBackground('AUTONOMOUS_MODE_CHANGED', autonomousMode);
      break;
    case 'RESET_ACTION_COUNTER':
      actionCounter = 0;
      actionLog = [];
      break;
  }
});

// Initial handshake
notifyBackground('CONTENT_SCRIPT_READY', { url: window.location.href });
