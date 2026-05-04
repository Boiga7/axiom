---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: Ranked knowledge gaps relative to active projects — 0 critical gaps, 2 concept gaps. RFC 7591 Dynamic Client Registration is the top priority for mcpindex auth scanning.
updated: 2026-05-03
---

# Knowledge Gap Report — 2026-05-03 (run 3)

> **TL;DR** Both projects have strong wiki coverage. No blocking gaps. Two concept gaps surfaced from scanning the three pages added this session.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for eval regression comments. Phase: Distribution (Show HN, cookbook PRs, marketplace listing). Wiki coverage: comprehensive — all distribution-relevant pages exist (pypi-distribution, github-apps, evals/methodology).
- **mcpindex**: CLI + public scorecard for MCP server security scanning. Phase: Weekend 2 (auth boundary tests, latency baselines, HTTP transport). Wiki coverage: strong — `security/oauth-boundary-testing`, `python/latency-benchmarking`, `protocols/mcp-http-transport`, and the new `protocols/oauth-server-metadata` all cover current-phase needs.

---

## Critical Gaps (blocks active project)

None. Both projects have complete wiki coverage for their current phase.

---

## Concept Gaps (mentioned, no page)

### 1. `protocols/rfc-7591-dynamic-client-registration`
RFC 7591 (Dynamic Client Registration) is referenced in [[protocols/oauth-server-metadata]] as the mechanism MCP clients use to self-register when no `client_id` is pre-provisioned. The `registration_endpoint` field in the RFC 8414 metadata document points to this endpoint. For mcpindex auth boundary testing, checking whether a server's `registration_endpoint` accepts arbitrary client registrations (scope creep, no rate limiting) is a security test case. No dedicated page.

-> Suggested: `vault:new-page protocols/rfc-7591-dynamic-client-registration "RFC 7591 OAuth 2.0 Dynamic Client Registration — registration_endpoint, client metadata fields, security considerations for MCP servers"`

### 2. `llms/multi-head-latent-attention`
MLA (Multi-head Latent Attention) is mentioned in [[llms/deepseek-r1]] as the attention variant used in DeepSeek-V3/R1 — a compressed KV cache approach that reduces memory by projecting keys and values to a low-rank latent space before caching. It is architecturally distinct from GQA and has been adopted in subsequent models. Referenced by name without a dedicated page. [[llms/transformer-architecture]] covers MHA, GQA, and MQA but not MLA.

-> Suggested: `vault:new-page llms/multi-head-latent-attention "DeepSeek MLA — low-rank KV cache compression, latent projection vs GQA, memory savings"`

---

## Suggested Ingest Queue (ranked)

1. **RFC 7591 Dynamic Client Registration** (concept gap — mcpindex auth scanning relevance)
2. **Multi-head Latent Attention (MLA)** (concept gap — referenced in deepseek-r1 without own page)

---

## Previously Resolved Gaps

| Gap | Page | Sprint |
|---|---|---|
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

- Does RFC 7591 Dynamic Client Registration need a full page or is a section in [[protocols/oauth-server-metadata]] sufficient for mcpindex's purposes?
- Is MLA best covered as its own page or as a section in [[llms/transformer-architecture]]?
