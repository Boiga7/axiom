---
type: concept
category: cloud
para: resource
tags: [multi-tenancy, saas, tenant-isolation, data-partitioning, billing, rbac]
sources: []
updated: 2026-05-01
tldr: Serving multiple customers from shared infrastructure.
---

# Multi-Tenancy Patterns

Serving multiple customers from shared infrastructure. The central challenge is isolation: tenants must not see each other's data, exhaust each other's resources, or interfere with each other's experience.

---

## Tenancy Models

| Model | Isolation Level | Cost | Complexity | When |
|---|---|---|---|---|
| Silo (one stack per tenant) | Maximum | High | Low | Enterprise with strict compliance |
| Pool (shared everything) | Minimum | Low | High | SMB SaaS, tight budgets |
| Bridge (shared app, separate DB) | Medium | Medium | Medium | Most common — balance cost and isolation |
| Namespace (shared DB, row-level) | Minimum | Lowest | Medium | Simple products, small teams |

---

## Row-Level Security (RLS) in PostgreSQL

```sql
-- Enable RLS on every tenant-scoped table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;  -- applies to table owner too

-- Policy: tenant can only see their own rows
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- App sets tenant on every connection
-- In SQLAlchemy:
CREATE OR REPLACE FUNCTION set_tenant(tenant_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.tenant_id', tenant_id::text, true);  -- true = session-local
END;
$$ LANGUAGE plpgsql;
```

```python
# SQLAlchemy — set tenant on every request
from sqlalchemy import event

@event.listens_for(engine, "connect")
def connect(dbapi_connection, connection_record):
    pass

@contextmanager
def tenant_session(tenant_id: str):
    with Session(engine) as session:
        session.execute(text("SELECT set_tenant(:tid)"), {"tid": tenant_id})
        yield session
        session.rollback()  # never commit outside business logic

# FastAPI middleware — extract tenant from JWT claim
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    claims = decode_jwt(token)
    request.state.tenant_id = claims.get("tenant_id")
    return await call_next(request)
```

---

## Database Per Tenant (Bridge Model)

```python
# tenant_router.py — route queries to the right database
from functools import lru_cache
import asyncpg

TENANT_CONNECTIONS = {}

@lru_cache(maxsize=100)
def get_tenant_dsn(tenant_id: str) -> str:
    # Look up tenant DB in a central registry
    registry = get_registry_db()
    tenant = registry.fetchrow("SELECT db_url FROM tenants WHERE id = $1", tenant_id)
    return tenant["db_url"]

async def get_tenant_pool(tenant_id: str) -> asyncpg.Pool:
    if tenant_id not in TENANT_CONNECTIONS:
        TENANT_CONNECTIONS[tenant_id] = await asyncpg.create_pool(
            get_tenant_dsn(tenant_id),
            min_size=2, max_size=10,
        )
    return TENANT_CONNECTIONS[tenant_id]

# Provision a new tenant
async def provision_tenant(tenant_id: str, plan: str):
    # 1. Create schema in pool DB, or
    # 2. Spin up new RDS instance for enterprise tenants
    db_url = await create_tenant_database(tenant_id, plan)
    await run_migrations(db_url)  # Alembic against tenant DB
    await register_tenant(tenant_id, db_url)
```

---

## Kubernetes Namespace Isolation

```yaml
# One namespace per enterprise tenant
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    tenant: acme-corp
    tier: enterprise

---
# ResourceQuota — prevent one tenant from exhausting cluster
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme-corp
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"

---
# NetworkPolicy — tenant pods cannot talk to other tenant namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: acme-corp
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: acme-corp
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system  # allow DNS
```

---

## Rate Limiting Per Tenant

```python
# Redis-based rate limiting — per tenant, per endpoint
import redis.asyncio as redis
from fastapi import Request, HTTPException

async def rate_limit(request: Request, limit: int, window: int = 60):
    tenant_id = request.state.tenant_id
    endpoint = request.url.path
    key = f"rate:{tenant_id}:{endpoint}"

    client = get_redis()
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    results = await pipe.execute()
    count = results[0]

    if count > limit:
        raise HTTPException(status_code=429,
                           detail=f"Rate limit {limit}/{window}s exceeded")

# Per-plan limits
PLAN_LIMITS = {
    "free": 100,
    "starter": 1000,
    "professional": 10_000,
    "enterprise": 100_000,
}

async def enforce_plan_limits(request: Request, db):
    tenant = await get_tenant(request.state.tenant_id, db)
    limit = PLAN_LIMITS[tenant.plan]
    await rate_limit(request, limit=limit, window=3600)
```

---

## Tenant Onboarding Automation

```python
import asyncio
from dataclasses import dataclass

@dataclass
class TenantProvisionResult:
    tenant_id: str
    db_url: str
    namespace: str
    status: str

async def provision_tenant_full(org_name: str, plan: str, admin_email: str) -> TenantProvisionResult:
    tenant_id = generate_tenant_id(org_name)

    # Parallel provisioning steps
    db_task = asyncio.create_task(provision_database(tenant_id, plan))
    k8s_task = asyncio.create_task(create_k8s_namespace(tenant_id))
    dns_task = asyncio.create_task(configure_subdomain(tenant_id, org_name))

    db_url, namespace, _ = await asyncio.gather(db_task, k8s_task, dns_task)

    # Sequential steps that depend on above
    await run_migrations(db_url)
    await create_admin_user(db_url, admin_email)
    await send_welcome_email(admin_email, tenant_id)

    return TenantProvisionResult(
        tenant_id=tenant_id, db_url=db_url,
        namespace=namespace, status="active"
    )
```

---

## Common Failure Cases

**Row-level security bypassed because `app.tenant_id` is not set on a connection from the pool**
Why: a connection was reused from the pool after a previous request without re-executing `set_tenant()`, so the session-local setting carries over from the prior tenant.
Detect: intermittent data leakage reports where one tenant sees rows belonging to another; `SELECT current_setting('app.tenant_id')` on a pooled connection returns a stale value.
Fix: call `set_tenant()` at the start of every request inside the session context manager, not just on new connections; set `pool_pre_ping=True` in SQLAlchemy to discard stale connections.

**Tenant provisioning partially succeeds and leaves orphaned resources**
Why: `asyncio.gather` in `provision_tenant_full` has no rollback logic; if `provision_database` succeeds but `create_k8s_namespace` raises, the tenant is in the registry with a DB but no namespace.
Detect: newly provisioned tenants report errors accessing the platform; checking the registry shows the tenant's `status` is not `active` but a DB exists.
Fix: implement a saga with compensating transactions — on failure, delete the successfully created resources before raising; use an idempotent `status` field (`pending`, `active`, `failed`) so partial states can be retried.

**ResourceQuota blocks legitimate workloads when a tenant exhausts their namespace quota**
Why: a single noisy tenant runs a batch job that consumes all pods or CPU in the namespace, blocking other workloads including the operator that manages the tenant's infrastructure.
Detect: `kubectl describe resourcequota -n tenant-<name>` shows the namespace at 100% of `pods` or `requests.cpu`; new pods are stuck `Pending`.
Fix: separate workload quotas by priority class within the namespace, and set LimitRange defaults so containers that omit `resources` get sensible defaults rather than consuming unlimited quota.

**Redis rate limit key persists across tenant ID reuse**
Why: if a tenant account is deleted and the same `tenant_id` UUID is reused for a new tenant, the rate limit counters from the old tenant are still live in Redis under the same key, giving the new tenant a polluted starting count.
Detect: a newly created tenant immediately hits rate limits on first use; checking Redis shows non-zero counter values for the new tenant's ID.
Fix: never reuse tenant IDs; generate UUIDs v4 (essentially impossible to collide); also set Redis key TTLs to expire naturally within the rate limit window.

## Connections
[[cloud-hub]] · [[cloud/kubernetes-operators]] · [[cloud/aws-rds-aurora]] · [[cs-fundamentals/auth-patterns]] · [[cs-fundamentals/database-design]] · [[cloud/finops-cost-management]]
