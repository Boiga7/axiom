---
type: concept
category: qa
para: resource
tags: [process-improvement, TMMi, TPI, maturity-model, consulting, qa-leadership]
sources: []
updated: 2026-05-04
tldr: "Structured methodology for assessing client test capability against industry maturity frameworks (TMMi, TPI Next), identifying gaps, and delivering a measurable benefits-driven improvements roadmap."
---

# Process Improvement Model (PIM)

Structured methodology for assessing client test capability against industry maturity frameworks, identifying gaps, and delivering a measurable benefits-driven improvements roadmap. Core responsibility at Senior Technical Consultant grade in QA consultancies such as Resillion.

---

## What PIM Means in QA Consulting

A Process Improvement Model engagement answers one question: _what would it take to make this organisation's testing reliably good?_ The consultant does not deliver software — they deliver a diagnosis and a roadmap.

The workflow has five phases:

1. **Baseline assessment** — current state across key areas, using an accredited framework (TMMi, TPI Next) as the measuring stick
2. **Gap analysis** — current vs target maturity level, mapped to business impact
3. **Improvements roadmap** — quick wins (0-30 days) vs strategic investments (90+ days), prioritised by risk and value
4. **Implementation support** — hands-on help executing the roadmap items
5. **Re-assessment** — re-run the assessment after 3-6 months to measure actual improvement and demonstrate ROI

The distinguishing feature of benefits-driven PIM is that every improvement action is tied to a measurable business outcome (defect escape rate down 40%, time-to-release reduced by two weeks) rather than just tool adoption or process compliance.

---

## TMMi — Test Maturity Model Integration

The dominant industry standard for test process improvement. Owned by the TMMi Foundation (non-profit). Designed as a complement to CMMI, providing the test-specific depth that CMMI lacks.

### 5 Maturity Levels

| Level | Name | What it means |
|-------|------|---------------|
| 1 | Initial | Testing is ad hoc and unmanaged; no separation from debugging; outcomes depend on individuals |
| 2 | Managed | Fundamental test approach established per project; test policy and strategy defined; basic planning, monitoring, execution and environments in place |
| 3 | Defined | Organisation-wide standards and procedures; testing integrated throughout the SDLC from requirements phase; test organisation, training programme and non-functional testing formalised |
| 4 | Measured | Quantitative management of test processes; defect-based models; statistical process control; test measurement programme |
| 5 | Optimisation | Continuous improvement of test processes using measurement data; defect prevention; innovation management |

Most commercial clients sit at level 1-2. A realistic 12-18 month engagement targets level 3.

### Process Areas by Level

**Level 2 — Managed (5 process areas)**
- Test Policy and Strategy
- Test Planning
- Test Monitoring and Control
- Test Design and Execution
- Test Environment

**Level 3 — Defined (5 process areas)**
- Test Organisation
- Test Training Programme
- Test Lifecycle and Integration
- Non-Functional Testing
- Peer Reviews

**Level 4 — Measured (3 process areas)**
- Test Measurement
- Software Quality Evaluation
- Advanced Reviews

**Level 5 — Optimisation (3 process areas)**
- Defect Prevention
- Test Process Optimisation
- Quality Control

### Running a TMMi Assessment (TAM)

The TMMi Assessment Method (TAM) is the accredited mechanism. A typical engagement:

1. **Document review** (1 week) — test plans, strategy docs, defect data, automation reports
2. **Structured interviews** (2-3 days) — test leads, QA engineers, developers, PMs. Per process area: "show me evidence" not just "do you do this?"
3. **Process observations** (1-2 days) — sprint ceremonies, code review, test execution sessions
4. **Findings consolidation** — score each process area against its specific goals and practices
5. **Assessment report** — current level, strengths, gaps, detailed recommendations

Each process area is rated against its Specific Goals (SGs) and the Generic Goals (GG2: institutionalised as a managed process; GG3: institutionalised as a defined process). A level is achieved only when all process areas at that level and all lower levels meet their goals.

---

## TPI Next — Test Process Improvement Next

Sogeti's framework. More business-driven than TMMi — it starts from business goals and maps testing capability to those goals rather than working up a fixed ladder.

### Structure

- **16 key areas** covering all aspects of test process
- **4 maturity levels** per area: Initial, Controlled, Efficient, Optimising
- **157 checkpoints** — concrete observable evidence items that determine level
- **Clusters** — groupings of key areas by business driver (e.g., time-to-market, cost reduction, risk coverage)
- **Maturity matrix** — one-page visual showing the level achieved across all 16 areas

### The 16 Key Areas

| # | Key Area |
|---|----------|
| 1 | Stakeholder commitment |
| 2 | Degree of involvement |
| 3 | Test strategy |
| 4 | Test organisation |
| 5 | Communication |
| 6 | Reporting |
| 7 | Test process management |
| 8 | Estimating and planning |
| 9 | Metrics |
| 10 | Defect management |
| 11 | Testware management |
| 12 | Methodology practice |
| 13 | Tester professionalism |
| 14 | Test case design |
| 15 | Test tools |
| 16 | Test environment |

### TPI Next in a Consulting Engagement

The cluster concept is the key differentiator. Rather than improving all 16 areas at once (expensive, disruptive), the consultant identifies which cluster of areas has the highest impact on the client's stated business goal — e.g., if the goal is faster releases, focus the first 90 days on Estimating and Planning + Test Tools + Test Environment.

TPI Next is better suited to agile organisations where TMMi's staged model feels overly prescriptive. TMMi is preferred where formal accreditation is required (e.g., regulated industries, defence).

---

## CMMI — Capability Maturity Model Integration

Broader software process improvement model (not test-specific). Relevant to PIM in two ways:

1. **Prerequisite context** — a TMMi assessment assumes certain CMMI-level capabilities exist (requirements management, configuration management). If they don't, the test process cannot mature independently.
2. **Parallel process areas** — CMMI Verification and Validation process areas overlap with TMMi level 2/3. A consultant should note where the client already has CMMI practices in place — TMMi does not repeat them.

In practice: if a client is CMMI level 2+, the TMMi Level 2 baseline assessment is faster because some infrastructure (change management, planning discipline) already exists.

---

## The Consulting Workflow in Practice

### Phase 1 — Baseline Assessment (Weeks 1-2)

Scope: current state across all framework key areas or process areas.

Deliverable: scored assessment report with evidence citations. Never conclusions without evidence — every finding ties back to a document reviewed, interview quote, or observed practice.

Common findings at Level 1/2 clients:
- No organisation-wide test strategy; each project invents its own
- Test planning happens after development starts
- No test environment management; testers fight for shared environments
- Defect data exists but is not analysed (escape rate unknown)
- Automation exists but has no ownership or maintenance budget

### Phase 2 — Gap Analysis (Week 3)

Map each finding to: current state → target state → gap size → business impact.

Example gap analysis entry:

| Area | Current | Target | Gap | Business Impact |
|------|---------|--------|-----|-----------------|
| Test Strategy | Ad hoc per project | Org-wide strategy (TMMi L2) | Medium | Inconsistent coverage; regressions missed |
| Defect Measurement | Counts only | Escape rate tracked (TMMi L4) | High | Cannot demonstrate QA value to leadership |
| Automation | ~20% coverage, no CI | 60%+ coverage, CI gated (strategy-aligned) | High | Slow release cycles |

### Phase 3 — Improvements Roadmap

Structure the roadmap in three horizons:

**Quick wins (0-30 days)** — No dependencies, low effort, visible impact. Examples: introduce defect escape rate reporting, add a test strategy template to the project playbook, plug automation into CI.

**Medium-term (30-90 days)** — Process changes needing team adoption. Examples: establish a Test Centre of Excellence (TCoE), roll out the test planning standard across all squads, implement test environment booking.

**Strategic investments (90+ days)** — Structural changes. Examples: build a TMMi Level 3-aligned test organisation, run test training programmes, achieve formal TMMi assessment accreditation.

Prioritisation criteria: business value > risk reduction > effort. Express benefits in language that resonates with each stakeholder (see Stakeholder Management below).

### Phase 4 — Implementation Support

The consultant's role shifts from assessor to coach. Responsibilities:
- Pairing with test leads to author the org-wide test strategy
- Running workshops to embed new practices (e.g., Three Amigos, risk-based test selection)
- Reviewing deliverables against the framework to ensure they meet the process area goals
- Unblocking adoption issues — usually cultural (developer resistance) or resource (no test environment budget)

### Phase 5 — Re-assessment

Re-run the assessment 3-6 months after roadmap delivery. Compare scores. Produce a before/after improvements report.

This is how the consulting engagement demonstrates ROI — not by claiming a level was reached, but by showing the metrics moved.

---

## Benefits-Driven Framing

The biggest failure mode in PIM consulting is framing improvements as "we'll implement TMMi Level 3." Leadership doesn't care about framework levels. They care about:

| Business concern | QA metric | Target |
|---|---|---|
| Releases are too slow | Time-to-release | Reduce from 3 weeks to 1 week |
| Production incidents embarrassing | Defect escape rate | Reduce from 8% to under 2% |
| Testing costs too much | Automation ROI | Achieve 3:1 return within 12 months |
| Can't tell if we're getting better | Test coverage % | Establish baseline; improve 20% in 90 days |
| Incidents take too long to catch | MTTD | Reduce from hours to minutes via monitoring |
| Regression cycles risk releases | Regression failure rate | Reduce flaky test rate below 2% |

Every roadmap item must have at least one owning metric. If you cannot name the metric that will move, the improvement is not worth doing.

See [[qa/qa-metrics]] for metric definitions and calculation methods.

---

## Key Metrics in PIM Engagements

### Defect Escape Rate
`(Defects found in production / Total defects found) × 100`

The single most important metric for demonstrating QA value. A client with no measurement at baseline cannot know their escape rate — establishing this baseline is itself a quick win.

Industry baseline: 15-30% for Level 1 organisations. Target after engagement: below 5%.

### Test Coverage %
Proportion of requirements, user stories, or code paths covered by tests. Directionally useful; never treat as a proxy for quality in isolation.

### Automation ROI
`(Manual test hours saved × hourly cost) / Automation investment cost`

Break-even is typically 6-18 months depending on suite size and change frequency. See [[qa/test-automation-strategy]] for the full ROI model.

### MTTD — Mean Time to Detect
Average time from defect introduction to detection. Lower is better. Shift-left practices (pre-commit hooks, unit tests, contract tests) drive MTTD down. See [[qa/shift-left-testing]].

### Defect Density
`Defects per 1,000 lines of code (or per story point)`

Useful for identifying high-risk modules. See [[qa/defect-clustering]].

### Regression Failure Rate
`Failed regression tests / Total regression tests run`

Above 5% indicates either flaky tests or genuine instability. Both are problems.

---

## Stakeholder Management

Getting buy-in is as important as the assessment itself. Three audiences, three framings:

**Engineering teams** — Frame improvements as removing friction, not adding bureaucracy. "We're introducing a shared test environment so you stop blocking each other" lands better than "we're implementing TMMi L2 Test Environment process area." Involve senior engineers in co-designing the test strategy.

**QA leads and test managers** — They already understand the framework language. Brief them on findings before the formal report — no surprises. They become the internal champions.

**Executive sponsors (CTO, VP Engineering)** — Translate everything into cost, speed, and risk. The assessment report should have an executive summary of no more than one page: current maturity level, the three biggest risks to the business, and the top three roadmap items with projected benefit.

A stakeholder map at assessment kickoff (who holds budget, who holds veto, who is an active detractor) prevents the roadmap from stalling during implementation.

---

## What a 90-Day Engagement Looks Like

| Week | Activity |
|------|----------|
| 1-2 | Kickoff, document review, structured interviews |
| 3 | Assessment analysis, gap scoring, draft findings |
| 4 | Findings presentation, gap analysis workshop with QA leads |
| 5-6 | Roadmap co-design sessions; quick wins begin immediately |
| 7-8 | Roadmap delivery; implementation begins on medium-term items |
| 9-10 | Coaching support; unblock adoption issues |
| 11-12 | Progress review; metrics baseline confirmed; handover pack |

Post-engagement: schedule a 90-day re-assessment check-in to validate improvements held.

---

## How AI and CI/CD Accelerate PIM

Traditional PIM relies on manual document review and interviews to assess maturity. CI/CD pipeline data makes several process areas auto-assessable:

- **Test Monitoring and Control (TMMi L2)** — CI dashboards already capture pass/fail rates, coverage trends, test duration. A consultant can pull 6 months of data and score this process area objectively, not from self-reported interviews.
- **Defect Management (TPI Next KA 10)** — Jira/GitHub Issues data shows defect escape rate, resolution time, and reopening rate automatically.
- **Test Environment (TMMi L2)** — Kubernetes ephemeral environment usage, environment failure rates, and booking conflicts are visible in platform logs.
- **Metrics (TPI Next KA 9)** — Any team with Grafana/DataDog already has the raw data; the gap is usually connecting it to test outcomes.

LLM-assisted analysis of historical defect reports can surface clustering patterns (80% of production bugs originating in two modules) in minutes rather than days. See [[qa/defect-clustering]].

The implication: a consultant in 2026 can produce a higher-confidence baseline assessment faster than traditional TAM methods, because objective pipeline data supplements interview evidence rather than being replaced by it.

---

## Connections

- [[qa/benefits-realisation]] — the benefits tracking discipline that proves the PIM roadmap delivered its promised ROI
- [[qa/qa-change-management]] — the people-side layer without which PIM technical recommendations fail to embed
- [[qa/qa-metrics]] — metric definitions for defect escape rate, MTTD, and automation ROI used throughout the assessment and roadmap
- [[qa/qa-leadership]] — stakeholder engagement, executive briefing formats, and maturity model communication
- [[qa/test-automation-strategy]] — automation ROI model that underpins the strategic investment horizon of the roadmap
- [[qa/defect-clustering]] — hotspot analysis that feeds baseline assessment findings
- [[qa/test-strategy]] — the organisation-wide artefact that TMMi L2 and TPI Next both require as a deliverable

## Open Questions

- When CI/CD pipeline data allows auto-assessment of several TMMi process areas, should those areas still require structured interviews, or does objective data supersede them entirely?
- Is TPI Next's cluster-based approach reliably superior to TMMi's staged ladder in agile organisations, or does the answer depend on which business driver is dominant?
- How should a PIM consultant handle the situation where the client's senior sponsor leaves mid-engagement — restart the stakeholder alignment or continue with the replacement?

## Related Pages

- [[qa/qa-leadership]] — QA maturity model, strategy templates, and metrics communication to stakeholders
- [[qa/qa-metrics]] — Full metric definitions: defect density, escape rate, automation ROI, MTTD, flaky rate
- [[qa/qa-in-devops]] — Quality pipeline structure and quality gates that PIM roadmaps typically target
- [[qa/test-automation-strategy]] — Automation ROI model, phased automation roadmap, what to automate first
- [[qa/continuous-testing]] — The shift-left/shift-right model that a mature test process (TMMi L3+) produces
- [[qa/shift-left-testing]] — Cost-of-bug-by-stage data that justifies early process improvement investment
- [[qa/risk-based-testing]] — Risk-based prioritisation used in gap analysis and roadmap construction
- [[qa/defect-clustering]] — Hotspot analysis; core input to the baseline assessment findings
- [[qa/test-planning]] — Test plan standards targeted by TMMi Level 2 Test Planning process area
- [[qa/test-strategy]] — Organisation-wide test strategy artefact that TMMi L2 and TPI Next require
