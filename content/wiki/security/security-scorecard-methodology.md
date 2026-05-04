---
type: concept
category: security
para: resource
tags: [security, scoring, opensff-scorecard, cvss, mcpindex]
tldr: How to design a defensible, reproducible composite security score — covering OpenSSF Scorecard's weighted 0-10 model, CVSS's base/temporal/environmental split, graduated vs pass/fail tradeoffs, and category weighting conventions.
sources: [raw/inbox/security-scorecard-methodology-perplexity-2026-05-04.md]
updated: 2026-05-04
---

# Security Scorecard Methodology

> **TL;DR** How to design a defensible, reproducible composite security score — covering OpenSSF Scorecard's weighted 0-10 model, CVSS's base/temporal/environmental split, graduated vs pass/fail tradeoffs, and category weighting conventions.

---

## Key Facts

- OpenSSF Scorecard uses a 0–10 scale per check and a weighted aggregate; each check has a risk tier (Critical/High/Medium/Low) that acts as the weight in the composite.
- CVSS separates intrinsic severity (Base Score) from time-varying exploitability (Temporal/Threat) and deployment context (Environmental) — only Base Scores are published by default; organizations apply Environmental adjustments themselves.
- Graduated scales (0–10 or 0–100) give more signal for prioritization than pass/fail; pass/fail is a CI gate applied on top of a graduated underlying metric.
- Category weighting consensus: auth/access control > injection > information disclosure > supply chain hygiene > informational.
- OpenSSF Scorecard's highest-risk-weighted checks: known Vulnerabilities, Dangerous-Workflow (CI code execution), Binary-Artifacts; Code-Review and Branch-Protection are High. [unverified: exact current risk tiers — check ossf/scorecard source for current values]
- Reproducibility requires: all inputs are public and immutable, algorithm is versioned and open source, methodology version is included in every output.
- OpenSSF Scorecard V5 (2024) introduced structured results — per-check granular data enabling custom policy enforcement, not just a single composite number.
- SecurityScorecard uses a logarithmic A–F grading scale; an F-grade organization is reportedly 13.8x more likely to sustain a breach than an A-grade one. [unverified]
- Snyk Priority Score runs 0–1,000 and incorporates CVSS severity, reachability, exploit availability, and fix availability; its Risk Score layer adds ML-based likelihood weighting.
- Socket.dev scores packages across supply chain, quality, maintenance, license, and vulnerability categories — targeting signals (install scripts, unexpected network access) that CVSS does not cover.
- Responsible disclosure convention: 90-day embargo (Google Project Zero standard), then public. SECURITY.md / security.txt (RFC 9116) signal how to report.
- CVE + NVD: industry standard identifiers and CVSS-enriched severity scores, fully public and machine-readable.

---

## Detail

### OpenSSF Scorecard model

OpenSSF Scorecard (launched 2020, maintained by the Open Source Security Foundation) is the closest existing reference point for scoring open source tools. It runs 18+ automated checks against a repository's public state and produces: (a) a per-check score 0–10 and (b) a composite aggregate derived from a weighted average of all check scores.

The weighting mechanism is the risk tier of each check. Checks classified as Critical or High risk contribute more to reducing the aggregate when they score poorly than Medium or Low checks do. The exact numeric coefficients are encoded in the tool's source code rather than a published formula sheet — which is a weakness for external auditability, though the code is open source.

The tool is deliberately opinionated. The OpenSSF team acknowledges that check selection, risk classification, and aggregation are all judgment calls, and that checks use heuristics with false positives and false negatives. The score is a signal, not a ground truth.

V5 (2024) introduced structured results: instead of consuming only the composite number, integrators can receive the full per-check breakdown and enforce custom policy rules (e.g., "fail the build if the Vulnerabilities check scores below 8"). This separates the measurement layer from the enforcement layer — a design pattern worth adopting for mcpindex.

### CVSS scoring approach

CVSS (Common Vulnerability Scoring System, maintained by FIRST) provides the industry vocabulary for individual vulnerability severity. Its 0–10 numeric output maps to five severity bands: None (0.0), Low (0.1–3.9), Medium (4.0–6.9), High (7.0–8.9), Critical (9.0–10.0).

The Base Score is intrinsic: it encodes how exploitable the vulnerability is (Attack Vector, Attack Complexity, Privileges Required, User Interaction) and what the impact is (Confidentiality, Integrity, Availability — each None/Low/High). A network-reachable, low-complexity, no-privileges-required, user-interaction-free vulnerability with High impact across all three pillars scores 10.0. This profile — AV:N/AC:L/PR:N/UI:N/C:H/I:H/A:H — is the upper bound and typical of remote code execution vulnerabilities.

The Temporal Score (v3.x) or Threat Score (v4.0) adjusts for whether exploit code exists and how reliable the report is. The Environmental Score adjusts for an organization's specific deployment context and mitigations. For a public scorecard, Base Scores are the right reference — they are stable, reproducible, and the industry default on NVD.

CVSS v4.0 (2023) adds a Supplemental group for non-score-affecting context and renames Temporal to Threat, shifting focus from generic temporal factors to active exploitation evidence. [unverified: v4.0 adoption rate as of 2026]

### Graduated vs pass/fail

The industry consensus is to measure with a graduated scale and enforce with a threshold. Every mature tool (OpenSSF, Snyk, SecurityScorecard, Socket.dev) uses graduated internal scores because they allow prioritization — a score of 3 and a score of 7 both fail a gate of 8, but they should not receive the same remediation urgency.

Pass/fail is appropriate as a CI gate: expose a configurable threshold so that projects can declare "my mcpindex score must be >= 7 to merge." Below the threshold, fail the CI step. The underlying metric stays graduated.

OpenSSF Scorecard's V5 structured results formalize this: the raw check scores are graduated, and the policy layer (which runs in CI) applies pass/fail thresholds per check or per aggregate. This is the model to follow.

SecurityScorecard uses letter grades (A–F) over a 0–100 numeric score, which is effectively a graduated scale with labeled bands. The band labels (A/B/C/D/F) help non-technical stakeholders interpret scores without understanding the numeric scale — a useful UX pattern for a public scorecard directory.

### Category weighting conventions

No universal published standard governs category weights across tools, but consistent patterns emerge:

**Authentication and access control** is uniformly the highest-weight category. Auth failures are the most common breach causation factor (credential stuffing, token leakage, privilege escalation). In a CVSS context, auth vulnerabilities frequently score PR:N (no privileges required) and AV:N, producing high Base Scores.

**Injection** (command injection, SQL injection, prompt injection) ranks second. CVSS exploitability metrics for injection are typically worst-case: network reachable, low complexity, no privileges. In an MCP context, tool poisoning and STDIO injection map directly here.

**Information disclosure** ranks third. It scores lower on CVSS because Impact metrics are limited to Confidentiality:High (Integrity and Availability are unaffected), capping the Base Score relative to full-impact vulnerabilities. However, disclosure findings escalate when chained with other issues.

**Supply chain integrity** (dependency pinning, signed releases, binary artifact verification) is medium-weight in OpenSSF Scorecard. These checks detect risk indirectly rather than finding a specific exploitable vulnerability.

**Hygiene and process checks** (SECURITY.md presence, maintained status, license) are low weight. They matter for trust and responsible disclosure but have low direct breach causation.

For mcpindex specifically, the MCP-specific categories that don't fit neatly into existing frameworks are: tool description injection risk, transport security (STDIO vs HTTP), and rug-pull resistance (version pinning, update verification). These should be treated as High-weight custom checks given their specific relevance to the MCP threat model.

### Public disclosure norms

The established convention for open source security tooling is coordinated vulnerability disclosure (CVD): the discoverer reports privately, the maintainer is given a remediation window (90 days is the Google Project Zero standard, now widely adopted), and then the finding is published publicly regardless of whether a fix exists. Early publication without notice is generally considered irresponsible; indefinite embargo defeats the purpose.

For a tool like mcpindex that publishes security scores for third-party servers, the relevant question is how to handle findings about a specific server. The convention is:

1. A score reflects the observable state of a server at a point in time — this is not the same as disclosing a private vulnerability.
2. If the scanning discovers a specific CVE or exploit condition, notify the maintainer before publishing the finding detail.
3. The aggregate score can be published immediately; the specific finding that drove a low score can be embargoed per CVD norms.
4. Publish methodology openly so server maintainers can understand why their score is what it is and how to improve it.

SECURITY.md (or a security policy link in the repository) is what OpenSSF's Security-Policy check looks for. RFC 9116 defines the security.txt format for web servers. Both signal that a project has a responsible disclosure path.

### Reproducibility requirements

A score is reproducible if any third party running the same tool against the same inputs at any future point gets the same result. This requires:

1. **Immutable inputs:** Score against a specific commit hash or a pinned server version, not "latest."
2. **Versioned algorithm:** The scoring logic must be tagged and the version included in every output artifact. A score produced by methodology v1.2 is not directly comparable to one produced by v1.3 without a changelog.
3. **No opaque black-box models:** ML-based scoring (like parts of Snyk's risk model) is useful for internal prioritization but undermines reproducibility and auditability for a public scorecard.
4. **Published formula:** Anyone should be able to read the source and manually verify a score. OpenSSF Scorecard satisfies this; SecurityScorecard's z-score normalization does not. [unverified: SSC has published methodology PDFs but the full normalization formula is proprietary]

For mcpindex, publishing the scoring source code under an open source license and including methodology version + inputs in every report satisfies all four requirements.

### Designing a composite score for an open source security tool

Bringing these patterns together, a principled composite score for mcpindex would:

- Run a fixed set of named checks against a server (analogous to OpenSSF's 18+ checks).
- Assign each check a risk tier (Critical/High/Medium/Low) based on its contribution to breach probability in the MCP threat model.
- Score each check 0–10 using a graduated scale.
- Compute a weighted average using tier weights as coefficients (e.g., Critical = 4, High = 3, Medium = 2, Low = 1).
- Report the aggregate 0–10 score, each check's individual score, and the methodology version.
- Expose a configurable threshold for CI consumers.
- Map aggregate score bands to severity labels (e.g., 0–3 = Critical Risk, 4–5 = High Risk, 6–7 = Medium Risk, 8–9 = Low Risk, 10 = Pass) so non-technical stakeholders can interpret results.
- Include CVSS Base Score where a known CVE is detected, so the finding connects to industry-standard severity language.

---

## Connections

- [[para/projects]] — mcpindex scorecard design needs this framework directly; the scoring model here should inform check weighting and report format
- [[security/owasp-llm-top10]] — defines what to check (the vulnerability classes); this page defines how to score it
- [[security/mcp-cves]] — raw CVE data that feeds into a scorecard; known CVEs directly reduce the Vulnerabilities check score
- [[protocols/mcp]] — the protocol being scored; MCP-specific attack surfaces (tool poisoning, STDIO injection, rug pull) require custom check categories
- [[security/prompt-injection]] — prompt injection is a High-weight check category in any MCP scorecard
- [[security/threat-modelling]] — OWASP Risk Rating Methodology (Likelihood × Impact) is relevant to category weight derivation
- [[security/owasp-wstg]] — WSTG check taxonomy can inform which injection and disclosure checks to include
- [[security/socket-dev]] — Socket.dev scoring categories are a reference implementation for composite scoring
- [[security/snyk]] — Snyk Priority Score is a reference implementation for multi-factor composite scoring

---

## Open Questions

- What exact numeric weights does OpenSSF Scorecard assign to each risk tier (Critical/High/Medium/Low)? These are in the source code but not documented in a single canonical location.
- Should mcpindex use a 0–10 scale (matching OpenSSF) or a 0–100 scale (matching SecurityScorecard/Snyk) for the composite? 0–10 is simpler; 0–100 gives more granularity for differentiation between close scores.
- How should the scorecard handle MCP servers with no public source code? (Closed-source servers cannot be checked for branch protection, code review, etc. — many OpenSSF checks are inapplicable.)
- Is there a published industry standard for weighting tool poisoning / prompt injection risk relative to classic injection (SQLi, CMDi)? No known source covers this as of 2026.
- Should mcpindex publish per-server findings immediately (treating scores as observable-state reports) or apply a CVD embargo window for specific vulnerability findings?
- How to handle score staleness — a score from 3 months ago may not reflect the current server state. What is the right TTL for a published scorecard entry?

---

## Sources

- raw/inbox/security-scorecard-methodology-perplexity-2026-05-04.md
