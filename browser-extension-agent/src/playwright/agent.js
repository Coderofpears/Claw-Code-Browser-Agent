// src/playwright/agent.js — Playwright-based browser automation agent
// Runs as a companion to the extension for direct browser control
// Usage: node src/playwright/agent.js --goal "Find the cheapest flight to Tokyo"

import { chromium } from 'playwright';

class PlaywrightAgent {
  constructor(options = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.headless = options.headless ?? false;
    this.slowMo = options.slowMo ?? 100;
    this.maxActions = options.maxActions ?? 50;
    this.actionCount = 0;
    this.goal = null;
    this.llmClient = options.llmClient;
    this.onAction = options.onAction || (() => {});
    this.onLog = options.onLog || console.log;
  }

  async launch() {
    this.browser = await chromium.launch({
      headless: this.headless,
      slowMo: this.slowMo,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
    this.onLog('Browser launched');
    return this;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.onLog('Browser closed');
    }
  }

  async serializePage() {
    const elements = await this.page.evaluate(() => {
      const interactive = document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]'
      );
      return Array.from(interactive).map((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        return {
          id: i,
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          text: el.textContent?.trim().slice(0, 100) || '',
          value: el.value || '',
          href: el.href || null,
          ariaLabel: el.getAttribute('aria-label') || '',
          placeholder: el.placeholder || '',
          name: el.name || '',
          visible: true,
        };
      }).filter(Boolean);
    });

    return {
      url: this.page.url(),
      title: await this.page.title(),
      elements,
    };
  }

  async executeAction(action) {
    this.actionCount++;
    if (this.actionCount > this.maxActions) {
      throw new Error(`Max actions reached (${this.maxActions})`);
    }

    const { type, elementId, value } = action;
    this.onAction(action);

    try {
      switch (type) {
        case 'click': {
          const el = await this.getElementByIndex(elementId);
          if (el) await el.click();
          break;
        }
        case 'type': {
          const el = await this.getElementByIndex(elementId);
          if (el) {
            await el.clear();
            await el.fill(value);
          }
          break;
        }
        case 'press': {
          await this.page.keyboard.press(value);
          break;
        }
        case 'navigate': {
          await this.page.goto(value, { waitUntil: 'domcontentloaded' });
          break;
        }
        case 'scroll': {
          await this.page.evaluate((px) => window.scrollBy(0, px), value || 300);
          break;
        }
        case 'wait': {
          await this.page.waitForTimeout(value || 2000);
          break;
        }
        case 'screenshot': {
          const path = value || `screenshot-${Date.now()}.png`;
          await this.page.screenshot({ path });
          return { screenshot: path };
        }
        case 'select': {
          const el = await this.getElementByIndex(elementId);
          if (el) await el.selectOption(value);
          break;
        }
        case 'hover': {
          const el = await this.getElementByIndex(elementId);
          if (el) await el.hover();
          break;
        }
        default:
          throw new Error(`Unknown action: ${type}`);
      }

      // Wait for navigation if triggered
      try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      } catch {
        // No navigation occurred
      }

      return { success: true, action };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getElementByIndex(index) {
    const elements = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]'
      ))
    );
    // Use locator approach for Playwright
    const allInteractive = this.page.locator(
      'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [role="radio"]'
    );
    const count = await allInteractive.count();
    if (index < count) {
      return allInteractive.nth(index);
    }
    return null;
  }

  async run(goal) {
    this.goal = goal;
    this.actionCount = 0;
    this.onLog(`Starting agent with goal: "${goal}"`);

    while (this.actionCount < this.maxActions) {
      const snapshot = await this.serializePage();
      const action = await this.planAction(goal, snapshot);

      if (action.action === 'done') {
        this.onLog(`Goal complete: ${action.summary}`);
        return { success: true, summary: action.summary };
      }

      if (action.action === 'wait') {
        this.onLog(`Waiting: ${action.reason}`);
        await this.executeAction({ type: 'wait', value: 2000 });
        continue;
      }

      const result = await this.executeAction({
        type: action.action,
        elementId: action.elementId,
        value: action.value,
      });

      if (!result.success) {
        this.onLog(`Action failed: ${result.error}`);
      }
    }

    return { success: false, error: 'Max actions reached' };
  }

  async planAction(goal, snapshot) {
    if (!this.llmClient) {
      throw new Error('LLM client required for planning');
    }

    const serializedElements = snapshot.elements.map((el) => ({
      id: el.id,
      tag: el.tag,
      text: el.text,
      type: el.type,
      ariaLabel: el.ariaLabel,
      value: el.value,
    }));

    const systemPrompt = `You are an autonomous browser agent using Playwright. Given a user goal and the current page's interactive elements, return a JSON object with the next action.

Rules:
- Return ONLY valid JSON
- Action types: "click", "type", "press", "navigate", "scroll", "wait", "screenshot", "select", "hover"
- For "type", "press", "navigate", "scroll" actions, include a "value" field
- For "click", "type", "select", "hover" actions, include "elementId"
- If goal is complete: {"action": "done", "summary": "what was accomplished"}
- If stuck: {"action": "wait", "reason": "why"}`;

    const userPrompt = `Goal: ${goal}
URL: ${snapshot.url}
Title: ${snapshot.title}
Elements: ${JSON.stringify(serializedElements.slice(0, 80), null, 2)}`;

    const response = await this.llmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse JSON from response
    const cleaned = response.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON in LLM response');
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

// CLI entrypoint
if (process.argv[1]?.endsWith('agent.js')) {
  const args = process.argv.slice(2);
  const goalIdx = args.indexOf('--goal');
  const goal = goalIdx !== -1 ? args[goalIdx + 1] : null;

  if (!goal) {
    console.error('Usage: node agent.js --goal "your goal here"');
    process.exit(1);
  }

  const agent = new PlaywrightAgent({
    headless: args.includes('--headless'),
    slowMo: 50,
  });

  await agent.launch();
  try {
    const result = await agent.run(goal);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await agent.close();
  }
}

export { PlaywrightAgent };
