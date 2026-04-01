// src/background/llmClient.js — LLM API client with multi-provider abstraction

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.0-flash', 'meta-llama/llama-3.3-70b-instruct'],
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
  },
  xai: {
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-3', 'grok-3-mini', 'grok-2'],
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1', 'mistral', 'phi3', 'codellama', 'deepseek-coder'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
  },
};

export class LLMClient {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.model = 'gpt-4o';
    this.provider = 'openai';
  }

  static getProviders() {
    return PROVIDERS;
  }

  static getProviderInfo(name) {
    return PROVIDERS[name] || null;
  }

  configure({ provider, apiKey, model, baseUrl }) {
    this.provider = provider || this.provider;
    this.apiKey = apiKey || this.apiKey;
    this.model = model || this.model;
    this.baseUrl = baseUrl || this.getDefaultBaseUrl();
  }

  getDefaultBaseUrl() {
    return PROVIDERS[this.provider]?.baseUrl || PROVIDERS.openai.baseUrl;
  }

  async chat(messages) {
    if (!this.apiKey && this.provider !== 'ollama') {
      throw new Error('API key not configured. Set your API key in the sidepanel settings.');
    }

    switch (this.provider) {
      case 'openai':
      case 'groq':
      case 'openrouter':
      case 'mistral':
      case 'xai':
      case 'deepseek':
      case 'together':
      case 'ollama':
        return this.callOpenAICompatible(messages);
      case 'anthropic':
        return this.callAnthropic(messages);
      case 'google':
        return this.callGoogle(messages);
      default:
        return this.callOpenAICompatible(messages);
    }
  }

  async callOpenAICompatible(messages) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${PROVIDERS[this.provider]?.name || this.provider} API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callAnthropic(messages) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model || 'claude-sonnet-4-20250514',
        system: systemMessage?.content,
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callGoogle(messages) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}
