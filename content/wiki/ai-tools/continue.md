---
type: entity
category: ai-tools
para: resource
tags: [continue, ide, vscode, jetbrains, ai-coding, context-providers, open-source, autocomplete]
sources: []
updated: 2026-05-03
tldr: Open-source IDE extension for VS Code and JetBrains. The most configurable AI coding assistant — any model, any context provider, any provider via config.json. Community-maintained JetBrains plugin. Direct alternative to Copilot for teams wanting full control over model and context.
---

# Continue

> **TL;DR** Open-source AI code assistant for VS Code and JetBrains. Configurable via `~/.continue/config.json` — choose any model (Claude, GPT-4o, Gemini, local Ollama), add context providers (docs, codebase, web, terminal), and define custom slash commands. The alternative to Copilot when you need full control.

**GitHub:** [continuedev/continue](https://github.com/continuedev/continue)
**Docs:** docs.continue.dev
**License:** Apache 2.0

> [Source: docs.continue.dev, github.com/continuedev/continue, 2026-05-03]

---

## Key Facts

- **VS Code extension:** actively maintained by Continue team
- **JetBrains plugin:** community-maintained (as of 2025)
- **Model agnostic:** any model via config — Anthropic, OpenAI, Gemini, local Ollama, Azure OpenAI
- **Context providers:** modular system for injecting context (files, docs, web, terminal, codebase)
- **Autocomplete:** multi-line tab completion with configurable model
- **Chat:** sidebar chat with context awareness (`cmd/ctrl+L` VS Code, `cmd/ctrl+J` JetBrains)
- **Config format:** `~/.continue/config.json` (JSON) or `config.yaml`

---

## Configuration

All configuration lives in `~/.continue/config.json`. The file controls models, context providers, rules, and slash commands.

```json
{
  "models": [
    {
      "title": "Claude Sonnet",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "apiKey": "$ANTHROPIC_API_KEY"
    },
    {
      "title": "Ollama Llama 3",
      "provider": "ollama",
      "model": "llama3"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Starcoder2",
    "provider": "ollama",
    "model": "starcoder2:3b"
  },
  "contextProviders": [
    { "name": "code" },
    { "name": "docs" },
    { "name": "diff" },
    { "name": "terminal" },
    { "name": "problems" },
    { "name": "folder" },
    { "name": "codebase" }
  ],
  "slashCommands": [
    { "name": "edit", "description": "Edit selected code" },
    { "name": "comment", "description": "Write comments for selected code" },
    { "name": "share", "description": "Export conversation" }
  ],
  "rules": "Always use TypeScript. Prefer functional components. Never use `any`."
}
```

---

## Context Providers

Context providers are the core differentiator. They let you `@mention` specific context sources in the chat.

| Provider | Usage | What it injects |
|---|---|---|
| `@file` | `@src/api/users.ts` | Specific file contents |
| `@folder` | `@src/components` | All files in a folder |
| `@codebase` | `@codebase` | Semantic search over entire repo (embeddings) |
| `@docs` | `@React` | Indexed docs from any URL |
| `@diff` | `@diff` | Current git diff |
| `@terminal` | `@terminal` | Last terminal output |
| `@problems` | `@problems` | VS Code diagnostics / lint errors |
| `@web` | `@web latest Pydantic v2 changes` | Real-time web search |
| `@clipboard` | `@clipboard` | Current clipboard content |
| `@url` | `@https://example.com/api` | Content from a specific URL |

The `@codebase` provider builds an embedding index of the repo locally — the closest equivalent to Cursor's codebase context.

---

## Usage Patterns

### Chat with file context

```
@src/models/order.py why does the status field allow null?
```

### Inline edit (cmd+I)

Select code → `cmd+I` → describe the change. Continue rewrites the selection and shows a diff.

### Tab autocomplete

Continue shows multi-line completions as you type. Tab to accept, Escape to dismiss. Uses a dedicated smaller model (e.g., Starcoder2 via Ollama) to keep latency low.

### Slash commands

```
/edit add error handling to this function
/comment explain what this function does
/share export this conversation as markdown
```

Custom slash commands can run any prompt template against the selected context.

---

## Comparison with Other AI Coding Tools

| Feature | Continue | Cursor | GitHub Copilot | Claude Code | Aider |
|---|---|---|---|---|---|
| IDE | VS Code, JetBrains | VS Code (fork) | VS Code, JetBrains, others | Terminal | Terminal |
| Model | Any (configurable) | Cursor models + API | Copilot / API key | Claude | Any |
| Codebase context | Embeddings (`@codebase`) | Deep codebase index | Limited | Full repo via tools | Repo map (tree-sitter) |
| Autocomplete | Yes (configurable) | Yes | Yes | No | No |
| Open source | Yes (Apache 2.0) | No | No | No | Yes (Apache 2.0) |
| Local model support | Yes (Ollama) | Via API key | No | No | Via API key |
| Cost | Free (own API key) | Subscription + API | Subscription | API usage | API usage |

Continue is the right choice when:
- You want full control over which model powers which task (different models for chat vs autocomplete)
- Your team needs to work air-gapped or with local models
- You want to use Claude or another non-OpenAI model for coding assistance
- You are an existing JetBrains shop and want Copilot-style assistance

Continue is not the right choice when:
- You need deep autonomous multi-file editing (use Claude Code or Cursor)
- You want the highest-quality codebase awareness without configuration (use Cursor)
- You're running one-shot tasks from the terminal (use Aider or Claude Code)

---

## Docs Indexing

Continue can index any documentation site and make it available as `@docs`:

```json
{
  "contextProviders": [
    {
      "name": "docs",
      "params": {
        "sites": [
          { "startUrl": "https://docs.pydantic.dev/latest/", "title": "Pydantic" },
          { "startUrl": "https://fastapi.tiangolo.com/", "title": "FastAPI" },
          { "startUrl": "https://docs.anthropic.com/", "title": "Anthropic" }
        ]
      }
    }
  ]
}
```

Then use `@Pydantic how do I use model_validator?` in chat.

---

## Common Failure Cases

**`@codebase` returns irrelevant results for large repos**
Why: the local embedding index quality depends on the embedding model and chunk size; large repos with many similar files produce noisy retrieval.
Detect: `@codebase` mentions clearly wrong files in its response.
Fix: configure a better embedding model in `config.json` (e.g., `voyage-code-2` via Voyage AI instead of the default); add `.continueignore` to exclude test fixtures, generated code, and vendored libraries.

**Autocomplete latency too high**
Why: the default or configured chat model is used for autocomplete — large models have too much latency for inline suggestions.
Detect: completions appear more than 1–2 seconds after stopping typing.
Fix: configure a dedicated `tabAutocompleteModel` using a small fast model (Starcoder2 3B via Ollama, or Codestral via Mistral API).

**JetBrains plugin out of date with VS Code features**
Why: the JetBrains plugin is community-maintained; new features land in VS Code first and may lag by weeks or months.
Detect: a feature described in docs.continue.dev doesn't appear in JetBrains.
Fix: check the JetBrains plugin changelog; the VS Code extension is the reference implementation.

---

## Connections

- [[ai-tools/claude-code]] — autonomous agentic coding from the terminal; complement to Continue for multi-file changes
- [[ai-tools/cursor-copilot]] — Cursor has deeper codebase indexing; Continue has more model flexibility
- [[ai-tools/aider]] — terminal-based, similar model agnosticism, stronger for autonomous commits
- [[protocols/mcp]] — Continue has MCP support via config; can expose local tools to the model

## Open Questions

- Does Continue support MCP servers as context providers in config.json, and if so, what is the stability of that integration?
- How does `@codebase` embedding quality compare to Cursor's proprietary codebase index on a 100k+ line repo?
