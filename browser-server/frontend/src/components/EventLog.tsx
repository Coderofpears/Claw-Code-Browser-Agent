import React, { useEffect, useRef } from 'react'

interface EventLogProps {
  events: any[]
}

const eventColors: Record<string, string> = {
  task_created: 'text-[var(--accent)]',
  task_started: 'text-[var(--success)]',
  step_started: 'text-[var(--text-secondary)]',
  step_action: 'text-[var(--text-primary)]',
  step_completed: 'text-[var(--success)]',
  task_completed: 'text-[var(--success)]',
  task_failed: 'text-[var(--error)]',
  task_cancelled: 'text-[var(--warning)]',
}

export default function EventLog({ events }: EventLogProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-xs text-[var(--text-muted)]">No events yet. Start a task to see the event stream.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {events.map((event, i) => (
        <div key={i} className="fade-in flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
          <span className={`text-[10px] font-mono font-medium whitespace-nowrap ${eventColors[event.type] || 'text-[var(--text-muted)]'}`}>
            {event.type}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] truncate">
            {JSON.stringify(event.data)}
          </span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
