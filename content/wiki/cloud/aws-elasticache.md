---
type: concept
category: cloud
para: resource
tags: [elasticache, redis, memcached, aws, caching, pub-sub, session-store]
sources: []
updated: 2026-05-01
tldr: Managed Redis and Memcached in AWS. ElastiCache handles node provisioning, patching, failure detection, and replication. Use Redis for most workloads — richer data structures, persistence, pub/sub.
---

# AWS ElastiCache

Managed Redis and Memcached in AWS. ElastiCache handles node provisioning, patching, failure detection, and replication. Use Redis for most workloads. Richer data structures, persistence, pub/sub.

---

## Redis vs Memcached on ElastiCache

| | Redis | Memcached |
|---|---|---|
| Data structures | Strings, Hashes, Lists, Sets, Sorted Sets, Streams | Strings only |
| Persistence | RDB snapshots + AOF | None |
| Replication | Multi-AZ with auto-failover | No replication |
| Pub/Sub | Yes | No |
| Clustering | Redis Cluster (horizontal sharding) | Yes |
| Use case | Session store, cache, queues, leaderboards, rate limiting | Simple high-throughput cache |

**Default choice:** Redis. Memcached only when you need pure simplicity and maximum throughput with no durability.

---

## ElastiCache Redis — Terraform

```hcl
# infra/elasticache.tf
resource "aws_elasticache_subnet_group" "redis" {
  name       = "myapp-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name   = "myapp-redis"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "myapp-redis"
  description                = "MyApp Redis cluster"
  node_type                  = "cache.r7g.large"     # 13 GB RAM
  num_cache_clusters         = 2                     # primary + 1 replica
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true                  # TLS in transit
  auth_token                 = var.redis_auth_token  # Redis AUTH password
  automatic_failover_enabled = true
  multi_az_enabled           = true
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_window            = "03:00-04:00"
  snapshot_retention_limit   = 7

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
```

---

## Python — redis-py Connection

```python
# app/cache.py
import redis.asyncio as redis
import json
import os
from typing import Any, Optional

_redis_client: redis.Redis = None

def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.environ["REDIS_HOST"],
            port=6379,
            password=os.environ["REDIS_PASSWORD"],
            ssl=True,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
            max_connections=20,
        )
    return _redis_client

class Cache:
    def __init__(self):
        self.client = get_redis()

    async def get(self, key: str) -> Optional[Any]:
        value = await self.client.get(key)
        return json.loads(value) if value else None

    async def set(self, key: str, value: Any, ttl: int = 300):
        await self.client.setex(key, ttl, json.dumps(value))

    async def delete(self, key: str):
        await self.client.delete(key)

    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching a glob pattern (use sparingly — O(N))."""
        keys = await self.client.keys(pattern)
        if keys:
            await self.client.delete(*keys)
```

---

## Caching Patterns

```python
# Cache-aside with ElastiCache
cache = Cache()

async def get_product(product_id: str) -> dict:
    cache_key = f"product:{product_id}"

    # Try cache first
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Miss — load from DB
    product = await db.fetch_product(product_id)
    if product:
        await cache.set(cache_key, product, ttl=600)  # cache 10 minutes
    return product

# Rate limiting
async def check_rate_limit(user_id: str, limit: int = 100, window: int = 3600) -> bool:
    key = f"rate_limit:{user_id}"
    pipe = cache.client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    results = await pipe.execute()
    count = results[0]
    return count <= limit

# Session store
async def create_session(user_id: str, data: dict) -> str:
    import secrets
    session_id = secrets.token_urlsafe(32)
    await cache.set(f"session:{session_id}", {"user_id": user_id, **data}, ttl=86400)
    return session_id

async def get_session(session_id: str) -> Optional[dict]:
    return await cache.get(f"session:{session_id}")
```

---

## Pub/Sub for Real-Time Events

```python
# Publisher
async def publish_order_event(order_id: str, status: str):
    client = get_redis()
    await client.publish("order_events", json.dumps({
        "order_id": order_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
    }))

# Subscriber
async def subscribe_to_order_events():
    client = get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe("order_events")

    async for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            await handle_order_event(event)
```

---

## Monitoring and Alarms

```python
import boto3

cloudwatch = boto3.client("cloudwatch")

# Alarm: cache hits too low (caching is not effective)
cloudwatch.put_metric_alarm(
    AlarmName="ElastiCache-LowCacheHitRate",
    MetricName="CacheHits",
    Namespace="AWS/ElastiCache",
    Dimensions=[{"Name": "CacheClusterId", "Value": "myapp-redis-001"}],
    Statistic="Average",
    Period=300,
    EvaluationPeriods=3,
    Threshold=0.7,   # alert if hit rate < 70%
    ComparisonOperator="LessThanThreshold",
    AlarmActions=["arn:aws:sns:eu-west-1:123:ops-alerts"],
)
```

---

## Common Failure Cases

**Connection refused from application — security group not open**
Why: the Redis security group only allows inbound 6379 from specific sources, and the application's security group is not listed.
Detect: `redis.exceptions.ConnectionError: Error 111 connecting to <host>:6379. Connection refused.` in application logs.
Fix: add an inbound rule to the ElastiCache security group allowing TCP 6379 from the application's security group ID (not its IP).

**TLS handshake failure after enabling `transit_encryption_enabled`**
Why: the redis-py client is connecting without `ssl=True` after encryption was enabled on the cluster, or the wrong port is used (ElastiCache TLS uses 6379 not 6380 by default).
Detect: `ssl.SSLError: [SSL: WRONG_VERSION_NUMBER]` or `ConnectionRefusedError` after enabling TLS.
Fix: set `ssl=True` in the redis-py connection and ensure `REDIS_HOST` points to the primary endpoint, not an individual node endpoint.

**Cache stampede on cold start — all keys expired simultaneously**
Why: all cache keys were set with the same TTL (e.g., after a deploy flush or a bulk-load), so they expire at the same time and all requests hit the database at once.
Detect: CloudWatch `CacheHits` drops to zero while `DatabaseConnections` spikes; latency p99 spikes immediately after the TTL window.
Fix: add random jitter to TTLs (`ttl = base_ttl + random.randint(0, 30)`) so expirations are spread over time.

**`KEYS` pattern scan causes latency spikes in production**
Why: `KEYS *` or `KEYS pattern:*` blocks the Redis event loop for the duration of the scan — a single call on a large keyspace can freeze Redis for hundreds of milliseconds.
Detect: CloudWatch `EngineCPUUtilization` spikes coincide with latency spikes; `SLOWLOG GET` shows the KEYS command.
Fix: replace `KEYS` with `SCAN` (cursor-based, non-blocking) for all production pattern lookups; the `invalidate_pattern` helper in the code above is an example of this anti-pattern to fix.

## Connections
[[cloud-hub]] · [[cloud/aws-rds-aurora]] · [[cs-fundamentals/caching-strategies]] · [[cloud/serverless-patterns]] · [[cs-fundamentals/distributed-systems]] · [[cloud/finops-cost-management]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
