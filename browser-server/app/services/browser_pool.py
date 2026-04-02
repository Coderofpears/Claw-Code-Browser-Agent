from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from typing import Optional, Dict
import asyncio

class BrowserPool:
    def __init__(self):
        self._playwright = None
        self._browsers: Dict[str, Browser] = {}
        self._contexts: Dict[str, BrowserContext] = {}
        self._pages: Dict[str, Page] = {}

    async def init(self):
        self._playwright = await async_playwright().start()

    async def get_browser(self, session_id: str, headless: bool = True) -> Browser:
        if session_id not in self._browsers:
            if not self._playwright:
                await self.init()
            self._browsers[session_id] = await self._playwright.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled"],
            )
        return self._browsers[session_id]

    async def get_context(self, session_id: str, headless: bool = True) -> BrowserContext:
        if session_id not in self._contexts:
            browser = await self.get_browser(session_id, headless)
            self._contexts[session_id] = await browser.new_context(
                viewport={"width": 1280, "height": 720},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            )
        return self._contexts[session_id]

    async def get_page(self, session_id: str, headless: bool = True) -> Page:
        if session_id not in self._pages:
            context = await self.get_context(session_id, headless)
            self._pages[session_id] = await context.new_page()
        return self._pages[session_id]

    async def close_session(self, session_id: str):
        if session_id in self._pages:
            await self._pages[session_id].close()
            del self._pages[session_id]
        if session_id in self._contexts:
            await self._contexts[session_id].close()
            del self._contexts[session_id]
        if session_id in self._browsers:
            await self._browsers[session_id].close()
            del self._browsers[session_id]

    async def shutdown(self):
        for sid in list(self._browsers.keys()):
            await self.close_session(sid)
        if self._playwright:
            await self._playwright.stop()

browser_pool = BrowserPool()
