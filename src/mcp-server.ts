#!/usr/bin/env node

/**
 * slopsquash MCP server — a minimal shim server over stdio.
 *
 * Exposes one tool: "greet"
 *
 * Configure in Claude Desktop (or any MCP host):
 *   {
 *     "mcpServers": {
 *       "slopsquash": {
 *         "command": "npx",
 *         "args": ["slopsquash-mcp"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { greet } from "./index.js";

const server = new McpServer({
  name: "slopsquash",
  version: "0.1.0",
});

// ── Tool: greet ────────────────────────────────────────────────────────
server.registerTool(
  "greet",
  {
    description: "Say hello via slopsquash. Optionally pass a name.",
    inputSchema: {
      name: z
        .string()
        .optional()
        .describe("Name to greet. Omit for a generic hello."),
    },
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: greet(name),
        },
      ],
    };
  },
);

// ── Boot ───────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("slopsquash MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
