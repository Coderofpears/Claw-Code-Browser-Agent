import React, { useState } from 'react'

interface TaskInputProps {
  onSubmit: (goal: string) => void
  disabled?: boolean
}

export default function TaskInput({ onSubmit, disabled }: TaskInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell the agent what to do on the web..."
          disabled={disabled}
          className="w-full px-4 py-3 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all pr-12 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
        Powered by Playwright + LLM — the agent can browse, click, type, and navigate autonomously.
      </p>
    </form>
  )
}
