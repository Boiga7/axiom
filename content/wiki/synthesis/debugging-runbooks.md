---
type: synthesis
category: synthesis
para: resource
tags: [debugging, runbooks, troubleshooting, production, reference]
updated: 2026-05-03
tldr: Index of 32 production debugging runbooks organised by failure domain. Each runbook is a step-by-step guide for isolating and fixing a specific class of production failure.
---

# Debugging Runbooks

> **TL;DR** 32 step-by-step debugging runbooks organised by failure domain. Start with the category that matches your symptom, read the matching runbook, follow the isolation steps.

These runbooks complement [[cs-fundamentals/debugging-systems]], which covers the underlying methodology. Each runbook here is a concrete, opinionated procedure for a specific failure class.

---

## AI / LLM Issues

Problems specific to language model behaviour, RAG pipelines, and model quality.

- [[synthesis/debug-hallucination-in-production]] — Model returning confident but incorrect answers
- [[synthesis/debug-llm-high-latency]] — LLM API calls taking longer than expected
- [[synthesis/debug-prompt-injection-detected]] — Injection attempt confirmed or suspected in production
- [[synthesis/debug-rag-wrong-context]] — RAG pipeline retrieving irrelevant chunks
- [[synthesis/debug-rag-pipeline-slow]] — RAG retrieval or generation latency regression
- [[synthesis/debug-embedding-quality-degraded]] — Retrieval relevance dropped after a model or data change
- [[synthesis/debug-fine-tuned-model-worse]] — Fine-tuned model underperforming the base model

## Agent Issues

Failures in agentic loops and tool-calling systems.

- [[synthesis/debug-agent-loop-not-terminating]] — Agent loops indefinitely without reaching a final answer
- [[synthesis/debug-agent-not-using-tools]] — Agent ignores available tools and responds from context alone

## Database

Query, schema, and transaction failures.

- [[synthesis/debug-slow-query]] — Query latency spike in production database
- [[synthesis/debug-deadlock]] — Deadlock detected in transaction logs
- [[synthesis/debug-database-migration-failing]] — Alembic or schema migration failing on apply
- [[synthesis/debug-duplicate-writes]] — Duplicate rows appearing despite unique constraints

## Infrastructure / Cloud

Compute, container, and scaling failures.

- [[synthesis/debug-kubernetes-pod-not-starting]] — Pod stuck in CrashLoopBackOff or Pending
- [[synthesis/debug-scaling-not-triggering]] — HPA or autoscaler not adding capacity under load
- [[synthesis/debug-cloud-cost-spike]] — Unexpected billing increase in cloud account
- [[synthesis/debug-high-cpu]] — CPU usage at or above capacity, service degraded
- [[synthesis/debug-memory-leak]] — Memory usage growing without bound across restarts

## Network / Security

Connectivity, TLS, DNS, auth, and secrets failures.

- [[synthesis/debug-cors-error]] — Cross-origin requests blocked in browser
- [[synthesis/debug-ssl-certificate-error]] — TLS handshake failures or certificate errors
- [[synthesis/debug-dns-resolution-failing]] — Service unable to resolve internal or external hostnames
- [[synthesis/debug-auth-failing]] — Authentication or authorisation rejecting valid requests
- [[synthesis/debug-secret-leaked]] — Secret or credential exposed in logs, code, or a public location

## APIs / Services

Upstream dependencies and inter-service communication.

- [[synthesis/debug-api-timeout]] — External or internal API calls timing out
- [[synthesis/debug-websocket-dropping]] — WebSocket connections disconnecting unexpectedly
- [[synthesis/debug-error-rate-after-deploy]] — Error rate increased following a deployment

## Data / Cache

Stale or inconsistent data across layers.

- [[synthesis/debug-cache-inconsistency]] — Cache returning stale or incorrect data
- [[synthesis/debug-data-pipeline-failing]] — ETL or data pipeline job failing or producing bad output

## Observability

When the signals you rely on are missing or wrong.

- [[synthesis/debug-no-logs-in-production]] — Logs absent from expected destination after deployment
- [[synthesis/debug-alert-firing-incorrectly]] — Alert firing when system is healthy (or not firing when it is not)

## CI/CD

Build, test, and deployment pipeline failures.

- [[synthesis/debug-ci-pipeline-failing]] — CI pipeline failing after a change that should have passed
- [[synthesis/debug-flaky-test]] — Test passing and failing non-deterministically across runs

---

## How to use these runbooks

Each runbook follows the same structure:

1. **Symptom** — what you observe
2. **Immediate checks** — the first 2–3 things to look at before diving deeper
3. **Isolation steps** — narrow the failure domain systematically
4. **Common causes** — ranked by frequency
5. **Fix** — concrete commands or code changes
6. **Verify** — how to confirm the issue is resolved

For the underlying methodology — correlation IDs, distributed tracing, structured log reading, hypothesis-driven debugging — see [[cs-fundamentals/debugging-systems]].

---

## Connections

- [[cs-fundamentals/debugging-systems]] — methodology layer: how to think about debugging, not just what to do
- [[observability/tracing]] — OTel tracing that feeds the data used in many runbooks
- [[observability/platforms]] — Langfuse / Arize / LangSmith for AI-specific observability
- [[cloud/cloud-monitoring]] — CloudWatch, Prometheus, and Grafana for infrastructure signals
- [[cs-fundamentals/observability-se]] — structured logging and metrics for application-level signals

## Open Questions

- Which runbooks are missing from the set? Candidates: debug-rate-limiting, debug-model-context-overflow, debug-vector-store-index-corrupt.
- Should the AI/LLM runbooks be split into their own hub under `synthesis/ai-debugging/`?
