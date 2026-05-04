---
type: concept
category: protocols
para: resource
tags: [mcp, registry, distribution, modelcontextprotocol]
tldr: The official MCP Registry (registry.modelcontextprotocol.io) is a namespace-verified, community-moderated catalog of MCP servers launched in preview September 2025, governed under the Linux Foundation's Agentic AI Foundation.
sources: [raw/inbox/mcp-registry-perplexity-2026-05-04.md]
updated: 2026-05-04
---

> **TL;DR** The official MCP Registry (registry.modelcontextprotocol.io) is a namespace-verified, community-moderated catalog of MCP servers launched in preview September 2025, governed under the Linux Foundation's Agentic AI Foundation.

## Key Facts

- Official registry at `registry.modelcontextprotocol.io`; GitHub repo at `modelcontextprotocol/registry`
- Launched in **preview September 2025**; API v0.1 freeze (no breaking changes) declared October 2025
- Backed by Anthropic, GitHub, PulseMCP, and Microsoft; governed under the **Agentic AI Foundation (AAIF)** / Linux Foundation
- Named maintainers include David Soria Parra (lead), Adam Jones, Tadas Antanavicius, Toby Padilla, and Theodora Chu (Anthropic PM)
- Servers are published by submitting a **`server.json`** file; namespace ownership is verified automatically (no manual approval queue before listing) [unverified — queued review step not ruled out]
- Two namespace types: `io.github.[org]/[server]` (GitHub OAuth/OIDC) and `com.[domain]/[server]` (DNS or HTTP verification)
- Schema versioned at `static.modelcontextprotocol.io/schemas/YYYY-MM-DD/server.schema.json`; current known versions: 2025-09-29, 2025-12-11
- Required schema fields: `name`, `description`, `version`, `packages`
- Optional `_meta` property for extension metadata; no first-class `tags` or `categories` fields found [unverified — may exist in later schema revisions]
- Moderation is reactive: community flags violations; maintainers denylist offending entries
- No standardised security rating or scan-result field in the registry schema as of 2026
- Ecosystem: 16,000+ servers in the wild (up from ~714 in January 2025); official registry is canonical but third-party indexes (mcp.so, PulseMCP, Glama) hold broader catalogs
- GitHub Copilot (VS Code) added allowlist controls tied to the registry in November 2025

## Detail

### Who Runs the Registry

The MCP Registry is maintained under the `modelcontextprotocol` GitHub organisation as a community-driven project. Anthropic provided the founding governance but donated MCP and its associated infrastructure to the **Agentic AI Foundation (AAIF)**, a directed fund under the Linux Foundation co-founded by Anthropic, Block, and OpenAI, with AWS, Google, Microsoft, Cloudflare, and Bloomberg as supporters. The registry working group includes maintainers from Anthropic and external contributors; as of late 2025 the named maintainers are David Soria Parra (lead), Adam Jones, Tadas Antanavicius, and Toby Padilla, with Theodora Chu as the Anthropic PM overseeing it.

### Submission Process

A server author creates a `server.json` file conforming to the official JSON Schema. The `name` field is the critical first decision because it determines the authentication path:

- **GitHub namespace** (`io.github.[org]/[server]`): authenticate via GitHub OAuth (browser flow) or GitHub OIDC (for GitHub Actions CI/CD automation).
- **Domain namespace** (`com.[domain]/[server]`): verify ownership via a DNS TXT record or by hosting a verification file at a well-known HTTP path.

Once the `server.json` passes namespace validation, the entry appears in the registry. Publication appears to be immediate after automated verification rather than queued for human pre-approval, though moderation can remove entries after the fact [unverified — an initial human review step was not confirmed absent in source material]. The registry API was at v0 as of the October 2025 freeze; the endpoint accepts push/publish requests programmatically.

### Metadata Schema

The schema is pinned to dated versions hosted at `static.modelcontextprotocol.io/schemas/`. The `server.json` must declare `$schema` pointing to the appropriate version URL. Known schema revisions: 2025-09-29 (launch) and 2025-12-11 (later revision).

**Required fields:**
- `name` — reverse-DNS unique identifier
- `description` — human-readable summary of server capabilities
- `version` — version string
- `packages` — package locations (npm package name, PyPI identifier, remote URL, etc.)

**Notable optional fields:**
- `_meta` — a reserved extension property that is preserved when publishing; tooling can use it to attach custom metadata (e.g., build provenance, scanner results) without polluting the main schema
- Remote server URL configuration for HTTP-transport servers [unverified — exact field name unclear from sources]

No formal `tags` or `categories` taxonomy was found in the schema descriptions retrieved. Discoverability relies primarily on text search against name and description fields, plus namespace conventions.

### Discoverability

The official registry API is publicly queryable and can be filtered by metadata. Servers undergo liveness checks (active pinging at a short interval [unverified — ~5 seconds reported]) before appearing as valid. There is no popularity-based ranking within the official registry itself.

The wider discovery landscape in 2026 is fragmented: the official registry is authoritative but not the largest index. mcp.so indexes 16,000+ servers via automated crawling; PulseMCP is the largest hand-reviewed directory; MCPmarket.com publishes daily rankings by community engagement; Glama offers broad automated coverage. GitHub Copilot and VS Code integrated the official registry as a trusted source for internal allowlist controls in November 2025, which is a meaningful signal of institutional adoption.

### Moderation and Governance

Moderation is reactive. Any community member can file an issue against the registry repo to flag a server for violating moderation guidelines (spam, malicious code, impersonation of legitimate services). Registry maintainers review flagged entries and can denylist them, which retroactively removes public access. There are no published SLAs for review time [unverified]. The model is optimised for openness over gate-keeping: publication is fast, removal is manual.

This creates a meaningful security gap: servers are published faster than they are reviewed, and the ecosystem grew from hundreds to tens of thousands of servers before any systematic vetting infrastructure existed. Third-party security scanners (AgentSeal, Astrix, mcpindex) fill this gap independently of the registry itself.

### Stability and Adoption as of 2026

The registry is in a stable-preview state. The v0.1 API freeze means no breaking changes, but the "preview" label and absence of explicit durability guarantees means it should not be treated as a fully production-grade GA service for critical infrastructure. In practice, it is already widely referenced: VS Code/Copilot, Cursor, and other tooling treat it as the canonical source. The foundation governance transfer to the Linux Foundation adds long-term legitimacy. A 1.0 designation has not been announced in any source found.

### Relevance to Security Scanning Tools (mcpindex)

The `_meta` extension property is the most plausible path for a tool like mcpindex to attach security scan results to a registry entry. However, no standardised schema for security metadata exists in the registry today, and no evidence was found that the working group has an active roadmap item for security ratings as a first-class registry feature. The practical distribution paths for mcpindex scan results are therefore:

1. **Independent scorecard** — a separate public directory that links to registry entries by `name` (no registry modification required)
2. **`_meta` embedding** — publishing server.json entries that include scan results in the `_meta` field (possible today, but non-standard)
3. **Registry feature request** — proposing a standardised security field to the working group via the GitHub repo

Option 1 is the lowest-friction path and does not depend on registry governance approval.

## Connections

- [[protocols/mcp]] — parent protocol; the registry is the distribution layer for the MCP ecosystem
- [[para/projects]] — mcpindex project; distribution planning depends on understanding what the registry supports
- [[security/mcp-cves]] — CVE data that could be surfaced via registry entries or a linked scorecard
- [[security/prompt-injection]] — tool poisoning via malicious descriptions is detectable by scanners; registry lacks built-in screening
- [[ai-tools/claude-code]] — ships first-party MCP servers; registry is relevant for any third-party server users install

## Open Questions

- Is the MCP Registry stable enough for production distribution reliance (durability guarantees, uptime SLA)?
- Can security scan results be associated with registry entries via `_meta`, and would this be adopted as a convention?
- Will the working group add a formal `tags`/`categories` taxonomy to improve programmatic discoverability?
- Does the registry roadmap include proactive security vetting (pre-listing scans) rather than purely reactive denylist moderation?
- How does the Linux Foundation governance affect the pace of schema evolution?

## Sources

- raw/inbox/mcp-registry-perplexity-2026-05-04.md
