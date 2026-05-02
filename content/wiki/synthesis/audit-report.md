---
type: synthesis
category: synthesis
para: resource
tags: [audit, health, duplicates, accuracy, frontmatter]
tldr: First full vault audit — 134 broken links (90% from 4 missing hub pages), 167 frontmatter gaps (mostly missing tldr), 3 flagged duplicate pairs all confirmed complementary.
updated: 2026-05-02
---

# Vault Audit Report — 2026-05-02

## Summary

| Check | Count |
|---|---|
| Pages checked | ~310 |
| Broken links | 134 |
| Index inconsistencies | 14 (5 not indexed, 9 entries missing file) |
| Frontmatter issues | 167 (mostly missing `tldr`) |
| Potential duplicates flagged | 3 |
| Misplaced pages | 0 |
| Semantic duplicates confirmed | 0 |
| Accuracy issues | 1 minor |

---

## Broken Wikilinks (134)

### Root cause analysis

90%+ of broken links are the same 4 patterns — hub pages that don't exist yet:

| Missing page | Broken link count | Affected directory |
|---|---|---|
| `cloud/cloud-hub` | ~32 | cloud/ |
| `cs-fundamentals/se-hub` | ~32 | cs-fundamentals/ |
| `qa/qa-hub` | ~28 | qa/ |
| `technical-qa/tqa-hub` | ~22 | technical-qa/ |

**Fix:** Create 4 hub pages. This resolves ~115 of 134 broken links in one pass.

### Remaining broken links (individual)

| Source | Broken link | Notes |
|---|---|---|
| `agents/mcp-server-development.md` | `python/async` | No python/async page — would link to python/ section |
| `papers/chain-of-thought.md` | `prompting/chain-of-thought` | CoT paper references a prompting page that may not exist |
| `infra/deployment.md` | `vm` | Bare slug — likely `infra/vm` never created |
| `cloud/infrastructure-monitoring.md` | `cloud/production-monitoring-qa` | Cross-domain link to qa/ page |

### False positives (audit script parsing errors)

The regex-based link extractor incorrectly parsed shell code inside code blocks as wikilinks:

- `cs-fundamentals/linux-fundamentals.md`: `$APP_ENV == "production"`, `! -f ".env"` parsed as links
- `cs-fundamentals/type-annotations.md`: `tool.mypy.overrides` (TOML key) parsed as links
- `math/probability.md`: `2.5, 0.5, -1.0` (floats) parsed as links
- `synthesis/graph-health.md`: `wikilink` (bare word in prose) parsed as link

**Action:** Update `tools/audit.py` to skip wikilinks that contain spaces, `$`, `!`, numbers-only, or are inside fenced code blocks.

---

## Index Inconsistencies

### Files not in index (5)

These files exist on disk but `wiki/index.md` has no entry for them:

- `apis/what-is-an-api`
- `java/anthropic-java-sdk`
- `java/build-tools`
- `java/grpc`
- `java/what-is-java`

All 5 are Java section pages. Add entries under the Java category in index.md.

### Index entries without files (9)

The index references these slugs but no corresponding `.md` file exists:

- `experiments/embedding-mteb-local` — experiment `.qmd` files may be under the wrong extension
- `experiments/model-latency-comparison` — same
- `experiments/prompt-caching-savings` — same
- `experiments/rag-chunking-benchmark` — same
- `para/archives`, `para/areas`, `para/projects`, `para/resources` — PARA stub pages never created
- `synthesis/gap-report` — file exists at `synthesis/gap-report.md`; likely a slug extraction bug in the audit script

**Note:** The 4 experiment entries are likely slug format mismatches — the index may use `.qmd` in the link but the checker looks for `.md`. Verify by checking if the files exist as `.qmd`. The `para/` pages need to be created or removed from the index. `synthesis/gap-report` is a false positive.

---

## Frontmatter Issues (167 pages)

### Distribution

| Directory | Pages affected | Fields missing |
|---|---|---|
| `cloud/` | ~35 | `tldr` only |
| `cs-fundamentals/` | ~35 | `tldr` only |
| `qa/` | ~35 | `tldr` only |
| `technical-qa/` | ~30 | `tldr` only |
| `papers/` | ~10 | `tldr` only |
| Early pages (agents/, apis/, evals/) | ~6 | all fields (`type`, `category`, `para`, `tldr`, `updated`) |
| `experiments/` | 4 | all fields |

### Pages needing all fields (priority fixes)

These were written before the full frontmatter convention was established:

- `agents/langgraph.md` — missing type, category, para, tldr, updated
- `agents/multi-agent-patterns.md` — missing type, category, para, tldr, updated
- `apis/anthropic-api.md` — missing category, para, tldr, type, updated
- `evals/methodology.md` — missing category, para, tldr, type, updated
- `experiments/*.md` (4 files) — missing all fields

**Fix:** Bulk-add `tldr` from existing `> **TL;DR** ...` blockquotes where present (most pages have them). Script at `tools/fix-frontmatter.py` can handle this.

---

## Potential Duplicates — Semantic Review

### 1. `cs-fundamentals/grpc.md` vs `java/grpc.md`

**Verdict: COMPLEMENTARY**

`cs-fundamentals/grpc.md` — language-agnostic reference: protocol comparison table (REST/GraphQL/gRPC), proto syntax, 4 streaming modes, general interceptors. Missing `tldr`.

`java/grpc.md` — Java + AI workload specific: why gRPC for Java-Python AI boundaries, bidirectional streaming for LLM token output, Java codegen with Maven plugin, Spring Boot integration.

These cover distinct scopes and are both needed. **Action:** Add `[[java/grpc]]` to cs-fundamentals/grpc.md Connections, add `[[cs-fundamentals/grpc]]` to java/grpc.md Connections.

---

### 2. `papers/constitutional-ai.md` vs `safety/constitutional-ai.md`

**Verdict: COMPLEMENTARY**

`papers/constitutional-ai.md` — academic paper summary: full citation (Bai et al., 2022), problem statement, key contributions in paper-summary format.

`safety/constitutional-ai.md` — practical engineering guide: two-phase training walkthrough (SL-CAF + RLAIF), the 16-principle constitution, how to use CAI in practice.

This is the standard vault pattern for seminal papers that also have engineering implications — papers/ holds the citation-level summary, the domain category holds the practical guide. Both pages should exist. **Action:** Verify cross-links exist in both directions.

---

### 3. `papers/mechanistic-interpretability.md` vs `safety/mechanistic-interpretability.md`

**Verdict: COMPLEMENTARY**

`papers/mechanistic-interpretability.md` — four paper summaries: Zoom In (2020), Toy Models of Superposition (2022), Towards Monosemanticity (2023), Scaling Monosemanticity (2024). Academic focus.

`safety/mechanistic-interpretability.md` — practical guide: superposition problem, SAEs as the breakthrough tool, activation steering, applications to safety.

Same pattern as constitutional-ai. **Action:** Verify cross-links exist in both directions.

---

## Placement Sense-Check (20 most recently updated pages)

All 20 pages are correctly placed. The only candidate for discussion:

- `infra/litellm.md` (`cat=infra`) — LiteLLM is provider-abstraction middleware. `infra` is defensible (it's infrastructure for AI API access). An alternative placement would be `apis/`. Not a misplacement but worth noting for consistency if more provider-abstraction tools are added.

No pages flagged as misplaced.

---

## Accuracy Spot-Check (5 recent sprint pages)

Pages checked: `apis/aws-bedrock.md`, `agents/mcp-server-development.md`, `infra/litellm.md`, `agents/strands-agents-sdk.md`, `cs-fundamentals/cicd-pipelines.md`

### Findings

**1. `agents/strands-agents-sdk.md`** — minor [unverified] gap

`from strands_deploy import AgentCoreDeployment` with `deployment.deploy()` is presented as established fact. The AgentCore Runtime deployment API surface is not confirmed from a second source.

**Action:** Add `[unverified]` to the AgentCore deployment code block comment.

**2. `apis/aws-bedrock.md`** — model IDs use Claude 3.5 Sonnet

Code examples use `anthropic.claude-3-5-sonnet-20240620-v1:0` throughout. As of May 2026, newer Claude models may be available on Bedrock. Not inaccurate (this model ID is valid), but the `Open Questions` section already captures this.

No action needed — `Open Questions` already flags the Claude 4.x availability question.

**3. `infra/litellm.md`, `agents/mcp-server-development.md`, `cs-fundamentals/cicd-pipelines.md`** — no issues found.

---

## Recommended Actions (prioritised)

1. **Create 4 hub pages** — `cloud/cloud-hub`, `cs-fundamentals/se-hub`, `qa/qa-hub`, `technical-qa/tqa-hub`. Resolves ~115 broken links. Highest ROI fix in the vault.

2. **Bulk-add `tldr` frontmatter** — 167 pages missing it. Most pages already have a `> **TL;DR** ...` blockquote; extract and insert programmatically. Use `tools/fix-frontmatter.py`.

3. **Fix 5 unindexed Java pages** — add `apis/what-is-an-api`, `java/anthropic-java-sdk`, `java/build-tools`, `java/grpc`, `java/what-is-java` to `wiki/index.md`.

4. **Add cross-links for complementary pairs** — cs-fundamentals/grpc ↔ java/grpc; verify constitutional-ai and mechanistic-interpretability cross-links.

5. **Fix early pages missing all frontmatter fields** — agents/langgraph, agents/multi-agent-patterns, apis/anthropic-api, evals/methodology, experiments/*.

6. **Mark strands-agents-sdk AgentCore code as `[unverified]`** — minor truth-discipline fix.

7. **Update audit.py false positive handling** — skip wikilinks containing `$`, `!`, spaces, bare numbers, or content inside fenced code blocks.

8. **Resolve `para/` index entries** — create stub PARA pages or remove from index.

---

## Connections

- [[index]] — coverage map used for consistency checks
- [[synthesis/gap-report]] — complementary gap intelligence
- [[synthesis/graph-health]] — link graph health score (stale — needs rebuild)
