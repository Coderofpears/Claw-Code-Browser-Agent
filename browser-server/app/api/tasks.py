import uuid
import asyncio
import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.browser_pool import browser_pool
from app.agents.task_agent import TaskAgent
from app.core.event_store import event_store

router = APIRouter()

class CreateTask(BaseModel):
    goal: str
    model: str = "gpt-4o"
    provider: str = "openai"
    api_key: Optional[str] = None
    headless: bool = True
    max_steps: int = 50
    session_id: Optional[str] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    goal: str
    created_at: str

class TaskStatus(BaseModel):
    task_id: str
    status: str
    goal: str
    steps_completed: int
    max_steps: int
    result: Optional[str] = None
    error: Optional[str] = None
    screenshots: list = []
    created_at: str
    updated_at: str

active_tasks: dict = {}

@router.post("/", response_model=TaskResponse)
async def create_task(task: CreateTask):
    task_id = str(uuid.uuid4())
    session_id = task.session_id or str(uuid.uuid4())

    task_data = {
        "task_id": task_id,
        "session_id": session_id,
        "goal": task.goal,
        "model": task.model,
        "provider": task.provider,
        "api_key": task.api_key,
        "headless": task.headless,
        "max_steps": task.max_steps,
        "status": "queued",
        "steps_completed": 0,
        "result": None,
        "error": None,
        "screenshots": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    active_tasks[task_id] = task_data

    asyncio.create_task(run_task(task_id, task_data))

    event_store.add_event(task_id, "task_created", {"goal": task.goal, "session_id": session_id})

    return TaskResponse(
        task_id=task_id,
        status="queued",
        goal=task.goal,
        created_at=task_data["created_at"],
    )

@router.get("/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    t = active_tasks[task_id]
    return TaskStatus(**t)

@router.get("/")
async def list_tasks():
    return list(active_tasks.values())

@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    active_tasks[task_id]["status"] = "cancelled"
    event_store.add_event(task_id, "task_cancelled", {})
    return {"task_id": task_id, "status": "cancelled"}

@router.get("/{task_id}/events")
async def get_task_events(task_id: str):
    return event_store.get_events(task_id)

async def run_task(task_id: str, task_data: dict):
    try:
        task_data["status"] = "running"
        task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        event_store.add_event(task_id, "task_started", {})

        agent = TaskAgent(
            goal=task_data["goal"],
            model=task_data["model"],
            provider=task_data["provider"],
            api_key=task_data["api_key"],
            headless=task_data["headless"],
            max_steps=task_data["max_steps"],
            task_id=task_id,
        )

        result = await agent.run()

        task_data["status"] = result.get("status", "completed")
        task_data["result"] = result.get("summary") or result.get("output")
        task_data["error"] = result.get("error")
        task_data["screenshots"] = result.get("screenshots", [])
        task_data["steps_completed"] = result.get("steps", 0)
        task_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        event_store.add_event(task_id, "task_completed", {
            "status": task_data["status"],
            "result": task_data["result"],
        })

    except Exception as e:
        task_data["status"] = "failed"
        task_data["error"] = str(e)
        task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        event_store.add_event(task_id, "task_failed", {"error": str(e)})
