from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api import router as api_router
from app.services.browser_pool import browser_pool
import os

app = FastAPI(
    title="Claw Browser Server",
    description="Self-hosted browser automation platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

@app.on_event("startup")
async def startup():
    await browser_pool.init()

@app.on_event("shutdown")
async def shutdown():
    await browser_pool.shutdown()

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
