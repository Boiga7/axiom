---
type: synthesis
category: synthesis
para: resource
tags: [debugging, deploy, error-rate, regression, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing a spike in errors or 5xx responses immediately after a deployment.
---

# Debug: High Error Rate After Deploy

**Symptom:** Error rate or 5xx responses spike immediately after a deployment. Was clean before. May affect all traffic or only a subset.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Errors on all endpoints immediately | App failing to start — bad config, missing env var, schema mismatch |
| Errors on specific endpoints only | Code change introduced a bug on that path |
| Errors spike then recover partially | Rolling deploy — some pods on new version, some on old |
| Errors only under load | New code has a performance regression or race condition |
| Errors start minutes after deploy | DB migration ran and broke a query or constraint |

---

## Likely Causes (ranked by frequency)

1. Missing or changed environment variable — app starts but crashes on first use
2. DB schema migration applied but old code still running during rollout
3. Code bug on a specific path introduced in this diff
4. Dependency version change with a breaking API
5. Config change not applied to all instances

---

## First Checks (fastest signal first)

- [ ] Check error logs immediately — what is the exception type and stack trace on the first failure?
- [ ] Confirm which endpoints are failing — is it all traffic or a specific path?
- [ ] Check whether all instances are on the new version — partial rollout can cause split behaviour
- [ ] Check for any DB migration that ran alongside this deploy — did it alter or drop a column?
- [ ] Diff the deploy — what changed? Config, dependencies, schema, code?

**Signal example:** 500s on all `/api/orders` requests immediately after deploy — logs show `KeyError: 'PAYMENT_SERVICE_URL'`; env var was renamed in the new code but not updated in the deployment config.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| App crashing on startup | [[cloud/kubernetes]] |
| DB migration breaking queries | [[cs-fundamentals/database-design]] |
| Rolling deploy split-brain behaviour | [[cloud/blue-green-deployment]] |
| Config and secrets not propagated | [[cloud/secrets-management]] |
| Tracing which code path is failing | [[observability/tracing]] |

---

## Fix Patterns

- Roll back immediately if error rate is above 5% and cause is unknown — diagnose on the previous version, not in production
- Check env vars and secrets first — fastest to verify, most common cause
- For DB migrations: run migrations before deploying code, not simultaneously — old code must tolerate new schema
- Use blue-green or canary deployment to limit blast radius — catch regressions at 5% traffic, not 100%
- Add a smoke test to the deploy pipeline — hit 3-5 critical endpoints after deploy before shifting traffic

---

## When This Is Not the Issue

If errors appeared before the deploy or the deploy timestamp does not correlate:

- This is not a regression — check for an upstream dependency failure or infrastructure event
- Check whether a scheduled job or cron ran at the same time
- Check whether a certificate or token expired coincidentally

Pivot to [[cs-fundamentals/debugging-systems]] for a systematic approach when the cause is not obvious from the deploy diff.

---

## Connections

[[cs-fundamentals/debugging-systems]] · [[cloud/blue-green-deployment]] · [[cs-fundamentals/database-design]] · [[observability/tracing]] · [[cloud/secrets-management]] · [[cloud/kubernetes]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
