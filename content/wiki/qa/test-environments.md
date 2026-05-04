---
type: concept
category: qa
para: resource
tags: [test-environments, environment-parity, ephemeral-environments, feature-flags]
sources: []
updated: 2026-05-01
tldr: The environments through which code travels from developer laptop to production. Environment gaps cause bugs that only appear in certain stages.
---

# Test Environments

The environments through which code travels from developer laptop to production. Environment gaps cause bugs that only appear in certain stages. The goal is maximum parity between environments at minimum cost.

---

## Environment Tiers

```
local         Developer's machine. Fast iteration. No SLAs.
              Risk: "works on my machine" — config and service versions drift.

dev/ci        CI environment. Every PR. Automated tests run here.
              Should be closest to staging in config. Ephemeral where possible.

staging       Production mirror. Manual QA and integration testing.
              Same infrastructure class as prod, but scaled down.
              Shared between team — coordinate deployments.

production    Live. Real users. No testing except smoke/canary.
```

---

## Environment Parity (The Twelve-Factor Rule)

Gaps between environments cause bugs that are hard to reproduce. Common gaps:

| Gap | Effect |
|---|---|
| Different database versions | Query behaviour differs (SQL modes, function support) |
| Different OS/Python/Node versions | Library compatibility issues |
| Missing environment variables | App silently uses fallback defaults |
| No HTTPS in local | Cookie/security header bugs only in prod |
| Different DNS/service names | Service discovery works in prod, breaks in CI |
| Mocked third parties in CI | Real API rate limits, timeouts, and formats missed |

**Fix:** use Docker Compose locally and Testcontainers in CI to run real services.

---

## Ephemeral Environments

On-demand environments spun up per PR, torn down on merge. Enables QA to test each branch in isolation without sharing staging.

```yaml
# GitHub Actions — deploy ephemeral environment per PR
name: PR Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to ephemeral env
      run: |
        # Build and push Docker image
        docker build -t myregistry/myapp:pr-${{ github.event.number }} .
        docker push myregistry/myapp:pr-${{ github.event.number }}

        # Deploy to Kubernetes with PR-specific namespace
        kubectl create namespace pr-${{ github.event.number }} --dry-run=client -o yaml | kubectl apply -f -
        helm upgrade --install myapp-pr-${{ github.event.number }} ./helm/myapp \
          --namespace pr-${{ github.event.number }} \
          --set image.tag=pr-${{ github.event.number }} \
          --set ingress.host=pr-${{ github.event.number }}.myapp.dev

    - name: Comment PR with env URL
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `Preview environment: https://pr-${{ github.event.number }}.myapp.dev`
          })

  cleanup:
    runs-on: ubuntu-latest
    if: github.event.action == 'closed'
    steps:
    - name: Destroy ephemeral env
      run: kubectl delete namespace pr-${{ github.event.number }} --ignore-not-found
```

Tools: Vercel (automatic preview deploys), Railway, Render, Okteto, Namespace-per-PR pattern on Kubernetes.

---

## Feature Flags for Environment Segmentation

```python
# Use feature flags instead of environment-specific code paths
from functools import lru_cache
import boto3

@lru_cache(maxsize=1)
def get_flags():
    ssm = boto3.client('ssm')
    return {
        'new_checkout': ssm.get_parameter(Name='/myapp/flags/new_checkout')['Parameter']['Value'] == 'true',
        'ai_recommendations': ssm.get_parameter(Name='/myapp/flags/ai_recommendations')['Parameter']['Value'] == 'true',
    }

# In application code
if get_flags()['new_checkout']:
    return new_checkout_flow(cart)
else:
    return legacy_checkout_flow(cart)
```

Feature flag tools: LaunchDarkly, Unleash (self-hosted), AWS AppConfig, Flagsmith, PostHog.

---

## Environment Variables — Secrets Matrix

```
Variable           local           ci              staging         production
DATABASE_URL       sqlite / docker real postgres    RDS instance    RDS (prod)
STRIPE_KEY         test key        test key         test key        live key
OPENAI_API_KEY     dev key         test key         prod key        prod key
DEBUG              true            false            false           false
LOG_LEVEL          DEBUG           INFO             INFO            WARNING
```

Rule: never hardcode environment-specific values. Load from environment variables or Secrets Manager. Never let DEBUG=true reach production.

---

## Environment Health Checks

```python
# healthcheck.py — expose /health and /health/dependencies
from fastapi import FastAPI, HTTPException
import asyncpg, redis.asyncio as redis

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/health/dependencies")
async def dependencies():
    results = {}

    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute("SELECT 1")
        await conn.close()
        results["database"] = "ok"
    except Exception as e:
        results["database"] = f"error: {e}"

    try:
        r = await redis.from_url(REDIS_URL)
        await r.ping()
        results["redis"] = "ok"
    except Exception as e:
        results["redis"] = f"error: {e}"

    if any(v != "ok" for v in results.values()):
        raise HTTPException(status_code=503, detail=results)

    return results
```

---

## Common Failure Cases

**Ephemeral environment not torn down after PR closes, accumulating idle namespaces**
Why: the cleanup job in the workflow only runs on `pull_request` closed events, which are missed if the PR is merged rather than closed, or if a workflow run times out before the delete step.
Detect: `kubectl get namespaces | grep "^pr-"` in the cluster shows namespaces for PRs merged weeks ago.
Fix: add a scheduled nightly workflow that lists all `pr-*` namespaces, checks whether the PR is still open via the GitHub API, and deletes any namespace whose PR is closed or merged.

**Feature flag cache returns stale values after a flag change**
Why: `@lru_cache(maxsize=1)` caches the flag values for the lifetime of the process, so a flag toggled in SSM Parameter Store does not take effect until the service restarts.
Detect: a flag is changed in the console but the application behaviour does not change without a redeploy, or tests that toggle flags between test cases see the first value for all cases.
Fix: replace `lru_cache` with a TTL-based cache (e.g., `cachetools.TTLCache` with a 60-second TTL) or use a flag service with push notifications (LaunchDarkly streaming, Unleash client) that invalidates the local cache on change.

**Environment variable matrix has `DEBUG=true` reaching staging due to a misconfigured deploy script**
Why: a deploy script copies the `.env.local` file as a base and overrides only selected variables, so `DEBUG=true` from the developer's local config slips through to the staging environment.
Detect: the running staging app returns stack traces in API error responses or has verbose SQL logging enabled; check the deployed environment's `/health` or an admin endpoint that exposes the config.
Fix: treat every environment's variable set as fully explicit with no inheritance from local; validate in the CI deploy step that `DEBUG` is absent or false before promoting to staging or production.

**Testcontainers-based CI environment uses a different database collation than production**
Why: the Testcontainers Postgres image uses the default `C` locale, while production RDS uses `en_US.UTF-8`, causing string sort order and case-insensitive query results to differ.
Detect: a test passes in CI but fails in staging for queries that rely on ordering or case-insensitive matching; `SHOW lc_collate` returns different values between environments.
Fix: specify the locale explicitly in the Testcontainers setup (`withEnv("POSTGRES_INITDB_ARGS", "--locale=en_US.UTF-8")`) to match the production RDS configuration.

## Connections
[[qa-hub]] · [[qa/test-data-management]] · [[qa/agile-qa]] · [[qa/qa-in-devops]] · [[cloud/github-actions]] · [[cloud/kubernetes]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?
