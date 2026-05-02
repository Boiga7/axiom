---
type: concept
category: qa
para: resource
tags: [qa-leadership, quality-strategy, team-building, metrics, stakeholders, qa-maturity]
sources: []
updated: 2026-05-01
tldr: Operating QA at team and organisation scale — strategy, metrics, team building, and stakeholder communication.
---

# QA Leadership and Quality Strategy

Operating QA at team and organisation scale. Strategy, metrics, team building, and stakeholder communication.

---

## QA Maturity Model

```
Level 1: Reactive
  Testing happens after code is "done"
  QA is a gate at the end of the pipeline
  No test automation; all manual
  Quality is the QA team's problem

Level 2: Managed
  Test plans written per sprint
  Basic automation (smoke + regression)
  QA embedded in scrum teams
  Bug tracking and metrics in place

Level 3: Defined
  Shift-left: QA involved in requirements
  Automation pyramid respected (unit > integration > E2E)
  CI gates with quality thresholds
  Quality metrics tracked and reported

Level 4: Quantitatively Managed
  Defect escape rate < 5% to production
  Automation coverage > 80%
  Flaky test rate < 1%
  DORA metrics tracked (deployment frequency, MTTR)

Level 5: Optimising
  Quality built into development process — QA guides, not polices
  Predictive defect analysis
  Continuous experimentation and improvement
  Engineers own quality; QA owns strategy

Assessment: run quarterly; track movement between levels
```

---

## Building a QA Strategy

```
A QA strategy answers:
  1. What is our quality goal? (specific, measurable)
  2. What testing activities will get us there?
  3. What tools and processes will enable those activities?
  4. How will we measure success?
  5. What is the roadmap (6-12 month horizon)?

Quality goal example (not "ship quality software"):
  "Reduce customer-reported defects by 40% in 6 months while maintaining
   current release cadence, measured by production defect rate per 1000 users."

Strategy components:
  Shift-left:    QA reviews every AC before sprint starts (Three Amigos)
  Automation:    80% of regression coverage automated within 6 months
  Observability: synthetic monitoring on all P0 flows by Q3
  Culture:       developers own unit/integration tests; QA owns strategy + E2E
```

---

## QA Metrics that Matter to Leadership

```
Metric               What it shows              How to present
───────────────────────────────────────────────────────────────────────
Defect escape rate   Quality reaching users      % defects found in prod
                                                 vs total defects found
                                                 Target: < 5%

Defect detection     Where we catch bugs         Stacked bar by stage
by stage             (costs money to miss early) Show cost implication

Automation ROI       Time saved by automation    Hours manual testing
                                                 Hours automation saves
                                                 Show payback period

MTTD                 How fast we find bugs       Average hours from
                                                 release to detection
                                                 in production

Flaky test rate      Test reliability            % tests that flaked
                                                 this sprint
                                                 Target: < 1%

Sprint velocity      QA team throughput          Stories QA-signed-off
impact               (QA not a bottleneck?)      per sprint
```

---

## Communicating Quality to Stakeholders

```
Audience: Product Owner
  Care about: will this ship on time? what's the risk?
  Don't say: "we found 23 defects"
  Say: "2 blockers need fixing before release; 5 medium issues tracked for next sprint.
        Release risk: medium — the payment flow has 1 unresolved high-severity issue."

Audience: Engineering Manager
  Care about: team health, tech debt, process efficiency
  Don't say: "QA is overwhelmed"
  Say: "We're spending 40% of QA time on manual regression.
        Automation roadmap will reduce this to 10% by Q3, freeing capacity for exploratory work."

Audience: CTO / VP Engineering
  Care about: business outcomes, reliability, cost
  Don't say: "test coverage is 78%"
  Say: "Our defect escape rate dropped from 12% to 4% this quarter.
        One major production incident was prevented by our new synthetic monitoring.
        Estimated COGS saved: £15k in incident response."

Audience: Developers
  Care about: fast feedback, clear expectations, not being blocked by QA
  Don't say: "QA can't start until Monday"
  Say: "What does the feature need to be testable? Let's agree on test data and environment
        needs during sprint planning so QA can start on day 3."
```

---

## Quality Gates — Governance Without Bureaucracy

```
Level 1 gate: pre-commit (developer owns)
  - Linting + formatting pass
  - Fast unit tests pass (< 60s)
  - No secrets detected

Level 2 gate: PR merge (team owns)
  - All CI tests green
  - Coverage > 80%
  - QA review of ACs signed off
  - At least 1 code review approval

Level 3 gate: release (QA lead owns)
  - Integration tests pass
  - Performance benchmarks within threshold
  - Security scan clean
  - Exploratory testing session completed
  - No open P1/P2 defects

Each gate is a checklist, not a waiting room.
Gates block bad releases; they should not block good ones.
If a gate is blocking good releases: reduce it.
If a gate is letting bad releases through: strengthen it.
```

---

## QA Team Building

```
Hiring signals for strong QA engineers:
  ✓ Asks "why" about requirements (not just "what to test")
  ✓ Comfortable with code (reads it, writes scripts, understands architecture)
  ✓ Has opinions about what should NOT be tested
  ✓ Explains defects with root causes, not just reproduction steps
  ✓ Talks about risk-based testing, not 100% coverage

Red flags:
  ✗ "I find all the bugs" (overconfidence)
  ✗ Can't describe their automation framework at architecture level
  ✗ Treats all defects with equal urgency
  ✗ No interest in developer workflows or deployment process

Roles at scale:
  QA Engineer:    owns sprint-level testing, writes automation
  Senior QA:      owns test architecture, mentors, leads exploratory sessions
  QA Lead:        owns strategy, metrics, stakeholder communication
  SDET:           automation-first; can be embedded in Platform/Infra teams
  Principal QA:   org-wide quality strategy; hiring bar; tooling decisions
```

---

## QA Roadmap Format

```markdown
# QA Roadmap — Q2/Q3 2026

## Theme: Shift Left and Automation Coverage

### Q2 (May–June)
Goal: establish baseline metrics and stop the bleeding

- [ ] Define and instrument: defect escape rate, flaky test rate, coverage %
- [ ] Three Amigos sessions for all P0 features (starting Sprint 14)
- [ ] Automate 20 critical regression tests (currently manual)
- [ ] Set up Allure dashboard on CI

### Q3 (July–September)
Goal: achieve 80% automation, reduce QA bottleneck

- [ ] Complete E2E automation for all P0 journeys
- [ ] Implement synthetic monitoring on 5 critical flows
- [ ] Train all developers to own unit and integration tests
- [ ] QA time on manual regression < 20%

### Success Metrics
| Metric | Current | Q2 Target | Q3 Target |
|---|---|---|---|
| Defect escape rate | 12% | 8% | 5% |
| Automation coverage | 45% | 65% | 80% |
| QA manual regression time | 60% | 40% | 20% |
| Flaky test rate | 8% | 3% | 1% |
```

---

## Connections

[[qa-hub]] · [[qa/qa-metrics]] · [[qa/test-strategy]] · [[qa/defect-prevention]] · [[qa/continuous-testing]] · [[qa/shift-left-testing]]
