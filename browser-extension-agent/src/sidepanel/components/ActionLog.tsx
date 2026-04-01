import React from 'react';

interface Action {
  type: string;
  status: 'queued' | 'success' | 'error';
  element?: string | number;
  error?: string;
  timestamp: string;
}

interface ActionLogProps {
  actions: Action[];
}

const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  queued: { bg: 'bg-[var(--codex-warning)]/10', text: 'text-[var(--codex-warning)]', icon: '⏳' },
  success: { bg: 'bg-[var(--codex-success)]/10', text: 'text-[var(--codex-success)]', icon: '✓' },
  error: { bg: 'bg-[var(--codex-error)]/10', text: 'text-[var(--codex-error)]', icon: '✗' },
};

const actionTypeColors: Record<string, string> = {
  click: 'text-blue-400',
  type: 'text-purple-400',
  select: 'text-cyan-400',
  hover: 'text-pink-400',
  scroll: 'text-orange-400',
  wait: 'text-yellow-400',
  navigate: 'text-emerald-400',
  done: 'text-[var(--codex-accent)]',
};

export default function ActionLog({ actions }: ActionLogProps) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border)] flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-[var(--codex-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xs font-medium text-[var(--codex-text-secondary)] mb-1">No Actions Yet</h3>
        <p className="text-[11px] text-[var(--codex-text-muted)]">Set a goal to see the agent in action.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-1.5">
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-[var(--codex-text-muted)]">Live Action Log</h3>
        <span className="text-[9px] text-[var(--codex-text-muted)]">{actions.length} actions</span>
      </div>

      {actions.map((action, idx) => {
        const status = statusColors[action.status] || statusColors.queued;
        return (
          <div
            key={idx}
            className="fade-in p-2.5 rounded-lg bg-[var(--codex-bg-tertiary)]/50 border border-[var(--codex-border)] hover:border-[var(--codex-border-light)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-semibold ${status.text}`}>
                {status.icon}
              </span>
              <span className={`text-[10px] font-mono font-medium uppercase ${actionTypeColors[action.type] || 'text-[var(--codex-text-secondary)]'}`}>
                {action.type}
              </span>
              {action.element !== undefined && (
                <span className="text-[9px] text-[var(--codex-text-muted)] truncate">
                  element #{action.element}
                </span>
              )}
              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                {action.status}
              </span>
            </div>
            {action.error && (
              <p className="text-[9px] text-[var(--codex-error)] mt-1 ml-5">{action.error}</p>
            )}
            <p className="text-[9px] text-[var(--codex-text-muted)] mt-1 ml-5">
              {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
