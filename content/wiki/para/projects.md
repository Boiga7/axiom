---
type: index
category: para
para: area
tags: [para, projects]
tldr: Active builds that use the Nexus as research context — each has a goal, current phase, and end condition.
updated: 2026-05-04
---

# Projects

> **TL;DR** Active builds that use the Nexus as research context — each has a goal, current phase, and end condition.

Projects are work with an end date. When complete, move them to [[para/archives]].

## Active

### evalcheck
- **Goal:** pytest plugin + GitHub App posting eval regression comments on every PR
- **Phase:** Distribution (post-launch) — dev.to content, cookbook PRs, Show HN
- **Kill criterion:** <500 weekly PyPI downloads AND <3 paying installs by 2026-07-28
- **Key wiki pages:** [[evals/methodology]], [[apis/anthropic-api]], [[test-automation/pytest-patterns]]
- **Next:** Marketplace listing once installs exist — see [[tools/github-marketplace-apps]] for full submission checklist

### mcpindex
- **Goal:** CLI + public scorecard directory for MCP server security scanning
- **Phase:** Weekend 2 — auth boundary tests, latency baselines, HTTP transport
- **Key wiki pages:** [[security/mcp-cves]], [[protocols/mcp]], [[security/prompt-injection]], [[protocols/mcp-registry]], [[security/security-scorecard-methodology]]
- **Distribution note:** MCP Registry researched — see [[protocols/mcp-registry]] for submission process, `_meta` extension field (the most viable path to attach scan results to registry entries), and governance. Independent scorecard linking to registry entries by `name` is the lowest-friction launch path.
- **Scoring framework:** [[security/security-scorecard-methodology]] now exists — covers OpenSSF Scorecard weighted 0-10 model, CVSS base/temporal/environmental split, category weighting conventions (auth > injection > disclosure), graduated vs pass/fail design, and reproducibility requirements. Use this as the reference for mcpindex check weighting and report format.

## Connections
- [[para/areas]] — ongoing responsibilities with no end date
- [[para/resources]] — the 23-category reference library
- [[para/archives]] — completed projects

## Open Questions
- Which project gets wiki research priority this week?
