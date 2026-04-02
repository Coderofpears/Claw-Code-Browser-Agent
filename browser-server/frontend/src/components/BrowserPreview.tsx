import React from 'react'

interface Task {
  task_id: string
  status: string
  goal: string
  screenshots: string[]
  result: string | null
  error: string | null
}

interface BrowserPreviewProps {
  task: Task | null
  events: any[]
}

export default function BrowserPreview({ task, events }: BrowserPreviewProps) {
  const latestScreenshot = task?.screenshots?.[task.screenshots.length - 1] || null
  const latestEvent = events[events.length - 1]

  if (!task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Browser Preview</h2>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          Start a task to see the agent's browser activity in real time.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
          {['Find the cheapest flight to Tokyo', 'Extract all product prices from amazon.com', 'Fill out the contact form on example.com', 'Search for Python tutorials on YouTube'].map(s => (
            <span key={s} className="px-3 py-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg">
              {s}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Goal</span>
          <span className="text-xs text-[var(--text-primary)] truncate">{task.goal}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] p-4 overflow-auto">
        {latestScreenshot ? (
          <div className="relative rounded-xl overflow-hidden border border-[var(--border)] shadow-2xl max-w-full">
            <img
              src={`data:image/jpeg;base64,${latestScreenshot}`}
              alt="Browser preview"
              className="max-w-full max-h-[60vh] object-contain"
            />
            {task.status === 'running' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="text-[10px] text-white font-medium">Live</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {task.status === 'running' ? (
              <>
                <div className="dot-loading">
                  <span></span><span></span><span></span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">Agent is working...</span>
              </>
            ) : task.status === 'completed' ? (
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-primary)]">{task.result || 'Task completed'}</p>
              </div>
            ) : task.error ? (
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--error-subtle)] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--error)]">{task.error}</p>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">Waiting for screenshots...</span>
            )}
          </div>
        )}
      </div>

      {latestEvent && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--accent)]">{latestEvent.type}</span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {JSON.stringify(latestEvent.data).slice(0, 120)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
