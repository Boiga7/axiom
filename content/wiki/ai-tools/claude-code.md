---
type: entity
category: ai-tools
tags: [claude-code, cli, agents, mcp, hooks, subagents, claude, coding-assistant]
sources: []
updated: 2026-04-29
para: resource
tldr: Claude Code is Anthropic's autonomous agentic coding CLI that reads entire codebases, runs shell commands, uses MCP tools, and spawns subagents — the most capable agentic coding tool as of April 2026.
---

# Claude Code

> **TL;DR** Claude Code is Anthropic's autonomous agentic coding CLI that reads entire codebases, runs shell commands, uses MCP tools, and spawns subagents — the most capable agentic coding tool as of April 2026.

Anthropic's agentic coding CLI. Not a code completion tool — an autonomous agent that reads your codebase, plans multi-step changes, runs tests, uses MCP tools, and executes shell commands. The most capable agentic coding tool as of April 2026.

---

## What It Is

Claude Code runs in the terminal (or IDE extension) as an interactive agent loop. You describe a task; it reads files, writes code, runs commands, and iterates until done. It's Claude Sonnet 4.6 by default (switchable to Opus).

```bash
npm install -g @anthropic-ai/claude-code
claude
```

---

## Core Capabilities

### File Operations
Reads, writes, and edits files. Understands entire codebases — not just the file you're looking at.

### Shell Execution
Runs arbitrary shell commands: `npm test`, `git diff`, `python script.py`, etc. Sees the output and adapts.

### MCP Integration
Claude Code is an MCP host. Any MCP server can be added:
```bash
claude mcp add server-name -- command --args
# or
claude mcp add --transport http https://api.example.com/mcp
```

Built-in first-party MCP servers: filesystem, git, GitHub, Brave search, memory, and more.

### Subagents
For complex parallel tasks, Claude Code can spawn subagents — separate agent instances that run independently and report back. Enables true parallel work (e.g. three subagents each working on a different module).

### Worktrees
Agent-safe isolation via git worktrees:
```bash
claude --worktree  # or configured via settings.json
```
Creates an isolated git worktree so the agent can make changes without touching your working branch.

---

## CLAUDE.md

The governance file that tells Claude Code how to behave in a project. Lives at the repo root or any parent directory. Loaded automatically at session start.

**Key sections:**
- Mode (CODE / DESIGN / VAULT / MIXED)
- Build/test/lint commands
- Key file paths
- Domain glossary
- Custom rules ("Always", "Never")

This wiki's vault is governed by `Nexus/CLAUDE.md`.

---

## Hooks

Shell commands that run automatically in response to tool events. Configured in `settings.json` or `.claude/settings.local.json`.

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{"type": "command", "command": "echo 'Running: $CLAUDE_TOOL_INPUT'"}]
    }],
    "PostToolUse": [{
      "matcher": "Write",
      "hooks": [{"type": "command", "command": "npm run lint -- $CLAUDE_TOOL_OUTPUT_PATH"}]
    }]
  }
}
```

Hook events: `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`. Use cases: auto-lint after writes, logging, permission gates, environment setup.

---

## Skills (SKILL.md)

Custom slash commands installed as plugins. Each skill is a markdown file with instructions that Claude loads when invoked. The `superpowers` plugin (used in this project) provides TDD, debugging, code review, and other workflow skills.

```bash
claude /my-skill-name
```

Skills live in `~/.claude/plugins/` or are installed via npm packages.

---

## Settings Reference

`settings.json` (global: `~/.claude/settings.json`, project: `.claude/settings.json`):

```json
{
  "model": "claude-opus-4-7",
  "theme": "dark",
  "permissions": {
    "allow": ["Bash(git:*)", "Read", "Write", "Edit"],
    "deny": ["Bash(rm -rf *)"]
  },
  "mcp": {
    "servers": {...}
  }
}
```

Permission modes: `default` (interactive confirmation), `bypassPermissions` (auto-approve all — use with caution).

---

## IDE Extensions

- **VS Code** (`@anthropic-ai/claude-code` extension) — sidebar panel, inline editing
- **JetBrains** (IntelliJ, WebStorm, PyCharm) — same agent, native IDE UI

The extension shares the same session as the terminal CLI — they're the same agent.

---

## /ultrareview

A multi-agent cloud review command. Launches multiple review agents in parallel to analyse the current branch from different angles (architecture, security, test coverage, performance). Billed. Not available in subagents — user-triggered only.

```bash
claude /ultrareview          # review current branch
claude /ultrareview 123      # review GitHub PR #123
```

---

## Comparison with Alternatives

| Tool | Autonomy | Context | Tool use | Cost/mo |
|---|---|---|---|---|
| **Claude Code** | Highest | Full codebase + shell | MCP ecosystem | Usage-based |
| **Cursor** | Medium | File + selection | Composer, MCP | $20 |
| **GitHub Copilot** | Low–Medium | File context | MCP (VS Code 1.99+) | $10–19 |
| **Aider** | High | Repo map | Limited | Free/usage |
| **Devin** | Highest (async) | Full environment | VM access | $500 |

See [[ai-tools/cursor-copilot]] for comparison details.

---

## Key Facts

- Install: `npm install -g @anthropic-ai/claude-code`
- Default model: Claude Sonnet 4.6 (switchable to Opus)
- Hook events: `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`
- Permission modes: `default` (interactive), `bypassPermissions` (auto-approve — use with caution)
- `/ultrareview` is user-triggered only; not available inside subagents
- VS Code and JetBrains extensions share the same agent session as the terminal CLI
- Skills (SKILL.md) live in `~/.claude/plugins/` or are installed via npm packages
- Up to 4 cache breakpoints per request when calling the underlying Anthropic API

## Connections

- [[protocols/mcp]] — the tool connectivity layer Claude Code uses natively
- [[agents/multi-agent-patterns]] — subagent patterns Claude Code implements
- [[apis/anthropic-api]] — the underlying API Claude Code runs on; prompt caching applies
- [[ai-tools/cursor-copilot]] — comparison of autonomy, context, and pricing across tools

## Open Questions

- How does Claude Code's subagent context isolation compare to LangGraph's checkpointed state in long-running tasks?
- What are the token cost implications of full-codebase context vs repo-map approaches (Aider)?
- When will the hooks system support asynchronous hooks that don't block the agent loop?
