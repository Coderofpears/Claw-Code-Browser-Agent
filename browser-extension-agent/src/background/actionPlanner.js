// src/background/actionPlanner.js — Parses LLM responses into structured actions

const VALID_ACTIONS = ['click', 'type', 'select', 'hover', 'scroll', 'wait', 'navigate', 'done'];

export class ActionPlanner {
  parseResponse(response) {
    const cleaned = this.extractJSON(response);
    const parsed = JSON.parse(cleaned);
    return this.validateAction(parsed);
  }

  extractJSON(text) {
    // Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1).trim();
    }

    throw new Error('No JSON found in LLM response');
  }

  validateAction(action) {
    if (!action || typeof action !== 'object') {
      throw new Error('Invalid action format: expected object');
    }

    if (!action.action) {
      throw new Error('Invalid action format: missing "action" field');
    }

    if (!VALID_ACTIONS.includes(action.action)) {
      throw new Error(`Invalid action type: "${action.action}". Must be one of: ${VALID_ACTIONS.join(', ')}`);
    }

    return {
      type: action.action,
      elementId: action.elementId ?? null,
      value: action.value ?? null,
      requiresConfirmation: action.requiresConfirmation ?? false,
      reason: action.reason ?? null,
      summary: action.summary ?? null,
    };
  }
}
