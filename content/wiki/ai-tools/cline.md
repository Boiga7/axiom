---
type: entity
category: ai-tools
para: resource
tags: [cline, vs-code, coding-agent, autonomous, open-source, mcp, plan-act, clinerules]
sources: []
updated: 2026-05-03
tldr: Open-source autonomous AI coding agent running as a VS Code extension — reads/writes files, executes terminal commands, drives a real browser, and supports 30+ LLM providers; human approves each step by default.
---

# Cline

> **TL;DR** Open-source autonomous AI coding agent running as a VS Code extension. Reads/writes files, runs terminal commands, drives a browser via Puppeteer, and connects to MCP servers. Supports 30+ model providers. Requires human approval at each step by default; YOLO mode disables this.

Apache 2.0. 61k+ GitHub stars, 5M+ installs. Originated as "Claude Dev" in 2024 and has since expanded significantly. As of 2026 it runs in VS Code, JetBrains, Cursor, Windsurf, Zed, Neovim, and a preview CLI.

> [Source: github.com/cline/cline, marketplace.visualstudio.com — stars and installs verified 2026-05-03]

---

## How It Works

Cline runs in the VS Code extension host process (separate from the main UI), giving it deep access to editor state, open files, and workspace operations via the VS Code API. The agent loop:

1. Receive task in the Cline panel.
2. Read relevant files and terminal output.
3. Propose an action (file edit, terminal command, browser action, MCP call).
4. Present the action to the user for approval.
5. Execute on approval; observe output.
6. Repeat until task complete or blocked.

The core loop is agentic but gated — the human remains in the critical path at each step unless autonomy settings are relaxed.

---

## Core Capabilities

| Capability | Detail |
|---|---|
| File read/write | Creates, edits, and deletes files; monitors linter/compiler errors after edits |
| Terminal execution | Runs shell commands directly; captures stdout/stderr |
| Browser control | Puppeteer-backed headless browser: click, type, scroll, screenshot, console log capture |
| MCP tool use | Connects to stdio and SSE MCP servers; can auto-install via MCP Marketplace |
| Multi-provider LLMs | OpenRouter, Anthropic, OpenAI, Gemini, AWS Bedrock, Azure, GCP Vertex, Cerebras, Groq, LM Studio, Ollama, any OpenAI-compatible endpoint |

---

## Plan / Act Mode

The two-phase workflow for structured task execution:

- **Plan**: Cline reads the codebase, analyses the task, and writes a step-by-step plan before touching any file. No code changes during this phase.
- **Act**: Cline executes the plan one step at a time, with approval gates.

Plan mode is recommended for any non-trivial task. It reduces mid-task surprises and gives the user a cheap review point before destructive operations begin.

---

## Configuration — `.clinerules`

Project-scoped governance. Two forms:
- A single `.clinerules` file in the project root.
- A `.clinerules/` directory containing multiple markdown files, each scoped to specific file patterns or contexts.

Rules are version-controlled with the repo. Examples: coding standards, preferred libraries, off-limits files, output format conventions. Conditional rules can trigger only when specific file types or keywords appear in the task.

The equivalent of CLAUDE.md / `.cursorrules` in the Cline ecosystem.

---

## MCP Integration

Cline has a built-in MCP Marketplace — a curated registry of MCP servers that can be installed with one click. Categories include databases, observability tools, internal tooling connectors, and more. MCP Rules let you group connected servers and define trigger keywords so the right tools activate automatically based on what the task mentions.

Both stdio and SSE transports supported. This makes Cline extensible to essentially any external system that has an MCP server.

---

## Autonomy Controls

| Mode | Behaviour |
|---|---|
| Default | Approval required for every file change and terminal command |
| YOLO mode | Skips approval prompts; runs continuously until complete or error |
| Lazy Teammate Mode | More conservative; batches minor suggestions rather than executing immediately |
| Spend limits | Hard stop when API cost reaches a configured threshold |

---

## Context Window Management

Cline tracks token usage per conversation. When approaching context limits:
- Older messages are truncated from the conversation history.
- Cline surfaces a warning so the user can decide whether to start a new task or continue with truncated context.

No automatic summarisation; the truncation is explicit. For long-running tasks, breaking work into smaller sub-tasks is the recommended pattern.

---

## Comparison to Alternatives

| Dimension | Cline | Claude Code | Cursor | Aider |
|---|---|---|---|---|
| Interface | VS Code extension | CLI + IDE extensions | VS Code IDE | CLI |
| Autonomy | Medium (approval gates) | High (executes autonomously) | Medium | Lower (proposes, user accepts) |
| Model flexibility | 30+ providers | Claude only | Multiple | Any |
| Config file | `.clinerules` | `CLAUDE.md` | `.cursorrules` | `~/.aider.conf.yml` |
| MCP support | Native marketplace | Native (claude code plugins) | Supported | Via community MCP server (not native) |
| Browser control | Yes (Puppeteer) | No built-in | No | No |
| Open-source | Yes (Apache 2.0) | No | No | Yes (Apache 2.0) |
| Best for | VS Code users wanting model flexibility + browser automation | Autonomous multi-step terminal tasks | IDE-integrated AI pair programming | Terminal-native multi-provider experimentation |

---

## When to Use Cline

- You want an autonomous agent inside VS Code but are not locked to Claude.
- Task requires browser verification (e.g., check that UI changes look correct in a real browser).
- Team wants version-controlled coding standards enforced via `.clinerules/`.
- Need MCP tools (database access, observability, custom APIs) wired into the coding workflow.
- You want explicit approval gates rather than Claude Code's higher autonomy.

---

## Connections

- [[ai-tools/claude-code]] — Claude Code is the closest autonomous alternative; higher autonomy, Claude-only
- [[ai-tools/cursor-copilot]] — Cursor is the main IDE-integrated competitor; no browser control, strong inline completion
- [[ai-tools/aider]] — Aider is the CLI-native open-source alternative with architect mode
- [[protocols/mcp]] — MCP is Cline's primary extension mechanism; MCP Marketplace built on top of the protocol

## Open Questions

- How does Cline's agentic loop performance compare to Claude Code on SWE-bench style coding tasks?
- Does the YOLO mode + spend limit combination provide sufficient safety for unattended overnight runs?
