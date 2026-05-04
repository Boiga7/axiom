---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: Ranked knowledge gaps relative to active projects — 3 critical gaps, 3 concept gaps. GitHub Marketplace listing blocks evalcheck distribution; MCP Registry and security scorecard methodology block mcpindex Weekend 2.
updated: 2026-05-04
---

# Knowledge Gap Report — 2026-05-04 (run 4)

> **TL;DR** 3 critical gaps blocking active projects, 3 concept gaps surfaced from recently added pages. GitHub Marketplace listing is the top priority for evalcheck distribution; MCP Registry and security scorecard methodology are blocking mcpindex Weekend 2.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for eval regression comments. Phase: Distribution (Show HN, cookbook PRs, marketplace listing). Wiki coverage: strong on evals and PyPI distribution; gap in GitHub Marketplace listing process for GitHub Apps.
- **mcpindex**: CLI + public scorecard for MCP server security scanning. Phase: Weekend 2 (auth boundary tests, latency baselines, HTTP transport). Wiki coverage: strong on MCP protocol and OAuth; gaps in security scorecard methodology and MCP Registry ecosystem.

---

## Critical Gaps (blocks active project)

### 1. GitHub Marketplace listing for GitHub Apps
**Blocks:** evalcheck — distribution phase requires submitting the GitHub App to GitHub Marketplace.
No wiki page covers the GitHub Marketplace listing flow for GitHub Apps: pricing plans (free tier requirements), listing review process, OAuth app vs GitHub App distinction on Marketplace, required fields (logo, description, permissions disclosure), and the review SLA. [[ai-tools/claude-code]] covers GitHub App concepts tangentially but the distribution workflow is absent.

-> Suggested: `vault:research "GitHub Marketplace listing GitHub Apps 2025 — submission, pricing plans, review process"`

### 2. Security scorecard methodology
**Blocks:** mcpindex — the public scorecard that mcpindex generates needs a principled scoring framework. No wiki page covers how security scorecards are structured: weighted scoring models (CVSS-style), pass/fail vs graduated scales, category weighting (auth > injection > disclosure), public disclosure conventions, and how tools like OpenSSF Scorecard approach reproducibility. [[security/owasp-llm-top10]] covers what to check but not how to present a composite score.

-> Suggested: `vault:research "security scorecard methodology — OpenSSF Scorecard, CVSS scoring, reproducible security ratings for open source tools"`

### 3. MCP Registry
**Blocks:** mcpindex — publishing scan results to the MCP Registry (or referencing it) is a distribution option for mcpindex, but no wiki page covers how the MCP Registry works: submission process, metadata schema, discoverability, who runs it, moderation. [[protocols/mcp]] references the registry in passing. No dedicated page exists.

-> Suggested: `vault:research "MCP Registry — submission process, metadata schema, ecosystem governance, modelcontextprotocol.io/registry"`

---

## Concept Gaps (mentioned, no page)

### 4. DeepEval
Mentioned in [[security/llm-red-teaming-tools]] as an evaluation framework for red-teaming LLM outputs (hallucination metrics, toxicity, bias scoring). Also referenced in the evals domain as a testing-oriented alternative to promptfoo. [[evals/methodology]] and [[evals/openai-evals]] both lack coverage of DeepEval's metric taxonomy (G-Eval, Ragas integration, threshold-based CI gating). No dedicated page.

-> Suggested: `vault:new-page evals/deepeval "DeepEval — LLM evaluation framework, G-Eval metrics, hallucination/toxicity/bias scoring, CI integration"`

### 5. Feature stores
Mentioned in [[data/data-engineering-hub]] in the context of ML data pipelines, and implied by [[cs-fundamentals/sql]] AI patterns (pre-computed embeddings). No wiki page covers feature stores: what they are (centralised repository for ML features), leading tools (Feast, Tecton, Hopsworks), online vs offline stores, point-in-time correctness, serving latency requirements, and when they matter for LLM applications (e.g., pre-computed embeddings, user preference vectors).

-> Suggested: `vault:new-page data/feature-stores "Feature stores — Feast, Tecton, Hopsworks, online/offline split, point-in-time correctness, LLM relevance"`

### 6. Model Cards
Implied by [[landscape/open-source-models]] (HuggingFace model cards are required for Hub submissions) and [[data/synthetic-data]] (documenting synthetic data generation methodology). No wiki page covers model cards as a specification: the Mitchell et al. 2018 paper, required sections (intended use, factors, metrics, caveats), HuggingFace model card format, EU AI Act documentation alignment, and how model cards differ from system cards (Anthropic's format).

-> Suggested: `vault:new-page data/model-cards "Model cards — Mitchell 2018 spec, HuggingFace format, EU AI Act documentation alignment, vs Anthropic system cards"`

---

## Index Gap

- **safety/responsible-ai** — page exists on disk but is absent from `wiki/index.md`. Add under `safety/` section.

---

## Suggested Ingest Queue (ranked)

1. **GitHub Marketplace listing 2025** (critical — blocks evalcheck distribution phase)
2. **Security scorecard methodology** (critical — blocks mcpindex scorecard design)
3. **MCP Registry** (critical — blocks mcpindex distribution planning)
4. **DeepEval** (concept gap — referenced in llm-red-teaming-tools without own page)
5. **Feature stores** (concept gap — referenced in data-engineering-hub without own page)
6. **Model Cards** (concept gap — implied by open-source-models and synthetic-data pages)

---

## Previously Resolved Gaps

| Gap | Page | Sprint |
|---|---|---|
| protocols/rfc-7591-dynamic-client-registration | concept gap (run 3) — open |  |
| llms/multi-head-latent-attention | concept gap (run 3) — open |  |
| llms/deepseek-r1 | [[llms/deepseek-r1]] | 2026-05-03 (run 3) |
| protocols/oauth-server-metadata | [[protocols/oauth-server-metadata]] | 2026-05-03 (run 3) |
| papers/mistral | [[papers/mistral]] | 2026-05-03 (run 3) |
| synthesis/debugging-runbooks hub | [[synthesis/debugging-runbooks]] | 2026-05-03 |
| apis/openai-responses-api | [[apis/openai-responses-api]] | 2026-05-03 |
| papers/toolformer | [[papers/toolformer]] | 2026-05-03 |
| papers/gpt-4-technical-report | [[papers/gpt-4-technical-report]] | 2026-05-03 |
| ai-tools/continue | [[ai-tools/continue]] | 2026-05-03 |
| ai-tools/cline | [[ai-tools/cline]] | 2026-05-03 |
| papers/llama | [[papers/llama]] | 2026-05-03 |
| papers/llama-2 | [[papers/llama-2]] | 2026-05-03 |
| web-frameworks/django-drf | [[web-frameworks/django-drf]] | 2026-05-03 |
| agents/google-adk | [[agents/google-adk]] | 2026-05-03 |
| ai-tools/aider | [[ai-tools/aider]] | 2026-05-03 |
| safety/scalable-oversight | [[safety/scalable-oversight]] | 2026-05-03 |
| cloud/bedrock-agentcore | [[cloud/bedrock-agentcore]] | 2026-05-03 |
| JavaScript/TypeScript ecosystem | [[javascript/javascript-hub]] + 4 pages | 2026-05-02 |
| OpenAI Agents SDK | [[agents/openai-agents-sdk]] | 2026-05-02 |
| Strands Agents SDK | [[agents/strands-agents-sdk]] | 2026-05-02 |

---

## Connections

- [[para/projects]] — source of active project context
- [[index]] — coverage map source
- [[synthesis/audit-report]] — full vault audit (2026-05-03)

## Open Questions

- Is the MCP Registry stable enough to be worth a dedicated page, or should it be a section in [[protocols/mcp]]?
- Does RFC 7591 Dynamic Client Registration (run 3 gap) still need its own page, or is a section in [[protocols/oauth-server-metadata]] sufficient?
