---
type: synthesis
category: synthesis
para: resource
tags: [debugging, cpu, performance, profiling, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing a process with CPU pegged at 100% or consistently high under load.
---

# Debug: High CPU

**Symptom:** Process CPU pegged at 100%, service response times climbing, pod getting throttled or evicted. Worse under load.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| CPU spikes with request rate | CPU-bound request path — inefficient algorithm or serialisation |
| CPU high even at low traffic | Background task or infinite loop consuming cycles |
| CPU spikes then recovers | GC pressure — memory allocation causing frequent garbage collection |
| Only one core maxed | Single-threaded bottleneck — not parallelising across cores |
| Grows after a recent deploy | New code introduced inefficient path |

---

## Likely Causes (ranked by frequency)

1. Tight loop or inefficient algorithm on the hot request path
2. Excessive JSON serialisation/deserialisation at high throughput
3. GC pressure from high object allocation rate
4. Regex with catastrophic backtracking
5. Background task running without sleep or yield

---

## First Checks (fastest signal first)

- [ ] Check which process is consuming CPU — `top` or `kubectl top pod`; confirm it is your service, not a sidecar
- [ ] Check whether CPU correlates with request rate — if yes, the hot path is the issue; if no, a background task is
- [ ] Profile the process — Python: `py-spy top`; Node: `--prof`; Java: async-profiler
- [ ] Check GC logs — excessive GC pauses cause CPU spikes that look like application load
- [ ] Check for regex patterns on user input — test with a long string of near-matches for backtracking

**Signal example:** CPU pegged at 95% with only 10 req/s — profiler shows 80% of time in `json.dumps` on a response object that includes a full 10MB document; serialising the full document on every request.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Profiling Python processes | [[python/python-basics]] |
| Algorithmic complexity on hot path | [[cs-fundamentals/algorithms]] |
| GC pressure and memory allocation | [[synthesis/debug-memory-leak]] |
| Container CPU limits and throttling | [[cloud/kubernetes]] |
| Performance measurement methodology | [[cs-fundamentals/performance-optimisation-se]] |

---

## Fix Patterns

- Profile before optimising — never guess which function is hot; measure first
- Reduce serialisation on the hot path — compute once and cache, or reduce the payload size
- Move CPU-heavy work off the request thread — background queue or async task
- Fix catastrophic regex — use non-backtracking alternatives or input length limits
- Increase CPU limits or horizontal scale only after the algorithmic fix — scaling a slow algorithm is expensive

---

## When This Is Not the Issue

If CPU is high but profiling shows no single hot function:

- The system may be doing the right work but simply need more capacity — check whether load has genuinely grown
- Check for noisy neighbours on the host — another container may be competing for CPU on the same node

Pivot to [[cloud/finops-cost-management]] to evaluate whether right-sizing or autoscaling is the appropriate response once the algorithmic ceiling is confirmed.

---

## Connections

[[cs-fundamentals/performance-optimisation-se]] · [[cs-fundamentals/algorithms]] · [[cloud/kubernetes]] · [[synthesis/debug-memory-leak]] · [[python/python-basics]]
