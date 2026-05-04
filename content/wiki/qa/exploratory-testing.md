---
type: concept
category: qa
para: resource
tags: [exploratory-testing, session-based, charters, heuristics, qa]
sources: []
updated: 2026-05-01
tldr: Simultaneous learning, test design, and execution. The tester uses their knowledge of the system to discover behaviours that scripted tests miss.
---

# Exploratory Testing

Simultaneous learning, test design, and execution. The tester uses their knowledge of the system to discover behaviours that scripted tests miss. Not ad-hoc. Structured exploration with clear goals and time-boxing.

Scripted tests verify what you expect. Exploratory testing finds what you didn't expect.

---

## Why Exploratory Testing?

Scripted tests are only as good as the person who wrote them. They test known scenarios. Exploratory testing:
- Finds bugs that emerge from combinations no one considered
- Validates usability and flows from the user's perspective
- Adapts in real time — follow the smell of a bug
- Exercises new features quickly before scripted suites catch up
- Covers risk areas that are hard to script (concurrent users, unusual sequences)

---

## Session-Based Testing

Structure exploratory testing as time-boxed sessions with a defined charter. Developed by James Bach and Jonathan Bach.

**Session** — a focused, uninterrupted period of exploratory testing. Typically 30–120 minutes.

**Charter** — the mission for the session. Not a script, but a direction.

Charter format: **"Explore [target] with [resources] to discover [information]"**

```
Charter examples:

"Explore the checkout flow with valid and invalid payment cards
 to discover error handling and recovery behaviour."

"Explore the user profile settings with different permission levels
 to discover access control and data visibility issues."

"Explore the API under concurrent load using Postman
 to discover race conditions and state corruption."

"Explore the mobile app on iOS 17 with slow network conditions (3G)
 to discover performance and timeout handling issues."
```

---

## Session Structure

```
Pre-session (5 min):
  - Read the charter
  - Identify the area under test
  - Gather tools (browser, Postman, DB access, logs)

Session (45–90 min):
  - Execute the charter
  - Take real-time notes: bugs found, questions, observations
  - Note percentage breakdown: test design vs execution vs setup

Debrief (10 min):
  - Summarise: what was tested, what was found, what wasn't tested
  - File bug reports
  - Propose follow-up charters
```

---

## The SBTM Report (Session-Based Test Management)

After each session, log:

```
Session: SBTM-042
Charter: Explore the bulk import feature with large CSV files to discover 
         performance limits and error feedback quality.
Tester: Lewis
Date: 2026-05-01
Duration: 60 minutes

Coverage:
  Test design: 20%
  Execution: 70%
  Setup/other: 10%

Bugs Filed:
  - BUG-201: Import hangs with no progress indicator for files > 10,000 rows
  - BUG-202: Error message "File too large" shown for 9MB file (limit is stated as 10MB)
  - BUG-203: Column headers with trailing spaces cause import to fail silently

Issues/Observations:
  - No documentation of supported date formats
  - Import does not resume if session times out mid-import

Charter coverage: 80% complete
Follow-up charters:
  - Test with Unicode column headers
  - Test concurrent imports from two users
```

---

## Heuristics

Mental shortcuts experienced testers use to guide exploration.

**HICCUPPS** (consistency heuristics — James Bach):
- **H**istory — does it behave consistently with older versions?
- **I**mage — is it consistent with the product's brand/quality expectations?
- **C**omparable products — does it behave like similar products?
- **C**laims — does it do what documentation/marketing says it does?
- **U**ser expectations — does it meet what users would reasonably expect?
- **P**roduct — is it internally consistent?
- **P**urpose — does it serve the user's goal?
- **S**tandards — does it comply with relevant standards (accessibility, legal)?

**CRUD testing** — for any data entity, test: Create, Read, Update, Delete. Also: Create then Read (data persists?), Update to invalid state, Delete while referenced.

**FEW HICCUPPS** — adds F (Familiar — does it behave like familiar systems?) and E (Explainability — can the user understand the result?) and W (World — does it respect laws, regulations, locale?).

**RCRCRC** (risk heuristic):
- Recent changes
- Core functionality
- Risky areas (complex, error-prone history)
- Configuration-sensitive paths
- Repaired defects (regression risk)
- Chronic problems

---

## Mind Maps for Exploration

Map the feature before testing. Nodes = areas; branches = sub-areas. Use as a coverage tracker. Mark each node as tested, skipped, or needs more.

```
User Authentication
├── Login
│   ├── Valid credentials
│   ├── Wrong password (1, 2, 3, 4, 5 attempts)
│   ├── Locked account
│   ├── MFA flow
│   └── Remember me
├── Registration
│   ├── Email validation
│   ├── Password rules
│   └── Duplicate email
├── Password Reset
│   ├── Email receipt
│   ├── Token expiry
│   └── Used token
└── Session Management
    ├── Logout
    ├── Session timeout
    └── Concurrent sessions
```

---

## When to Use Exploratory Testing

| Situation | Approach |
|---|---|
| New feature just built | 45-min charter per major user flow |
| Pre-release smoke | 90-min session on highest-risk areas |
| After a major refactor | Focus on areas that changed + regression scope |
| Production incident root cause | Reproduce, then probe surrounding behaviour |
| No time to write scripts | Exploratory is faster feedback than no testing |
| Complement existing scripts | Target areas scripts don't cover |

Exploratory testing is not a replacement for automated regression suites. It complements them. Automation verifies known scenarios reliably; exploration finds unknown scenarios.

---

## Tools for Exploratory Testing

- **Bug tracking**: Jira, Linear — file bugs immediately during the session
- **Screen recording**: Loom, OBS — capture reproducible evidence
- **Notation**: Rapid Reporter (session notes), XMind/Miro (mind maps)
- **API exploration**: Postman, Insomnia, Hoppscotch
- **Network manipulation**: Chrome DevTools, Proxyman, Charles
- **Data generation**: Faker, Mockaroo
- **Accessibility**: axe DevTools, screen readers (NVDA, VoiceOver)

---

## Cognitive Biases to Fight

| Bias | Effect | Fix |
|---|---|---|
| Confirmation bias | You expect it to work so you don't look hard where it might not | Explicitly try to break it |
| Availability bias | You test what's easy to test, not what's risky | Use a risk-based heuristic to pick areas |
| Anchoring | You test the same path every session because that's how you started | Start sessions from a different entry point |
| Tunnel vision | You chase one bug and forget surrounding areas | Time-box bug investigation to 10 min; log and move on |
| Happy path bias | You follow the intended flow; real users do weird things | Explicitly plan "bad path" sessions |

---

## Pair Exploration

Two explorers, one application — each brings a different perspective.

**Driver/Navigator:** Driver controls the keyboard; navigator observes, asks questions, notices what driver misses. Swap every 20 minutes.

**Adversarial pair:** Explorer A tests the feature; Explorer B reviews notes and actively challenges assumptions. Best for pre-release high-risk sessions.

**Cross-functional pair:** Developer + QA. Developer knows the code paths; QA knows the heuristics. Developer can direct QA to risky implementation areas.

---

## Test Notes Template

```markdown
## Exploratory Testing Session

**Charter:** Explore the password reset flow with focus on token expiry
**Tester:** Lewis E.
**Date:** 2026-05-01
**Duration:** 60 minutes (9:00–10:00)

### Test Notes (what I tried)
- Clicked "Forgot password" → email in < 30s
- Waited 65 minutes, tried link → error shown ✓
- Tried same link twice → second attempt rejected ✓
- Requested reset twice in 2 min — both links worked. Is first token invalidated? UNCLEAR.

### Bugs Found
**B001** [HIGH] Two reset tokens active simultaneously
  Steps: Request reset → don't click → request again → both links work
  Expected: first link invalidated on second request

### Questions/Issues
- Are reset tokens stored hashed or plaintext?

### Coverage
- Happy path: ✓  |  Expiry: ✓  |  Concurrent tokens: partial (bug found)
```

---

## Attack Patterns (Where Bugs Hide)

- **Long sequences** — do 50 operations in a row; state accumulates unexpectedly
- **Interruptions** — click back mid-flow, lose connection mid-upload
- **Permissions** — try as different roles; attempt privilege escalation
- **Concurrency** — open in two tabs and submit simultaneously
- **Boundaries** — first/last item, exactly at limit, just over limit
- **Recovery** — force errors and see how the app recovers

Use at least two attack patterns per session as a literal checklist alongside the charter.

---

## Common Failure Cases

**Exploring without a charter and calling it exploratory testing**
Why: undirected clicking around the application is not exploratory testing — it is ad-hoc testing; without a charter there is no way to know what was covered, what was missed, or whether the session added any value.
Detect: session notes consist of a list of bugs with no stated mission, no coverage assessment, and no follow-up charters.
Fix: write the charter before the session starts using the format "Explore [target] with [resources] to discover [information]"; the charter is the minimum unit of structure for an exploratory session.

**Sessions longer than 90 minutes without a break**
Why: cognitive fatigue degrades the quality of exploratory testing significantly after 90 minutes; testers start following familiar paths and stop noticing anomalies.
Detect: single session blocks in the test schedule exceed two hours; testers report feeling like they were "just clicking around" by the end.
Fix: time-box sessions to 45-90 minutes with a mandatory debrief; if more coverage is needed, start a new session with a fresh charter after a break.

**Bugs documented in session notes but never filed in the tracker**
Why: informal notes taken during a session are not actionable for developers; bugs that remain in a notes document rather than a tracker get lost, duplicated, or forgotten between sprints.
Detect: session SBTM reports contain bug descriptions that do not correspond to any open ticket in Jira or Linear.
Fix: file every bug in the tracker before the debrief ends; the session is not complete until every finding has a ticket number.

**Not adjusting charters based on what you find during the session**
Why: rigid adherence to the original charter when you discover something unexpected causes high-value bugs to be logged but not fully investigated during the session.
Detect: session notes show "found anomaly in X, continued with charter" repeatedly without follow-up charters to investigate the anomalies.
Fix: log unexpected findings immediately and note them as follow-up charter candidates; it is acceptable to deviate from the charter for 10-15 minutes to probe a finding before returning.

## Connections

- [[qa/test-strategy]] — exploratory testing sits in the Q4 (critique product) quadrant
- [[qa/test-case-design]] — exploratory sessions often generate new test case ideas
- [[qa/bug-lifecycle]] — bugs found in sessions enter the standard lifecycle
- [[qa/risk-based-testing]] — risk analysis informs which charters to prioritise
- [[qa/bdd-gherkin]] — confirmed behaviour from exploration can be formalised as BDD scenarios
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?
