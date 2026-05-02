---
type: concept
category: qa
para: resource
tags: [exploratory-testing, heuristics, session-based, charters, bugs, cognitive-bias]
sources: []
updated: 2026-05-01
tldr: Going beyond basic charter/session structure into the cognitive craft of finding bugs that scripted tests miss. Exploratory testing is a skill, not a workflow.
---

# Exploratory Testing — Advanced

Going beyond basic charter/session structure into the cognitive craft of finding bugs that scripted tests miss. Exploratory testing is a skill, not a workflow.

---

## Why Exploratory Testing Finds Different Bugs

```
Scripted tests verify known behaviour.
Exploratory testing discovers unknown behaviour.

What scripted tests miss:
  - Bugs at the intersection of two features (feature interaction)
  - Timing-dependent bugs (what happens if you click twice fast?)
  - Edge cases the spec author didn't think of
  - Business logic that's technically correct but wrong for users
  - Bugs that only appear under realistic usage patterns
  - Accessibility issues that need a human to notice
  - Visual glitches that aren't captured by assertions

Exploratory is most valuable when:
  - A major feature is complete (before release)
  - A complex area has just been refactored
  - Unusual bug clusters appear in production (investigate the area)
  - After integration of external systems
```

---

## Advanced Heuristics

```
HICCUPPS (consistency heuristics):
  History:       How has this worked before? Does it still?
  Image:         Does this fit the company's reputation?
  Comparable:    How do competitors do it? Is ours worse?
  Claims:        Do marketing/docs match what the product does?
  User:          What do actual users expect?
  Product:       Is this consistent with the rest of the product?
  Purpose:       Does this serve the product's purpose?
  Statutes:      Is this legal, compliant, private?

FCC CUTS VIDS (information-gathering heuristics):
  Function:      What does it do?
  Claims:        What does it claim to do?
  Compatibility: Does it work with other parts?
  Usability:     Is it easy to use?
  Time:          What happens with timing (fast/slow)?
  Scalability:   What happens at volume?

Attack patterns (where bugs hide):
  Long sequences: do 50 operations in a row — state accumulates
  Interruptions:  click back mid-flow, lose connection mid-upload
  Permissions:    try as different roles, try escalating
  Concurrency:    open in two tabs and submit simultaneously
  Boundaries:     first/last item, exactly at limit, just over limit
  Recovery:       force errors and see how the app recovers
```

---

## Session-Based Test Management (SBTM)

```
Session:
  Duration: 45-90 minutes (enough to go deep; not so long you fatigue)
  Charter: "Explore the checkout flow with focus on promo code validation"
  Charter formula: "Explore X with focus on Y to discover Z"

Example charters:
  "Explore the order history page with focus on pagination to discover data
   integrity issues when moving between pages"

  "Explore the user profile settings with focus on email change to discover
   security gaps (notification to old email, session invalidation)"

  "Explore product search with focus on special characters and unicode
   to discover injection or encoding vulnerabilities"

During session:
  Note: things you tried (test notes)
  Note: bugs found (with reproduction steps)
  Note: questions and issues (things to follow up)
  Note: coverage achieved

Charter metrics:
  % time on charter vs exploration vs session setup
  Target: 70%+ on charter; < 20% on setup
```

---

## Cognitive Biases to Fight

```
Confirmation bias:
  You expect it to work, so you don't look hard where it might not.
  Fix: explicitly try to break it.

Availability bias:
  You test what's easy to test, not what's risky.
  Fix: use a risk-based heuristic to prioritise areas.

Anchoring:
  You test the same path every session because that's how you started.
  Fix: start sessions from a different entry point.

Tunnel vision:
  You chase one bug and forget to look at the surrounding area.
  Fix: time-box bug investigation during exploration; log and move on.

Happy path bias:
  You follow the intended flow. Real users do weird things.
  Fix: explicitly plan "bad path" sessions.
```

---

## Pair Exploration

```
Two explorers, one application — each brings different perspective.

Format 1: Driver/Navigator
  Driver: controls the keyboard, focuses on immediate actions
  Navigator: observes, asks questions, notices what the driver misses
  Swap every 20 minutes

Format 2: Adversarial pair
  Explorer A: tests the feature
  Explorer B: reviews A's notes and actively challenges assumptions
  "You assumed X would work because Y — what if it doesn't?"

Format 3: Cross-functional pair
  Developer + QA: developer knows the code paths; QA knows the test heuristics
  Developer can direct QA to risky implementation areas
  QA can surface usability issues developer wouldn't notice

When to use:
  Complex new feature: pair on first exploratory session
  Before major release: rotating pairs cover more cognitive ground
  High-risk area: adversarial pair for maximum skepticism
```

---

## Test Notes Template

```markdown
## Exploratory Testing Session

**Charter:** Explore the password reset flow with focus on token expiry
**Tester:** Lewis E.
**Date:** 2026-05-01
**Duration:** 60 minutes (9:00-10:00)

### Test Notes (what I tried)
- Clicked "Forgot password" → received email in < 30s (staging)
- Clicked link immediately → worked as expected
- Opened link in incognito → worked (not session-dependent)
- Waited 65 minutes, tried link → error message shown ✓
- Tried same link twice → second attempt rejected ✓
- **Concurrent tokens**: requested reset twice in 2 min. Both links worked. 
  Is the first token invalidated when a second is requested? UNCLEAR.
- Copied reset URL, checked token format: base64? JWT? Guessable? → base64
- Tried incrementing token by 1 character → invalid token message shown

### Bugs Found
**B001** [HIGH] Two reset tokens active simultaneously
  Steps: Request reset → don't click → request again → both links work
  Expected: first link should be invalidated
  Impact: reduces security of reset flow

**B002** [LOW] Error message on expired token reveals token expiry time
  Message: "This link expired 1 hour ago"
  Risk: information disclosure; minor

### Questions/Issues to Follow Up
- Does the first reset token get invalidated when a new one is requested?
- Are reset tokens stored hashed or in plaintext?

### Coverage
- Happy path: ✓
- Expiry: ✓
- Reuse after reset: ✓
- Concurrent tokens: partial (bug found)
- Token guessing: ✓ (basic)
```

---

## Common Failure Cases

**Happy path bias that persists even when explicitly trying bad paths**
Why: testers know the system well enough to complete the happy path automatically; even a "bad path session" drifts toward familiar flows because the tester subconsciously knows what works.
Detect: session notes show mostly valid inputs with minor variations; no tests of concurrent operations, interruptions, or dramatically out-of-range values.
Fix: use the attack pattern list (long sequences, interruptions, permissions, concurrency, boundaries, recovery) as a literal checklist at session start; pick at least two attack patterns per session and execute them explicitly.

**Confirmation bias unchecked in high-stakes pre-release sessions**
Why: testers under release pressure subconsciously interpret ambiguous behaviour as acceptable rather than probing it, because finding a critical bug at release time is socially uncomfortable.
Detect: pre-release exploratory sessions produce few or no bugs despite the feature being complex; bugs are found in production shortly after release.
Fix: use adversarial pair exploration for pre-release sessions; the second person's explicit role is to challenge every "that looks fine" judgment and push to verify it against a specific expected behaviour.

**Tunnel vision during bug investigation consuming the whole session**
Why: a compelling bug draws complete focus; the tester spends 45 of 60 minutes fully characterising one issue and never tests the surrounding area where related bugs are likely.
Detect: session notes show exhaustive detail on one bug and a single line of charter coverage.
Fix: time-box bug investigation to 10-15 minutes during a session; log the reproduction steps and move on, then return for deeper investigation after the charter is complete.

**Pair exploration where both explorers follow the same path**
Why: two people exploring together default to one person driving while the other watches passively; this is pair testing in name only and adds no diversity of perspective.
Detect: session notes from a pair session are identical to what a single tester would produce; the navigator's contributions are not visible in the record.
Fix: assign the driver/navigator roles explicitly and enforce a swap every 20 minutes; the navigator must actively call out missed paths and challenge assumptions rather than watching the driver.

## Connections
[[qa-hub]] · [[qa/exploratory-testing]] · [[qa/risk-based-testing]] · [[qa/usability-testing]] · [[qa/security-testing-qa]] · [[qa/test-strategy]]
