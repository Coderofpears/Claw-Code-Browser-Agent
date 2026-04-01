// src/background/stateManager.js — Extension state management

const DEFAULT_STATE = {
  goal: null,
  autonomousMode: false,
  running: false,
  processing: false,
  actionCount: 0,
  maxActions: 50,
  consecutiveErrors: 0,
  maxConsecutiveErrors: 5,
  completedActions: [],
  actionLog: [],
  lastSnapshot: null,
  apiKey: null,
  model: 'gpt-4o',
  provider: 'openai',
};

export class StateManager {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['apiKey', 'model', 'provider', 'maxActions']);
      if (result.apiKey) this.state.apiKey = result.apiKey;
      if (result.model) this.state.model = result.model;
      if (result.provider) this.state.provider = result.provider;
      if (result.maxActions) this.state.maxActions = result.maxActions;
    } catch {
      // Storage not available
    }
  }

  async saveToStorage(keys) {
    try {
      await chrome.storage.local.set(keys);
    } catch {
      // Storage not available
    }
  }

  setGoal(goal) {
    this.state.goal = goal;
    this.state.running = true;
    this.state.actionCount = 0;
    this.state.consecutiveErrors = 0;
    this.state.completedActions = [];
  }

  getGoal() {
    return this.state.goal;
  }

  setAutonomousMode(mode) {
    this.state.autonomousMode = mode;
  }

  getAutonomousMode() {
    return this.state.autonomousMode;
  }

  setRunning(running) {
    this.state.running = running;
  }

  getRunning() {
    return this.state.running;
  }

  setProcessing(processing) {
    this.state.processing = processing;
  }

  getProcessing() {
    return this.state.processing;
  }

  setLastSnapshot(snapshot) {
    this.state.lastSnapshot = snapshot;
  }

  getLastSnapshot() {
    return this.state.lastSnapshot;
  }

  addCompletedAction(action) {
    this.state.actionCount++;
    this.state.completedActions.push(action);
    this.state.actionLog.push({
      ...action,
      index: this.state.actionCount,
      timestamp: new Date().toISOString(),
    });
  }

  getActionCount() {
    return this.state.actionCount;
  }

  getMaxActions() {
    return this.state.maxActions;
  }

  getConsecutiveErrors() {
    return this.state.consecutiveErrors;
  }

  incrementConsecutiveErrors() {
    this.state.consecutiveErrors++;
  }

  resetConsecutiveErrors() {
    this.state.consecutiveErrors = 0;
  }

  async resetActionCounter() {
    this.state.actionCount = 0;
    this.state.consecutiveErrors = 0;
    this.state.completedActions = [];
  }

  getApiKey() {
    return this.state.apiKey;
  }

  getModel() {
    return this.state.model;
  }

  async setApiKey(apiKey) {
    this.state.apiKey = apiKey;
    await this.saveToStorage({ apiKey });
  }

  async setModel(model) {
    this.state.model = model;
    await this.saveToStorage({ model });
  }

  async setProvider(provider) {
    this.state.provider = provider;
    await this.saveToStorage({ provider });
  }

  getFullState() {
    return {
      goal: this.state.goal,
      autonomousMode: this.state.autonomousMode,
      running: this.state.running,
      processing: this.state.processing,
      actionCount: this.state.actionCount,
      maxActions: this.state.maxActions,
      consecutiveErrors: this.state.consecutiveErrors,
      completedActions: this.state.completedActions.slice(-20),
      apiKey: this.state.apiKey ? '****' + this.state.apiKey.slice(-4) : null,
      model: this.state.model,
      provider: this.state.provider,
    };
  }
}
