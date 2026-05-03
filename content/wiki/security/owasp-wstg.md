---
type: concept
category: security
tags: [owasp, wstg, security-testing, web-testing, methodology]
sources: []
updated: 2026-05-03
para: resource
tldr: WSTG is a structured, test-ID-driven methodology for web application security testing — not a risk list. Use it to scope engagements, document findings against test IDs, and produce defensible deliverables.
---

# OWASP Web Security Testing Guide (WSTG)

> **TL;DR** WSTG is a structured, test-ID-driven methodology for web application security testing -- not a risk list. Use it to scope engagements, document findings against test IDs, and produce defensible deliverables.

The OWASP Web Security Testing Guide is the canonical reference for executing structured security testing engagements against web applications. Current version: WSTG v4.2 (2021, maintained on GitHub). Unlike the [[security/owasp-llm-top10|OWASP Top 10]], which is a ranked list of risk categories, the WSTG is a _how-to_: it tells you what to test, how to test it, and what constitutes a finding.

---

## WSTG vs OWASP Top 10

| Dimension | OWASP Top 10 | WSTG |
|---|---|---|
| Purpose | Awareness: "these are the biggest risks" | Execution: "here is how to test for them" |
| Audience | Developers, product owners, leadership | Security testers, penetration testers |
| Structure | 10 ranked risk categories | 12 test categories, 90+ individual test cases |
| Test IDs | None | WSTG-AUTHN-01, WSTG-INPVAL-03, etc. |
| Output | Risk prioritisation | Test coverage matrix + findings |
| Scope guidance | No | Yes -- exclusion justifications built in |

In practice: the Top 10 is what you put in an executive summary to explain _why_ the engagement matters. The WSTG is what you use to plan and execute the engagement itself.

---

## Test Categories and Their Coverage

The WSTG organises test cases into 12 categories. Each has a short code used as the prefix for its test IDs.

### INFO -- Information Gathering

Passive and active reconnaissance before any attack simulation. Covers fingerprinting web servers, enumerating application entry points, mapping application architecture, and identifying technology stack. Passive techniques (analysing headers, source code, public DNS) should be completed before any active scanning begins.

Key tests: search engine discovery (WSTG-INFO-01), web server fingerprinting (WSTG-INFO-02), application entry point enumeration (WSTG-INFO-06), HTTP methods (WSTG-INFO-08).

### CONF -- Configuration and Deployment Management

Server and infrastructure configuration. Checks for insecure defaults, unnecessary exposed services, missing security headers, TLS configuration, and file/directory enumeration.

Key tests: network/infrastructure configuration (WSTG-CONF-01), TLS/SSL testing (WSTG-CONF-10), HTTP strict transport security (WSTG-CONF-07), HTTP security header analysis (WSTG-CONF-07), file extension handling (WSTG-CONF-03), directory enumeration (WSTG-CONF-04).

### IDNT -- Identity Management

How identities are created, managed, and revoked. Covers account provisioning processes, username enumeration, account lockout policies, and password policy enforcement.

Key tests: account enumeration (WSTG-IDNT-04) -- whether the application distinguishes between "user not found" and "wrong password" (an information leak), password policy enforcement, and privilege provisioning.

### ATHN -- Authentication

The authentication mechanism itself. One of the richest test categories; covers basic auth, form-based auth, default credentials, credential transport, CAPTCHA, multi-factor authentication, and "remember me" functionality.

Key tests:
- WSTG-AUTHN-01: Credentials transported over encrypted channel
- WSTG-AUTHN-02: Default credentials
- WSTG-AUTHN-03: Account lockout policy
- WSTG-AUTHN-04: Authentication bypass via direct object reference or parameter manipulation
- WSTG-AUTHN-06: Browser cache weakness (credentials cached in browser history)
- WSTG-AUTHN-09: Weak password reset mechanism

### AUTHZ -- Authorisation

Whether authenticated users can access only what they are permitted to access. Covers path traversal, privilege escalation (horizontal and vertical), and insecure direct object references (IDOR).

Key tests:
- WSTG-AUTHZ-01: Directory traversal / file include
- WSTG-AUTHZ-02: Bypassing authorisation schema (parameter tampering, force browsing)
- WSTG-AUTHZ-03: Privilege escalation
- WSTG-AUTHZ-04: Insecure direct object references -- accessing resources belonging to another user by manipulating IDs

IDOR (WSTG-AUTHZ-04) is consistently the highest-yield test in modern web applications. Always test with two accounts in the same role and attempt to access each other's resources.

### SESS -- Session Management

Session token generation, transport, and lifecycle. Covers token entropy, fixation, hijacking, CSRF, and cookie attributes.

Key tests:
- WSTG-SESS-01: Session management schema analysis -- entropy, predictability
- WSTG-SESS-02: Cookie attributes (Secure, HttpOnly, SameSite, path/domain scope)
- WSTG-SESS-03: Session fixation
- WSTG-SESS-04: Exposed session variables (in URL, logs, referrer header)
- WSTG-SESS-05: Cross-site request forgery (CSRF)
- WSTG-SESS-06: Logout functionality -- does the session actually invalidate server-side?
- WSTG-SESS-09: Session hijacking via XSS

### INPVAL -- Input Validation

The largest category. Covers all injection classes: reflected and stored XSS, SQL injection, NoSQL injection, LDAP injection, XML/XPath injection, OS command injection, template injection, HTTP response splitting, SSI injection, and URL redirect.

Key tests:
- WSTG-INPVAL-01: Reflected XSS
- WSTG-INPVAL-02: Stored XSS
- WSTG-INPVAL-03: HTTP verb tampering
- WSTG-INPVAL-05: SQL injection
- WSTG-INPVAL-07: XML injection
- WSTG-INPVAL-11: Code injection
- WSTG-INPVAL-12: Command injection
- WSTG-INPVAL-13: Format string injection
- WSTG-INPVAL-18: Server-side template injection (SSTI)
- WSTG-INPVAL-19: Server-side request forgery (SSRF)

SSRF (WSTG-INPVAL-19) warrants escalated attention in cloud-hosted applications where the EC2/GCP metadata endpoints are reachable from the server.

### ERRH -- Error Handling

Whether the application leaks diagnostic information in error responses. Stack traces, SQL query fragments, internal paths, and version strings in error messages all feed later-stage attacks.

Key tests: WSTG-ERRH-01 (error codes analysis), WSTG-ERRH-02 (stack traces). Typically low effort -- trigger 400/500 responses and inspect.

### CRYP -- Cryptography

Transport and storage cryptography. Checks TLS version, cipher suite strength, certificate validity, and storage of sensitive data (passwords hashed with bcrypt/argon2 vs MD5, encryption at rest).

Key tests:
- WSTG-CRYP-01: Weak TLS (TLS 1.0/1.1, export ciphers, RC4, null ciphers)
- WSTG-CRYP-02: Padding oracle vulnerabilities
- WSTG-CRYP-03: Sensitive information sent via unencrypted channels
- WSTG-CRYP-04: Weak encryption (ECB mode, short keys, predictable IVs)

### BUSL -- Business Logic

Flaws in the application's intended workflows that cannot be detected by automated scanners. Requires a tester who understands what the application is supposed to do.

Key tests:
- WSTG-BUSL-01: Business logic data validation (e.g., negative quantities in e-commerce)
- WSTG-BUSL-02: Request forgery (replaying requests out of sequence)
- WSTG-BUSL-04: Intentional misuse of application functions
- WSTG-BUSL-07: Defences against application misuse (rate limiting, abuse detection)
- WSTG-BUSL-09: Upload of unexpected file types (polyglots, SVG with script content)

This is where a knowledgeable tester beats automated tooling. Spend proportionally more time here if the application has complex workflows (e-commerce, financial transactions, multi-step processes).

### CLNT -- Client-Side Testing

Browser-executed vulnerabilities. Covers DOM-based XSS, JavaScript injection, HTML injection, cross-origin resource sharing (CORS) misconfiguration, clickjacking, WebSockets, localStorage/sessionStorage exposure, and cross-site flashing.

Key tests:
- WSTG-CLNT-01: DOM-based XSS (tainted sources flowing to dangerous sinks without encoding)
- WSTG-CLNT-07: CORS header misconfiguration (wildcard origin + credentials, null origin accepted)
- WSTG-CLNT-09: Clickjacking (missing X-Frame-Options or CSP frame-ancestors)
- WSTG-CLNT-11: localStorage/sessionStorage misuse (sensitive tokens stored in JS-accessible storage)
- WSTG-CLNT-12: Browser storage in general

### APIT -- API Testing

REST and GraphQL-specific tests. Often the most vulnerable surface in modern applications: unauthenticated endpoints, excessive data exposure in responses, mass assignment, rate limiting absence.

Key tests: authentication on all endpoints, authorisation between users, schema validation enforcement, rate limiting on authentication endpoints, GraphQL introspection exposure in production, batching attacks on GraphQL.

---

## How Test IDs Work

Every WSTG test case has the format:

```
WSTG-<CATEGORY>-<NN>
```

Examples:
- `WSTG-AUTHN-03` -- Authentication, test 03: Account lockout and throttling
- `WSTG-INPVAL-05` -- Input validation, test 05: SQL injection
- `WSTG-SESS-05` -- Session management, test 05: CSRF
- `WSTG-AUTHZ-04` -- Authorisation, test 04: IDOR

IDs are stable across WSTG versions (v4.1 to v4.2 IDs are consistent). Use them in finding references, scope matrices, and deliverables. They allow clients to track remediation against specific, named test cases rather than prose descriptions.

---

## Scoping a Grey-Box Web Application Test

Grey-box testing is the practical default for most commercial engagements: the tester has credentials and some application knowledge (e.g., user roles, API documentation, architecture overview), but no access to source code or infrastructure internals.

### Scoping Process

**1. Define the attack surface.** List every domain, subdomain, API endpoint, mobile app backend, and third-party integration in scope. Get written confirmation from the client. Out-of-scope assets (CDN providers, third-party SaaS) must be explicitly excluded.

**2. Define test roles.** Identify which user roles exist (anonymous, authenticated standard user, privileged user, admin). Each AUTHZ and AUTHN test should be executed from at least two roles. Provide test accounts for each.

**3. Select applicable WSTG test cases.** Walk the 12 categories and mark each test as:
- **In scope** -- will be tested
- **Out of scope -- justified** -- e.g., no file upload functionality means WSTG-BUSL-09 does not apply
- **Out of scope -- excluded by client** -- must be documented

A scope matrix is the output: one row per test ID, one column for status, one for justification. This becomes exhibit A in the deliverable.

**4. Passive before active.** Complete all INFO and CONF passive reconnaissance before running any active tests. Never run automated scans during business hours without client agreement. Clarify whether production or a staging environment is in scope for active testing.

**5. Agree on testing window and emergency contact.** Define when active testing runs. Provide a halt condition -- a phone number the client can call to stop testing immediately if production is impacted.

### What Grey-Box Testing Can and Cannot Find

Grey-box testing with valid credentials finds: IDOR, privilege escalation, session management flaws, injection in authenticated endpoints, business logic flaws. It misses: pre-authentication vulnerabilities beyond the login surface, infrastructure vulnerabilities outside the agreed scope, client-side supply chain issues (third-party scripts not under test).

---

## Passive vs Active Testing

| Mode | Description | When to use |
|---|---|---|
| Passive | Observe traffic, analyse headers, read source -- no requests that could trigger state changes | Information gathering phase; safe in production |
| Active | Send crafted requests, attempt exploitation, run scanners | Requires written authorisation; avoid production during business hours unless agreed |

Passive techniques: analysing HTTP response headers, reading JavaScript source for exposed keys or endpoints, reviewing robots.txt and sitemap.xml, certificate transparency log review (crt.sh), Google dorking for exposed content.

Active techniques: form submission with malicious payloads, parameter tampering, brute-force on test accounts (with lockout awareness), automated scanner runs.

The distinction matters legally. A passive reconnaisance phase on a client's public-facing application before contract signature is defensible. An active scan without written authorisation is not.

---

## Using WSTG with Automated Tools

Automated tooling accelerates coverage but does not replace manual testing. The canonical combination:

### OWASP ZAP

Open-source DAST scanner. Integrates directly with WSTG categories. Use ZAP for:
- Spider/crawl to enumerate the attack surface (feeds INFO phase)
- Passive scan during proxied browse-through (CONF, ERRH, CRYP headers)
- Active scan against non-production environments (INPVAL injection classes)
- API scan with OpenAPI/Swagger import (APIT)

ZAP alert IDs map loosely to WSTG test IDs -- you will need to manually cross-reference ZAP findings to the WSTG matrix. ZAP misses: logic flaws, IDOR, stored XSS in asynchronous flows, anything requiring session-aware context.

### Burp Suite Professional

The practical standard for manual web testing. Use Burp for:
- Intercepting proxy during manual walk-through
- Repeater for manual payload testing (INPVAL, AUTHZ, SESS)
- Intruder for parameter fuzzing and enumeration (IDNT account enumeration)
- Scanner for augmented active scanning (comparable to ZAP, with better session handling)
- Collaborator for out-of-band detection (SSRF, blind SQLi, blind command injection)
- Extensions: ActiveScan++ (extends injection coverage), Autorize (IDOR/authorisation), JWT Editor (ATHN JWT tests), Retire.js (client-side library CVEs)

**Workflow:** Browse the entire application through Burp proxy first. Build the site map. Then run targeted active tests per WSTG category using Repeater and Intruder rather than firing a global scan.

### Complementary Tools

| Tool | WSTG Category | Purpose |
|---|---|---|
| `testssl.sh` | CRYP | Comprehensive TLS configuration analysis |
| `nikto` | CONF | Quick server misconfig and default file check |
| `ffuf` / `feroxbuster` | CONF, INFO | Directory and file enumeration |
| `sqlmap` | INPVAL-05 | Automated SQL injection detection and exploitation |
| `jwt_tool` | ATHN | JWT algorithm confusion, secret brute-force |
| Retire.js / `npm audit` | CLNT | Known-vulnerable JavaScript libraries |
| `wfuzz` | AUTHZ | Fuzzing for IDOR and path traversal |

---

## Documenting Findings Against WSTG Test IDs

Every finding in the report should carry:

1. **WSTG reference** -- the test ID(s) that surfaced it (e.g., WSTG-AUTHZ-04)
2. **Finding title** -- specific to the application, not just the test name
3. **Severity** -- Critical / High / Medium / Low / Informational
4. **CVSS v3.1 score** -- base score vector string
5. **Description** -- what the vulnerability is, where it lives
6. **Evidence** -- reproduction steps, request/response excerpts (redact credentials)
7. **Impact** -- what an attacker could achieve
8. **Remediation** -- specific, actionable guidance
9. **References** -- WSTG URL, CWE ID, OWASP Top 10 mapping where relevant

### CVSS v3.1 Scoring

CVSS (Common Vulnerability Scoring System) provides a numeric severity score 0--10. The base vector has eight metrics:

**Attack Vector (AV):** Network (N) / Adjacent (A) / Local (L) / Physical (P)
**Attack Complexity (AC):** Low (L) / High (H)
**Privileges Required (PR):** None (N) / Low (L) / High (H)
**User Interaction (UI):** None (N) / Required (R)
**Scope (S):** Unchanged (U) / Changed (C)
**Confidentiality (C):** None (N) / Low (L) / High (H)
**Integrity (I):** None (N) / Low (L) / High (H)
**Availability (A):** None (N) / Low (L) / High (H)

Example -- IDOR exposing another user's PII:
`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` = 6.5 (Medium)

Example -- unauthenticated SQL injection with DBA privileges:
`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H` = 10.0 (Critical)

Severity bands: Critical (9.0--10.0), High (7.0--8.9), Medium (4.0--6.9), Low (0.1--3.9), Informational (0.0).

Do not invent CVSS scores. Use the NVD calculator or Burp's built-in CVSS calculator. State the vector string, not just the number -- reviewers will check it.

---

## Deliverable Structure for a Security Test Report

A professional WSTG-aligned report has five sections:

### 1. Executive Summary (1--2 pages)

Written for non-technical stakeholders. Cover: scope, testing period, total findings by severity, top three risk items in plain language, overall risk posture statement. No technical jargon. Reference OWASP Top 10 categories if helpful for context.

### 2. Scope and Methodology (1 page)

Enumerate the in-scope assets. State the testing approach (grey-box, authenticated). Reference WSTG v4.2 as the methodology. Note testing dates and personnel. Include any explicit exclusions.

### 3. Scope Matrix (table)

One row per WSTG test ID. Columns: Test ID, Test Name, Status (Tested / Not Applicable / Excluded), Finding Reference (if any), Justification for exclusions. This is the audit trail that proves coverage.

### 4. Findings (main body)

One section per finding, formatted per the documentation standard above. Order by severity descending. Number findings (F-001, F-002, ...) for cross-reference. Attach full request/response evidence in appendices rather than inline.

### 5. Appendices

- Raw scanner output (ZAP/Burp reports)
- Reproduction steps in full
- Tool versions used
- Tester sign-off and scope confirmation emails

---

## Scoping Decisions: Justify Exclusions

A common mistake is silently skipping test cases that seem inapplicable. Every exclusion must be documented with a reason in the scope matrix. Acceptable justifications:

- "Application has no file upload functionality -- WSTG-BUSL-09 not applicable"
- "Client explicitly excluded automated scanning of production database -- WSTG-INPVAL-05 active exploitation excluded; manual testing only"
- "No SOAP/XML web services present -- WSTG-INPVAL-07 not applicable"
- "Authentication handled by external IdP (Okta) -- WSTG-AUTHN-01 through WSTG-AUTHN-05 tested at integration boundary only, not within IdP"

Undocumented exclusions create liability. If a vulnerability exists in an area the report silently skipped, the client can reasonably claim the engagement failed to cover it.

---

## Practical Engagement Checklist

Before starting:
- Written authorisation with scope definition
- Test accounts provisioned for each user role
- Agreed testing window (especially for active phases)
- Emergency contact and halt condition confirmed
- Staging vs production clearly stated

During testing:
- Complete passive INFO/CONF reconnaissance first
- Document every interesting finding immediately -- memory is unreliable across a multi-day engagement
- Screenshot and log all evidence at time of discovery
- Retesting after client remediation should be explicitly scoped (it often is not)

After testing:
- Verify CVSS vectors before submission
- Have a second tester review the scope matrix for coverage gaps
- Redact any live credentials from evidence before delivery

---

## Related Pages

- [[security/owasp-llm-top10]] -- OWASP Top 10 for LLM applications (different scope: AI risk categories, not web testing methodology)
- [[security/red-teaming]] -- AI/LLM-focused red teaming methodology
- [[security/prompt-injection]] -- prompt injection in detail
- [[security/oauth-boundary-testing]] -- OAuth and authentication boundary testing
- [[test-automation/playwright]] -- automated browser testing (distinct from security testing, but shares tooling concepts)
