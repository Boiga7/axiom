---
type: concept
category: qa
para: resource
tags: [reporting, stakeholders, rag, dashboards, defect-burndown, test-progress, executive, qa]
tldr: QA stakeholder reporting transforms raw test data into decision-relevant information — RAG dashboards for executives, defect burn-down for test managers, quality gate status for release managers.
sources: []
updated: 2026-05-04
---

# QA Stakeholder Reporting

Stakeholder reporting is the practice of presenting test progress and quality health information in the format and level of detail appropriate to the audience. The same underlying data — defect counts, test execution rates, coverage metrics — serves different purposes for different people. Done well, reporting builds confidence and enables decisions. Done poorly, it creates noise that gets ignored.

The fundamental question is always: what decision does this audience need to make, and what information do they need to make it?

---

## Audience Taxonomy

**Executive audience (CTO, VP Engineering, Product)** — care about release risk and business impact, not test counts. They need: go/no-go status, the top 3 open quality risks, and a trend line showing whether quality is improving. Format: a one-page summary with RAG (Red-Amber-Green) status, three bullets of qualitative risk commentary, and two or three charts. Frequency: weekly during active release cycles.

**Test manager / QA lead audience** — own the test programme and need to understand progress vs plan, resource allocation, and whether the current trajectory hits the release date. They need: test execution progress vs plan, defect discovery rate vs resolution rate, automation run health, and environment availability. Format: a detailed dashboard updated daily. Frequency: daily during sprint; weekly otherwise.

**Release manager / change board audience** — own the release decision. They need: quality gate status (pass/fail per gate), outstanding critical and blocker defects, and risk acceptance decisions still open. Format: a release readiness report tied to exit criteria. Frequency: at each quality gate checkpoint.

**Engineering team audience** — own defect resolution and test infrastructure. They need: defect assignment, age of open defects, flaky test counts, and coverage gaps in areas they own. Format: integrated into Jira/GitHub dashboards they already use. Frequency: continuous.

---

## RAG Dashboard Pattern

RAG status (Red-Amber-Green) provides an at-a-glance quality health indicator:

- **Green** — all quality gates passing, defect discovery rate within acceptable range, no release-blocking issues.
- **Amber** — one or more quality metrics approaching threshold; risk is manageable but requires attention.
- **Red** — one or more quality gates failing, or a release-blocking defect open without an agreed resolution timeline.

RAG status is meaningful only if the thresholds are defined and agreed before the release cycle begins. Setting thresholds after the fact undermines trust.

---

## Core Reporting Artefacts

**Test Progress vs Plan** — planned vs actual test execution rate over time. A test progress chart that shows planned execution as a line and actual execution as bars immediately reveals slip. When actual lags plan by more than 10%, it is a leading indicator of scope risk.

**Defect Burn-Down** — open defect count over time, split by severity. A healthy burn-down shows open critical and blocker defects decreasing steadily as the release approaches. A flat or rising line signals a quality problem that needs escalation.

**Quality Gate Status** — pass/fail for each defined gate (e.g., unit test coverage > 80%, integration tests passing, performance baseline within 10%, security scan clean). Presented as a simple checklist at the release readiness review.

**Automation Health** — pass rate, flaky test count, and suite run time trends. A pass rate dropping below 95% or a flaky test count rising above 2% are signals the automation suite needs attention before it becomes an unreliable signal.

---

## Reporting Anti-Patterns

- Reporting test counts without context: "1,200 tests passing" is meaningless without knowing what they cover and what they do not.
- Burying risk in appendices: executives read the executive summary. Put the risk statement in the first paragraph.
- Changing RAG thresholds mid-release: this destroys trust in the reporting system.
- Daily detailed reports to executives: they need weekly summaries, not daily data dumps.

---

## Connections

- [[qa/qa-change-management]] — change management context for introducing new reporting to resistant organisations
- [[qa/release-sign-off]] — the formal sign-off process that release readiness reports feed into
- [[qa/test-estimation]] — estimation feeds the "planned" line in test progress vs plan charts
