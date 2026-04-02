from fastapi import APIRouter
from app.api.tasks import router as tasks_router
from app.api.sessions import router as sessions_router
from app.api.screenshots import router as screenshots_router
from app.api.streaming import router as streaming_router

router = APIRouter()
router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
router.include_router(screenshots_router, prefix="/screenshots", tags=["screenshots"])
router.include_router(streaming_router, prefix="/stream", tags=["streaming"])
