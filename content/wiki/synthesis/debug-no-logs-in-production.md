---
type: synthesis
category: synthesis
para: resource
tags: [debugging, logs, observability, production, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing missing or incomplete logs in production when they work locally.
---

# Debug: No Logs in Production

**Symptom:** Logs visible locally or in staging but missing in production. Log platform shows nothing during a known incident. Errors happening but no trace.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| No logs at all from a service | Log shipper not running or misconfigured |
| Logs present in some environments, missing in prod | Log level set too high in prod — DEBUG suppressed |
| Logs exist but not searchable | Wrong index, wrong log group, or parsing failure |
| Logs appear then stop | Log shipper crashing or buffer full |
| Logs delayed by minutes | Buffering too aggressive — not flushing on error |

---

## Likely Causes (ranked by frequency)

1. Log level set to `ERROR` or `WARNING` in production — INFO and DEBUG suppressed
2. Log shipper (Fluent Bit, CloudWatch agent) not deployed or crashing silently
3. Application logging to stdout but container runtime not capturing it
4. Buffered logger not flushing on crash — last lines lost on unclean shutdown
5. Wrong log group or index — logs are there but you are looking in the wrong place

---

## First Checks (fastest signal first)

- [ ] Confirm the log level configured in production — `LOG_LEVEL` env var or config; is it suppressing expected messages?
- [ ] Check whether the log shipper is running — `kubectl get pods -n logging` or check CloudWatch agent status
- [ ] Check whether the application is logging to stdout — most container log collection only captures stdout/stderr
- [ ] Search a broader time range and log group — logs may exist but in an unexpected location
- [ ] Trigger a known log line manually — make a request that should produce a log and check if it appears

**Signal example:** No logs from a new service in production — service logs to a file at `/app/logs/app.log` instead of stdout; Fluent Bit is configured to collect stdout only; all logs are written to a file inside the container that is never exported.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Structured logging configuration | [[cs-fundamentals/logging-best-practices]] |
| CloudWatch log collection in ECS/EKS | [[cloud/aws-ecs]] |
| Fluent Bit and log pipeline | [[cloud/observability-stack]] |
| Observability instrumentation | [[observability/tracing]] |

---

## Fix Patterns

- Always log to stdout in containers — never to files; log shippers collect stdout by default
- Set log level per environment via env var — `LOG_LEVEL=INFO` in prod, `DEBUG` in dev; never hardcode
- Flush logs synchronously on shutdown — add a shutdown hook that flushes the log buffer before process exit
- Use structured JSON logging — enables filtering and parsing in log platforms without fragile regex
- Test log collection as part of deploy verification — trigger a known log line and confirm it appears in the log platform

---

## When This Is Not the Issue

If logs are present but do not contain the information you need:

- The code path in question may not have any logging — add it
- Correlation IDs may be missing — logs exist but you cannot trace a specific request through them

Pivot to [[cs-fundamentals/logging-best-practices]] to add structured logging with correlation IDs that make logs useful under pressure, not just present.

---

## Connections

[[cs-fundamentals/logging-best-practices]] · [[cloud/observability-stack]] · [[observability/tracing]] · [[cloud/aws-ecs]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
