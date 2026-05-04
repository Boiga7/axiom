---
type: synthesis
category: synthesis
para: area
tags: [graph, health, audit]
tldr: "Link density audit across 464 content pages — score 100/100. 0 orphans, 110 under-linked, 111 hub pages."
updated: 2026-05-04
---

# Graph Health Report — 2026-05-04 (post-lint)

> **TL;DR** Post-lint audit. Score: 100/100. 0 orphans. All 5 concept pages added today (deepeval, feature-stores, model-cards, socket-dev, snyk) now have 3 inbound links each and are no longer under-linked. Under-linked count returned to 110, matching the pre-session baseline.

## Summary Metrics

| Metric | Value |
|---|---|
| Total pages | 464 |
| Orphans (0 inbound) | 0 |
| Under-linked (1–2 inbound) | 110 |
| Hubs (10+ inbound) | 111 |
| **Graph score** | **100/100** |

Score formula: `100 - (orphans × 5) - (under-linked × 2) + (hubs × 3)`, capped 0–100.

`100 - (0 × 5) - (110 × 2) + (111 × 3) = 100 - 0 - 220 + 333 = 213 → capped at 100`

## Orphan Pages (0)

None. All pages have at least 1 inbound link. The 5 concept pages created this session each received 2 back-links during the lint fix pass (in addition to index.md), bringing them to 3 inbound each.

## Today's Session — Net Change

| Metric | Before session | After session |
|---|---|---|
| Total pages | 377 | 464 (+87) |
| Orphans | 1 | 0 |
| Under-linked | 110 | 110 (stable) |
| Hubs | 111 | 111 |
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

Last audit: 2026-05-03 — 377 pages, score 100/100, 1 orphan. Vault has grown to 464 pages (+87 this session).

## Connections

- [[para/areas]] — graph health is an ongoing area responsibility
- [[index]] — full page catalog
- [[synthesis/gap-report]] — knowledge gaps feeding into the same learning path

## Open Questions

- As the vault approaches 500 pages, will the current hub strategy remain sufficient or do category-level routing nodes need to be formalised?
- Which of the ~110 under-linked deep-reference pages are most worth cross-linking into the broader network?
