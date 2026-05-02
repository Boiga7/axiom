---
type: synthesis
category: synthesis
para: resource
tags: [debugging, data, pipeline, ingestion, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing silent data drops, stale outputs, or broken ingestion in data pipelines.
---

# Debug: Data Pipeline Failing

**Symptom:** Pipeline completes without error but output is wrong, stale, or missing records. Downstream data is incomplete. Dashboard shows old data.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Pipeline runs but output is stale | Incremental logic reading wrong watermark or checkpoint |
| Records missing from output | Silent filter or schema mismatch dropping rows |
| Pipeline errors only on specific records | Bad data in source — type mismatch, null in non-nullable field |
| Was working, broke after schema change | Source schema changed, pipeline not updated |
| Duplicate records in output | Missing deduplication, at-least-once delivery not handled |

---

## Likely Causes (ranked by frequency)

1. Schema change in source — new column, renamed field, type change silently drops rows
2. Watermark or checkpoint stale — incremental load re-processing old data or skipping new
3. Silent row filter — a `WHERE` clause or join condition dropping records without error
4. Null or type mismatch in a required field — rows rejected at load without surfacing
5. Upstream source not updated — pipeline ran but source had no new data

---

## First Checks (fastest signal first)

- [ ] Compare row counts at each stage — source vs transform vs load; where does the count drop?
- [ ] Check the last successful run timestamp — is the pipeline actually running on schedule?
- [ ] Check for schema changes in the source since the last successful run
- [ ] Check error logs for rejected rows — many pipelines silently drop bad rows without failing the job
- [ ] Verify the watermark or checkpoint value — is it advancing correctly after each run?

**Signal example:** Dashboard shows data from 3 days ago — pipeline logs show successful runs daily but row count is 0 each time; source added a NOT NULL column, pipeline INSERT is failing on every row and silently continuing.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Schema drift between source and pipeline | [[cs-fundamentals/data-validation]] |
| Watermark and incremental load logic | [[data/pipelines]] |
| Deduplication strategy | [[cs-fundamentals/distributed-systems]] |
| Monitoring pipeline health | [[observability/tracing]] |
| Cloud-native pipeline tooling | [[cloud/data-engineering-cloud]] |

---

## Fix Patterns

- Add row count assertions at each stage — fail loudly when counts drop unexpectedly
- Log rejected rows to a dead-letter location — never silently drop; always capture what was skipped and why
- Version and validate source schemas — fail the pipeline on unexpected schema change rather than producing wrong output
- Test incremental logic with a known dataset — verify the watermark advances correctly on each run
- Alert on zero-row outputs — a pipeline that produces nothing is more dangerous than one that fails

---

## When This Is Not the Issue

If row counts match at all stages but the output is still wrong:

- The transformation logic has a bug — data is flowing through but being transformed incorrectly
- Check join logic — a many-to-one join may be multiplying rows or losing them depending on join type

Pivot to [[cs-fundamentals/sql]] to validate the transformation query against a small known dataset before running at scale.

---

## Connections

[[data/pipelines]] · [[cs-fundamentals/data-validation]] · [[cs-fundamentals/sql]] · [[cloud/data-engineering-cloud]] · [[observability/tracing]]
