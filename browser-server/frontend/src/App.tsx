import React, { useState, useEffect, useRef, useCallback } from 'react'
import TaskInput from './components/TaskInput'
import BrowserPreview from './components/BrowserPreview'
import EventLog from './components/EventLog'
import TaskList from './components/TaskList'
import SettingsPanel from './components/SettingsPanel'

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

interface Settings {
  model: string
  provider: string
  api_key: string
  headless: boolean
  max_steps: number
}

const API_BASE = '/api'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('claw-settings')
    return saved ? JSON.parse(saved) : {
      model: 'gpt-4o',
      provider: 'openai',
      api_key: '',
      headless: true,
      max_steps: 50,
    }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'log'>('preview')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('claw-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!activeTask?.task_id) return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`${API_BASE}/stream/${activeTask.task_id}`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        setEvents(prev => [...prev, event])
      } catch {}
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [activeTask?.task_id])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks/`)
      const data = await res.json()
      setTasks(data)
      if (activeTask) {
        const updated = data.find((t: Task) => t.task_id === activeTask.task_id)
        if (updated) setActiveTask(updated)
      }
    } catch {}
  }, [activeTask])

  const handleCreateTask = useCallback(async (goal: string) => {
    const res = await fetch(`${API_BASE}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        model: settings.model,
        provider: settings.provider,
        api_key: settings.api_key || undefined,
        headless: settings.headless,
        max_steps: settings.max_steps,
      }),
    })
    const task = await res.json()
    setEvents([])
    setActiveTask({
      ...task,
      steps_completed: 0,
      max_steps: settings.max_steps,
      result: null,
      error: null,
      screenshots: [],
      updated_at: task.created_at,
    })
    fetchTasks()
  }, [settings, fetchTasks])

  const handleSelectTask = useCallback(async (task: Task) => {
    setActiveTask(task)
    setEvents([])
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.task_id}/events`)
      const data = await res.json()
      setEvents(data)
    } catch {}
  }, [])

  const handleCancelTask = useCallback(async (taskId: string) => {
    await fetch(`${API_BASE}/tasks/${taskId}/cancel`, { method: 'POST' })
    fetchTasks()
  }, [fetchTasks])

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Left Sidebar - Task List */}
      {showSidebar && (
        <div className="w-72 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
          <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tasks</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          {showSettings && (
            <SettingsPanel settings={settings} onChange={setSettings} />
          )}
          <div className="flex-1 overflow-y-auto">
            <TaskList
              tasks={tasks}
              activeId={activeTask?.task_id}
              onSelect={handleSelectTask}
              onCancel={handleCancelTask}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <h1 className="text-sm font-medium">Claw Browser Server</h1>
            </div>
          </div>
          {activeTask && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeTask.status === 'running' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                activeTask.status === 'completed' ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' :
                activeTask.status === 'failed' ? 'bg-[var(--error-subtle)] text-[var(--error)]' :
                'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}>
                {activeTask.status}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Step {activeTask.steps_completed}/{activeTask.max_steps}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-secondary)] px-2">
          {[
            { id: 'preview' as const, label: 'Browser Preview', icon: '🖥️' },
            { id: 'log' as const, label: `Event Log (${events.length})`, icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-[var(--accent)] border-[var(--accent)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
              }`}
            >
              <span className="text-[10px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'preview' ? (
            <BrowserPreview task={activeTask} events={events} />
          ) : (
            <EventLog events={events} />
          )}
        </div>

        {/* Bottom Input */}
        <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <TaskInput onSubmit={handleCreateTask} disabled={activeTask?.status === 'running'} />
        </div>
      </div>
    </div>
  )
}
