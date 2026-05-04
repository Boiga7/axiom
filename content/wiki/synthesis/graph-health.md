---
type: synthesis
category: synthesis
para: area
tags: [graph, health, audit]
tldr: "Link density audit across all 377 content pages — score 100/100. 1 orphan (cline, just added), 110 under-linked, 111 hub pages."
updated: 2026-05-03
---

# Graph Health Report — 2026-05-03

> **TL;DR** Full audit across 377 pages. Score: 100/100. Vault has grown 4x since last clean audit (87 pages, 2026-05-01). Connectivity is strong — 111 hub pages, average 7.9 links per page.

## Summary Metrics

| Metric | Value |
|---|---|
| Total pages | 377 |
| Orphans (0 inbound) | 1 |
| Under-linked (1–2 inbound) | 110 |
| Hubs (10+ inbound) | 111 |
| Avg links per page | 7.9 |
| Total wikilinks | 2,988 |
| **Graph score** | **100/100** |

Score formula: `100 - (orphans × 5) - (under-linked × 2) + (hubs × 3)`, capped 0–100.

`100 - (1 × 5) - (110 × 2) + (111 × 3) = 100 - 5 - 220 + 333 = 208 → capped at 100`

## Orphan Pages (1)

- `ai-tools/cline` — just created (2026-05-03); link added to [[ai-tools/cursor-copilot]] this session. Will resolve on next audit once that link propagates.

## Top Hub Pages (10+ inbound links)

| Page | Inbound |
|---|---|
| [[apis/anthropic-api]] | 63 |
| [[evals/methodology]] | 60 |
| [[rag/pipeline]] | 49 |
| [[cloud/kubernetes]] | 48 |
| [[python/ecosystem]] | 40 |
| [[agents/langgraph]] | 39 |
| [[cloud/cloud-hub]] | 38 |
| [[cs-fundamentals/se-hub]] | 38 |
| [[protocols/mcp]] | 35 |
| [[observability/tracing]] | 34 |
| [[qa/qa-hub]] | 32 |
| [[security/owasp-llm-top10]] | 32 |

111 hub pages total — the cs-fundamentals/, cloud/, qa/, and technical-qa/ expansions all have hub pages with strong inbound counts.

## Under-Linked Pages (sample — 1–2 inbound)

The 110 under-linked pages are primarily from the mass category expansions (cs-fundamentals, cloud, qa, technical-qa, papers). These are deep-reference pages linked from their hub pages but not yet cross-linked into the broader network. This is expected for a vault that grew 4x in two phases. Priority cross-links to add:

- `papers/llama` and `papers/llama-2` — link from [[llms/model-families]] (foundational open-weight models)
- `ai-tools/cline` — link from [[ai-tools/claude-code]] (comparison section)
- cs-fundamentals/* pages — linked from se-hub but not from the layer 3 infra/cloud pages that depend on those concepts

## Previous Audit

Last clean audit: 2026-05-01 — 87 pages, score 97/100. Vault has grown 4.3x since then.

## Connections

- [[para/areas]] — graph health is an ongoing area responsibility
- [[index]] — full page catalog
- [[synthesis/gap-report]] — knowledge gaps feeding into the same learning path

## Open Questions

- Which of the 110 under-linked pages are most critical to cross-link into the broader network?
- As the vault grows past 500 pages, will the hub-page strategy remain sufficient or do category-level index pages need to act as routing nodes?
