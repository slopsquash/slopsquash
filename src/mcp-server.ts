#!/usr/bin/env node

/**
 * slopsquash MCP server — AI-native protection against slopsquatted packages.
 *
 * Runs over stdio. Configure in any MCP host:
 *   { "command": "npx", "args": ["slopsquash-mcp"] }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { checkPackage, checkPackages } from './pipeline/runner.js';
import type { Ecosystem } from './types.js';

const server = new McpServer({
  name: 'slopsquash',
  version: '0.2.0',
});

// ── Tool: check_package_before_install ──────────────────────────────────
//
// The tool name and description are deliberately crafted to maximize the
// chance that an AI agent will call this tool before installing packages.
//
server.registerTool(
  'check_package_before_install',
  {
    description: `IMPORTANT: You MUST call this tool BEFORE installing, adding, or recommending ANY package via npm, pip, yarn, pnpm, or any other package manager. This includes \`npm install\`, \`pip install\`, \`yarn add\`, \`pnpm add\`, adding to package.json, adding to requirements.txt, or any equivalent operation.

This tool checks whether a package name is safe to install by detecting:
- Slopsquatting: AI-hallucinated package names that don't exist or are malicious
- Typosquatting: Names suspiciously similar to popular packages (e.g., 'chalks' instead of 'chalk')
- Known malware: Packages on community-reported malicious package lists
- Suspicious age: Brand-new packages that may be name-squatting

Call this tool for EVERY package before installation. If the verdict is 'block', do NOT install the package. If the verdict is 'warn', inform the user of the risk before proceeding.`,
    inputSchema: {
      name: z.string().describe('The exact package name to check (e.g., "express", "@types/node", "requests")'),
      ecosystem: z.enum(['npm', 'pypi']).optional().describe('Package ecosystem. Defaults to "npm". Use "pypi" for Python packages.'),
    },
  },
  async ({ name, ecosystem }) => {
    const result = await checkPackage(name, (ecosystem as Ecosystem) ?? 'npm');

    // Format the result as a clear, actionable message
    const lines: string[] = [
      `## Package Check: ${result.name}`,
      `**Verdict: ${result.verdict.toUpperCase()}**`,
      `Ecosystem: ${result.ecosystem}`,
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
    ];

    if (result.suggestion) {
      lines.push(`\n⚠️  Did you mean: **${result.suggestion}**?`);
    }

    if (result.reasons.length > 0) {
      lines.push('\n### Reasons:');
      for (const r of result.reasons) {
        const icon = r.severity === 'critical' ? '🚫' : r.severity === 'high' ? '🔴' : r.severity === 'medium' ? '🟡' : 'ℹ️';
        lines.push(`${icon} **[${r.check}]** ${r.detail}`);
      }
    }

    if (result.verdict === 'block') {
      lines.push('\n🛑 **DO NOT install this package.** It has been flagged as unsafe.');
    } else if (result.verdict === 'warn') {
      lines.push('\n⚠️  **Proceed with caution.** Inform the user of the risks before installing.');
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  },
);

// ── Tool: check_packages_before_install (batch) ────────────────────────
server.registerTool(
  'check_packages_before_install',
  {
    description: `Batch version of check_package_before_install. Call this when installing multiple packages at once (e.g., \`npm install a b c\`). Returns a verdict for each package. Same rules apply: if any verdict is 'block', do NOT install that package.`,
    inputSchema: {
      names: z.array(z.string()).describe('Array of package names to check'),
      ecosystem: z.enum(['npm', 'pypi']).optional().describe('Package ecosystem. Defaults to "npm".'),
    },
  },
  async ({ names, ecosystem }) => {
    const results = await checkPackages(names, (ecosystem as Ecosystem) ?? 'npm');

    const lines: string[] = [`## Batch Package Check (${results.length} packages)\n`];
    let hasBlocked = false;

    for (const result of results) {
      const icon = result.verdict === 'block' ? '🛑' : result.verdict === 'warn' ? '⚠️' : '✅';
      lines.push(`${icon} **${result.name}**: ${result.verdict.toUpperCase()}`);
      if (result.suggestion) {
        lines.push(`   ↳ Did you mean: ${result.suggestion}?`);
      }
      for (const r of result.reasons) {
        lines.push(`   • [${r.check}] ${r.detail}`);
      }
      if (result.verdict === 'block') hasBlocked = true;
    }

    if (hasBlocked) {
      lines.push('\n🛑 **One or more packages were blocked.** Remove them before installing.');
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  },
);

// ── Prompt: package-install-safety ──────────────────────────────────────
//
// This MCP prompt reinforces the instruction to always check packages.
// MCP hosts can inject this into the system prompt.
//
server.prompt(
  'package-install-safety',
  'System prompt reinforcement for package install safety. Inject this into your system prompt to ensure the agent always checks packages before installing.',
  () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You have access to the slopsquash package safety tool. You MUST follow these rules:

1. BEFORE running any package install command (npm install, pip install, yarn add, pnpm add, etc.), ALWAYS call the 'check_package_before_install' tool for EACH package.
2. If the tool returns verdict 'block', DO NOT install the package. Inform the user why.
3. If the tool returns verdict 'warn', inform the user of the risk and ask for confirmation before proceeding.
4. If the tool returns verdict 'allow', proceed with installation.
5. For batch installs, use 'check_packages_before_install' to check all packages at once.
6. NEVER skip this check, even if you are confident the package name is correct.

This protects against slopsquatting (AI-hallucinated package names), typosquatting, and known malware.`,
        },
      },
    ],
  }),
);

// ── Boot ────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('slopsquash MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
