---
type: synthesis
category: synthesis
para: resource
tags: [debugging, memory, leak, performance, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing process memory that climbs over time and never releases.
---

# Debug: Memory Leak

**Symptom:** Process memory grows steadily over time and never drops. Eventually OOM killed or degraded. Restarts fix it temporarily.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Memory grows with request count, plateaus | Request-scoped cache or connection not released |
| Memory grows continuously regardless of traffic | Background task accumulating objects |
| Memory spikes on specific endpoints | Large payload loaded fully into memory |
| Grows only in production, not locally | Production data size or traffic pattern difference |
| Grows after a recent deploy | New code introduced the leak |

---

## Likely Causes (ranked by frequency)

1. Unbounded in-memory cache — keys added, never evicted
2. Event listeners or callbacks registered but never removed
3. Background thread or task accumulating results without flushing
4. Large objects held in a global or class-level variable
5. DB connections or file handles opened but not closed

---

## First Checks (fastest signal first)

- [ ] Confirm memory grows monotonically — take a heap snapshot, wait, take another; compare object counts
- [ ] Check whether a restart resets memory to baseline — confirms leak vs expected high usage
- [ ] Identify which deploy introduced the growth — `git log` + memory graph timestamp
- [ ] Check for unbounded dicts, lists, or caches at module or class level
- [ ] Check that DB connections, file handles, and HTTP clients are closed or used as context managers

**Signal example:** Memory grows 50MB per hour regardless of traffic — heap snapshot shows a global `results` list accumulating LLM response objects from a background polling task that appends but never clears.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Unbounded cache or accumulating collection | [[python/python-basics]] |
| Async tasks holding references | [[python/nodejs-async]] |
| DB connections not released | [[python/sqlalchemy]] |
| OS-level memory and process inspection | [[cs-fundamentals/linux-fundamentals]] |
| Container OOM kill in Kubernetes | [[cloud/kubernetes]] |

---

## Fix Patterns

- Add a max size to every in-memory cache — use `lru_cache` with `maxsize` or a TTL cache, never an unbounded dict
- Use context managers for all resources — `with` blocks guarantee release even on exception
- Clear or flush background task accumulators on a schedule — do not let them grow unbounded
- Profile with `tracemalloc` (Python) or heap snapshots (Node) to confirm the leak source before fixing
- Set memory limits on containers — forces OOM kill rather than silent degradation across the whole host

---

## When This Is Not the Issue

If memory is high but stable (not growing):

- This is not a leak — it is high baseline usage
- Check whether the process is caching aggressively by design
- Check whether the data set loaded at startup is larger than expected

Pivot to [[cs-fundamentals/os-internals]] to understand whether the OS is reclaiming memory correctly and whether RSS vs heap is the right metric to watch.

---

## Connections

[[cs-fundamentals/os-internals]] · [[cs-fundamentals/performance-optimisation-se]] · [[cs-fundamentals/linux-fundamentals]] · [[python/python-basics]] · [[cloud/kubernetes]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
