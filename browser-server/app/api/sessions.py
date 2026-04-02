from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

class CreateSession(BaseModel):
    name: str = "New Session"
    profile_id: Optional[str] = None
    proxy: Optional[str] = None
    user_agent: Optional[str] = None

class SessionInfo(BaseModel):
    session_id: str
    name: str
    status: str
    created_at: str
    page_count: int = 0
    profile_id: Optional[str] = None

active_sessions: dict = {}

@router.post("/", response_model=SessionInfo)
async def create_session(session: CreateSession):
    session_id = str(uuid.uuid4())
    data = {
        "session_id": session_id,
        "name": session.name,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "page_count": 0,
        "profile_id": session.profile_id,
        "proxy": session.proxy,
        "user_agent": session.user_agent,
    }
    active_sessions[session_id] = data
    return SessionInfo(**data)

@router.get("/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionInfo(**active_sessions[session_id])

@router.get("/")
async def list_sessions():
    return list(active_sessions.values())

@router.delete("/{session_id}")
async def close_session(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    active_sessions[session_id]["status"] = "closed"
    return {"session_id": session_id, "status": "closed"}
