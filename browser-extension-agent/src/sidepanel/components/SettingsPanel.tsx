import React, { useState } from 'react';

interface Settings {
  apiKey: string;
  model: string;
  provider: string;
}

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  { value: 'google', label: 'Google', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { value: 'groq', label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
  { value: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.0-flash', 'meta-llama/llama-3.3-70b-instruct'] },
  { value: 'mistral', label: 'Mistral', models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'] },
  { value: 'xai', label: 'xAI (Grok)', models: ['grok-3', 'grok-3-mini', 'grok-2'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { value: 'together', label: 'Together AI', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'] },
  { value: 'ollama', label: 'Ollama (Local)', models: ['llama3.1', 'mistral', 'phi3', 'codellama', 'deepseek-coder'] },
];

export default function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [form, setForm] = useState<Settings>({
    apiKey: settings.apiKey || '',
    model: settings.model || 'gpt-4o',
    provider: settings.provider || 'openai',
  });

  const selectedProvider = PROVIDERS.find((p) => p.value === form.provider) || PROVIDERS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="border-b border-[var(--codex-border)] bg-[var(--codex-bg-secondary)] p-4 fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--codex-text-primary)]">Settings</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--codex-bg-hover)] transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-[var(--codex-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Provider */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--codex-text-muted)] mb-1.5">Provider</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, provider: p.value, model: p.models[0] })}
                className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-all text-left ${
                  form.provider === p.value
                    ? 'bg-[var(--codex-accent-subtle)] border-[var(--codex-accent-border)] text-[var(--codex-accent)]'
                    : 'bg-[var(--codex-bg-tertiary)] border-[var(--codex-border)] text-[var(--codex-text-secondary)] hover:border-[var(--codex-border-light)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--codex-text-muted)] mb-1.5">API Key</label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={form.provider === 'ollama' ? 'Not required for local' : 'Enter your API key...'}
            disabled={form.provider === 'ollama'}
            className="w-full px-3 py-2 text-xs bg-[var(--codex-bg-input)] border border-[var(--codex-border-light)] rounded-lg text-[var(--codex-text-primary)] placeholder-[var(--codex-text-muted)] focus:outline-none focus:border-[var(--codex-accent)] focus:ring-1 focus:ring-[var(--codex-accent)]/20 transition-all font-mono disabled:opacity-50"
          />
          {form.provider === 'ollama' && (
            <p className="text-[9px] text-[var(--codex-text-muted)] mt-1">Ollama runs locally — no API key needed.</p>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="block text-[10px] font-medium text-[var(--codex-text-muted)] mb-1.5">Model</label>
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[var(--codex-bg-input)] border border-[var(--codex-border-light)] rounded-lg text-[var(--codex-text-primary)] focus:outline-none focus:border-[var(--codex-accent)] focus:ring-1 focus:ring-[var(--codex-accent)]/20 transition-all"
          >
            {selectedProvider.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Save */}
        <button
          type="submit"
          className="w-full py-2 text-xs font-medium bg-[var(--codex-accent)] text-white rounded-lg hover:bg-[var(--codex-accent-hover)] transition-colors"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
