---
type: concept
category: tools
para: resource
tags: [mcp, distribution, npm, pypi, docker, publishing, smithery]
tldr: "Distributing MCP servers — npm (Node.js), PyPI (Python), Docker Hub, and Smithery registry. Package once, install anywhere Claude Desktop, Claude Code, or any MCP client can reach."
sources: []
updated: 2026-05-06
---

# MCP Server Distribution

> **TL;DR** Distributing MCP servers — npm (Node.js), PyPI (Python), Docker Hub, and Smithery registry. Package once, install anywhere Claude Desktop, Claude Code, or any MCP client can reach.

MCP servers are distributed like any other developer tool — via package registries. The choice of distribution format determines how users install and run the server. This page covers the packaging and publishing workflow for each format.

---

## Distribution Formats

| Format | Runtime | Install command | Best for |
|---|---|---|---|
| **npm package** | Node.js | `npx @scope/server-name` | TypeScript/JavaScript servers |
| **PyPI package** | Python | `uvx server-name` | Python servers |
| **Docker image** | Any | `docker pull org/server` | Multi-language, isolated servers |
| **Smithery** | Any | Via Smithery registry | Discoverability + managed config |

The `npx` and `uvx` patterns are the most common — they download and run without a persistent install, making them easy to add to `claude_desktop_config.json`.

---

## npm Distribution (Node.js / TypeScript)

### package.json setup

```json
{
  "name": "@yourorg/mcp-server-name",
  "version": "1.0.0",
  "description": "MCP server for X",
  "bin": {
    "mcp-server-name": "dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

The `bin` field is what makes `npx @yourorg/mcp-server-name` work — it points to the entry script.

### Entry point

```typescript
#!/usr/bin/env node
// dist/index.js — must have the shebang line
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, { capabilities: { tools: {} } });
// ... register tools

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Publish to npm

```bash
npm login
npm publish --access public
```

For scoped packages (`@org/name`): `npm publish --access public` is required (scoped packages default to private).

### Claude Desktop config

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@yourorg/mcp-server-name"]
    }
  }
}
```

`-y` auto-confirms the install prompt. Users don't need to run `npm install` separately.

---

## PyPI Distribution (Python)

### pyproject.toml setup

```toml
[project]
name = "mcp-server-name"
version = "1.0.0"
description = "MCP server for X"
requires-python = ">=3.10"
dependencies = ["mcp>=1.0.0"]

[project.scripts]
mcp-server-name = "mcp_server_name:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

The `[project.scripts]` entry point is what `uvx mcp-server-name` calls.

### Publish to PyPI

```bash
pip install build twine
python -m build
twine upload dist/*
```

Or with uv:
```bash
uv build
uv publish
```

Use Trusted Publishers (OIDC from GitHub Actions) to avoid storing PyPI tokens:

```yaml
- name: Publish to PyPI
  uses: pypa/gh-action-pypi-publish@release/v1
  # No token needed with Trusted Publishers — OIDC handles auth
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "my-server": {
      "command": "uvx",
      "args": ["mcp-server-name"]
    }
  }
}
```

`uvx` runs the package in an ephemeral virtual environment without installing it globally.

---

## Docker Distribution

Docker is suitable for servers with complex dependencies, non-Node/Python runtimes, or servers that need filesystem isolation.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -e .
CMD ["python", "-m", "mcp_server_name"]
```

Publish to Docker Hub:
```bash
docker build -t yourorg/mcp-server-name:latest .
docker push yourorg/mcp-server-name:latest
```

### Claude Desktop config (Docker STDIO)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "yourorg/mcp-server-name:latest"]
    }
  }
}
```

`-i` keeps STDIN open (required for STDIO transport). `--rm` removes the container on exit.

---

## Smithery Registry

Smithery (smithery.ai) is a dedicated MCP server registry and deployment platform. It provides:
- Searchable catalogue of MCP servers
- Managed configuration UI (no manual JSON editing)
- One-click install into Claude Desktop
- Usage analytics and versioning

**Submitting to Smithery:** Publish your server to npm or PyPI first, then submit via the Smithery dashboard. Smithery pulls from those registries.

---

## MCP Registry (AAIF / Linux Foundation)

The formal MCP Registry (governed by AAIF/Linux Foundation) is for verified, namespace-controlled server listings. See [[protocols/mcp-registry]] for the submission workflow.

---

## Versioning and Release

Follow semantic versioning. MCP tool schema changes are breaking changes:
- Adding a new tool → minor bump
- Removing or renaming a tool → major bump
- Adding an optional parameter to a tool → minor bump
- Adding a required parameter → major bump

Automate releases with GitHub Actions triggered on version tags (same pattern as VS Code extension publishing).

---

## Key Facts

- npm: `bin` field + shebang line → enables `npx @org/server-name` install-on-demand pattern
- PyPI: `[project.scripts]` entry point → enables `uvx server-name` ephemeral execution
- Docker `-i` flag is required for STDIO transport — without it the container has no STDIN
- Smithery provides discoverability on top of npm/PyPI — publish there first, submit second
- Tool schema changes that remove or rename tools are breaking changes → major version bump
- Trusted Publishers (OIDC) eliminate the need for long-lived PyPI tokens in CI

## Connections

- [[tools/github-marketplace-apps]] — GitHub Marketplace for GitHub Apps; same principle of registry-based distribution
- [[protocols/mcp]] — MCP spec, tool schema, transport types; the protocol your distributed server implements
- [[protocols/mcp-server-development]] — building the server itself before distributing it
- [[protocols/mcp-registry]] — formal AAIF/Linux Foundation registry for namespace-verified submissions
- [[python/pypi-distribution]] — detailed PyPI publishing workflow: Trusted Publishers, pyproject.toml, uv workspaces
- [[ai-tools/claude-code]] — Claude Code discovers MCP servers from `claude_desktop_config.json` and project-level `.mcp.json`

## Open Questions

- Does Smithery enforce security scanning before listing, or is it self-reported?
- Is there a standard for MCP server health checks / readiness probes when running as Docker containers?
