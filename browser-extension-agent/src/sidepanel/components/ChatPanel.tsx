import React, { useState, useRef, useEffect } from 'react';

interface Message {
  type: 'goal' | 'response' | 'action' | 'error' | 'system';
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  messages: Message[];
  isProcessing: boolean;
  onSetGoal: (goal: string) => void;
}

const messageStyles: Record<string, string> = {
  goal: 'bg-[var(--codex-accent-subtle)] border-[var(--codex-accent-border)] text-[var(--codex-text-primary)]',
  response: 'bg-[var(--codex-bg-tertiary)] border-[var(--codex-border)] text-[var(--codex-text-primary)]',
  action: 'bg-[var(--codex-accent-subtle)] border-[var(--codex-accent-border)] text-[var(--codex-text-primary)]',
  error: 'bg-[var(--codex-error-subtle)] border-[var(--codex-error)]/20 text-[var(--codex-error)]',
  system: 'bg-[var(--codex-bg-tertiary)] border-[var(--codex-border)] text-[var(--codex-text-secondary)]',
};

export default function ChatPanel({ messages, isProcessing, onSetGoal }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSetGoal(trimmed);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty State - Claude-style centered welcome */
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border)] flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-[var(--codex-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--codex-text-primary)] mb-1.5">Autonomous Agent</h2>
            <p className="text-xs text-[var(--codex-text-muted)] max-w-[260px] leading-relaxed mb-6">
              Describe what you want to accomplish and the agent will navigate the page autonomously.
            </p>
            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
              {[
                'Fill out the login form',
                'Find the pricing page',
                'Extract table data',
                'Navigate to settings',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSetGoal(suggestion)}
                  className="px-3 py-1.5 text-[11px] text-[var(--codex-text-secondary)] bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border)] rounded-lg hover:border-[var(--codex-accent-border)] hover:text-[var(--codex-accent)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`fade-in p-3 rounded-xl border ${messageStyles[msg.type]}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[var(--codex-bg-hover)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {msg.type === 'goal' && (
                      <svg className="w-2.5 h-2.5 text-[var(--codex-accent)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {msg.type === 'response' && (
                      <svg className="w-2.5 h-2.5 text-[var(--codex-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {msg.type === 'action' && (
                      <svg className="w-2.5 h-2.5 text-[var(--codex-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {msg.type === 'error' && (
                      <svg className="w-2.5 h-2.5 text-[var(--codex-error)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
                    {msg.type === 'system' && (
                      <svg className="w-2.5 h-2.5 text-[var(--codex-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[var(--codex-text-primary)]">{msg.content}</p>
                    <p className="text-[9px] text-[var(--codex-text-muted)] mt-1.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isProcessing && (
              <div className="fade-in p-3 rounded-xl bg-[var(--codex-bg-tertiary)] border border-[var(--codex-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[var(--codex-bg-hover)] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[var(--codex-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="dot-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-[10px] text-[var(--codex-text-muted)]">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Claude-style bottom input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--codex-border)] bg-[var(--codex-bg-secondary)]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What should the agent do?"
            className="w-full px-4 py-2.5 text-xs bg-[var(--codex-bg-input)] border border-[var(--codex-border-light)] rounded-xl text-[var(--codex-text-primary)] placeholder-[var(--codex-text-muted)] focus:outline-none focus:border-[var(--codex-accent)] focus:ring-1 focus:ring-[var(--codex-accent)]/20 transition-all pr-10"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[var(--codex-accent)] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--codex-accent-hover)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[9px] text-[var(--codex-text-muted)] text-center mt-2">
          The agent may click, type, and navigate on your behalf.
        </p>
      </form>
    </div>
  );
}
