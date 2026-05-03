---
type: concept
category: security
tags: [threat-modelling, stride, dread, security-testing, architecture]
updated: 2026-05-03
para: resource
sources: []
---

# Threat Modelling

Threat modelling is a structured approach to identifying, categorising, and prioritising potential security threats to a system before — or alongside — development. It produces a threat register that drives security requirements, architecture decisions, and a targeted test strategy.

The central question threat modelling answers: *what can go wrong, and how bad would it be?*

## When to Do It

Threat modelling belongs at **design time**, not test time. Running it after a system is built means retrofitting controls, which is expensive and often incomplete. The ideal trigger points are:

- **New system or service design** — before any code is written
- **Significant architecture change** — new integrations, new trust boundaries, switching auth mechanisms
- **New data flows** — onboarding a third party, adding an API surface, expanding to a new region
- **Pre-penetration test** — a threat model scopes the pentest, preventing wasted cycles on low-risk surfaces
- **Post-incident review** — reconstruct what the threat model missed and why

Threat modelling is not a one-time artefact. Revisit it whenever the architecture changes materially.

---

## STRIDE

STRIDE is Microsoft's threat categorisation framework. Each letter names a category of threat. Walking every component and data flow through STRIDE surfaces threats systematically rather than relying on intuition.

### S — Spoofing

An attacker claims an identity they do not have.

- Unauthenticated API endpoint accepts a user ID in the request body and acts on it
- JWT signed with `alg: none` accepted by a misconfigured library
- DNS poisoning redirecting traffic to an attacker-controlled server
- Service-to-service calls without mutual TLS — any internal host can impersonate a legitimate service

**Controls:** strong authentication (MFA, certificate-based), signed tokens with verified algorithms, mutual TLS for internal services.

### T — Tampering

An attacker modifies data in transit or at rest without authorisation.

- SQL injection altering records in the database
- Parameter tampering — changing `?price=10` to `?price=1` on a checkout flow
- Unsigned webhook payloads accepted and processed
- Log files writable by the application process — an attacker covers tracks or inserts false entries

**Controls:** input validation and parameterised queries, HMAC signature verification on webhooks, write-once or append-only log storage, integrity checks (checksums, digital signatures) on sensitive data at rest.

### R — Repudiation

A user or attacker can deny performing an action, and the system cannot prove otherwise.

- No audit log for administrative actions — a rogue admin can deny deleting records
- Authentication events not logged — impossible to reconstruct a session timeline post-incident
- Shared service accounts — multiple people authenticate as `svc-deploy`, so individual actions cannot be attributed

**Controls:** immutable audit logs with timestamps, individual accounts (no sharing), cryptographic signing of critical audit events, non-repudiation through transaction receipts.

### I — Information Disclosure

Data is exposed to parties not authorised to see it.

- Verbose error messages returning stack traces, SQL queries, or internal hostnames to end users
- S3 bucket with public read permissions containing PII
- API response including fields the current user's role should not see (missing object-level authorisation)
- Secrets committed to a public Git repository
- TLS not enforced — credentials or session tokens sent over HTTP

**Controls:** structured error handling (log detail server-side, return generic message to client), field-level authorisation checks, secrets management (Vault, AWS Secrets Manager), enforce HTTPS, data classification and DLP controls.

### D — Denial of Service

An attacker prevents legitimate users from accessing the system.

- No rate limiting on an authentication endpoint — credential stuffing exhausts CPU and database connections
- Regex with catastrophic backtracking triggered by crafted input (ReDoS)
- Unbounded file uploads filling disk
- Billion laughs XML entity expansion exhausting memory
- Resource-intensive endpoints (report generation, export) callable without pagination or queueing

**Controls:** rate limiting and throttling, request size limits, input validation before expensive operations, async job queues for heavy workloads, circuit breakers, WAF rules.

### E — Elevation of Privilege

An attacker gains capabilities beyond what they were granted.

- IDOR (Insecure Direct Object Reference) — user modifies `?account_id=1234` to access another user's data
- JWT role claim accepted client-side without server-side enforcement
- Deserialization vulnerability allows remote code execution as the application service account
- SSRF allowing an attacker to reach the EC2 instance metadata endpoint and retrieve IAM credentials
- Misconfigured sudo rules allowing a low-privilege process to escalate to root

**Controls:** server-side authorisation checks on every sensitive operation, principle of least privilege for service accounts, deny-by-default ACLs, network egress filtering to block SSRF targets.

---

## DREAD

DREAD is a scoring model for prioritising identified threats. Each threat gets a score of 1–10 across five dimensions; the average (or weighted average) determines priority.

| Dimension | Question | Score guidance |
|---|---|---|
| **D**amage | How bad is the worst-case impact? | 1 = cosmetic, 5 = significant data loss, 10 = full system compromise or mass PII breach |
| **R**eproducibility | How reliably can the attack be repeated? | 1 = requires rare conditions, 5 = repeatable with some effort, 10 = trivially reproducible every time |
| **E**xploitability | How much skill or resource does exploitation require? | 1 = nation-state tooling required, 5 = public exploit available, 10 = no skill needed, automated |
| **A**ffected users | How many users are impacted? | 1 = single user, 5 = subset of users, 10 = all users or the organisation itself |
| **D**iscoverability | How easy is it to find the vulnerability? | 1 = requires deep source access, 5 = visible with moderate effort, 10 = obvious to casual inspection |

**DREAD score = (D + R + E + A + D) / 5**

Thresholds (common convention):
- 8–10: Critical — fix before release
- 5–7: High — fix in next sprint
- 3–4: Medium — schedule for remediation
- 1–2: Low — accept or defer

DREAD is subjective and its Discoverability dimension has been criticised (security through obscurity is not a control). Use it as a relative ranking tool within a session, not as an absolute measure across systems.

---

## PASTA

PASTA (Process for Attack Simulation and Threat Analysis) is a seven-stage risk-centric methodology. It is more rigorous than STRIDE+DREAD but requires more time investment, making it better suited to critical systems or regulated environments.

1. **Define objectives** — establish business objectives and security requirements
2. **Define technical scope** — enumerate technical components, dependencies, and environment
3. **Decompose the application** — DFDs, trust boundaries, entry points, asset inventory
4. **Threat analysis** — identify threat actors, capabilities, and motivations
5. **Vulnerability analysis** — map existing weaknesses (CVEs, code review findings, config issues)
6. **Attack modelling** — construct attack trees; simulate realistic attack paths
7. **Risk analysis** — quantify residual risk; prioritise countermeasures by risk reduction per cost

PASTA produces a risk-ranked remediation backlog directly tied to business impact, which makes it easier to get executive sign-off on security investment.

---

## Running a Threat Modelling Workshop

### Who to Invite

A productive threat model needs representation across disciplines. Missing a perspective means missing whole categories of threat.

| Role | Why present |
|---|---|
| Solution architect / tech lead | Knows the intended design and its constraints |
| Developer(s) | Knows what was actually built vs. what was designed |
| Security engineer / consultant | Knows attack patterns; facilitates STRIDE walk |
| DevOps / platform engineer | Knows infrastructure, network topology, secrets management |
| Product owner | Clarifies business sensitivity of data flows; approves risk acceptance |
| QA lead | Translates threats into test cases; spots testability gaps |

For a client engagement as a Senior Technical Consultant, you are typically the security engineer and facilitator. The client provides the other roles. If the client's developer and architect are the same person, call that out — it means there is no independent perspective on the design.

### What to Bring

- **System context diagram** — the "what are we modelling" anchor. Even a rough whiteboard photo is better than nothing.
- **Data classification register** — what data does the system hold, and at what sensitivity?
- **Regulatory scope** — PCI DSS, GDPR, HIPAA, ISO 27001 controls that apply
- **Prior pentest reports or audit findings** — threats the system has already faced
- **STRIDE worksheet** — pre-populated with component and data flow rows; participants fill in threats during the session

### Data Flow Diagram Creation

A DFD is the primary artefact. Build it at the start of the session collaboratively — do not arrive with a finished DFD, because the act of drawing it surfaces disagreements about how the system actually works.

DFD elements:
- **External entities** (rectangles) — actors outside the system: browser, mobile app, third-party API, admin user
- **Processes** (circles/ovals) — code that transforms data: API gateway, auth service, payment processor
- **Data stores** (parallel lines) — persistence: database, cache, S3 bucket, message queue
- **Data flows** (arrows) — data moving between elements; label with the data type and protocol
- **Trust boundaries** (dashed rectangles) — the line between zones with different privilege levels: internet vs. DMZ, DMZ vs. internal network, user context vs. admin context

Trust boundaries are where most STRIDE threats live. Every data flow crossing a trust boundary gets interrogated.

### Walking the Attack Surface

With the DFD on the wall (or shared screen), walk each trust boundary crossing systematically:

1. Name the data flow (e.g., "browser submits payment to API gateway over HTTPS")
2. For each STRIDE category, ask: "Can this flow be exploited for [S/T/R/I/D/E]?"
3. For each identified threat, capture: description, affected component, DREAD score, proposed control
4. Defer debate about controls — capture first, prioritise later

A two-hour session is realistic for a system with 5–8 components and 10–15 data flows. More complex systems need a half-day or split sessions.

### Facilitation Tips for Client Engagements

- Start by agreeing scope explicitly. "Are we modelling the mobile app, the backend, both, and which environments?"
- Timebox each component to 10–15 minutes. Rabbit holes about implementation detail kill momentum.
- If participants say "that can't happen because we trust our cloud provider", note it and move on — cloud misconfiguration is a real threat class, but the debate can happen offline.
- Surface assumptions: "You said the internal network is trusted — who can reach it? Can a compromised VM?"
- After the session, own the write-up. Clients rarely produce the threat register themselves.

---

## Trust Boundaries

Trust boundaries define where the level of trust changes between components. Every boundary crossing is a candidate attack surface.

Common trust boundaries:
- Internet to DMZ
- DMZ to internal application tier
- Application to database
- User context to privileged/admin context
- On-premise to cloud
- Third-party integration boundary (OAuth callback, webhook receiver)
- Container to host (container escape)
- CI/CD pipeline to production environment

When modelling microservices, every service-to-service call that crosses a network boundary is a trust boundary. The naive assumption that the internal network is trusted is the root cause of a large proportion of lateral movement in breaches.

---

## Mapping STRIDE to OWASP Top 10

The OWASP Top 10 (2021) maps closely onto STRIDE categories. Using both together ensures that workshop-identified threats translate into recognised vulnerability classes with established test cases.

| STRIDE | Relevant OWASP Top 10 2021 |
|---|---|
| Spoofing | A07: Identification and Authentication Failures |
| Tampering | A03: Injection; A08: Software and Data Integrity Failures |
| Repudiation | A09: Security Logging and Monitoring Failures |
| Information Disclosure | A02: Cryptographic Failures; A05: Security Misconfiguration |
| Denial of Service | A05: Security Misconfiguration (rate limiting); partially A04: Insecure Design |
| Elevation of Privilege | A01: Broken Access Control; A04: Insecure Design |

This mapping lets you bridge the workshop output directly to the client's existing OWASP awareness and compliance requirements.

---

## Threat Modelling for APIs and Microservices

APIs and microservices introduce threat patterns that monolithic DFDs often miss.

**API-specific threats:**
- Broken Object Level Authorisation (BOLA/IDOR) — every endpoint that accepts a resource ID is a Spoofing + Elevation threat
- Mass assignment — accepting more fields than intended via PUT/PATCH
- Insecure deserialization on JSON/protobuf endpoints
- GraphQL introspection enabled in production — full schema enumeration
- Lack of versioning allowing clients to pin to vulnerable API versions

**Microservices-specific threats:**
- Service mesh misconfiguration — mTLS not enforced between services
- Container image supply chain — base images with CVEs pulled from public registries
- Secret sprawl — same credentials shared across services, one compromise exposes all
- Sidecar injection in service mesh — compromised sidecar intercepts all traffic
- Event bus poisoning — untrusted input written to Kafka/SQS processed by downstream services without validation

For microservice architectures, draw a separate mini-DFD per service boundary. The aggregate picture is too complex to walk in a single session.

---

## From Threat Model to Test Strategy

The threat register is not the end product — it is the input to the test strategy. Each threat generates one or more test cases.

**Mapping threats to tests:**

| Threat | Test case type | Example |
|---|---|---|
| Spoofing: JWT alg:none accepted | Unit test + API test | Send token with `alg: none`; assert 401 |
| Tampering: price parameter | API test | Send negative price; assert 400 or original price enforced server-side |
| Information Disclosure: verbose errors | API test | Trigger a 500; assert response body contains no stack trace |
| Elevation: IDOR on account endpoint | API test | Authenticate as User A; request User B's account; assert 403 |
| DoS: no rate limit on login | Load test | Send 1,000 login requests/minute; assert 429 after threshold |
| Repudiation: no audit log | Integration test | Perform admin action; assert event written to audit log with correct actor |

Test cases derived from the threat model are higher value than generic OWASP checklists because they are scoped to the system's actual attack surface.

The threat register should feed directly into:
- The pentest scope and rules of engagement
- Security-specific acceptance criteria in user stories
- Regression test suite for identified vulnerabilities
- Risk acceptance sign-off for threats that are accepted rather than mitigated

---

## MITRE ATT&CK Basics

MITRE ATT&CK is a knowledge base of adversary tactics, techniques, and procedures (TTPs) derived from real-world intrusions. It complements STRIDE by providing attacker-perspective detail on *how* threats are realised.

**Structure:**
- **Tactics** — the adversary's goal at a phase of the attack (e.g., Initial Access, Persistence, Lateral Movement, Exfiltration)
- **Techniques** — how a tactic is achieved (e.g., T1190: Exploit Public-Facing Application, T1078: Valid Accounts)
- **Sub-techniques** — specific implementations (e.g., T1078.001: Default Accounts)
- **Mitigations** — controls mapped to each technique

For threat modelling workshops, ATT&CK is most useful in the attack simulation stage: after identifying a threat via STRIDE, look up the relevant ATT&CK technique to understand realistic attack paths, tools attackers use, and detection opportunities.

ATT&CK matrices exist for Enterprise, Mobile, ICS, and Cloud. For web application and API threat models, the Enterprise matrix is the primary reference.

---

## Output Format — Threat Register

The threat register is the canonical deliverable. Maintain it as a structured table (spreadsheet or issue tracker). Minimum fields:

| Field | Description |
|---|---|
| ID | Sequential identifier (TM-001, TM-002…) |
| Component | Affected system component |
| Data flow | The flow or boundary the threat targets |
| STRIDE category | S / T / R / I / D / E |
| Threat description | One sentence: what an attacker does and what happens |
| DREAD score | D/R/E/A/D scores and aggregate |
| Priority | Critical / High / Medium / Low |
| Proposed control | Specific mitigation, not "add validation" |
| Status | Open / In Progress / Mitigated / Accepted |
| Owner | Who is responsible for remediation |
| Test case | Linked test case reference or description |

For client deliverables, supplement the register with an executive summary (overall risk posture, top three threats, recommended immediate actions) and a DFD annotated with threat IDs.

---

## Tooling

### OWASP Threat Dragon

Open-source, web-based threat modelling tool. Draws DFDs with trust boundaries, generates STRIDE threat lists per component, exports threat registers to JSON/PDF. Runs in-browser or as an Electron desktop app. Integrates with GitHub for storing `.tdx` model files in the repository alongside the code.

Best for: teams that want the threat model version-controlled with the codebase. Free, no vendor lock-in.

### Microsoft Threat Modeling Tool

Windows desktop application. Uses STRIDE natively. Ships with component templates (web application, Azure services, generic components) that auto-generate threat suggestions from the DFD. Produces reports in HTML. Requires Windows.

Best for: Microsoft-stack shops, teams already in the Microsoft security ecosystem.

### draw.io / Miro

Not purpose-built for threat modelling, but widely used in workshops because clients already have access. Use a custom STRIDE notation layer on top of a standard DFD. Export to image and maintain the threat register separately in a spreadsheet.

Best for: client workshops where installing specialist tooling is not practical.

### IriusRisk

Commercial platform with automated threat generation from architecture templates, risk scoring, and integration with JIRA and Azure DevOps. Used in regulated industries (finance, healthcare) where auditable threat models are required.

Best for: organisations with compliance requirements that mandate formal threat modelling evidence.

---

## Cross-References

- [[security/owasp-llm-top10]] — OWASP Top 10 for LLMs; relevant when threat modelling AI systems
- [[security/prompt-injection]] — a specific STRIDE Tampering + Elevation threat in AI pipelines
- [[security/red-teaming]] — structured adversarial testing; downstream of threat model outputs
- [[protocols/mcp]] — MCP security model; threat modelling for agentic tool use
- [[security/oauth-boundary-testing]] — Elevation of Privilege threats at OAuth trust boundaries
- [[evals/index]] — capability evaluations as a form of threat modelling for AI systems
