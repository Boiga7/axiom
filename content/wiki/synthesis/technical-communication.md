---
type: synthesis
category: synthesis
para: resource
tags: [communication, technical-writing, leadership, stakeholders, documentation]
tldr: The communication layer that separates senior engineers from lead engineers — technical writing, stakeholder translation, ADRs, RFCs, and explaining tradeoffs without losing precision.
updated: 2026-05-02
---

# Technical Communication

Technical communication is the leverage multiplier on everything else in this vault. A decision made correctly but communicated poorly gets overruled, ignored, or re-made by someone who did not know you already worked it out. Writing well means your thinking outlasts the meeting.

## The Audience Problem

Technical communication fails when you optimise for demonstrating knowledge instead of transferring understanding. The question before writing anything is: what does this person need to do or decide, and what is the minimum they need to know to do it well?

| Audience | Optimise for |
|---|---|
| Engineers on your team | Precision. Include edge cases, failure modes, exact API contracts. |
| Engineers in other teams | Context first. What problem does this solve, what are the constraints, how does it interact with their system? |
| Engineering manager | Impact and confidence. What is the risk, what is the timeline, what decision do you need? |
| Non-technical stakeholders | Outcome and tradeoffs in their terms. Not "we're switching databases" — "this reduces downtime from 4 hours to 0 and costs £X". |

The same information requires different framing. Writing for the wrong audience wastes their time and creates the impression you cannot communicate.

## Architecture Decision Records (ADRs)

An ADR captures why a significant technical decision was made. Not just what was decided. The "why" is what decays fastest from collective memory.

**Structure:**

```markdown
# ADR-0042: Use Postgres for session storage over Redis

## Status
Accepted — 2026-03-12

## Context
We need persistent session storage. Redis was the initial choice
(fast, simple), but we already run Postgres for primary data and
the ops team does not want to manage a second stateful service.

## Decision
Store sessions in a Postgres table with a TTL column, cleaned by
a background job every 10 minutes.

## Consequences
**Good:** No new infrastructure. Sessions survive Redis eviction.
Postgres ACID guarantees session integrity.
**Bad:** Slightly higher latency than Redis (2-5ms vs <1ms).
DB load increases under session churn.

## Alternatives considered
- Redis: faster, but adds operational overhead
- JWT (stateless): removes session storage entirely, but cannot
  invalidate tokens before expiry — unacceptable for security requirements
```

The value of an ADR is the alternatives considered and the reasoning, not the decision itself. Six months later, when someone asks "why don't we just use Redis?", the answer is in the ADR.

## RFCs (Request for Comments)

An RFC is a proposal for a significant change, written before implementation, circulated for input. It separates the "should we do this and how" question from the "build it" question.

**When to write one:** Any change that affects multiple teams, introduces a new system component, changes a shared API contract, or has significant operational risk.

**Structure:**
1. **Problem statement** — what is broken or missing, and why it matters now
2. **Proposal** — the specific change, with enough detail to evaluate it
3. **Alternatives** — other approaches considered and why this one was chosen
4. **Open questions** — decisions not yet made, areas of uncertainty
5. **Rollout plan** — phasing, feature flags, rollback strategy

The goal is to make it easy for reviewers to say yes or identify the one important problem. Keep it as short as possible while covering what they need to know.

## Postmortems

A postmortem is a written analysis of an incident: what happened, why, what was done, and what will prevent recurrence. Its purpose is organisational learning, not blame.

**Blameless culture:** Systems fail. People make decisions with the information they had. A blameless postmortem asks "what in the system allowed this to happen" rather than "who made the mistake".

**Structure:**
```markdown
## Incident: Payment service outage — 2026-04-15 14:32–16:18 UTC

### Impact
2,847 failed payment attempts. £143K in affected transactions
(all recovered via retry). 106 minutes total downtime.

### Timeline
14:32 — Deploy of payment-service v2.4.1 begins
14:35 — First payment failures detected (PagerDuty)
14:41 — On-call engineer paged, begins investigation
14:58 — Root cause identified: connection pool limit
15:03 — Rollback to v2.4.0 initiated
15:22 — Service recovered, payments processing normally
16:18 — All queued retries processed, incident closed

### Root cause
v2.4.1 added parallel payment verification that opened 4 DB
connections per request instead of 1. Under normal load (50 req/s),
this exceeded the Postgres max_connections limit of 100.

### Contributing factors
- No load testing between staging and production traffic levels
- Connection pool limit not monitored (no alert threshold set)
- Deploy happened without checking DB connection metrics

### Action items
- [ ] Add connection pool utilisation to deploy runbook checklist (owner: @lewis, due: 2026-04-22)
- [ ] Set PagerDuty alert on connection pool >80% (owner: @infra, due: 2026-04-19)
- [ ] Add load test to CI pipeline for services touching the payment DB (owner: @qa, due: 2026-05-01)
```

Action items with owners and due dates. Without these, the postmortem is an expensive diary entry.

## Explaining Tradeoffs Without Losing Precision

What non-technical stakeholders need is not a simplified version of your thinking. It is your actual thinking, framed in their terms.

**Wrong:** "We need to migrate from a monolith to microservices to improve scalability."

**Right:** "Right now, a single team change can accidentally slow down unrelated features. Splitting the payment and catalogue code into separate services means a catalogue deploy cannot affect payment performance. The tradeoff is six months of engineering time and ongoing operational complexity. The alternative is leaving the risk in place."

The second version:
- States the problem in terms the stakeholder cares about (payment reliability)
- States the cost in their terms (engineering time, months)
- Names the alternative and its risk

**For tradeoff decisions, structure your explanation as:**
1. What is the problem we are solving? (not the solution)
2. What are the two or three real options?
3. What does each option cost — in time, money, risk, complexity?
4. What is your recommendation and why?
5. What decision do you need from them?

The stakeholder cannot make a good decision without options. If you present only one option, you are asking for approval, not input.

## Writing Runbooks

A runbook is the operational guide for a production system: how to deploy, how to verify health, how to diagnose common failures, how to roll back.

**Write for the on-call engineer at 2am who has never touched this service.**

Include:
- What the service does in one sentence
- How to check if it is healthy (the exact command)
- The top 5 failure modes and how to diagnose each
- How to roll back a deployment
- Who to escalate to, and when

If the runbook is not tested, it is fiction. Rotate runbook walkthroughs into on-call practice.

## Code Review Communication

Code review is a communication exercise as much as a quality gate.

**As author:**
- Add a description that answers: what problem does this solve, what was the non-obvious decision, what should the reviewer focus on?
- Flag complex sections with inline comments — "this handles the race condition where X" — so the reviewer does not have to reconstruct your reasoning

**As reviewer:**
- Distinguish blocking issues from suggestions: "blocking: this will cause data loss under concurrent writes" vs "suggestion: this could be simplified"
- Explain why, not just what: "use a set here (O(1) lookup) instead of a list (O(n))" teaches; "change list to set" does not

## Connections

- [[cs-fundamentals/debugging-systems]] — postmortems close the debugging loop
- [[synthesis/engineering-tradeoffs]] — the tradeoffs you need to communicate
- [[synthesis/request-flow-anatomy]] — what to put in architecture diagrams and ADRs
- [[cs-fundamentals/code-review]] — review communication in practice
- [[qa/root-cause-analysis]] — systematic RCA that feeds postmortems

## Open Questions

- At what team size does a formal RFC process become worth the overhead vs informal Slack discussion?
- How do you write an ADR when the decision was made under time pressure with incomplete information? Do you reconstruct it honestly, or does that damage credibility?
