---
type: synthesis
category: synthesis
para: resource
tags: [audit, health, duplicates, accuracy]
tldr: "Vault audit report — rule-based and semantic checks across all 377 pages. 2 broken links, 32 debug runbooks missing from index, 0 frontmatter issues, 3 complementary pairs (all cross-linked), 1 accuracy issue."
updated: 2026-05-03
---

# Vault Audit Report — 2026-05-03

## Summary

| Check | Result |
|---|---|
| Pages checked | 377 |
| Broken wikilinks | 2 |
| Files not in index | 32 |
| Index entries without file | 1 |
| Frontmatter issues | 0 |
| Potential duplicates flagged | 3 pairs |
| Semantic duplicates confirmed | 0 (all complementary) |
| Misplaced pages | 0 |
| Accuracy issues | 1 confirmed, 4 [unverified] markers (appropriate) |

---

## Broken Wikilinks

Both originate in `wiki/synthesis/gap-report.md`:

- `cloud/cost-optimisation-cloud` — no file at that path. The cloud category has `finops-cost-management.md` — the gap-report link predated that page's actual slug. Fixed.
- `qa/exploratory-testing-advanced` — no file at that path. A gap-report entry pointing to a page that was never created. Fixed.

**Recommended action:** Update `gap-report.md` — replace `cloud/cost-optimisation-cloud` with `[[cloud/finops-cost-management]]`, remove or update the `qa/exploratory-testing-advanced` reference.

---

## Index Inconsistencies

### Files not in index (32)

All 32 are synthesis/debug-* runbooks from a prior sprint that were added to the vault but never listed in `wiki/index.md`:

```
synthesis/debug-agent-loop-not-terminating
synthesis/debug-agent-not-using-tools
synthesis/debug-alert-firing-incorrectly
synthesis/debug-api-timeout
synthesis/debug-auth-failing
synthesis/debug-cache-inconsistency
synthesis/debug-ci-pipeline-failing
synthesis/debug-cloud-cost-spike
synthesis/debug-cors-error
synthesis/debug-data-pipeline-failing
synthesis/debug-database-migration-failing
synthesis/debug-deadlock
synthesis/debug-dns-resolution-failing
synthesis/debug-duplicate-writes
synthesis/debug-embedding-quality-degraded
synthesis/debug-error-rate-after-deploy
synthesis/debug-fine-tuned-model-worse
synthesis/debug-flaky-test
synthesis/debug-hallucination-in-production
synthesis/debug-high-cpu
synthesis/debug-kubernetes-pod-not-starting
synthesis/debug-llm-high-latency
synthesis/debug-memory-leak
synthesis/debug-no-logs-in-production
synthesis/debug-prompt-injection-detected
synthesis/debug-rag-pipeline-slow
synthesis/debug-rag-wrong-context
synthesis/debug-scaling-not-triggering
synthesis/debug-secret-leaked
synthesis/debug-slow-query
synthesis/debug-ssl-certificate-error
synthesis/debug-websocket-dropping
```

**Recommended action:** Add all 32 to `wiki/index.md` under a "Debugging Runbooks" subsection in the synthesis category.

### Index entries without file (1)

- `synthesis/audit-report` — was listed before the file existed. Now resolved (this report).

---

## Frontmatter Issues

None. All 377 pages pass frontmatter checks (type, category, para, tldr, updated all present).

---

## Potential Duplicates — Semantic Review

### 1. `cs-fundamentals/grpc.md` vs `java/grpc.md`

**Verdict: Complementary — false positive.**

- `cs-fundamentals/grpc.md`: Language-agnostic reference — protocol comparison table (gRPC vs REST vs GraphQL), proto definition syntax, 4 streaming modes, retry policy, deadline propagation.
- `java/grpc.md`: Java-specific for AI workloads — Java-to-Python service boundary patterns, Java stub generation, bidirectional streaming for LLM token output, Java code examples throughout.

Both pages already cross-link each other. No action needed.

### 2. `papers/constitutional-ai.md` vs `safety/constitutional-ai.md`

**Verdict: Complementary — false positive.**

- `papers/constitutional-ai.md`: Paper page — full citation (Bai et al., 2022, arXiv:2212.08073), what problem it solved, key contributions, limitations, follow-up work.
- `safety/constitutional-ai.md`: Applied concept page — two-phase pipeline (SL-CAF, RLAIF), how CAI is used in practice, relationship to DPO and RLHF.

The standard vault pattern for a paper that defines a field: one papers/ page for the source document, one concept page for the technique. Both cross-link each other. No action needed.

### 3. `papers/mechanistic-interpretability.md` vs `safety/mechanistic-interpretability.md`

**Verdict: Complementary — false positive.**

- `papers/mechanistic-interpretability.md`: Four-paper research history — Zoom In (Olah 2020), Toy Models of Superposition (2022), Towards Monosemanticity (2023), Scaling Monosemanticity (2024). Paper-by-paper breakdown with contributions and findings.
- `safety/mechanistic-interpretability.md`: Current state of the field — SAEs as the breakthrough tool, superposition explanation, activation steering, practical implications for alignment.

Research history vs applied concept. Both cross-link each other. No action needed.

---

## Misplaced Pages

None detected. All 377 pages pass the directory-vs-frontmatter-category check.

---

## Placement Sense-Check (20 most recently updated)

Reviewed all 20 pages updated 2026-05-02/05-03. No misplacements found. Note:

- `synthesis/technical-communication`, `synthesis/request-flow-anatomy`, `synthesis/engineering-tradeoffs` — broad SE synthesis pages that could arguably sit in `cs-fundamentals/` but their content is genuinely synthesis-style (cross-cutting comparisons, decision frameworks). Current placement is defensible.
- `cloud/bedrock-agentcore` — correctly placed; AWS Bedrock AgentCore is a cloud-hosted AI infra service.

---

## Accuracy Issues

### Confirmed issue

**`papers/llama-2.md` — GPU memory requirement for 70B inference is understated.**

Line 155: *"70B requires at minimum 2× 40GB GPUs (or 4-bit quantisation for single-GPU inference)."*

At fp16, a 70B model requires approximately 140 GB VRAM. 2× 40GB = 80 GB — insufficient. The correct minimum is **2× 80GB GPUs (e.g., A100/H100 80GB)** or **4× 40GB GPUs** for fp16 inference.

**Recommended action:** Change to "at minimum 2× 80GB or 4× 40GB GPUs (or 4-bit quantisation for single-GPU inference on an A100 80GB or RTX 4090)."

### Appropriate [unverified] markers (not errors — pending cross-check)

- `papers/llama.md`: Training data percentages table, benchmark scores table marked `[unverified — verify from arXiv:2302.13971]`
- `papers/llama-2.md`: Pretraining details and benchmark numbers marked `[unverified — verify from arXiv:2307.09288]`
- `ai-tools/cline.md`: Stars/installs claim (`61k+ stars, 5M+ installs`) marked `[unverified]`

These are correctly tagged. Strip the markers after verifying against primary sources.

---

## Recommended Actions (prioritised)

1. **Index the 32 debug runbooks** — adds 32 pages to the catalog that are currently undiscoverable via `wiki/index.md`. High value, low effort.
2. **Fix 2 broken links in `gap-report.md`** — `cloud/cost-optimisation-cloud` → `[[cloud/finops-cost-management]]`, remove/replace `qa/exploratory-testing-advanced`.
3. **Fix GPU memory claim in `papers/llama-2.md:155`** — factual error; 2× 40GB is not enough for fp16 70B inference.
4. **Strip `[unverified]` from llama/llama-2 claims** after verifying against arXiv:2302.13971 and arXiv:2307.09288.

---

## Connections

- [[index]] — coverage map used for consistency checks
- [[synthesis/graph-health]] — complementary structural health audit (score 100/100 as of 2026-05-03)
- [[synthesis/gap-report]] — ranked knowledge gaps
