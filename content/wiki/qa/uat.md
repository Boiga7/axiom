---
type: concept
category: qa
para: resource
tags: [uat, user-acceptance-testing, acceptance, business-testing, qa]
sources: []
updated: 2026-05-01
tldr: The final validation before release, performed by business stakeholders or end users. UAT confirms the software meets business requirements and is fit for purpose — not just that it's bug-free.
---

# User Acceptance Testing (UAT)

The final validation before release, performed by business stakeholders or end users. UAT confirms the software meets business requirements and is fit for purpose. Not just that it's bug-free.

UAT answers: "Does this software do what we actually need it to do?" QA tests ask: "Does the software work correctly?" These are different questions.

---

## UAT vs QA Testing

| | QA Testing | UAT |
|--|--|--|
| Who | QA engineers | Business users, product owners, end customers |
| When | Throughout development | Before go-live |
| Scope | All functional and non-functional requirements | Business scenarios, real workflows |
| Environment | QA / staging | Staging or pre-production (production-like data) |
| Outcome | Defects found and fixed | Accept or reject for release |
| Focus | Does it work? | Is this what we need? |

---

## Types of UAT

**Alpha testing** — conducted by internal users within the development organisation. Controlled environment; close feedback loop with developers.

**Beta testing** — conducted by real end users outside the organisation. Real-world conditions; uncontrolled. Used for consumer products and SaaS launches.

**Contract acceptance testing** — software delivered to a client is tested against contractual specifications. Formal sign-off has legal/financial consequences.

**Operational acceptance testing (OAT)** — validates operational readiness: backup/restore, disaster recovery, admin procedures, monitoring.

**Regulation acceptance testing** — confirms compliance with regulatory requirements (GDPR, PCI-DSS, HIPAA, accessibility standards).

---

## UAT Process

### 1. Entry Criteria (before UAT starts)

- [ ] All QA testing complete; no Critical or P1 bugs open
- [ ] Build deployed to UAT environment with production-equivalent config
- [ ] UAT test scenarios documented and signed off by business
- [ ] Test data prepared (realistic, anonymised production data)
- [ ] UAT participants identified and scheduled
- [ ] Access provisioned for all participants

### 2. UAT Planning

**Identify participants:** Who are the actual users or stakeholders? Domain experts, end users, product owners, legal/compliance reviewers. Not QA engineers (they've already tested it).

**Scenario selection:** Based on business processes, not technical functions. Each scenario represents a real workflow.

```
Business process: Process a supplier invoice

UAT scenario steps:
1. Receive invoice notification (via email trigger or manual upload)
2. Review invoice details against purchase order
3. Approve invoice (or flag discrepancy)
4. Confirm payment is scheduled
5. Verify invoice status updated in the system
6. Check that the supplier portal reflects the status

Not UAT steps:
- Click the "Submit" button
- Verify the POST /invoices endpoint returns 200
```

**Test data:** UAT participants need real-feeling data. Use anonymised production data or high-quality synthetic data. Toy data ("Test User 1") creates superficial tests.

### 3. UAT Execution

- Participants follow business scenarios, not scripted click-by-click steps
- Feedback logged: bugs, confusion, missing features, usability issues
- Screenshots and recordings captured for each issue
- Daily standups during UAT period (especially for short windows)

### 4. UAT Defect Handling

UAT-found issues are categorised:
- **True defect** — software behaves incorrectly → enters bug lifecycle, fix before release
- **Missing feature** → product decision: fix now, defer, or accept
- **Usability issue** → UX decision: redesign, document, or accept
- **Changed requirement** → scope change; requires estimate and stakeholder sign-off
- **Not a defect** → user misunderstood the feature; needs documentation or training

### 5. UAT Sign-Off

Formal approval from business stakeholders that the software is accepted for production release.

**Sign-off document includes:**
- UAT scope tested
- Test scenarios executed and results
- Known defects accepted for release (with documented risk)
- Known defects deferred to next release
- Approver name, date, signature

**Definition of done for UAT:**
- All planned scenarios executed
- Zero Critical or P1 defects outstanding
- All P2 defects either fixed or formally accepted by product owner
- Sign-off obtained from defined approvers

---

## UAT Environment

Requirements:
- Production-equivalent infrastructure (same cloud region, same DB version, same config)
- SSL enabled (same as production)
- Email routing to test mailboxes, not real users
- Payment integrations in sandbox mode
- Anonymised production data (never real PII in staging)
- No shared sessions with other environments

Red flags:
- UAT environment frequently down → undermines UAT schedule
- UAT on localhost → misses environment-specific bugs
- Using developers' admin accounts → users experience different permissions than real life

---

## UAT for Regulated Industries

Finance, healthcare, and life sciences have formal UAT requirements.

**GxP validation (pharma):** IQ (Installation Qualification), OQ (Operational Qualification), PQ (Performance Qualification). Each requires documented evidence (screenshots, logs, sign-offs) that the system does what it's supposed to do under real conditions.

**SOX compliance (finance):** Software changes that affect financial reporting require formal testing evidence and sign-off from a qualified reviewer.

**GDPR:** UAT includes verifying data subject rights work correctly: access, deletion, export, rectification.

---

## Communicating UAT Results

**To engineering team:**
```
UAT Summary: Sprint 24 — Supplier Invoice Module

Executed: 18 scenarios
Passed: 15 (83%)
Failed: 3

Critical issues (block release):
- SCN-08: Invoice approval fails when multiple line items have VAT exceptions
- SCN-14: Email notification sent to wrong address when approver delegates

P2 issues (accepted for release with risk):
- SCN-17: PDF export layout slightly different from expected in Firefox

Action required: Fix SCN-08 and SCN-14 before release. SCN-17 deferred to Sprint 25.
```

**To stakeholders:**
```
UAT Status: NOT READY FOR RELEASE

Two critical issues found affecting 15% of invoice processing scenarios.
Estimated fix: 2 days. Revised release date: 5 May.
```

---

## Connections

- [[qa/test-strategy]] — UAT is the final phase in the testing process
- [[qa/test-case-design]] — UAT scenarios use the same structure as test cases
- [[qa/bug-lifecycle]] — UAT-found bugs enter the standard lifecycle
- [[qa/exploratory-testing]] — UAT participants often explore beyond their scenarios
- [[qa/risk-based-testing]] — UAT prioritises high-risk business scenarios
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?
