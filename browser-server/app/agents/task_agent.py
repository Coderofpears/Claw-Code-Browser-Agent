import json
import base64
from typing import Optional, Dict, Any
from playwright.async_api import Page
from app.services.browser_pool import browser_pool
from app.api.screenshots import store_screenshot
from app.core.event_store import event_store

PROVIDER_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "google": "https://generativelanguage.googleapis.com/v1beta",
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "mistral": "https://api.mistral.ai/v1",
    "xai": "https://api.x.ai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "ollama": "http://localhost:11434/v1",
}

class TaskAgent:
    def __init__(self, goal: str, model: str = "gpt-4o", provider: str = "openai",
                 api_key: Optional[str] = None, headless: bool = True,
                 max_steps: int = 50, task_id: Optional[str] = None):
        self.goal = goal
        self.model = model
        self.provider = provider
        self.api_key = api_key
        self.headless = headless
        self.max_steps = max_steps
        self.task_id = task_id
        self.step = 0
        self.screenshots = []
        self.page: Optional[Page] = None

    async def run(self) -> Dict[str, Any]:
        session_id = self.task_id or "default"
        self.page = await browser_pool.get_page(session_id, self.headless)
        
        try:
            while self.step < self.max_steps:
                self.step += 1
                event_store.add_event(self.task_id, "step_started", {"step": self.step})
                
                snapshot = await self._serialize_page()
                
                screenshot_b64 = await self.page.screenshot(type="jpeg", quality=60)
                screenshot_data = base64.b64encode(screenshot_b64).decode()
                store_screenshot(self.task_id, screenshot_data, self.step)
                self.screenshots.append(screenshot_data)
                
                action = await self._plan_action(snapshot)
                
                if action.get("action") == "done":
                    event_store.add_event(self.task_id, "step_completed", {"step": self.step, "action": "done"})
                    return {
                        "status": "completed",
                        "summary": action.get("summary", "Task completed"),
                        "steps": self.step,
                        "screenshots": self.screenshots,
                    }
                
                if action.get("action") == "wait":
                    event_store.add_event(self.task_id, "step_waiting", {"step": self.step, "reason": action.get("reason")})
                    await self.page.wait_for_timeout(2000)
                    continue
                
                result = await self._execute_action(action)
                event_store.add_event(self.task_id, "step_action", {"step": self.step, "action": action, "result": result})
                
                try:
                    await self.page.wait_for_load_state("domcontentloaded", timeout=3000)
                except Exception:
                    pass
            
            return {
                "status": "max_steps_reached",
                "summary": f"Reached maximum steps ({self.max_steps})",
                "steps": self.step,
                "screenshots": self.screenshots,
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "steps": self.step,
                "screenshots": self.screenshots,
            }

    async def _serialize_page(self) -> Dict[str, Any]:
        elements = await self.page.evaluate("""
            () => {
                const els = document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]');
                return Array.from(els).map((el, i) => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return null;
                    return {
                        id: i, tag: el.tagName.toLowerCase(), type: el.type || null,
                        text: (el.textContent || '').trim().slice(0, 100),
                        value: el.value || '', href: el.href || null,
                        ariaLabel: el.getAttribute('aria-label') || '',
                        placeholder: el.placeholder || '', name: el.name || '',
                    };
                }).filter(Boolean);
            }
        """)
        return {
            "url": self.page.url,
            "title": await self.page.title(),
            "elements": elements,
        }

    async def _plan_action(self, snapshot: Dict) -> Dict[str, Any]:
        if not self.api_key:
            return {"action": "wait", "reason": "No API key configured"}
        
        elements = snapshot["elements"][:80]
        system_prompt = """You are an autonomous browser agent. Given a goal and page elements, return JSON with the next action.
Action types: click, type, navigate, scroll, wait, select, hover, press
For type/navigate/scroll/press include "value". For click/type/select/hover include "elementId".
If done: {"action": "done", "summary": "what was accomplished"}
If stuck: {"action": "wait", "reason": "why"}
Return ONLY valid JSON."""
        
        user_prompt = f"Goal: {self.goal}\nURL: {snapshot['url']}\nTitle: {snapshot['title']}\nElements: {json.dumps(elements, indent=2)}"
        
        base_url = PROVIDER_URLS.get(self.provider, PROVIDER_URLS["openai"])
        
        if self.provider == "anthropic":
            resp = await self._fetch(f"{base_url}/messages", {
                "model": self.model,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
                "max_tokens": 512, "temperature": 0.1,
            }, {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
            return self._parse_json(resp["content"][0]["text"])
        
        headers = {"Authorization": f"Bearer {self.api_key}", "content-type": "application/json"}
        resp = await self._fetch(f"{base_url}/chat/completions", {
            "model": self.model, "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ], "temperature": 0.1, "max_tokens": 512,
        }, headers)
        return self._parse_json(resp["choices"][0]["message"]["content"])

    async def _execute_action(self, action: Dict) -> Dict[str, Any]:
        action_type = action.get("action", "")
        element_id = action.get("elementId")
        value = action.get("value", "")
        
        try:
            if action_type == "click" and element_id is not None:
                el = self.page.locator('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]').nth(element_id)
                await el.click(timeout=5000)
            elif action_type == "type" and element_id is not None:
                el = self.page.locator('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]').nth(element_id)
                await el.clear()
                await el.fill(value)
            elif action_type == "navigate":
                await self.page.goto(value, wait_until="domcontentloaded")
            elif action_type == "scroll":
                await self.page.evaluate(f"window.scrollBy(0, {value or 300})")
            elif action_type == "press":
                await self.page.keyboard.press(value)
            elif action_type == "select" and element_id is not None:
                el = self.page.locator('select').nth(element_id)
                await el.select_option(value)
            elif action_type == "hover" and element_id is not None:
                el = self.page.locator('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]').nth(element_id)
                await el.hover()
            elif action_type == "wait":
                await self.page.wait_for_timeout(int(value) if value else 2000)
            else:
                return {"success": False, "error": f"Unknown action: {action_type}"}
            return {"success": True, "action": action_type}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _parse_json(self, text: str) -> Dict:
        text = text.replace("```json", "").replace("```", "").strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return {"action": "wait", "reason": "Could not parse response"}
        return json.loads(text[start:end+1])

    async def _fetch(self, url: str, body: Dict, headers: Dict) -> Dict:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as resp:
                return await resp.json()
