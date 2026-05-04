---
type: concept
category: qa
para: resource
tags: [pair-testing, collaborative-testing, cross-functional, developer-qa, exploratory]
sources: []
updated: 2026-05-01
tldr: Two people testing together — more perspectives, fewer assumptions, faster knowledge transfer.
---

# Pair Testing

Two people testing together. More perspectives, fewer assumptions, faster knowledge transfer.

---

## Why Pair Testing Works

```
Solo testing has blind spots:
  - Tester confirms what they expect to find
  - Single frame of reference for what "correct" means
  - Fatigue reduces thoroughness over time
  - Knowledge stays siloed

Pair testing multiplies perspectives:
  - Second person questions assumptions ("why are you testing it that way?")
  - Different roles bring different mental models
  - Bugs found that neither would find alone
  - Knowledge transfers in real-time
```

---

## Pair Formats

```
Format 1: Driver / Observer
  Driver: controls keyboard, executes test actions
  Observer: watches, takes notes, asks questions, looks for what driver misses
  Swap roles every 20-30 minutes

Format 2: Developer + QA
  Developer knows the implementation (where bugs are likely)
  QA knows test heuristics and user mental models
  Developer directs: "try sending the request without auth header"
  QA notices: "the error message reveals the DB schema — that's a security issue"

Format 3: QA + QA (adversarial)
  QA A tests the feature
  QA B observes and actively challenges: "you assumed the flow would go to checkout.
    What if the user hits back and then forward?"

Format 4: QA + Product Owner
  Product Owner sees whether it matches their intent
  QA surfaces assumptions in the spec that were never stated
  Best for UAT-style scenarios before release

Format 5: QA + End User (usability pair)
  User drives; QA observes and notes confusion points
  Never correct the user — confusion is data
```

---

## Running a Pair Testing Session

```markdown
## Pair Testing Session Structure

**Duration:** 45-90 minutes (short enough to stay focused)

**Before the session:**
- Define a charter: "Explore the password reset flow with focus on multi-device scenarios"
- Assign initial driver/observer
- Open test note template

**During the session:**
1. Driver executes; observer watches and takes notes
2. Swap roles every 20-30 minutes
3. Observer speaks up with: questions, alternative paths, doubts
4. Both track: what was tried, bugs found, questions arising

**After the session:**
- Review notes together for 10 minutes
- Log bugs in tracker
- Summarise coverage achieved
- Record what still needs testing

**Session note template:**
  Charter: [charter text]
  Pair: [name 1] + [name 2]
  Date: 2026-05-01
  Duration: 60 minutes

  What we tested:
    - [action 1]
    - [action 2]

  Bugs found:
    - B001 [severity]: [description]

  Questions / follow-ups:
    - [open question]

  Coverage:
    - [area covered]
    - [area NOT covered — needs follow-up]
```

---

## When to Use Pair Testing

```
High value contexts:
  ✓ Complex new features with many edge cases
  ✓ Features with significant security or financial impact
  ✓ Before a major release (rotating pairs cover more ground)
  ✓ Knowledge transfer (onboarding a new QA)
  ✓ When a feature is ambiguous (developer explains intent)
  ✓ After a critical production bug (verify the fix AND the surrounding area)

Lower value contexts:
  ✗ Routine regression on stable, well-understood areas
  ✗ When one person has deep specialised knowledge the other lacks (just consult them)
  ✗ Simple UI changes with obvious verification
  ✗ Performance testing (better done solo with tooling)

Rule of thumb: pair when the cost of a miss (shipped bug) exceeds the cost of pairing (2× time).
For critical features, that calculation almost always favours pairing.
```

---

## Developer + QA Pairing Protocol

```
Most valuable pair combination: one person who built it, one who didn't.

Developer's role:
  - Share implementation context: "I was uncertain about this edge case"
  - Direct attention to risky code: "This concurrent path worried me"
  - Explain data model: "The discount applies here but not here because..."
  - Observe how QA tests: learn test heuristics

QA's role:
  - Bring user mental model: "Users won't know they need to X first"
  - Bring test heuristics: HICCUPPS, boundary analysis, attack patterns
  - Push back on assumptions: "Why do we assume the token is still valid?"
  - Observe implementation: learn system internals that inform future testing

Anti-patterns:
  - Developer takes over the keyboard and tests "their own way"
  - QA defers to developer's judgement on what's "correct"
  - No swap — one person drives the whole session
  - Session becomes a code review (different activity)
```

---

## Pairing Cadence

```
Sprint-level recommendation:
  Sprint planning:  identify 1-2 features for pair testing (complex/high-risk)
  Mid-sprint:       2-3 pair sessions of 60 minutes each
  Pre-demo:         1 adversarial pair session on the full sprint's changes
  Post-sprint:      short debrief (what did pairing find that solo would have missed?)

Rotating pairs:
  Don't always pair the same two people — rotate to spread knowledge
  Cross-functional pairs (QA+Dev+Product) for complex features
  New team members pair with experienced QA for first 2-3 sprints
```

---

## Common Failure Cases

**Developer dominates the session — QA never drives**
Why: the developer knows the feature best and naturally takes over when the QA hesitates or asks a question; the "observer" role collapses and the developer ends up testing their own assumptions.
Detect: after the session the session notes contain no bugs the developer didn't already know about; the QA can't summarise what they would test differently next time.
Fix: enforce the swap rule explicitly at the 20-minute mark with a visible timer; the driver hands over the keyboard — no exceptions — even mid-scenario.

**Charter too broad — session drifts and produces shallow coverage**
Why: a charter like "test the checkout flow" has no focus, so the pair keeps returning to the happy path instead of probing specific risk areas.
Detect: 60 minutes in and the session notes show the same three happy-path scenarios repeated; no edge cases or negative scenarios were attempted.
Fix: rewrite the charter to include a specific mission and scope constraint, e.g., "Explore multi-currency checkout with focus on currency switching mid-session and discount stacking"; a good charter fits in one sentence.

**Session notes not written during the session — insights lost**
Why: both people agree to write up notes "after," but after the session ends the details are forgotten and only the bugs are recorded; coverage gaps and open questions disappear.
Detect: the session notes filed in the bug tracker contain bug IDs but no "what we tested" or "what we didn't test" sections.
Fix: designate the observer role as the live note-taker using the session note template; notes must be filled in before the debrief conversation ends.

**Pair testing replaces exploratory testing for stable, low-risk areas**
Why: teams pair on everything regardless of risk level because it feels thorough; this wastes two people's time on routine regression areas.
Detect: the sprint retrospective flags that pairing sessions are running over schedule and finding no new bugs on the areas tested.
Fix: apply the rule: pair when the cost of a miss exceeds the cost of pairing; for stable, well-covered areas run solo exploratory instead and reserve pairing for complex or high-stakes features.

## Connections

[[qa-hub]] · [[qa/exploratory-testing]] · [[qa/exploratory-testing]] · [[qa/test-planning]] · [[qa/agile-qa]] · [[qa/shift-left-testing]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?
