from fastapi import APIRouter
from pydantic import BaseModel
import base64
from datetime import datetime, timezone

router = APIRouter()

_screenshots: dict = {}

@router.get("/{task_id}")
async def get_screenshots(task_id: str):
    return [s for s in _screenshots.values() if s["task_id"] == task_id]

def store_screenshot(task_id: str, data: str, step: int = 0):
    sid = str(step)
    _screenshots[f"{task_id}:{sid}"] = {
        "screenshot_id": sid,
        "task_id": task_id,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "step": step,
    }
    return sid
