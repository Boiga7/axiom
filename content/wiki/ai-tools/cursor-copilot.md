---
type: entity
category: ai-tools
tags: [cursor, copilot, ide, coding-assistant, comparison, mcp]
sources: []
updated: 2026-04-29
para: resource
tldr: Comparison of Cursor and GitHub Copilot — the two dominant IDE-integrated coding assistants — covering features, pricing, and where each fits relative to Claude Code and Aider.
---

# Cursor and GitHub Copilot

> **TL;DR** Comparison of Cursor and GitHub Copilot — the two dominant IDE-integrated coding assistants — covering features, pricing, and where each fits relative to Claude Code and Aider.

The two most popular IDE-integrated AI coding assistants. Neither reaches Claude Code's autonomy level, but both integrate into existing workflows with less friction.

---

## Cursor

A VS Code fork with AI built into the editor itself. Not a plugin — a separate application with native AI integration throughout the IDE.

### Key Features

**Composer / Agent mode:** Multi-file editing with a goal. Describe a feature; Cursor reads relevant files, proposes a plan, makes edits across multiple files. Less autonomous than Claude Code (no shell execution by default), but more visual.

**Inline editing (Cmd+K):** Highlight code, describe a change. Cursor applies it.

**Chat (Cmd+L):** Context-aware chat that references the file you're editing, your entire codebase (via repo indexing), docs, and web search.

**Rules (`.cursorrules`):** The equivalent of `CLAUDE.md` for Cursor. Define project conventions, preferred patterns, what to avoid.

```
# .cursorrules
You are helping with a Python FastAPI project.
- Use async/await throughout
- Use Pydantic v2 for all data models
- No print statements — use structlog
- Tests use pytest with pytest-asyncio mode=auto
```

**MCP support:** Cursor supports MCP servers. Add to `~/.cursor/mcp.json` or project-level `.cursor/mcp.json`.

### Models

Cursor routes between models based on task type. You can select specific models:
- Claude Sonnet 4.6 — default for agent/composer tasks
- Claude Haiku 4.5 — fast inline completions
- GPT-4o — alternative for code
- Cursor's own Cursor-Fast for completions

### Pricing

$20/month (Pro). Includes 500 fast requests and unlimited slow requests per month. Team plan at $40/user/month.

---

## GitHub Copilot

Microsoft/GitHub's AI assistant. More conservative than Cursor — inline suggestions first, chat second.

### Features

**Inline completions:** Ghost text suggestions as you type. The original Copilot feature. Tab to accept.

**Copilot Chat:** Conversational chat within VS Code. Context-aware. Can reference open files, selected code, terminal output.

**Copilot Edits:** Multi-file editing via natural language (newer feature). Similar to Cursor Composer but less developed.

**MCP support (VS Code 1.99+):** Full MCP host support. Add MCP servers to `settings.json`:
```json
{
  "github.copilot.mcp.servers": {
    "my-server": {
      "type": "stdio",
      "command": "python",
      "args": ["-m", "my_mcp_server"]
    }
  }
}
```

### Models

Copilot uses Claude Sonnet 4.6, GPT-4o, and Gemini models depending on task. The model routing is partially transparent via the model picker in VS Code.

### Pricing

Individual: $10/month. Business: $19/user/month. Enterprise: $39/user/month.

---

## Comparison Matrix

| Aspect | Claude Code | Cursor | Copilot |
|---|---|---|---|
| **Autonomy** | Highest (shell, subagents, worktrees) | Medium (multi-file, plan-first) | Lower (inline, chat, edits) |
| **Context** | Full codebase + shell + MCP | Repo index + docs | File + selected code |
| **Shell execution** | Yes (core feature) | Optional (unsafe mode) | No |
| **MCP support** | Native + extensive ecosystem | Yes | Yes (VS Code 1.99+) |
| **Workflow** | Terminal / IDE extension | IDE (VS Code fork) | IDE plugin (any editor) |
| **Pricing** | Usage-based (can be expensive for heavy use) | $20/mo fixed | $10/mo fixed |
| **Best for** | Complex multi-file refactors, autonomous tasks | Daily development, multi-file changes | Inline completions, quick questions |

---

## Aider

Open-source CLI alternative to both. Repository-aware, multi-file editing, works with any LLM via API.

```bash
pip install aider-chat
aider --model claude-sonnet-4-6 --file src/app.py
```

**Architect mode:** A planning model (Opus) designs the change; an editor model (Sonnet/Haiku) implements it. Good for complex refactors.

**Repo map:** Aider builds a tree-sitter based map of the codebase for context-efficient references.

---

## Choosing

- **Claude Code** — multi-step autonomous tasks, refactors across many files, anything requiring shell
- **Cursor** — daily development where you want an IDE-native experience with good multi-file editing
- **Copilot** — team standardisation, tight GitHub integration, or you prefer staying in your existing editor
- **Aider** — open-source preference, want to pick your own model, CLI-centric workflow

---

## Key Facts

- Cursor pricing: $20/month Pro (500 fast requests + unlimited slow); $40/user/month Team
- GitHub Copilot pricing: $10/month Individual, $19/month Business, $39/month Enterprise
- Cursor uses VS Code fork architecture — not a plugin, a separate application
- Cursor MCP config: `~/.cursor/mcp.json` or `.cursor/mcp.json` (project-level)
- Copilot MCP support added in VS Code 1.99+
- Cursor default agent model: Claude Sonnet 4.6; fast completions: Claude Haiku 4.5
- `.cursorrules` is the Cursor equivalent of `CLAUDE.md`
- Aider architect mode: Opus plans, Sonnet/Haiku implements

## Connections

- [[ai-tools/claude-code]] — Claude Code comparison; higher autonomy, shell execution, MCP ecosystem
- [[protocols/mcp]] — MCP servers available to Cursor, Copilot, and Claude Code alike

## Open Questions

- How does Cursor's repo index compare to Claude Code's full file-read approach for large monorepos?
- Will Copilot Edits eventually reach Cursor Composer parity in multi-file edit quality?
- What is the real-world cost comparison between Cursor's fixed $20/month and Claude Code's usage-based pricing for a typical developer?
