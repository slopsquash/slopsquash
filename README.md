# slopsquash

An MCP server that stops AI agents from installing slopsquatted packages.

## The problem

LLMs hallucinate package names, and attackers publish malware under those exact names betting your agent will install it without a human checking first. Axios, chalk/debug, TanStack, Bitwarden CLI, all compromised in the last year. When an agent installs packages directly, there's no one left to catch a name that just sounds real.

## What it does

slopsquash runs as an MCP server your agent calls before every install. It checks whether the package actually exists, how long it's been published, and whether it matches known slopsquat patterns, then blocks or warns before the install happens.

## Why this and not Aikido/PMG/Socket

Those tools guard against known-malicious packages and enforce install age. slopsquash guards the step before that: catching hallucinated names an agent invents on its own.

## Quick start

### Install

```bash
npm install -g slopsquash
```

Or run directly with npx — no install needed:

```bash
npx slopsquash
```

### CLI

```bash
# Default greeting
slopsquash
# Hello, world! 👋  You've been slopsquashed.

# Named greeting
slopsquash Alice
# Hello, Alice! 👋  You've been slopsquashed.
```

### Library

```typescript
import { greet } from "slopsquash";

console.log(greet());        // Hello, world! 👋  You've been slopsquashed.
console.log(greet("Alice")); // Hello, Alice! 👋  You've been slopsquashed.
```

### MCP server

slopsquash ships a stdio-based MCP server that exposes a `greet` tool. Connect it to any MCP host.

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slopsquash": {
      "command": "npx",
      "args": ["slopsquash-mcp"]
    }
  }
}
```

#### VS Code / Cursor / any MCP client

```json
{
  "command": "npx",
  "args": ["slopsquash-mcp"]
}
```

Restart the host after saving. The server exposes one tool:

| Tool    | Input          | Description                                      |
|---------|----------------|--------------------------------------------------|
| `greet` | `name?` string | Say hello via slopsquash. Omit name for default.  |

## Status

Early and actively built. The greet tool is a stub — real slopsquat-detection logic is coming. Feedback, issues, and PRs welcome.

## License

GPL-3.0
