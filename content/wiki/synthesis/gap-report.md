---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: Ranked list of knowledge gaps relative to active projects — what to research next. No critical project-blocking gaps. 7 index maintenance gaps. 2 concept gaps worth adding.
updated: 2026-05-02
---

# Knowledge Gap Report — 2026-05-02

> **TL;DR** Ranked list of knowledge gaps relative to active projects — what to research next. No critical project-blocking gaps. 7 index maintenance gaps. 2 concept gaps worth adding.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for eval regression comments. Phase: Distribution — dev.to content, cookbook PRs, Show HN. Wiki coverage: comprehensive (evals/methodology, apis/anthropic-api, test-automation/pytest-patterns, python/pypi-distribution, infra/github-apps, infra/github-marketplace all exist).
- **mcpindex**: CLI + public scorecard directory for MCP server security scanning. Phase: Weekend 2 — auth boundary tests, latency baselines, HTTP transport. Wiki coverage: excellent (protocols/mcp, protocols/mcp-http-transport, security/mcp-cves, security/oauth-boundary-testing, python/latency-benchmarking, agents/mcp-server-development all exist).

## Critical Gaps (blocks active project)

None. Both active projects have adequate wiki coverage for their current phases.

## Index Maintenance Gaps (files exist, not in index)

These pages exist on disk but are missing from `wiki/index.md`. Add to index before next sprint.

- **multimodal/image-generation** — Flux.1 vs DALL-E 3, open-source image gen APIs; exists, not indexed
  -> `vault:index multimodal/image-generation`
- **multimodal/video** — Gemini 1.5 Pro video understanding, Sora/Veo generation; exists, not indexed
  -> `vault:index multimodal/video`
- **multimodal/document-processing** — Claude PDF handling, pymupdf/unstructured pipeline; exists, not indexed
  -> `vault:index multimodal/document-processing`
- **safety/red-teaming-methodology** — structured adversarial testing, failure mode discovery; exists, not indexed
  -> `vault:index safety/red-teaming-methodology`
- **data/datasets** — HuggingFace datasets library, Alpaca/OpenHermes/HH-RLHF, streaming large datasets; exists, not indexed
  -> `vault:index data/datasets`
- **fine-tuning/rlhf-dpo** — RLHF + DPO treatment; exists but may overlap with fine-tuning/dpo-grpo — review before indexing
  -> Review for deduplication against [[fine-tuning/dpo-grpo]]
- **llms/ae-hub** — AI Engineering Brain hub stub; exists but missing `tldr:` frontmatter and content
  -> Add `tldr:` frontmatter and flesh out before indexing

## Concept Gaps (mentioned, no page)

- **LiteLLM** — provider-agnostic LLM router; mentioned in context of Bedrock/OpenAI-compatible routing but no dedicated page. Widely used in production.
  -> Suggested: `vault:research litellm provider abstraction proxy 2025 2026`

- **Strands Agents SDK** — AWS's open-source Python agent framework mentioned in [[apis/aws-bedrock]]; wraps Converse API with KB + Guardrails integration. No page.
  -> Suggested: `vault:new-page agents/strands-agents-sdk "AWS open-source Python agent framework wrapping Bedrock Converse API"`

## Suggested Ingest Queue (ranked)

1. Index 5 existing unindexed pages (multimodal/image-generation, video, document-processing, safety/red-teaming-methodology, data/datasets) — maintenance, not research
2. Review fine-tuning/rlhf-dpo vs dpo-grpo for deduplication
3. LiteLLM — genuine gap, widely referenced, no page
4. Strands Agents SDK — concept gap from aws-bedrock
5. Fix llms/ae-hub stub (add tldr + content)

## Resolved Gaps (this sprint — 2026-05-02)

| Gap | Page Written |
|---|---|
| nosql-databases | [[cs-fundamentals/nosql-databases]] |
| cicd-pipelines | [[cs-fundamentals/cicd-pipelines]] |
| annotation-tooling | [[data/annotation-tooling]] |
| aws-bedrock | [[apis/aws-bedrock]] |
| mcp-server-development | [[agents/mcp-server-development]] |

Previous sprint resolutions still current: python-basics, instructor, langchain, guardrails, experiment-tracking, testing-at-scale (via technical-qa), load-testing (via technical-qa).

## Connections

- [[para/projects]] — source of active project context
- [[index]] — coverage map source

## Open Questions

- Is fine-tuning/rlhf-dpo a standalone treatment of RLHF+DPO or a duplicate of dpo-grpo? Review and merge or index.
- Which of the 7 index maintenance gaps is most referenced by existing wikilinks?
