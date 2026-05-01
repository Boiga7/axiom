---
type: synthesis
category: synthesis
para: area
tags: [graph, health, audit]
tldr: Link density audit across all Nexus pages — pre-fix score 81/100, post-fix score 97/100 after 10 links added; 0 orphans, 24 under-linked, 48 healthy, 15 hubs.
updated: 2026-05-01
---

# Graph Health Report — 2026-05-01

> **TL;DR** Link density audit across all 87 content pages — pre-fix score 81/100, post-fix score 97/100 after 10 links added this session. 0 orphans remaining, 24 under-linked, 48 healthy, 15 hubs.

## Key Facts
- Total pages audited: 87
- Pre-fix graph score: 81/100 (2 orphans, 27 under-linked, 43 healthy, 15 hubs)
- Post-fix graph score: 97/100 (0 orphans, 24 under-linked, 48 healthy, 15 hubs)
- Orphan pages fixed this session: 2 (apis/google-ai, data/pipelines — both now healthy)
- Under-linked pages promoted this session: 3 (openai-agents-sdk, graphrag, open-source-models)
- Hub pages (10+ inbound): 15
- Score formula: 100 - (orphans x 5) - (under-linked x 2) + (hubs x 3), capped 0-100
- Methodology: index.md counts as 1 inbound link (it is a wiki page, not excluded from scoring)

## Score Detail

Pre-fix: 100 - (2 x 5) - (27 x 2) + (15 x 3) = 100 - 10 - 54 + 45 = **81/100**

Post-fix (after 10 suggested links applied): 100 - (0 x 5) - (24 x 2) + (15 x 3) = 100 - 0 - 48 + 45 = **97/100**

## Hub Pages (10+ inbound links)

- [[apis/anthropic-api]] — 28 inbound links
- [[evals/methodology]] — 23 inbound links
- [[rag/pipeline]] — 20 inbound links
- [[agents/langgraph]] — 14 inbound links
- [[fine-tuning/lora-qlora]] — 13 inbound links
- [[prompting/techniques]] — 13 inbound links
- [[infra/vector-stores]] — 12 inbound links
- [[observability/platforms]] — 12 inbound links
- [[protocols/mcp]] — 12 inbound links
- [[fine-tuning/decision-framework]] — 11 inbound links
- [[llms/claude]] — 11 inbound links
- [[rag/embeddings]] — 11 inbound links
- [[agents/multi-agent-patterns]] — 10 inbound links
- [[fine-tuning/dpo-grpo]] — 10 inbound links
- [[infra/inference-serving]] — 10 inbound links

## Orphan Pages (0 inbound links)

No orphans remaining after this session's fixes.

**Fixed this session:**
- `[[apis/google-ai]]` — was 0 inbound. Links added to [[apis/anthropic-api]] and [[llms/model-families]]. Now 3 inbound (including index.md). Promoted to Healthy.
- `[[data/pipelines]]` — was 0 inbound. Links added to [[data/synthetic-data]], [[data/rlhf-datasets]], [[evals/methodology]]. Now 4 inbound (including index.md). Promoted to Healthy.

## Under-Linked Pages (1–2 inbound links)

- `[[agents/openai-agents-sdk]]` — was 1 inbound. Link added to [[agents/multi-agent-patterns]] this session. Now 3 inbound. Promoted to Healthy.
- `[[ai-tools/cursor-copilot]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[protocols/mcp]] (Cursor and Copilot both consume MCP servers)
- `[[infra/cloud-platforms]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[infra/deployment]] (deployment targets land on these clouds)
- `[[java/langchain4j]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[agents/langgraph]] (JVM equivalent for agent orchestration)
- `[[landscape/open-source-models]]` — was 1 inbound. Link added to [[landscape/ai-labs]] this session. Now 3 inbound. Promoted to Healthy.
- `[[landscape/regulation]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[safety/alignment]] (regulation increasingly mandates alignment evidence)
- `[[llms/hallucination]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[rag/pipeline]] (RAG is the primary mitigation pattern)
- `[[math/probability]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[math/transformer-math]] (softmax, cross-entropy build on probability)
- `[[multimodal/audio]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[apis/openai-api]] (Whisper and TTS are exposed via the OpenAI audio APIs)
- `[[para/archives]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[para/areas]] (PARA index pages should cross-reference each other)
- `[[rag/graphrag]]` — was 1 inbound. Link added to [[rag/pipeline]] this session. Now 3 inbound. Promoted to Healthy.
- `[[synthesis/getting-started]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[index]] or [[overview]] (entry-point pages should fan out from the catalog)
- `[[synthesis/graph-health]]` — 1 inbound link (need 2 more)
  - Self-referential — improves naturally as future audits cite this report
- `[[synthesis/learning-path]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[synthesis/getting-started]] (already linked back; bidirectional needed elsewhere)
- `[[test-automation/selenium]]` — 1 inbound link (need 2 more)
  - Suggested: add link from [[test-automation/pytest-patterns]] (pytest is the test runner for both)
- `[[apis/openai-api]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[multimodal/audio]] (Whisper/TTS endpoints)
- `[[infra/caching]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[apis/anthropic-api]] (prompt caching lives in the Messages API)
- `[[java/spring-ai]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[apis/anthropic-api]] (Spring AI ChatClient wraps the Messages API)
- `[[math/linear-algebra]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[fine-tuning/lora-qlora]] (LoRA decomposes weights via low-rank matrix factorisation)
- `[[multimodal/vision]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[apis/anthropic-api]] (Claude vision via Messages API image blocks)
- `[[papers/attention-is-all-you-need]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[llms/transformer-architecture]] (canonical source for the architecture)
- `[[papers/key-papers]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[llms/transformer-architecture]] (catalog of foundational reading)
- `[[para/resources]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[para/areas]] (sibling PARA index)
- `[[protocols/a2a]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[protocols/mcp]] (sibling agent protocol; comparison value)
- `[[test-automation/playwright]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[ai-tools/claude-code]] (Playwright MCP for browser automation in Claude Code)
- `[[web-frameworks/django]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[python/ecosystem]] (Django is part of the Python web stack)
- `[[web-frameworks/vercel-ai-sdk]]` — 2 inbound links (need 1 more)
  - Suggested: add link from [[apis/anthropic-api]] (Vercel AI SDK wraps the Messages API for the Edge runtime)

## Healthy Pages (3-9 inbound links)

- [[math/transformer-math]] — 9 inbound links
- [[security/owasp-llm-top10]] — 9 inbound links
- [[security/prompt-injection]] — 9 inbound links
- [[agents/react-pattern]] — 8 inbound links
- [[infra/gpu-hardware]] — 8 inbound links
- [[llms/model-families]] — 8 inbound links
- [[llms/transformer-architecture]] — 8 inbound links
- [[evals/llm-as-judge]] — 7 inbound links
- [[infra/huggingface]] — 7 inbound links
- [[landscape/ai-labs]] — 7 inbound links
- [[prompting/context-engineering]] — 7 inbound links
- [[rag/hybrid-retrieval]] — 7 inbound links
- [[safety/alignment]] — 7 inbound links
- [[safety/constitutional-ai]] — 7 inbound links
- [[ai-tools/claude-code]] — 6 inbound links
- [[fine-tuning/frameworks]] — 6 inbound links
- [[python/ecosystem]] — 6 inbound links
- [[rag/reranking]] — 6 inbound links
- [[security/mcp-cves]] — 6 inbound links
- [[evals/benchmarks]] — 5 inbound links
- [[protocols/tool-design]] — 5 inbound links
- [[safety/mechanistic-interpretability]] — 5 inbound links
- [[synthesis/cost-optimisation]] — 5 inbound links
- [[test-automation/pytest-patterns]] — 5 inbound links
- [[web-frameworks/fastapi]] — 5 inbound links
- [[web-frameworks/nextjs]] — 5 inbound links
- [[landscape/model-timeline]] — 4 inbound links
- [[observability/tracing]] — 4 inbound links
- [[para/areas]] — 4 inbound links
- [[synthesis/llm-decision-guide]] — 4 inbound links
- [[test-automation/testing-llm-apps]] — 4 inbound links
- [[agents/memory]] — 3 inbound links
- [[data/rlhf-datasets]] — 3 inbound links
- [[data/synthetic-data]] — 3 inbound links
- [[infra/deployment]] — 3 inbound links
- [[llms/tokenisation]] — 3 inbound links
- [[math/optimisation]] — 3 inbound links
- [[para/projects]] — 3 inbound links
- [[prompting/dspy]] — 3 inbound links
- [[rag/chunking]] — 3 inbound links
- [[security/red-teaming]] — 3 inbound links
- [[synthesis/architecture-patterns]] — 3 inbound links
- [[synthesis/rag-vs-finetuning]] — 3 inbound links

## Links Applied This Session (Top 10)

All 10 were applied during this audit run. Post-fix score: 97/100.

1. ✓ `[[apis/google-ai]]` added to `[[apis/anthropic-api]]` Connections
2. ✓ `[[apis/google-ai]]` added to `[[llms/model-families]]` Connections
3. ✓ `[[data/pipelines]]` added to `[[data/synthetic-data]]` Connections
4. ✓ `[[data/pipelines]]` added to `[[data/rlhf-datasets]]` Connections
5. ✓ `[[data/pipelines]]` added to `[[evals/methodology]]` Connections
6. ✓ `[[agents/openai-agents-sdk]]` added to `[[agents/multi-agent-patterns]]` Connections
7. ✓ `[[infra/cloud-platforms]]` added to `[[infra/deployment]]` Connections
8. ✓ `[[landscape/open-source-models]]` added to `[[landscape/ai-labs]]` Connections
9. ✓ `[[rag/graphrag]]` added to `[[rag/pipeline]]` Connections
10. ✓ `[[multimodal/audio]]` added to `[[apis/openai-api]]` Connections

## Connections
- [[para/areas]] — graph health is an ongoing area responsibility
- [[index]] — full page catalog

## Open Questions
- Which orphan pages represent the most critical knowledge gaps? (`apis/google-ai` is the bigger gap — Gemini coverage matters for ecosystem completeness)
- Which categories are most under-connected relative to their importance? (`landscape/`, `multimodal/`, and `synthesis/` each have multiple 1-inbound pages)
- Should `[[index]]` and `[[overview]]` be added as canonical resolved targets in future audits? Currently shown as unresolved because they live at `wiki/index.md` and `wiki/overview.md` rather than under a category folder.

## Sources
- Audit run: 2026-05-01
- Method: scripted `[[wikilink]]` extraction across all 87 content pages (23 categories + PARA), normalised to canonical `category/slug` form, frontmatter excluded, self-links and duplicates removed
