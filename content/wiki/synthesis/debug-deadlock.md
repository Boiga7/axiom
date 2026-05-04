---
type: synthesis
category: synthesis
para: resource
tags: [debugging, deadlock, database, concurrency, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing DB or code deadlocks where requests hang indefinitely waiting for locks.
---

# Debug: Deadlock

**Symptom:** Requests hang indefinitely. DB raises deadlock errors. Transactions rolled back unexpectedly. Service unresponsive under concurrent load.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| DB logs show explicit deadlock errors | Two transactions acquiring locks in opposite order |
| Requests hang but no DB error | Application-level lock or async deadlock |
| Only happens under concurrent load | Race condition — single-threaded tests would not catch it |
| Specific endpoint always hangs | That endpoint's transaction locks rows another concurrent transaction needs |
| Hang resolves after timeout | Lock wait timeout set — DB is detecting and killing the loser |

---

## Likely Causes (ranked by frequency)

1. Two transactions acquiring the same rows in opposite order
2. Long-running transaction holding locks while doing slow work (API call, file write)
3. Application-level lock (mutex, semaphore) acquired but never released on exception path
4. ORM loading related objects inside a transaction, triggering additional locks
5. Async task awaiting a result that is itself waiting for the first task

---

## First Checks (fastest signal first)

- [ ] Check DB logs for deadlock errors — Postgres logs the exact transactions and rows involved
- [ ] Run `SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock'` — shows what is blocked and what holds the lock
- [ ] Check transaction scope — are transactions wrapping more than just DB operations?
- [ ] Check lock acquisition order across all code paths — do any two paths lock the same resources in reverse order?
- [ ] Check for async circular waits — task A awaits task B which awaits task A

**Signal example:** Order creation deadlocks under load — transaction 1 locks `users` then `orders`; transaction 2 locks `orders` then `users`; each waits for the other to release, neither proceeds.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| DB transaction isolation and locking | [[cs-fundamentals/database-transactions]] |
| Async deadlock in Python | [[python/nodejs-async]] |
| Concurrency primitives and race conditions | [[cs-fundamentals/concurrency]] |
| ORM generating unexpected lock queries | [[python/sqlalchemy]] |
| Distributed lock patterns | [[cs-fundamentals/distributed-systems]] |

---

## Fix Patterns

- Enforce consistent lock acquisition order — always lock resource A before resource B across all code paths
- Shorten transaction scope — commit before doing slow work, not after; never hold a DB lock during an HTTP call
- Use `SELECT ... FOR UPDATE SKIP LOCKED` for queue-like patterns — avoids contention on the same rows
- Set a lock timeout — `SET lock_timeout = '5s'` — fail fast rather than hang indefinitely
- Use optimistic locking for low-contention writes — check a version column instead of locking rows

---

## When This Is Not the Issue

If there are no DB lock errors and pg_stat_activity shows nothing blocked:

- The hang is not a DB deadlock — check application-level locks, thread pools, or async event loops
- Check connection pool exhaustion — all connections may be in use, not deadlocked

Pivot to [[synthesis/debug-api-timeout]] to check whether the hang is a timeout or pool exhaustion rather than a true deadlock.

---

## Connections

[[cs-fundamentals/database-transactions]] · [[cs-fundamentals/concurrency]] · [[cs-fundamentals/distributed-systems]] · [[python/sqlalchemy]] · [[synthesis/debug-api-timeout]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
