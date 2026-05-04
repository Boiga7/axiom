---
type: entity
category: ai-tools
para: resource
tags: [openai, codex, coding-agent, cli, ai-tools, codex-1, agents-md]
sources: []
updated: 2026-05-03
tldr: "OpenAI's agentic coding suite: an open-source Rust CLI with three approval modes and a macOS/Windows desktop app with ambient background coding — the primary competitor to Claude Code."
---

# OpenAI Codex

> **TL;DR** OpenAI's agentic coding suite: an open-source Rust CLI with three approval modes and a macOS/Windows desktop app with ambient background coding — the primary competitor to [[ai-tools/claude-code]].

Two distinct products share the Codex name: the **CLI** (terminal agent, open-source, self-hosted) and the **Codex app** (desktop agent with cloud-parallel task execution). Both are powered by `codex-1`.

---

## The CLI

### What It Is

A lightweight terminal coding agent released in April 2025. Originally TypeScript; rewritten to Rust in June 2025 — 95.6% of the codebase is now Rust. The rewrite significantly reduced startup time and resource usage. Apache 2.0 licensed.

```bash
npm install -g @openai/codex
codex
```

GitHub: `openai/codex` — 75k+ stars, 14.5M monthly npm downloads, 400+ contributors as of early 2026.

### Approval Modes

Three modes define how much the agent can do without stopping for confirmation:

| Mode | File edits | Shell commands | When to use |
|---|---|---|---|
| `suggest` | Requires approval | Requires approval | Default; safest for production machines |
| `auto-edit` | Auto-applied | Requires approval | Day-to-day development |
| `full-auto` | Auto-applied | Auto-applied | Isolated containers, disposable environments |

Switch mid-session with `/mode` — no restart required. `full-auto` is the equivalent of Claude Code's `bypassPermissions` and carries the same risks outside an isolated environment.

### Sandboxing

The sandbox is the boundary that lets Codex act autonomously without unrestricted machine access. In Auto preset, Codex can read files, make edits, and run commands inside the working directory. For Codex cloud tasks, internet access is configurable: full access or a domain allow-list.

### MCP Support

Codex CLI supports [[protocols/mcp]] servers, using the same tool connectivity layer as [[ai-tools/claude-code]] and other modern coding agents.

### AGENTS.md

Codex reads `AGENTS.md` from the repo root for project-level instructions — the direct counterpart to Claude Code's `CLAUDE.md`. Both files serve the same purpose: tell the agent how the project is structured, what commands to run for tests and lint, and what conventions to follow.

`AGENTS.md` is now an open standard stewarded by the Agentic AI Foundation under the Linux Foundation, supported by 60+ tools including Cursor, GitHub Copilot, Windsurf, Aider, Gemini CLI, Devin, and JetBrains Junie. Teams often maintain both: `AGENTS.md` for universal agent rules, `CLAUDE.md` importing `AGENTS.md` and adding Claude-specific enhancements.

---

## The Codex App

A desktop application launched February 2026 on macOS; Windows support followed in March 2026.

### Ambient Coding

The defining feature: Codex can work in the background while you do other things. Multiple agents run in parallel, using computer-use capabilities (seeing, clicking, and typing with its own cursor) without interfering with your active session. Agents can operate on ongoing and repeatable work, remember preferences, and learn from previous actions.

### Developer Workflow Features

- PR review: addresses GitHub review comments, reviews open pull requests
- Task assignment from GitHub issues
- Multiple terminal tabs
- Remote devbox connections via SSH (alpha)
- In-app browser for iterating on frontend designs
- Parallel agent dispatch from a single command centre UI

### Cloud Parallel Execution

Tasks are dispatched to isolated cloud containers. Each container has internet access (configurable), code execution, and git. This allows dispatching many tasks simultaneously and collecting results — a structural differentiator from Claude Code's local-first model.

---

## The Model: codex-1

`codex-1` is a version of o3 optimised specifically for software engineering tasks. Key characteristics:

- Context window: 192,000 tokens
- SWE-bench Verified: **72.1%** (surpasses o3-high at 71.7%; 85% with up to 8 retries)
- First-attempt accuracy on software engineering tasks: ~37%; climbs to 70.2% with retries
- Fine-tuned to produce clean diffs, follow repo conventions, and prefer verifiable actions

The CLI also supports other OpenAI models via the `--model` flag.

---

## Comparison: Codex CLI vs Claude Code

| Dimension | Codex CLI | Claude Code |
|---|---|---|
| Implementation | Rust (open-source, Apache 2.0) | TypeScript (proprietary) |
| Default model | codex-1 (o3-based, SWE-bench 72.1%) | Claude Sonnet 4.6 (SWE-bench ~60%) |
| Approval modes | suggest / auto-edit / full-auto | default / bypassPermissions |
| Project config file | `AGENTS.md` (open standard, 60+ tools) | `CLAUDE.md` (Anthropic-specific) |
| Multi-agent | Cloud parallel containers | Local subagents + worktrees |
| MCP support | Yes | Yes (native host) |
| Hooks system | No equivalent | `PreToolUse` / `PostToolUse` / `Stop` |
| Skills / slash commands | Agent Skills (SKILL.md pattern) | Skills via `~/.claude/plugins/` |
| `/ultrareview` equivalent | None | Yes (multi-agent cloud review) |
| Desktop app | Yes (macOS + Windows, Feb/Mar 2026) | No standalone app (IDE extensions only) |
| Ambient background coding | Yes (computer use, parallel agents) | No |
| Self-hostable | Yes (CLI is fully local) | Yes (CLI is local) |

### When to Choose Codex

- You need cloud-parallel task execution across many isolated containers simultaneously.
- You want an open-source, auditable Rust binary with a permissive licence.
- Your team uses `AGENTS.md` as the cross-tool standard and needs Codex to read it natively.
- `full-auto` mode inside CI or ephemeral containers is the target workflow.

### When to Choose Claude Code

- You need hooks for automated lint, test, or guardrail enforcement on every tool call.
- Multi-agent coordination with strict file ownership and worktree isolation matters.
- The broader MCP ecosystem (native host, first-party servers) is important.
- `/ultrareview` parallel code review from multiple angles is valuable.

---

## Key Facts

- CLI released: April 2025 (TypeScript); rewritten to Rust: June 2025
- Codex app (macOS): February 2026; Windows: March 2026
- GitHub stars: 75k+ (as of early 2026)
- Model: `codex-1` — o3 fine-tuned for software engineering, 192k context window
- SWE-bench Verified: 72.1% (first attempt); 85% (up to 8 retries)
- Licence: Apache 2.0
- `AGENTS.md`: open standard, Linux Foundation, 60+ tools
- Approval modes: `suggest` (default) → `auto-edit` → `full-auto`
- `/mode` command switches approval mode mid-session without restart

---

## Connections

- [[ai-tools/claude-code]] — direct competitor; comparison table above
- [[ai-tools/cursor-copilot]] — also reads `AGENTS.md`; comparison of autonomy and pricing
- [[ai-tools/aider]] — open-source CLI peer; repo-map approach vs Codex's full-context style
- [[protocols/mcp]] — shared tool connectivity layer
- [[agents/openai-agents-sdk]] — OpenAI's programmatic agent SDK; Codex is the interactive CLI counterpart
- [[apis/openai-api]] — codex-1 is accessed via the OpenAI API; Responses API underpins cloud tasks
- [[evals/benchmarks]] — SWE-bench Verified is the primary benchmark for coding agents
- [[papers/swe-bench]] — the benchmark paper that established SWE-bench as the coding agent gold standard
