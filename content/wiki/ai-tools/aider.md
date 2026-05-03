---
type: entity
category: ai-tools
tags: [aider, coding-assistant, cli, repo-map, architect-mode, editor-mode, open-source]
sources: [raw/inbox/aider-websearch-2026-05-03.md]
updated: 2026-05-03
para: resource
tldr: Open-source CLI AI coding assistant. Architect mode uses two models — one designs the solution, one applies file edits — beating single-model code mode for complex multi-file changes. Repo map gives the LLM full codebase context via tree-sitter.
---

# Aider

> **TL;DR** Open-source CLI AI coding assistant. Architect mode uses two models — one designs the solution, one applies file edits — beating single-model code mode for complex multi-file changes. Repo map gives the LLM full codebase context via tree-sitter.

The open-source CLI coding assistant most comparable to Claude Code for whole-repo editing. Aider works inside any terminal, supports any Git repo, creates atomic commits per change, and lets you pair LLMs: a powerful "architect" model reasons about what to change while a cheaper/faster "editor" model applies the file edits.

> [Source: aider.chat, 2026-05-03]

---

## Key Facts

- **Website**: https://aider.chat
- **Install**: `pip install aider-chat`
- **License**: Apache 2.0
- **Git integration**: creates atomic commits with co-authored-by attribution
- **Repo map**: tree-sitter based; indexes function signatures, class definitions, and file structure
- **Models supported**: Claude, GPT-4o, Gemini, DeepSeek, local models via Ollama
- **Benchmarks**: Aider Polyglot leaderboard (225 exercises across C++, Go, Java, JS, Python, Rust)

---

## Modes

### Code mode (default)
One model proposes the solution and applies file edits. Works well for straightforward single-file changes.

```bash
aider --model claude-opus-4-7 app.py
> Add input validation to the create_user function
```

### Architect mode
Two models collaborate: an architect designs the solution; an editor applies the edits to files. Significantly better for complex, multi-file changes where reasoning and editing are separate skills.

```bash
aider --architect --model claude-opus-4-7 --editor-model claude-haiku-4-5
> Refactor the auth module to use JWT instead of session tokens
```

The architect model sees the full context (repo map + relevant files) and proposes the changes in natural language. The editor model converts the proposal into precise file edits using `editor-diff` or `editor-whole` format.

**When to use architect mode:**
- Multi-file refactors
- Architecture changes spanning multiple modules
- When the default model produces incomplete or incorrect edits
- When you want to use a cheaper editor model to reduce cost

### Ask mode
Chat without modifying files — for exploring options, understanding code, or getting a plan before committing to changes.

```bash
aider --ask
> What's the best approach to add rate limiting to this API?
```

### Watch mode
Aider monitors your files for AI comments (e.g., `# AI: add type hints to this function`) and triggers automatically. Useful for annotation-driven development.

---

## Repo Map

Aider builds a map of your entire repository using tree-sitter:
- Extracts function signatures, class definitions, method names
- Compresses to fit in the LLM's context window
- Prioritises files most relevant to the current task
- Updated dynamically as files change

This gives the LLM awareness of the whole codebase without requiring it to read every file. The repo map is the key reason Aider can propose cross-file changes coherently.

---

## Git Workflow

Every change Aider makes is committed as an atomic commit:

```
Add input validation to create_user

Co-Authored-By: aider (claude-opus-4-7) <aider@example.com>
```

Benefits:
- Easy to `git diff HEAD~1` to review what Aider did
- Easy to `git revert` if the change is wrong
- Clean history showing which commits were AI-assisted

---

## Configuration

```bash
# ~/.aider.conf.yml
model: claude-opus-4-7
architect: true
editor-model: claude-haiku-4-5-20251001
auto-commits: true
cache-prompts: true   # prompt caching for Anthropic models
```

Or via environment:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
aider --model claude-sonnet-4-6 --architect
```

---

## Integrations

- **/web**: fetch and include a URL's content in context (`/web https://docs.example.com`)
- **/voice**: voice input via whisper
- **/paste**: paste clipboard content into context
- **/run**: run shell commands and add output to context
- **MCP servers**: can consume MCP tools as part of the workflow [unverified — check docs]

---

## vs Claude Code

| Dimension | Aider | Claude Code |
|---|---|---|
| Interface | CLI (any terminal) | CLI + IDE extensions |
| Autonomy | Lower — proposes, you accept | Higher — executes shell commands |
| Repo map | Built-in (tree-sitter) | CLAUDE.md + dynamic context |
| Git commits | Automatic (atomic) | Manual or on request |
| Model flexibility | Any model (multi-provider) | Claude only |
| Cost control | Architect+editor split | Single model |
| Best for | Terminal-native devs, model experimentation | Autonomous multi-step tasks |

---

## Connections

- [[ai-tools/claude-code]] — Claude Code is the closest equivalent from Anthropic; higher autonomy, Claude-only
- [[ai-tools/cursor-copilot]] — Cursor is the IDE-integrated alternative; less CLI-native
- [[apis/anthropic-api]] — Aider uses the Anthropic SDK for Claude models; prompt caching supported
- [[prompting/context-engineering]] — repo map is a form of context engineering at the tool layer

## Open Questions

- Does Aider's architect mode outperform Claude Code's agent mode on SWE-bench tasks?
- How does watch mode interact with CI/CD pipelines for annotation-driven development?
- What is the repo map size limit before tree-sitter compression degrades quality?
