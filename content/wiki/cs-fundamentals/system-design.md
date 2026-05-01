---
type: concept
category: cs-fundamentals
para: resource
tags: [system-design, scalability, load-balancing, caching, databases, microservices, cap-theorem, consistency]
tldr: How to design systems that scale — the vocabulary, tradeoffs, and building blocks used in every production architecture interview and real backend design conversation.
sources: []
updated: 2026-05-01
---

# System Design

> **TL;DR** How to design systems that scale — the vocabulary, tradeoffs, and building blocks used in every production architecture interview and real backend design conversation.

## Why System Design Matters for AI Engineers

Every ML system is a software system first. A model serving stack, an eval pipeline, a RAG API — all require the same scaling, caching, and consistency decisions as any backend. Understanding these principles lets you reason about where latency comes from, why costs scale, and what breaks under load.

---

## Scaling

### Vertical vs Horizontal

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Approach | Bigger machine | More machines |
| Cost | Expensive at high end | Linear with load |
| Failure mode | Single point of failure | Partial failures |
| Implementation | Change instance type | Add instances + load balancer |
| Limit | Hardware ceiling | Effectively unlimited |

**In practice:** start vertical (simpler), switch to horizontal when you hit the ceiling or need redundancy.

### Load Balancing

Distributes incoming requests across multiple servers. Sits in front of your application layer.

**Algorithms:**
- **Round robin** — cycle through servers sequentially. Simple, ignores load.
- **Least connections** — route to server with fewest active connections. Better for variable-length requests.
- **IP hash** — same client always routes to same server (sticky sessions). Required if session state lives on the server.
- **Weighted** — assign more traffic to beefier servers.

**Layer 4 vs Layer 7:**
- L4 (transport layer): routes on IP/port. Fast, no content inspection. AWS NLB.
- L7 (application layer): routes on URL, headers, cookies. Can do A/B testing, canary deployments. AWS ALB, Nginx.

---

## Caching

Store the result of expensive operations to avoid repeating them.

### Cache Strategies

**Cache-aside (lazy loading):** application checks cache, on miss fetches from DB and populates cache.

```python
def get_user(user_id):
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    redis.setex(f"user:{user_id}", 3600, json.dumps(user))  # 1-hour TTL
    return user
```

**Write-through:** write to cache and DB simultaneously. Cache is always consistent. Extra write latency.

**Write-behind (write-back):** write to cache only; DB updated asynchronously. Low write latency; risk of data loss on cache failure.

### What to Cache

- Database query results (most common)
- API responses to external services
- Rendered HTML / computed views
- Session tokens
- Expensive computation results (embeddings, similarity scores)

For AI: Anthropic's prompt caching (5-min TTL, 90% cost reduction for repeated system prompts) is an application of this same principle at the API level — see [[apis/anthropic-api]].

### Cache Invalidation

The hardest problem in CS. Options:
- **TTL (time-to-live):** simplest, tolerates brief staleness. Use for most cases.
- **Event-based invalidation:** write operations emit events that clear specific cache keys. Consistent but adds complexity.
- **Cache versioning:** include a version in the key (`user:v3:123`). Bump version on schema change.

**Cache stampede:** when a popular cached item expires, many requests hit the DB simultaneously. Fix with mutex locks or jitter on TTL.

---

## Databases

### Relational (SQL)

Tables with rows and typed columns. ACID guarantees. Strong consistency.

- **Use when:** data has clear relationships, you need joins, transactions, or strong consistency.
- **Examples:** PostgreSQL (default choice), MySQL, SQLite.
- **AI relevance:** pgvector extends PostgreSQL with vector similarity search — see [[infra/vector-stores]].

### NoSQL

Four main types with different tradeoffs:

| Type | Examples | Use when |
|---|---|---|
| Document | MongoDB, Firestore | Semi-structured data, flexible schema |
| Key-Value | Redis, DynamoDB | Fast lookups, caching, sessions |
| Wide-column | Cassandra, HBase | Write-heavy, time-series, massive scale |
| Graph | Neo4j | Highly connected data (social graphs, knowledge graphs) |

### Indexes

An index on a column stores a sorted copy to enable O(log n) lookup instead of O(n) table scan.

```sql
-- Without index: full table scan O(n)
SELECT * FROM users WHERE email = 'user@example.com';

-- With index: B-tree lookup O(log n)
CREATE INDEX idx_users_email ON users(email);
```

**Tradeoff:** indexes speed up reads but slow down writes (index must be updated on every insert/update/delete). Index columns you filter/sort on frequently; don't index everything.

### Database Replication

**Primary-replica (master-slave):** all writes go to primary; replicas handle reads. Eventual consistency between primary and replicas.

**Primary-primary:** both nodes accept writes. Conflict resolution needed. Rare.

**Use for:** read-heavy applications (most web apps are 80%+ reads), geographic distribution, high availability.

---

## CAP Theorem

A distributed system can guarantee at most two of:

- **Consistency (C):** every read gets the most recent write or an error.
- **Availability (A):** every request gets a (non-error) response (may be stale).
- **Partition tolerance (P):** system keeps operating despite network partitions.

**Network partitions always happen in real distributed systems**, so the real choice is CP vs AP:

| | CP (Consistent + Partition-tolerant) | AP (Available + Partition-tolerant) |
|---|---|---|
| Example | PostgreSQL, ZooKeeper, HBase | DynamoDB, Cassandra, CouchDB |
| On partition | Returns error | Returns potentially stale data |
| Use when | Financial transactions, inventory | Session data, DNS, social feeds |

**Practical implication:** if your AI app needs strong consistency (e.g., billing, user account state), use PostgreSQL. If it tolerates eventual consistency (session cache, feed ranking), NoSQL gives higher availability.

---

## Microservices vs Monolith

| | Monolith | Microservices |
|---|---|---|
| Deployment | Single unit | Independent services |
| Development speed | Fast initially | Slower (network calls, coordination) |
| Scaling | Scale everything | Scale individual services |
| Failure scope | Everything or nothing | Service isolation |
| Debugging | Easier (single process) | Harder (distributed tracing needed) |
| When to use | Early stage / small team | Large team / independent scaling needs |

**Default for new projects:** monolith. Extract to microservices when you have a clear scaling reason, not because "microservices are modern."

---

## API Design Patterns

### REST

Stateless, resource-oriented HTTP APIs. Standard for most web services.

```
GET    /users/{id}          — read
POST   /users               — create
PUT    /users/{id}          — replace
PATCH  /users/{id}          — partial update
DELETE /users/{id}          — delete
```

**Key principles:** stateless (no session on server), uniform interface (nouns not verbs in URLs), versioning via `/v1/`, standard HTTP status codes.

### Message Queues

Decouple producers from consumers. Producer puts a message on the queue; consumer reads it asynchronously.

```
Web server → [Queue: email_send] → Email worker
Web server → [Queue: image_resize] → Processing worker
```

- **Use when:** tasks are slow (email, transcoding), you need retry logic, or traffic is spiky.
- **Examples:** RabbitMQ, AWS SQS, Redis Streams.
- **AI relevance:** evaluation pipelines, batch inference jobs, async model calls all use queue patterns.

---

## Back-of-Envelope Estimates

Useful for checking if a design is feasible before building it.

**Key numbers:**
- Read from RAM: 100ns
- Read from SSD: 100µs (1,000× slower than RAM)
- Read from disk: 10ms (100,000× slower than RAM)
- Network round trip (same DC): 0.5ms
- Network round trip (cross-region): 150ms

**Storage estimates:**
- 1 char = 1 byte
- 1 int (32-bit) = 4 bytes
- 1 float (32-bit) = 4 bytes
- 1 embedding (1536 floats, OpenAI) = 6KB
- 1 million embeddings = 6GB

**Traffic:** 1,000 RPS is achievable with a single well-tuned server. 100,000 RPS requires horizontal scaling and caching.

---

## System Design Framework (for interviews and planning)

1. **Clarify requirements** — functional (what it does), non-functional (scale, latency, availability targets)
2. **Estimate scale** — daily/monthly users, read/write ratio, storage needed
3. **High-level design** — boxes and arrows: clients, load balancer, app servers, databases, caches
4. **Database schema** — key tables, indexes, relationships
5. **API design** — key endpoints and their request/response shape
6. **Dive deep** — pick one hard component and detail it (usually: the database, the cache, or the queue)
7. **Identify bottlenecks** — what breaks first at 10×, 100× load?

## Connections

- [[cs-fundamentals/networking]] — HTTP, DNS, TCP/IP are the transport layer under every API
- [[cs-fundamentals/sql]] — database fundamentals that back every architecture diagram
- [[infra/vector-stores]] — vector stores are specialised databases for AI workloads
- [[infra/caching]] — Redis semantic caching and Anthropic prompt caching
- [[infra/cloud-platforms]] — managed versions of all these components on AWS/GCP/Azure
- [[observability/tracing]] — distributed systems require tracing to understand what's happening
