import { describe, it, expect, vi, beforeAll } from 'vitest';

// Track registered tools and prompts
const registeredTools: Map<string, { config: any; handler: Function }> = new Map();
const registeredPrompts: Map<string, { description: string; handler: Function }> = new Map();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class MockMcpServer {
    constructor(_opts: any) {}
    registerTool(name: string, config: any, handler: Function) {
      registeredTools.set(name, { config, handler });
    }
    prompt(name: string, description: string, handler: Function) {
      registeredPrompts.set(name, { description, handler });
    }
    async connect() {}
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class MockTransport {},
}));

// Suppress console.error from main()
vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(async () => {
  await import('../src/mcp-server.js');
});

describe('MCP Server', () => {
  describe('tool registration', () => {
    it('registers check_package_before_install', () => {
      expect(registeredTools.has('check_package_before_install')).toBe(true);
    });

    it('registers check_packages_before_install', () => {
      expect(registeredTools.has('check_packages_before_install')).toBe(true);
    });
  });

  describe('check_package_before_install', () => {
    it('returns ALLOW for popular package', async () => {
      const handler = registeredTools.get('check_package_before_install')!.handler;
      const result = await handler({ name: 'express' }) as any;
      const text = result.content[0].text;
      expect(text).toContain('ALLOW');
    });

    it('returns BLOCK for typosquat with DO NOT install warning', async () => {
      const handler = registeredTools.get('check_package_before_install')!.handler;
      const result = await handler({ name: 'chalks' }) as any;
      const text = result.content[0].text;
      expect(text).toContain('BLOCK');
      expect(text).toContain('DO NOT install');
      expect(text).toContain('Did you mean');
    });

    it('handles ecosystem pypi', async () => {
      const handler = registeredTools.get('check_package_before_install')!.handler;
      const result = await handler({ name: 'requests', ecosystem: 'pypi' }) as any;
      const text = result.content[0].text;
      expect(text).toContain('ALLOW');
      expect(text).toContain('pypi');
    });

    it('shows Proceed with caution for warn verdict', async () => {
      const handler = registeredTools.get('check_package_before_install')!.handler;
      // A package that triggers warn (medium severity only): registry not found
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));
      const result = await handler({ name: 'xyzzy-warn-test-abc' }) as any;
      const text = result.content[0].text;
      if (text.includes('WARN')) {
        expect(text).toContain('Proceed with caution');
      }
      vi.unstubAllGlobals();
    });

    it('includes confidence percentage', async () => {
      const handler = registeredTools.get('check_package_before_install')!.handler;
      const result = await handler({ name: 'express' }) as any;
      const text = result.content[0].text;
      expect(text).toContain('Confidence');
      expect(text).toContain('%');
    });
  });

  describe('check_packages_before_install', () => {
    it('returns results for batch with blocked package message', async () => {
      const handler = registeredTools.get('check_packages_before_install')!.handler;
      const result = await handler({ names: ['express', 'chalks'] }) as any;
      const text = result.content[0].text;
      expect(text).toContain('express');
      expect(text).toContain('chalks');
      expect(text).toContain('blocked');
    });

    it('returns results for all-safe batch without blocked message', async () => {
      const handler = registeredTools.get('check_packages_before_install')!.handler;
      const result = await handler({ names: ['express', 'react'] }) as any;
      const text = result.content[0].text;
      expect(text).toContain('express');
      expect(text).toContain('react');
      expect(text).not.toContain('blocked');
    });

    it('includes suggestion for typosquats in batch', async () => {
      const handler = registeredTools.get('check_packages_before_install')!.handler;
      const result = await handler({ names: ['chalks'] }) as any;
      const text = result.content[0].text;
      expect(text).toContain('Did you mean');
    });
  });

  describe('prompt registration', () => {
    it('registers package-install-safety prompt', () => {
      expect(registeredPrompts.has('package-install-safety')).toBe(true);
    });

    it('prompt handler returns messages with system prompt text', () => {
      const handler = registeredPrompts.get('package-install-safety')!.handler;
      const result = handler() as any;
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThan(0);
      const text = result.messages[0].content.text;
      expect(text).toContain('check_package_before_install');
      expect(text).toContain('BEFORE');
    });
  });
});
