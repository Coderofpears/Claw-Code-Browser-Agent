// src/connectors/index.js — MCP connector registry for extensible tool connections
// Allows adding connectors/MCP servers that the agent can use for external tool access

export class ConnectorRegistry {
  constructor() {
    this.connectors = new Map();
    this.mcpServers = new Map();
  }

  register(connector) {
    if (!connector.id || !connector.connect) {
      throw new Error('Connector must have an "id" and a "connect" method');
    }
    this.connectors.set(connector.id, connector);
  }

  unregister(id) {
    this.connectors.delete(id);
  }

  get(id) {
    return this.connectors.get(id) || null;
  }

  list() {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.id,
      name: c.name,
      connected: c.isConnected?.() || false,
      tools: c.getTools?.() || [],
    }));
  }

  registerMCPServer(config) {
    const { id, name, transport, tools } = config;
    this.mcpServers.set(id, {
      id,
      name,
      transport,
      tools: tools || [],
      connected: false,
    });
  }

  getMCPServers() {
    return Array.from(this.mcpServers.values());
  }

  async executeTool(toolName, params) {
    for (const connector of this.connectors.values()) {
      if (connector.hasTool?.(toolName)) {
        return connector.execute(toolName, params);
      }
    }
    throw new Error(`Tool "${toolName}" not found in any connector`);
  }
}

// Built-in connectors
export const BuiltinConnectors = {
  filesystem: {
    id: 'filesystem',
    name: 'File System',
    description: 'Read and write files on the local system',
    tools: ['read_file', 'write_file', 'list_directory'],
    async connect() { return true; },
    isConnected() { return true; },
    hasTool(tool) { return this.tools.includes(tool); },
    async execute(tool, params) {
      throw new Error('Filesystem connector requires native messaging host');
    },
  },

  clipboard: {
    id: 'clipboard',
    name: 'Clipboard',
    description: 'Read and write clipboard content',
    tools: ['read_clipboard', 'write_clipboard'],
    async connect() { return true; },
    isConnected() { return true; },
    hasTool(tool) { return this.tools.includes(tool); },
    async execute(tool, params) {
      if (tool === 'read_clipboard') {
        return navigator.clipboard?.readText() || '';
      }
      if (tool === 'write_clipboard') {
        await navigator.clipboard?.writeText(params.text);
        return { success: true };
      }
    },
  },

  screenshot: {
    id: 'screenshot',
    name: 'Screenshot',
    description: 'Capture screenshots of the current tab',
    tools: ['capture_tab', 'capture_visible_area'],
    async connect() { return true; },
    isConnected() { return true; },
    hasTool(tool) { return this.tools.includes(tool); },
    async execute(tool, params) {
      if (tool === 'capture_tab') {
        return new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            resolve({ image: dataUrl });
          });
        });
      }
    },
  },

  storage: {
    id: 'storage',
    name: 'Extension Storage',
    description: 'Read and write extension storage',
    tools: ['get_storage', 'set_storage', 'remove_storage'],
    async connect() { return true; },
    isConnected() { return true; },
    hasTool(tool) { return this.tools.includes(tool); },
    async execute(tool, params) {
      if (tool === 'get_storage') {
        return new Promise((resolve) => {
          chrome.storage.local.get(params.keys, resolve);
        });
      }
      if (tool === 'set_storage') {
        return new Promise((resolve) => {
          chrome.storage.local.set(params.data, resolve);
        });
      }
      if (tool === 'remove_storage') {
        return new Promise((resolve) => {
          chrome.storage.local.remove(params.keys, resolve);
        });
      }
    },
  },
};
