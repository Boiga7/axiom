---
type: synthesis
category: synthesis
para: resource
tags: [debugging, database, migration, schema, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing DB migrations that stall, lock tables, or break running services.
---

# Debug: Database Migration Failing

**Symptom:** Migration stalls indefinitely, times out, or causes downtime. Service returns errors during migration. Migration completes but breaks queries.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Migration stalls indefinitely | Lock wait — a long-running transaction holds a lock the migration needs |
| Migration fails mid-run | Non-transactional operation failed partway through |
| Service errors during migration | Old code incompatible with new schema before all instances updated |
| Migration completes but queries break | Column renamed or dropped that existing code still references |
| Passes in staging, fails in prod | Prod data volume makes the migration too slow; staging table is small |

---

## Likely Causes (ranked by frequency)

1. Existing transactions holding locks — migration cannot acquire the lock it needs to ALTER TABLE
2. `ADD COLUMN NOT NULL` without a default on a large table — rewrites entire table
3. Migration not backward-compatible — deployed before old code was drained
4. Non-concurrent index creation locking the table
5. Migration not wrapped in a transaction — partial failure leaves schema in inconsistent state

---

## First Checks (fastest signal first)

- [ ] Check `pg_stat_activity` for blocking locks — `SELECT pid, query, wait_event FROM pg_stat_activity WHERE wait_event_type = 'Lock'`
- [ ] Confirm whether the migration is transactional — if it fails partway, will it roll back cleanly?
- [ ] Check table size in production — a migration safe on 10k rows may take hours on 100M rows
- [ ] Confirm the migration is backward-compatible — can the current running code work with both old and new schema?
- [ ] Check whether indexes are created with `CONCURRENTLY` — standard `CREATE INDEX` locks the table

**Signal example:** Migration to add NOT NULL column stalls for 20 minutes — pg_stat_activity shows it waiting on a lock held by a long-running analytics query started 25 minutes ago.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Lock contention during migration | [[cs-fundamentals/database-transactions]] |
| Safe migration patterns for large tables | [[cs-fundamentals/database-design]] |
| Zero-downtime deployment strategy | [[cloud/blue-green-deployment]] |
| Schema change backward compatibility | [[cs-fundamentals/api-versioning]] |

---

## Fix Patterns

- Always add columns as nullable first, backfill, then add NOT NULL constraint — never `ADD COLUMN NOT NULL` on a large table in one step
- Create indexes `CONCURRENTLY` — avoids table lock; takes longer but does not block reads or writes
- Set a `lock_timeout` before running the migration — fail fast rather than wait indefinitely for a lock
- Deploy migrations before code, not simultaneously — old code must tolerate the new schema
- Test migration duration on a production-sized dataset in staging — row count is the key variable

---

## When This Is Not the Issue

If the migration completes quickly but the service is broken after:

- The schema change is incompatible with the running code — check whether any query references a column that was renamed or dropped
- Run the migration in a transaction with a `ROLLBACK` first to preview its effect without committing

Pivot to [[synthesis/debug-error-rate-after-deploy]] to diagnose service errors that appear after the migration completes.

---

## Connections

[[cs-fundamentals/database-transactions]] · [[cs-fundamentals/database-design]] · [[cloud/blue-green-deployment]] · [[synthesis/debug-error-rate-after-deploy]]
