import React from 'react'

interface Settings {
  model: string
  provider: string
  api_key: string
  headless: boolean
  max_steps: number
}

interface SettingsPanelProps {
  settings: Settings
  onChange: (s: Settings) => void
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'] },
  { value: 'google', label: 'Google', models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'] },
  { value: 'groq', label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  { value: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.0-flash'] },
  { value: 'mistral', label: 'Mistral', models: ['mistral-large-latest', 'mistral-medium-latest', 'codestral-latest'] },
  { value: 'xai', label: 'xAI (Grok)', models: ['grok-3', 'grok-3-mini'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { value: 'ollama', label: 'Ollama (Local)', models: ['llama3.1', 'mistral', 'phi3'] },
]

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const provider = PROVIDERS.find(p => p.value === settings.provider) || PROVIDERS[0]

  return (
    <div className="p-3 border-b border-[var(--border)] space-y-2.5 fade-in">
      <div>
        <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              onClick={() => onChange({ ...settings, provider: p.value, model: p.models[0] })}
              className={`px-2 py-1 text-[10px] rounded border transition-all ${
                settings.provider === p.value
                  ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-light)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Model</label>
        <select
          value={settings.model}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
          className="w-full px-2 py-1.5 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">API Key</label>
        <input
          type="password"
          value={settings.api_key}
          onChange={(e) => onChange({ ...settings, api_key: e.target.value })}
          placeholder={settings.provider === 'ollama' ? 'Not required' : 'sk-...'}
          disabled={settings.provider === 'ollama'}
          className="w-full px-2 py-1.5 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono disabled:opacity-50"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-[var(--text-muted)]">Headless Mode</label>
        <button
          onClick={() => onChange({ ...settings, headless: !settings.headless })}
          className={`w-8 h-4 rounded-full transition-colors relative ${settings.headless ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-light)]'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings.headless ? 'left-4' : 'left-0.5'}`} />
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1">Max Steps: {settings.max_steps}</label>
        <input
          type="range"
          min="5"
          max="200"
          value={settings.max_steps}
          onChange={(e) => onChange({ ...settings, max_steps: parseInt(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </div>
    </div>
  )
}
