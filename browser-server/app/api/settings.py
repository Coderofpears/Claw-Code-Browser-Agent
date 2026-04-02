from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class Settings(BaseModel):
    model: str = "gpt-4o"
    provider: str = "openai"
    api_key: Optional[str] = None
    headless: bool = True
    max_steps: int = 50
    default_url: str = "https://www.google.com"

_settings = Settings()

@router.get("/", response_model=Settings)
async def get_settings():
    return _settings

@router.put("/", response_model=Settings)
async def update_settings(s: Settings):
    global _settings
    _settings = s
    return _settings

@router.patch("/", response_model=Settings)
async def patch_settings(s: Settings):
    global _settings
    for field, value in s.model_dump(exclude_unset=True).items():
        setattr(_settings, field, value)
    return _settings
