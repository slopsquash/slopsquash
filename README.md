# slopsquash

An AI-native MCP server and CLI that stops autonomous agents from installing slopsquatted or malicious packages.

## The problem

LLMs hallucinate package names, and attackers publish malware under those names, betting your agent will install it without a human checking first. Axios, chalk/debug, TanStack, Bitwarden CLI, all compromised in the last year. When an agent installs packages directly, there's no one left to catch a name that sounds real.

## What it does

**slopsquash** is a fire-and-forget safety net. It runs as an MCP server that your AI agent is instructed to call before every package install.

It checks packages using a lightning-fast, 5-stage pipeline:

1. **Known Malicious:** Blocks packages manually flagged or reported by the community.
2. **Similarity Engine:** Detects typosquatting against the top 10,000 packages using Levenshtein distance and Jaro-Winkler similarity (e.g. catches `chalks` for `chalk`).
3. **Hallucination Patterns:** Flags known AI-hallucinated packages (e.g. `llama_cpp`, `starlite-graphql`) based on curated datasets.
4. **Popularity Bypass:** Immediately allows known, high-impact packages without unnecessary network calls.
5. **Registry Checks:** Finally, queries `npmjs.org` or `pypi.org` to check if a package actually exists and warns if it's suspiciously brand-new.

### 🛡️ Zero Execution Risk

The entire codebase comprises of string comparisons, dictionary lookups, and metadata API calls. **We never run `npm install`, download tarballs, or execute package code.** It is fully isolated and safe.

## Quick start

### MCP Server

slopsquash provides a MCP server that AI agents use directly.

**Claude Desktop Configuration:**
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slopsquash": {
      "command": "npx",
      "args": ["-y", "slopsquash@latest", "slopsquash-mcp"]
    }
  }
}
```

The MCP Server exposes the following tools:

- `check_package_before_install`: Check a single package.
- `check_packages_before_install`: Batch check multiple packages.

It also provides an MCP Prompt (`package-install-safety`) which hosts can inject into the agent's system prompt to strongly reinforce the rule: _always check packages before running npm/pip install_.

### CLI

Check single or multiple packages before installing. Supports both `npm` (default) and `pypi`:

```bash
npx slopsquash check express chalks react
```

Output:

```
✅ express — ALLOW
   ℹ️  [popular] 'express' is a known popular package

🛑 chalks — BLOCK
   ↳ Did you mean: chalk
   🔴 [similarity] 'chalks' is suspiciously similar to popular package 'chalk' (edit distance: 1, similarity: 0.97)

✅ react — ALLOW
   ℹ️  [popular] 'react' is a known popular package
```

```bash
npx slopsquash check requests llama_cpp --pypi
```

Output:

```
✅ requests — ALLOW
   ℹ️  [popular] 'requests' is a known popular package

🛑 llama_cpp — BLOCK
   🔴 [pattern] 'llama_cpp' matches a known AI-hallucinated package name
   🟡 [registry] 'llama_cpp' was not found on the pypi registry
```

### Library Usage (TypeScript)

Use the pipeline directly in your Node projects:

```typescript
import { checkPackage, checkPackages } from "slopsquash";

const result = await checkPackage("expresss", "npm");
console.log(result.verdict); // "block"
console.log(result.suggestion); // "express"
```

### MCP Server

<<<<<<< HEAD
slopsquash provides a stdio-based MCP server that AI agents use directly. You can configure it in any MCP-compatible host.

**Claude Code:**

```bash
claude mcp add slopsquash -- npx -y slopsquash@latest slopsquash-mcp
```

**Codex:**

```bash
codex mcp add slopsquash -- npx -y slopsquash@latest slopsquash-mcp
```

**Claude Desktop / Cursor / Windsurf / Others:**
Add the following to your MCP configuration file (e.g., `claude_desktop_config.json`):
=======
slopsquash provides a stdio-based MCP server that AI agents use directly.

**Claude Desktop Configuration:**
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

> > > > > > > 520fb35e52437212a4b53cd92e0f92f681de9094

```json
{
  "mcpServers": {
    "slopsquash": {
      "command": "npx",
      "args": ["-y", "slopsquash@latest", "slopsquash-mcp"]
    }
  }
}
```

The MCP Server exposes the following tools:

- `check_package_before_install`: Check a single package.
- `check_packages_before_install`: Batch check multiple packages.

It also provides an MCP Prompt (`package-install-safety`) which hosts can inject into the agent's system prompt to strongly reinforce the rule: _always check packages before running npm/pip install_.

## License

MIT
