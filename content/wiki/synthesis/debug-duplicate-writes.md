---
type: synthesis
category: synthesis
para: resource
tags: [debugging, retries, idempotency, duplicate-writes, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing duplicate records or side effects caused by retries or at-least-once delivery.
---

# Debug: Duplicate Writes from Retries

**Symptom:** Duplicate records in the database, duplicate emails sent, duplicate charges, or duplicate events in a queue — after a retry or network hiccup.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Duplicates appear after deploys or restarts | In-flight requests retried on reconnect |
| Duplicates tied to specific high-latency windows | Client retrying a request that succeeded but timed out |
| Duplicates from queue consumers | Consumer processing the same message twice |
| Duplicates only on one endpoint | That handler is not idempotent |

---

## Likely Causes (ranked by frequency)

1. Client retries a request that already succeeded but returned a timeout
2. Queue consumer receives the same message twice (at-least-once delivery)
3. No idempotency key — handler has no way to detect a duplicate
4. Saga or workflow retried mid-step without checking prior state
5. Dual writes to two systems with no coordination

---

## First Checks (fastest signal first)

- [ ] Confirm duplicate timestamps — are they within the retry window of each other?
- [ ] Check whether an idempotency key is sent on the original request and retries
- [ ] Check queue consumer logs — is the same message ID processed more than once?
- [ ] Confirm whether the write endpoint is idempotent — does calling it twice produce one result or two?
- [ ] Check distributed transaction logs — did a saga step retry without verifying prior completion?

**Signal example:** Two identical orders created 800ms apart, both with the same cart ID — client timed out at 500ms, retried, and the original request completed in the background.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| No idempotency key on the request | [[cs-fundamentals/api-design]] |
| Queue delivering messages more than once | [[cs-fundamentals/message-queues]] |
| Retry logic not checking prior state | [[cs-fundamentals/error-handling-patterns]] |
| Saga retrying mid-step | [[cs-fundamentals/cqrs-event-sourcing]] |
| Distributed write coordination | [[cs-fundamentals/distributed-systems]] |

---

## Fix Patterns

- Add idempotency key on every mutating request — store processed keys with a TTL of at least the retry window
- Make the handler check-then-write — query for existing record before inserting, not after
- Use upsert instead of insert where the uniqueness constraint is clear
- Add a unique constraint at the DB level — let the database be the last line of defence
- For queues: record message ID on first processing; skip if already seen

---

## When This Is Not the Issue

If idempotency keys are present and unique constraints exist but duplicates still appear:

- Duplicates are not from retries — check for a bug in the application logic creating two writes intentionally
- Two separate code paths may both be triggering the same write
- Check event bus subscriptions — two consumers may both be handling the same event type

Pivot to [[cs-fundamentals/event-driven-architecture]] to trace whether multiple consumers are acting on the same event.

---

## Connections

[[cs-fundamentals/error-handling-patterns]] · [[cs-fundamentals/message-queues]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/cqrs-event-sourcing]] · [[cs-fundamentals/api-design]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
