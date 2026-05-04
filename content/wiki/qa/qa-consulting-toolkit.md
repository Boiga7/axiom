---
type: concept
category: qa
para: resource
tags: [consulting, toolkit, artefacts, raci, test-policy, assessment, deliverables, qa]
tldr: The QA consulting toolkit is the set of standard artefacts a consultant produces and uses on an engagement — quality strategy, test policy, RACI, assessment templates, and a deliverable register.
sources: []
updated: 2026-05-04
---

# QA Consulting Toolkit

The QA consulting toolkit is the collection of standard artefacts, templates, and methods a QA consultant uses across engagements. Having a reusable toolkit reduces setup time, ensures consistency, and provides defensible deliverables grounded in industry practice rather than improvisation.

The toolkit is not a rigid set of documents to be produced on every engagement. It is a library of options selected and adapted based on client context, maturity level, and the scope of the mandate.

---

## Core Artefacts

**Quality Strategy Document** — the organisation-wide statement of how quality will be achieved. Covers: quality objectives, test types and coverage targets, tooling standards, roles and responsibilities, process gates, and measurement approach. Typically 10-20 pages. The foundational document that everything else references. Created during the initial engagement and maintained by the client's QA lead thereafter.

**Test Policy** — a shorter (2-4 page) governance statement defining the mandatory quality standards that all projects must meet. Distinct from the quality strategy: the policy is mandatory and applies to all teams; the strategy provides the how-to detail. Together they form the quality governance layer that TMMi Level 2/3 requires.

**RACI Matrix** — Responsible, Accountable, Consulted, Informed. Applied to quality activities: who runs regression testing, who approves test plans, who signs off defect severity, who makes the release go/no-go call. Prevents the ambiguity about quality ownership that causes escalations on live engagements.

**Assessment Templates** — structured interview guides and artefact review checklists aligned to the assessment framework (TMMi, TPI Next). Used during the baseline assessment phase. Template per process area or key area, with space to record evidence cited and a scoring column. Never rely on memory or free-form notes during an assessment.

**Deliverable Register** — a live tracker of every committed deliverable, its due date, its owner (consultant vs client), its status (not started, in progress, complete, accepted), and the acceptance criteria. Consulted at every weekly checkpoint. The register makes scope creep visible and provides a paper trail for commercial disputes.

**Risk Register** — quality risks identified during the assessment, with likelihood, impact, and mitigation owner. Updated throughout the engagement. The risk register is the primary input to the executive stakeholder report's risk commentary.

**Handover Pack** — produced at the end of an engagement. Contains: a summary of what was achieved vs mandated success criteria, the state of all deliverables, the roadmap items not yet completed and their current owner, contacts for ongoing support, and the recommended re-assessment date.

---

## Template Management

Templates should be version-controlled and reviewed after each engagement to incorporate lessons learned. An assessment template that does not reflect the current state of TMMi or TPI Next is a liability. Maintain a private repository of templates with a changelog and a review cadence (minimum annually).

---

## Connections

- [[qa/qa-change-management]] — change management artefacts that complement the consulting toolkit
- [[qa/benefits-realisation]] — benefits tracking artefacts: baseline metrics, target metrics, actuals log
