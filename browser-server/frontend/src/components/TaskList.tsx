import React from 'react'

interface Task {
  task_id: string
  status: string
  goal: string
  created_at: string
  updated_at: string
  steps_completed: number
  max_steps: number
  result: string | null
  error: string | null
  screenshots: string[]
}

interface TaskListProps {
  tasks: Task[]
  activeId?: string
  onSelect: (task: Task) => void
  onCancel: (taskId: string) => void
}

const statusDot: Record<string, string> = {
  running: 'bg-[var(--success)] animate-pulse',
  completed: 'bg-[var(--accent)]',
  failed: 'bg-[var(--error)]',
  cancelled: 'bg-[var(--warning)]',
  queued: 'bg-[var(--text-muted)]',
}

export default function TaskList({ tasks, activeId, onSelect, onCancel }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-4">
        <p className="text-xs text-[var(--text-muted)]">No tasks yet.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {[...tasks].reverse().map(task => (
        <div
          key={task.task_id}
          onClick={() => onSelect(task)}
          className={`px-3 py-2.5 cursor-pointer transition-colors ${
            task.task_id === activeId
              ? 'bg-[var(--accent-subtle)] border-l-2 border-[var(--accent)]'
              : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[task.status] || 'bg-[var(--text-muted)]'}`} />
            <span className="text-[11px] text-[var(--text-primary)] truncate flex-1">{task.goal}</span>
            {task.status === 'running' && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(task.task_id) }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--error-subtle)] text-[var(--error)] hover:bg-[var(--error)]/20 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 ml-3.5">
            <span className="text-[9px] text-[var(--text-muted)]">
              {new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] capitalize">{task.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
