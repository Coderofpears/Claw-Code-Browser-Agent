from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
from app.core.event_store import event_store

router = APIRouter()

@router.get("/{task_id}")
async def stream_events(task_id: str):
    async def event_generator():
        last_idx = 0
        while True:
            events = event_store.get_events(task_id)
            for i, event in enumerate(events[last_idx:]):
                yield {
                    "event": event["type"],
                    "data": json.dumps(event),
                    "id": str(last_idx + i),
                }
            last_idx = len(events)
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
