---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: All 5 gaps identified 2026-05-03 resolved. debugging-runbooks hub, openai-responses-api, toolformer, gpt-4-technical-report, continue all written. No remaining critical gaps.
updated: 2026-05-03
---

# Knowledge Gap Report — 2026-05-03

> **TL;DR** Post-audit scan. 2 stale index entries fixed. Remaining top gaps: debugging-runbooks hub page (32 orphans), OpenAI Responses API (not covered at all), Toolformer and GPT-4 Technical Report papers.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for eval regression comments. Phase: Distribution (Show HN, cookbook PRs, marketplace listing). Wiki coverage: comprehensive — no blocking gaps.
- **mcpindex**: CLI + public scorecard directory for MCP server security scanning. Phase: Weekend 2 (auth boundary tests, latency baselines, HTTP transport). Wiki coverage: strong — auth, HTTP transport, latency all covered.

## Resolved This Session (2026-05-03)

| Gap | Page Written |
|---|---|
| synthesis/debugging-runbooks hub | [[synthesis/debugging-runbooks]] — 32 orphan runbooks now discoverable |
| apis/openai-responses-api | [[apis/openai-responses-api]] — stateful API, built-in tools, migration guide |
| papers/toolformer | [[papers/toolformer]] — Schick 2023 (Meta): self-supervised tool learning via perplexity reduction |
| papers/gpt-4-technical-report | [[papers/gpt-4-technical-report]] — OpenAI 2023: capability evals, system card format, architecture opacity |
| ai-tools/continue | [[ai-tools/continue]] — open-source IDE extension, model-agnostic, context providers, config.json |

## Fixed This Scan (2026-05-03)

Two stale index entries removed — pages were deleted during the audit but their index lines were missed:

| Removed Entry | Reason |
|---|---|
| `cloud/cost-optimisation-cloud` | Page deleted — content merged into [[cloud/finops-cost-management]] |
| `qa/exploratory-testing-advanced` | Page deleted — content merged into [[qa/exploratory-testing]] |

Page count corrected: 314 → 312.

## Resolved Previous Sprints

| Gap | Page Written | Sprint |
|---|---|---|
| web-frameworks/django-drf | [[web-frameworks/django-drf]] | 2026-05-03 |
| agents/google-adk | [[agents/google-adk]] | 2026-05-03 |
| ai-tools/aider | [[ai-tools/aider]] | 2026-05-03 |
| safety/scalable-oversight | [[safety/scalable-oversight]] | 2026-05-03 |
| cloud/bedrock-agentcore | [[cloud/bedrock-agentcore]] | 2026-05-03 |
| JavaScript/TypeScript ecosystem | [[javascript/javascript-hub]] + 4 pages | 2026-05-02 |
| OpenAI Agents SDK | [[agents/openai-agents-sdk]] | 2026-05-02 |
| Strands Agents SDK | [[agents/strands-agents-sdk]] | 2026-05-02 |

## Remaining Gaps

No critical or concept gaps identified at this time. All 5 gaps from the 2026-05-03 scan are resolved.

## Structural Issues (not gaps — flagged for awareness)

- **## Open Questions missing from ~248 pages**: cloud/, cs-fundamentals/, qa/, technical-qa/ categories lack this section. Content is complete; section is missing. Low priority.
- **Graph health stale**: graph-health.md last audited at 87 pages (score 97/100). Vault is now 317 pages. Score is not valid until rebuilt.

## Suggested Ingest Queue

No urgent gaps. Next candidates when adding new pages:
- `ai-tools/cline` — Cline and Windsurf remain absent from ai-tools/; covered in CLAUDE.md knowledge map
- `papers/llama` and `papers/llama-2` — listed in CLAUDE.md must-reads, no dedicated pages yet

## Connections

- [[para/projects]] — source of active project context
- [[index]] — coverage map source
- [[synthesis/graph-health]] — orphan and link-density analysis
- [[synthesis/audit-report]] — first full vault audit (2026-05-02); baseline for structural health
- [[synthesis/data-as-system]] — data lineage, contracts, freshness — production data engineering synthesis
- [[synthesis/technical-communication]] — ADRs, RFCs, stakeholder translation — the communication layer for senior engineers

## Open Questions

- Should the debugging-runbooks hub live under `synthesis/` or be promoted to `cs-fundamentals/debugging-systems` as a subsection?
- Is the OpenAI Responses API gap urgent enough to research before the next sprint, or does it wait until evalcheck or mcpindex specifically need it?
