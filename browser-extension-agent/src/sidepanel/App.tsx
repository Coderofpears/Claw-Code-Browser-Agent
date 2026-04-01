import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import ActionLog from './components/ActionLog';
import SettingsPanel from './components/SettingsPanel';

const MESSAGE_TYPES = {
  GOAL: 'goal',
  RESPONSE: 'response',
  ACTION: 'action',
  ERROR: 'error',
  SYSTEM: 'system',
};

function App() {
  const [messages, setMessages] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [settings, setSettings] = useState({
    apiKey: '',
    model: 'gpt-4o',
    provider: 'openai',
  });
  const [showSettings, setShowSettings] = useState(false);

  const portRef = useRef(null);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'sidepanel' });
    portRef.current = port;

    port.onMessage.addListener((message) => {
      const { type, data } = message;
      handleBackgroundMessage(type, data);
    });

    port.postMessage({ type: 'GET_STATE' });

    return () => port.disconnect();
  }, []);

  const handleBackgroundMessage = useCallback((type, data) => {
    switch (type) {
      case 'STATE_UPDATE':
        setSettings((prev) => ({
          ...prev,
          model: data.model || prev.model,
          provider: data.provider || prev.provider,
        }));
        setAutonomousMode(data.autonomousMode);
        setIsRunning(data.running);
        setIsProcessing(data.processing);
        if (data.completedActions?.length) {
          setActionLog(data.completedActions);
        }
        break;

      case 'GOAL_SET':
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.SYSTEM, content: `Goal set: "${data.goal}"`, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'AGENT_THINKING':
        setIsProcessing(true);
        break;

      case 'AGENT_WAITING':
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.SYSTEM, content: `Waiting: ${data.reason}`, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'ACTION_QUEUED':
        setActionLog((prev) => [
          ...prev,
          { type: data.type, status: 'queued', element: data.elementId, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'ACTION_COMPLETED':
        setActionLog((prev) => {
          const updated = [...prev];
          const lastQueued = [...updated].reverse().find((a) => a.status === 'queued');
          if (lastQueued) {
            lastQueued.status = data.success ? 'success' : 'error';
            lastQueued.error = data.error;
          }
          return updated;
        });
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            { type: MESSAGE_TYPES.ACTION, content: `Executed: ${data.type} on "${data.element}"`, timestamp: new Date().toISOString() },
          ]);
        }
        break;

      case 'GOAL_COMPLETE':
        setIsRunning(false);
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.RESPONSE, content: data.summary, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'AGENT_STOPPED':
        setIsRunning(false);
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.SYSTEM, content: 'Agent stopped.', timestamp: new Date().toISOString() },
        ]);
        break;

      case 'MAX_ACTIONS_REACHED':
        setIsRunning(false);
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.SYSTEM, content: `Maximum actions reached (${data.count}). Agent stopped.`, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'ERROR_LIMIT_REACHED':
        setIsRunning(false);
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.ERROR, content: `Too many consecutive errors (${data.count}). Agent stopped.`, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'ERROR':
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.ERROR, content: data.message, timestamp: new Date().toISOString() },
        ]);
        break;

      case 'TAB_READY':
        setMessages((prev) => [
          ...prev,
          { type: MESSAGE_TYPES.SYSTEM, content: `Connected to tab: ${data.url}`, timestamp: new Date().toISOString() },
        ]);
        break;
    }
  }, []);

  const sendToBackground = (type, payload) => {
    if (portRef.current) {
      portRef.current.postMessage({ type, payload });
    }
  };

  const handleSetGoal = (goal) => {
    setMessages((prev) => [
      ...prev,
      { type: MESSAGE_TYPES.GOAL, content: goal, timestamp: new Date().toISOString() },
    ]);
    sendToBackground('SET_GOAL', goal);
  };

  const handleToggleAutonomous = (enabled) => {
    setAutonomousMode(enabled);
    sendToBackground('TOGGLE_AUTONOMOUS', enabled);
  };

  const handleStop = () => {
    sendToBackground('STOP');
  };

  const handleSettingsSave = (newSettings) => {
    setSettings(newSettings);
    sendToBackground('SET_API_KEY', newSettings.apiKey);
    sendToBackground('SET_MODEL', newSettings.model);
    sendToBackground('SET_PROVIDER', newSettings.provider);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--codex-bg-primary)] text-[var(--codex-text-primary)]">
      {/* Header - Claude-style minimal top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--codex-border)] bg-[var(--codex-bg-secondary)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${isRunning ? 'bg-[var(--codex-success)] animate-pulse' : 'bg-[var(--codex-text-muted)]'}`} />
            <h1 className="text-sm font-medium text-[var(--codex-text-primary)] tracking-tight">Autonomous Agent</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Model selector pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border)]">
            <span className="text-[10px] text-[var(--codex-text-secondary)] font-medium uppercase tracking-wider">{settings.provider}</span>
            <span className="text-[10px] text-[var(--codex-text-muted)]">/</span>
            <span className="text-[10px] text-[var(--codex-text-primary)] font-mono">{settings.model}</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg hover:bg-[var(--codex-bg-hover)] transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4 text-[var(--codex-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Panel - slides down */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Tab Navigation - Claude-style subtle tabs */}
      <nav className="flex border-b border-[var(--codex-border)] bg-[var(--codex-bg-secondary)] px-2">
        {[
          { id: 'chat', label: 'Chat', icon: '💬' },
          { id: 'actions', label: 'Actions', icon: '⚡', count: actionLog.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-[var(--codex-accent)] border-[var(--codex-accent)]'
                : 'text-[var(--codex-text-muted)] border-transparent hover:text-[var(--codex-text-secondary)]'
            }`}
          >
            <span className="text-[10px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--codex-bg-tertiary)] text-[var(--codex-text-muted)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatPanel
            messages={messages}
            isProcessing={isProcessing}
            onSetGoal={handleSetGoal}
          />
        ) : (
          <ActionLog actions={actionLog} />
        )}
      </div>

      {/* Footer Controls - Claude-style bottom bar */}
      <footer className="px-4 py-2.5 border-t border-[var(--codex-border)] bg-[var(--codex-bg-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Autonomous Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={autonomousMode}
                  onChange={(e) => handleToggleAutonomous(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${autonomousMode ? 'bg-[var(--codex-accent)]' : 'bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border-light)]'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm ${autonomousMode ? 'translate-x-4' : ''}`} />
                </div>
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${autonomousMode ? 'text-[var(--codex-accent)]' : 'text-[var(--codex-text-muted)] group-hover:text-[var(--codex-text-secondary)]'}`}>
                Autonomous
              </span>
            </label>
          </div>
          {isRunning && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--codex-error)] bg-[var(--codex-error-subtle)] rounded-lg hover:bg-[var(--codex-error)]/20 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
