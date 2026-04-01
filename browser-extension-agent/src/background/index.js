// src/background/index.js — Background Service Worker: LLM orchestration & message routing

import { LLMClient } from './llmClient.js';
import { ActionPlanner } from './actionPlanner.js';
import { StateManager } from './stateManager.js';

const state = new StateManager();
const llm = new LLMClient();
const planner = new ActionPlanner();

let sidepanelPort = null;
let contentPorts = new Map();

// Chrome MV3: use chrome.sidePanel API
if (typeof chrome?.sidePanel?.setPanelBehavior === 'function') {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof chrome?.sidePanel?.open === 'function') {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Listen for connections from sidepanel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidepanelPort = port;
    port.onMessage.addListener(handleSidepanelMessage);
    port.onDisconnect.addListener(() => {
      sidepanelPort = null;
    });
  }
});

// Listen for connections from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'content-script') {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      contentPorts.set(tabId, port);
      port.onMessage.addListener((msg) => handleContentMessage(msg, tabId));
      port.onDisconnect.addListener(() => {
        contentPorts.delete(tabId);
      });
    }
  }
});

// Handle messages from sidepanel UI
async function handleSidepanelMessage(message) {
  const { type, payload } = message;

  switch (type) {
    case 'SET_GOAL':
      await state.setGoal(payload);
      await state.resetActionCounter();
      broadcastToSidepanel('GOAL_SET', { goal: payload });
      if (state.getAutonomousMode()) {
        await executeAutonomousLoop();
      }
      break;

    case 'TOGGLE_AUTONOMOUS':
      state.setAutonomousMode(payload);
      broadcastToContent('SET_AUTONOMOUS_MODE', payload);
      broadcastToSidepanel('AUTONOMOUS_MODE_CHANGED', payload);
      if (payload && state.getGoal()) {
        await executeAutonomousLoop();
      }
      break;

    case 'EXECUTE_SINGLE_ACTION':
      await executeAction(payload);
      break;

    case 'GET_STATE':
      broadcastToSidepanel('STATE_UPDATE', state.getFullState());
      break;

    case 'SET_API_KEY':
      await state.setApiKey(payload);
      broadcastToSidepanel('API_KEY_SET', {});
      break;

    case 'SET_MODEL':
      await state.setModel(payload);
      break;

    case 'SET_PROVIDER':
      await state.setProvider(payload);
      llm.configure({
        provider: payload,
        apiKey: state.getApiKey(),
        model: state.getModel(),
      });
      break;

    case 'STOP':
      state.setRunning(false);
      broadcastToSidepanel('AGENT_STOPPED', {});
      break;
  }
}

// Handle messages from content scripts
async function handleContentMessage(message, tabId) {
  const { type, data } = message;

  switch (type) {
    case 'CONTENT_SCRIPT_READY':
      broadcastToSidepanel('TAB_READY', { tabId, url: data.url });
      break;

    case 'DOM_SNAPSHOT':
      state.setLastSnapshot(data);
      broadcastToSidepanel('DOM_SNAPSHOT_RECEIVED', {
        url: data.url,
        elementCount: data.elements.length,
        timestamp: data.timestamp,
      });

      if (state.getRunning() && state.getAutonomousMode()) {
        await processSnapshotWithLLM(data);
      }
      break;

    case 'ACTION_RESULT':
      state.addCompletedAction(data);
      broadcastToSidepanel('ACTION_COMPLETED', data);

      if (state.getRunning() && state.getAutonomousMode()) {
        await executeAutonomousLoop();
      }
      break;

    case 'AUTONOMOUS_MODE_CHANGED':
      state.setAutonomousMode(data);
      break;
  }
}

async function executeAutonomousLoop() {
  if (!state.getRunning()) return;

  const actionCount = state.getActionCount();
  if (actionCount >= state.getMaxActions()) {
    broadcastToSidepanel('MAX_ACTIONS_REACHED', { count: actionCount });
    state.setRunning(false);
    return;
  }

  const consecutiveErrors = state.getConsecutiveErrors();
  if (consecutiveErrors >= 5) {
    broadcastToSidepanel('ERROR_LIMIT_REACHED', { count: consecutiveErrors });
    state.setRunning(false);
    return;
  }

  await requestDOMSnapshot();
}

async function requestDOMSnapshot() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage(
          { source: 'agent-background', type: 'SERIALIZE_DOM' },
          '*'
        );
      },
    });
  } catch (error) {
    state.incrementConsecutiveErrors();
    broadcastToSidepanel('ERROR', { message: `Failed to inject script: ${error.message}` });
  }
}

async function processSnapshotWithLLM(snapshot) {
  const goal = state.getGoal();
  if (!goal) return;

  try {
    state.setProcessing(true);
    broadcastToSidepanel('AGENT_THINKING', {});

    const serializedElements = snapshot.elements.map((el) => ({
      id: el.id,
      tag: el.tag,
      text: el.text,
      type: el.type,
      isSensitive: el.isSensitive,
      ariaLabel: el.ariaLabel,
    }));

    const systemPrompt = `You are an autonomous browser agent. Given a user goal and the current page's interactive elements, return a JSON object with the next action to take.

Rules:
- Return ONLY valid JSON, no markdown or explanation
- Action types: "click", "type", "select", "hover", "scroll", "wait", "navigate"
- For "type" actions, include a "value" field
- For "click" actions, include the element "id"
- If the goal is complete, return {"action": "done", "summary": "brief summary of what was accomplished"}
- If no useful action is possible, return {"action": "wait", "reason": "explanation"}
- Never suggest actions on sensitive elements (purchase, delete, payment) without flagging requiresConfirmation: true`;

    const userPrompt = `Goal: ${goal}

Current URL: ${snapshot.url}
Page Title: ${snapshot.title}

Interactive elements (${serializedElements.length} total):
${JSON.stringify(serializedElements.slice(0, 100), null, 2)}`;

    const response = await llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const action = planner.parseResponse(response);

    if (action.action === 'done') {
      broadcastToSidepanel('GOAL_COMPLETE', { summary: action.summary });
      state.setRunning(false);
      return;
    }

    if (action.action === 'wait') {
      state.incrementConsecutiveErrors();
      broadcastToSidepanel('AGENT_WAITING', { reason: action.reason });
      state.setProcessing(false);
      return;
    }

    state.resetConsecutiveErrors();
    await executeAction(action);
  } catch (error) {
    state.incrementConsecutiveErrors();
    broadcastToSidepanel('ERROR', { message: `LLM error: ${error.message}` });
    state.setProcessing(false);
  }
}

async function executeAction(action) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    broadcastToSidepanel('ACTION_QUEUED', action);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (action) => {
        window.postMessage(
          { source: 'agent-background', type: 'EXECUTE_ACTION', payload: action },
          '*'
        );
      },
      args: [action],
    });
  } catch (error) {
    state.incrementConsecutiveErrors();
    broadcastToSidepanel('ERROR', { message: `Action execution failed: ${error.message}` });
  }
}

function broadcastToSidepanel(type, data) {
  if (sidepanelPort) {
    sidepanelPort.postMessage({ type, data });
  }
}

function broadcastToContent(type, data) {
  contentPorts.forEach((port, tabId) => {
    try {
      port.postMessage({ type, data });
    } catch {
      contentPorts.delete(tabId);
    }
  });
}
