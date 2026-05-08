---
type: synthesis
category: synthesis
para: area
tags: [graph, health, audit]
tldr: "Link density audit across 467 content pages — score 100/100. 3 orphans (broken-link root cause), 81 under-linked, 137 hub pages."
updated: 2026-05-08
---

# Graph Health Report — 2026-05-08 (vault:lint)

> **TL;DR** Post-lint audit. Score: 100/100. 3 orphans found — all caused by broken wikilink paths in aws-ai-practitioner.md, not missing content. 81 under-linked pages (down from 110 at last audit). Hub count grew from 111 to 137.

## Summary Metrics

| Metric | Value |
|---|---|
| Total pages | 467 |
| Orphans (0 properly-formed inbound wikilinks) | 3 |
| Under-linked (1–2 inbound) | 81 |
| Hubs (10+ inbound) | 137 |
| **Graph score** | **100/100** |

Score formula: `100 - (orphans × 5) - (under-linked × 2) + (hubs × 3)`, capped 0–100.

`100 - (3 × 5) - (81 × 2) + (137 × 3) = 100 - 15 - 162 + 411 = 334 → capped at 100`

## Orphan Pages (3)

All three are orphans because incoming wikilinks use incorrect path prefixes or no wikilink at all:

| Page | Root cause |
|---|---|
| `cloud/aws-ecosystem` | Linked as `[[landscape/aws-ecosystem]]` in aws-ai-practitioner.md — wrong category prefix |
| `technical-qa/k6` | Referenced in text and from index but no `[[technical-qa/k6]]` wikilinks exist |
| `test-automation/testcontainers` | Duplicate of `technical-qa/testcontainers` in wrong directory; no wikilinks use this path |

## Session — Net Change

| Metric | 2026-05-04 | 2026-05-08 |
|---|---|---|
| Total pages | 464 | 467 (+3) |
| Orphans | 0 | 3 (broken links, awaiting fix) |
| Under-linked | 110 | 81 (−29) |
| Hubs | 111 | 137 (+26) |
| Score | 100/100 | 100/100 |

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
| [[protocols/mcp]] | 35+ |
| [[observability/tracing]] | 34 |
| [[qa/qa-hub]] | 32 |
| [[security/owasp-llm-top10]] | 32 |

111 hub pages total — unchanged.

## Previous Audit

Last audit: 2026-05-04 — 464 pages, score 100/100, 0 orphans, 110 under-linked, 111 hubs.

## Connections

- [[para/areas]] — graph health is an ongoing area responsibility
- [[index]] — full page catalog
- [[synthesis/gap-report]] — knowledge gaps feeding into the same learning path

## Open Questions

- As the vault approaches 500 pages, will the current hub strategy remain sufficient or do category-level routing nodes need to be formalised?
- Which of the ~110 under-linked deep-reference pages are most worth cross-linking into the broader network?
