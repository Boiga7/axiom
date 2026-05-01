---
type: concept
category: qa
para: resource
tags: [exploratory-testing, session-based, charters, heuristics, qa]
sources: []
updated: 2026-05-01
---

# Exploratory Testing

Simultaneous learning, test design, and execution. The tester uses their knowledge of the system to discover behaviours that scripted tests miss. Not ad-hoc — structured exploration with clear goals and time-boxing.

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

Map the feature before testing. Nodes = areas; branches = sub-areas. Use as a coverage tracker — mark each node as tested, skipped, or needs more.

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

Exploratory testing is not a replacement for automated regression suites. It complements them — automation verifies known scenarios reliably; exploration finds unknown scenarios.

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

## Connections

- [[qa/test-strategy]] — exploratory testing sits in the Q4 (critique product) quadrant
- [[qa/test-case-design]] — exploratory sessions often generate new test case ideas
- [[qa/bug-lifecycle]] — bugs found in sessions enter the standard lifecycle
- [[qa/risk-based-testing]] — risk analysis informs which charters to prioritise
- [[qa/bdd-gherkin]] — confirmed behaviour from exploration can be formalised as BDD scenarios
