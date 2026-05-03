---
type: concept
category: qa
tags: [uat, governance, stakeholder-management, sign-off, consultancy]
updated: 2026-05-03
para: resource
sources: []
tldr: The process ownership layer above UAT execution — entry/exit criteria, stakeholder briefings, scope dispute resolution, defect triage with business owners, formal sign-off, and managing the politics that determine whether a UAT phase lands cleanly or collapses.
---

# UAT Governance

UAT governance is the ownership layer that sits above test execution. Execution is writing and running test cases. Governance is deciding when UAT starts, what it covers, who has authority over decisions, how disputes get resolved, and what constitutes a valid sign-off. On a well-run engagement these are distinct concerns handled by distinct people. On a poorly-run one they collapse into each other and the UAT phase becomes a source of project risk rather than a confidence gate.

This page is about the governance layer. For execution mechanics, see [[uat]].

---

## Governance vs Execution

The distinction matters because mixing them causes predictable failures.

**Execution** concerns: writing test cases, assigning testers, logging defects, tracking test pass rates, maintaining the regression pack.

**Governance** concerns: defining what UAT is allowed to test, setting the criteria that determine readiness to enter and exit the phase, holding the decision rights on defect severity and sign-off acceptance, managing the stakeholder relationship, and owning the formal record of acceptance.

A test manager who conflates these ends up in test case reviews when they should be in steering meetings, and in steering meetings without the data to make decisions. The senior consultant role is to operate clearly at the governance level while delegating execution to a test lead or the client's own team.

---

## Entry Criteria

Entry criteria are the conditions that must be true before UAT begins. Defining them upfront is non-negotiable. Without them, pressure from project management will start UAT before the system is ready, and the phase becomes a second round of system testing rather than genuine business validation.

**Minimum viable entry criteria for most engagements:**

- All planned functional scope has been delivered into the UAT environment. Partial scope delivery forces scope decisions to be made mid-phase under pressure — this is avoidable.
- System testing is complete and signed off by the QA lead. Business users should not be finding bugs that QA should have caught. It destroys their confidence in the product and your team.
- All critical and high defects from system test are resolved and regression-tested. Outstanding medium defects must be documented, risk-assessed, and accepted by the test manager before entry.
- UAT environment is stable, populated with appropriate test data, and confirmed to match the production configuration in all material respects.
- Test cases are written, reviewed, and baselined. Business stakeholders who own test scenarios have signed off the coverage.
- Testers are identified and available. Casual commitments ("yes we'll have people available") are not commitments. Names, hours per day, and dates must be confirmed.
- Training on new functionality has been delivered if required.

Document the entry criteria in the test plan. Run a formal entry gate review meeting before UAT starts. If criteria are not met, do not start UAT — raise the issue to the project sponsor and document your recommendation. Starting a UAT phase that fails entry criteria exposes you to the outcome being blamed on the test phase rather than the underlying readiness problem.

**Entry gate review agenda (30 minutes):**

1. Walk through each entry criterion and its current status.
2. For any unmet criterion, agree whether it will be resolved before start or accepted as a known risk.
3. Confirm tester availability for the duration.
4. Confirm escalation path for defects and scope disputes.
5. Record the decision to proceed (or defer) in the meeting minutes.

---

## Exit Criteria

Exit criteria define what constitutes the end of UAT. Without them, the phase drifts. Business stakeholders find things to test indefinitely and UAT becomes the project's comfort blanket rather than a time-bounded gate.

**Standard exit criteria:**

- All planned test cases have been executed.
- Zero open critical defects.
- Zero open high defects unless individually risk-accepted by the business owner with the acceptance documented.
- All medium defects are triaged: either fixed, deferred with documented acceptance, or reclassified.
- Test execution rate is at or above the agreed threshold (typically 95%+ of test cases; document why any test cases were skipped).
- Business stakeholders have completed their review and are prepared to sign.
- Formal sign-off document is ready for signature.

Exit criteria are negotiated artefacts, not universal constants. A phased rollout may accept a lower defect closure rate than a big-bang go-live. A regulatory deployment may require 100% test case execution with zero outstanding defects of any severity. Set them in the test plan at the start of the engagement and get the client to agree them in writing.

---

## UAT Test Plan Structure

The UAT test plan is not a smaller version of the system test plan. It has different purposes and different audiences. The system test plan is read by QA engineers. The UAT test plan is read by business stakeholders, project managers, and client sponsors — people who will be making resource commitments and sign-off decisions based on it.

**Structure:**

**1. Scope statement** — what is in scope for UAT and, explicitly, what is not. The out-of-scope section is often more important than the in-scope section. Business users who read a list of what they can test will interpret everything not mentioned as also testable. The out-of-scope section manages that expectation.

**2. Business objectives** — what the UAT phase is intended to confirm from the business perspective. This is not a list of test cases. It is a statement of the business confidence that successful UAT will provide. Useful framing: "After UAT, the business will be confident that [specific workflows] operate correctly under [specific conditions] and that the system is fit for [specific purpose]."

**3. Entry and exit criteria** — as defined above. Presented clearly so stakeholders understand the gates.

**4. Tester identification and availability** — named individuals, their roles, the number of hours committed per day, and the dates. If the client cannot provide this at test plan sign-off, that is an escalation item, not a footnote.

**5. Test environment and data** — the environment(s) in which UAT will run, who is responsible for maintaining them, and the data strategy. Confirm that the data is representative of production volumes and edge cases without containing live PII.

**6. Test coverage overview** — a high-level mapping from business processes to test scenarios. Not individual test cases — a coverage matrix showing which business processes are tested and at what depth. This is the document that a business stakeholder reviews to confirm the coverage makes sense.

**7. Defect management** — the defect severity classification, the triage process, the resolution SLAs, and the escalation path. Presented in plain language. Business users who find defects should know exactly what happens next.

**8. Communication plan** — daily status reports, defect triage meeting cadence, end-of-phase briefing. Who receives what and when.

**9. Sign-off process** — who signs, what they are attesting to, the format of the sign-off document, and what happens if sign-off is withheld.

---

## Kick-off Briefing

Run a structured kick-off with business stakeholders before testing begins. This meeting does not need to be long. It needs to be clear.

**Objectives of the kick-off:**

- Ensure all testers understand the scope of UAT and their specific responsibilities within it.
- Correct any misconception that UAT is an opportunity to redesign or extend functionality.
- Confirm the defect reporting process so defects are logged correctly from day one.
- Set expectations for availability, response times, and the sign-off timeline.
- Create a shared understanding that UAT is a formal phase with formal governance, not an informal review period.

**Kick-off agenda (45–60 minutes):**

1. Purpose and scope of this UAT phase — what will be tested, what will not.
2. What UAT testers are being asked to do — walk real business scenarios, report what they observe, not rewrite requirements.
3. Defect reporting process — tool, severity definitions, what information is required.
4. Triage process — how defects will be reviewed, who makes severity decisions, SLAs.
5. Sign-off timeline and process — when sign-off is expected, who will sign, what the sign-off document contains.
6. Escalation path — who to contact if blockers arise, if a tester finds something that looks out of scope, or if they believe testing cannot proceed.
7. Q&A.

Circulate the test plan before the kick-off so stakeholders arrive having read it. In practice many will not have read it, but circulating it in advance means you can reference it as a shared document rather than presenting it cold.

---

## Close-out Briefing

The close-out briefing is the formal conclusion of the UAT phase before sign-off. It presents the test results to stakeholders and positions the decision to sign off.

**Agenda (30–45 minutes):**

1. Test execution summary — cases run, pass/fail breakdown, coverage achieved.
2. Defect summary — total raised, by severity, resolved/outstanding. Present the risk position on any outstanding defects clearly: what is the impact if they are not resolved before go-live, and who is accepting that risk.
3. Entry and exit criteria review — confirm which criteria are met and document any that required waiver.
4. Recommendation — the test manager's formal recommendation: proceed to sign-off, defer, or escalate. This is not optional. Stakeholders are paying for a recommendation, not just a data dump.
5. Sign-off process — confirm the signatories, the document, and the timeline.

The close-out briefing minutes and the sign-off document are the artefacts that matter if the project is audited or disputed later.

---

## Scope Dispute Resolution

Scope disputes are the most common political problem in UAT. A business tester finds something during UAT that was not in the agreed requirements. They raise it as a defect. The development team says it is out of scope. The business tester says it is essential. The test manager is now in the middle of a requirements dispute wearing a UAT hat.

**The governance position:**

UAT can only test what was specified. If something was not in the requirements, it is not a UAT defect. It is a change request. The test manager's job is to make this distinction clearly and consistently, not to mediate between the business and the development team on the merits of the functionality itself.

**Process for handling out-of-scope items raised during UAT:**

1. Log the item as a change request, not a defect. Use a different status or label in the defect management tool so it is clearly separated from UAT defects.
2. Document the item with full detail: what was observed, what the tester expected, what the business impact is.
3. Escalate to the project manager and business owner. This is a scope decision, not a test decision.
4. Continue UAT on in-scope items. Do not allow out-of-scope disputes to block the phase.
5. Obtain a written decision on each out-of-scope item before the close-out briefing: accepted into scope (with revised timeline), deferred to a future release, or rejected.

The test manager must not personally adjudicate scope. When business users ask "but shouldn't it do X?", the answer is "that is a question for the project manager and the requirements. My job is to confirm that what was specified is working correctly. If you believe something was missed from the requirements, raise it as a change request and I will log it as such."

This position needs to be established at kick-off. If it comes up for the first time mid-phase, the conversation is harder.

---

## Defect Triage with Business Owners

UAT defect triage has different dynamics from development team triage. Business owners are not trained in software defect classification. They think in terms of "this doesn't work" rather than "this is a severity 2 defect with a workaround." The test manager's job is to translate between these perspectives without losing accuracy or alignment.

**Running a UAT defect triage meeting:**

Cadence: daily during active testing, or every other day in a lighter phase.

Participants: test manager, business representative with authority to make severity decisions, development lead or project manager. Keep it small.

For each new defect, the test manager presents: what was observed, what was expected, the impact on the business process being tested, and a proposed severity classification. The business representative confirms or challenges the severity. The development lead provides an estimate of fix complexity and risk. The group agrees on severity, priority, and resolution commitment.

Document every decision. Business owners who change their assessment of a defect's severity two days before go-live are a known risk. The meeting record is your protection.

---

## Severity Classification in a UAT Context

Standard severity scales used in development testing (Critical/High/Medium/Low or S1–S4) need to be translated into business terms for UAT. The classification question is not "how badly is the software broken?" but "what is the impact on the business if this goes live unfixed?"

**Recommended UAT severity framing:**

| Severity | Business meaning | UAT implication |
|--|--|--|
| Critical | A core business process cannot be completed. Data integrity is at risk. Regulatory obligation cannot be met. | Blocks sign-off. Must be resolved before go-live. |
| High | A core business process is significantly impaired. A workaround exists but it is unreasonable to impose it in production. | Blocks sign-off unless explicitly risk-accepted by the business owner with rationale documented. |
| Medium | A process is impaired but a reasonable workaround exists. A non-core process is broken. | Does not block sign-off. Documented for post-go-live resolution. |
| Low | Cosmetic, minor inconsistency, improvement request. | Does not block sign-off. May be deferred to backlog. |

The critical distinction between High and Medium is the workaround test: would the business owner be comfortable explaining to their team on go-live day that they have to use a workaround for this? If the honest answer is no, it is High.

Business owners will often rate everything as Critical. The test manager must push back on this not to protect the development team but because severity inflation destroys the signal. If everything is Critical, nothing is Critical, and the sign-off decision becomes impossible to make rationally.

---

## Managing the UAT Defect Backlog

The UAT defect backlog is the live record of everything found during the phase, its current status, and the agreed resolution path. It is the primary artefact for communicating test health to the project team and stakeholders.

**Backlog hygiene rules:**

- Every item has a status that reflects reality, updated daily. No item sits in "In Progress" for three days without an update.
- Every item has a severity, an owner on the development side, and a target resolution date.
- Out-of-scope items are segregated from UAT defects. A mixed backlog creates confusion and audit risk.
- Resolved items are regression-tested before being closed. A defect is not resolved because the developer says it is resolved.
- The backlog is reviewed in its entirety at least once before the close-out briefing. Defects that have been inadvertently forgotten or deprioritised surface here.

**Daily status reporting against the backlog:**

At a minimum, the daily status report should show: total defects raised to date by severity, number resolved/retested/closed, number open by severity, and any new blockers. Keep it to one page or one email. The audience is the project manager and the business sponsor. They need trend data, not defect detail.

---

## Formal Sign-off Documentation

The sign-off document is the formal record that the business has accepted the software for release. It is a legal and commercial artefact, not just a process step. On contract acceptance engagements it may trigger payment milestones. On internal projects it is the record that provides cover for the go-live decision.

**Sign-off document contents:**

1. Project and release identification: system name, version, UAT phase dates.
2. Scope statement: what was tested (summarised from the test plan).
3. Test execution summary: cases planned, executed, passed, failed.
4. Defect summary: totals by severity, resolved count, outstanding count.
5. Outstanding defect acceptance register: for any defect not resolved before sign-off, a row confirming the severity, the agreed resolution timeline, and the business owner's acceptance of the risk. This is signed separately by the business owner, not buried in the main sign-off.
6. Entry and exit criteria confirmation: a checklist confirming each criterion was met (or noting any approved waivers with rationale).
7. Sign-off statement: "The undersigned confirm that the [system name] has been tested against the agreed scope, that the results meet the agreed exit criteria, and that the system is accepted for release to [environment/production]."
8. Signatories with name, title, and date.

Who signs matters. The signatory must be someone with actual authority to accept the system on behalf of the business. A test coordinator who signs because they did the most testing is not a valid signatory. The business owner or their formally delegated representative must sign.

---

## Handling Sign-off Refusal

Sign-off refusal happens for four reasons and each requires a different response.

**1. Legitimate unresolved defects.** The business is right to withhold sign-off. Resolve the defects, re-test, reconvene. This is the sign-off process working correctly.

**2. Scope creep disguised as defects.** Business users are withholding sign-off because they want functionality that was never in scope. This is a scope management failure. Escalate immediately to the project sponsor. The test manager's position: the system has passed its agreed tests. Sign-off is withheld on the basis of functionality outside the agreed scope. This is a commercial and scope decision, not a test decision.

**3. Risk aversion or organisational politics.** The business representative does not feel authorised to sign. Someone above them is uncomfortable. The project is contentious. In this case the defects are not the real issue. The test manager needs to surface this to the project sponsor and ensure the right person is in the room. No amount of defect resolution will produce a signature if the real obstacle is organisational.

**4. Inadequate testing time.** Business testers were not available as planned, or the phase was too short for the scope. The test manager must document this clearly: which test cases were not executed, what coverage was missed, and what the risk is of going live without it. This is an honest account for the project sponsor to make an informed go-live decision. It is not the test manager's job to absorb the risk caused by inadequate test resource.

In all cases: document the refusal, the stated reasons, the response, and the outcome. Do not accept verbal commitments. If the business agrees to sign subject to a specific defect being resolved by a specific date, get that in writing before closing the meeting.

---

## UAT in Agile vs Waterfall

**Waterfall:** UAT is a formal, time-bounded phase at the end of the delivery lifecycle. Entry and exit criteria are gates. Sign-off is binary. The governance framework described in this page maps most cleanly onto waterfall delivery.

**Agile:** UAT is distributed across sprints, typically as sprint review or dedicated sprint N acceptance testing. The governance challenge shifts: there is no single UAT phase to manage, but there is still a need for formal acceptance criteria per story, a definition of done that includes business acceptance, and a final release sign-off that aggregates acceptance across all delivered stories.

In agile contexts, governance responsibilities include:
- Ensuring the definition of done includes acceptance by the product owner or business representative per story.
- Running structured sprint reviews rather than ad hoc demos. A sprint review where the business says "looks good" is not UAT acceptance.
- Maintaining a living acceptance log: per story, who accepted it and when.
- Running a pre-release UAT consolidation that exercises end-to-end business scenarios across the full increment, not just individual stories. Individual story acceptance does not guarantee that the integrated product works as a business system.
- Producing a release sign-off document that references the acceptance log and the consolidation UAT results.

The common failure in agile UAT governance is treating story-level acceptance as equivalent to release-level acceptance. They are not the same thing.

**In scaled agile (SAFe, LeSS):** The PI (Program Increment) boundary is the natural UAT governance point. System demo and IP sprint acceptance activity maps onto the UAT phase. The test manager role becomes a cross-team coordination role focused on entry criteria for the PI demo and sign-off at PI close.

---

## Managing Business Users Who Don't Understand What UAT Is For

This is the most common governance problem and the one least likely to be covered in a test plan. Business users who arrive at UAT without a clear understanding of its purpose create consistent patterns of dysfunction:

**"We'll find everything in UAT."** Business stakeholders who treat UAT as the primary quality gate rather than a final acceptance gate. They arrive expecting to find hundreds of defects. When they do (because QA was not given enough time), it validates their model and they continue to treat UAT as system testing. The fix is earlier stakeholder engagement in test strategy, not better UAT governance. But in the short term: manage by presenting QA test results at kick-off to demonstrate what has already been validated, and by being explicit that UAT is a business validation exercise on a system that has already passed technical testing.

**"This isn't what I asked for."** Business users who discover at UAT that the system does not match their mental model of the requirements. Often the mental model was never documented. The fix is requirements and design review earlier in the project. In UAT: log every instance as a change request or requirements dispute, escalate, and do not allow it to absorb UAT time. If there are many of these, the project has a requirements problem and the UAT phase cannot fix it.

**"I'm too busy to test properly."** Testers who are nominally assigned but not available, or who treat UAT as an optional extra alongside their day job. This is a resource governance failure. It needs to be escalated before UAT starts, not during. The test plan should name the testers and their committed hours. If those commitments are not met, escalate to the business sponsor. Do not accept reduced coverage silently.

**"Can we just add this one thing?"** Scope creep through individual testers. Each one has something small they want added. Collectively, the small things add up to a significant scope change. Manage through the out-of-scope change request process: log it, escalate it, do not engage with whether the request has merit. The merit discussion happens at the project level, not in a UAT defect triage meeting.

The consistent senior consultant behaviour in all of these is to hold the governance position clearly and without apology, escalate rather than absorb, and document everything. The test manager who tries to accommodate every stakeholder request ends up owning the consequences of decisions that were not theirs to make.

---

## Key Artefacts

| Artefact | Purpose | Owner |
|--|--|--|
| UAT Test Plan | Scope, criteria, coverage, process | Test manager |
| Entry Gate Review minutes | Formal record of UAT start decision | Test manager |
| UAT Test Cases | Execution instructions | Test lead / business testers |
| Defect backlog | Live defect record | Test manager |
| Daily status report | Progress communication | Test manager |
| Triage meeting minutes | Decision record for each defect | Test manager |
| Close-out briefing pack | Results presentation | Test manager |
| Sign-off document | Formal acceptance record | Business owner (signs), test manager (prepares) |
| Outstanding defect acceptance register | Documented risk acceptance | Business owner |
| Change request log | Out-of-scope items | Test manager / project manager |

---

## Related Pages

- [[uat]] — UAT execution mechanics: types of UAT, test case writing, tester management
- [[test-planning]] — Test plan structure and planning methodology
- [[test-strategy]] — Overarching test approach across all phases
- [[defect-clustering]] — Defect analysis patterns
- [[bug-lifecycle]] — Defect states, workflow, and resolution
- [[risk-based-testing]] — Risk-based prioritisation applicable to UAT scope
- [[qa-leadership]] — Senior QA consultant skills and stakeholder management
- [[test-reporting]] — Reporting formats and metrics
- [[agile-qa]] — QA in agile delivery contexts
