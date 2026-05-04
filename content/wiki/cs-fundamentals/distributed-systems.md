---
type: concept
category: cs-fundamentals
para: resource
tags: [distributed-systems, cap-theorem, consistency, consensus, fault-tolerance]
sources: []
updated: 2026-05-01
tldr: Systems where computation spans multiple machines connected by a network.
---

# Distributed Systems

Systems where computation spans multiple machines connected by a network. The fundamental challenge: networks fail, machines fail, and clocks disagree, yet users expect the system to behave coherently.

---

## CAP Theorem

A distributed data store can provide at most two of three guarantees simultaneously during a network partition:

- **C — Consistency:** Every read sees the most recent write (or an error)
- **A — Availability:** Every request receives a response (not necessarily the latest data)
- **P — Partition Tolerance:** The system continues operating despite dropped messages

Since network partitions are inevitable in real systems, you actually choose between C and A when a partition occurs.

| System | CAP choice | Example |
|---|---|---|
| Traditional RDBMS | CA (assumes no partition) | PostgreSQL single node |
| Cassandra, DynamoDB | AP — available, eventually consistent | Social media feeds |
| HBase, Zookeeper | CP — consistent, may reject requests | Financial transactions |
| MongoDB | Configurable (default CP) | Depends on write concern |

---

## Consistency Models

```
Strong consistency     — Every read returns the latest write. Slowest.
                         Achieved with single-leader replication + sync replicas.

Sequential consistency — Operations appear to happen in some total order.
                         Processes see the same order, not necessarily real-time.

Causal consistency     — Causally related operations seen in correct order.
                         "If A causes B, everyone sees A before B."

Eventual consistency   — If no new writes occur, all replicas converge eventually.
                         DynamoDB, Cassandra defaults. Fastest, most available.

Read-your-writes       — After writing, your subsequent reads see that write.
                         Sticky sessions or leader reads.
```

---

## Consensus Algorithms

Required when distributed nodes must agree on a value (who is leader, what order to apply operations).

**Raft** (used by etcd, Consul, CockroachDB):
- Elects one leader per term
- Leader accepts all writes, replicates to followers
- Commit only after majority (quorum) acknowledge
- Leader election on timeout (heartbeat missed)

**Paxos** (underlying theory; Raft is easier to implement):
- Two-phase: Prepare → Accept
- Guarantees agreement even with minority failures

**Practical use:** You rarely implement consensus directly. Use etcd or ZooKeeper for distributed coordination, or pick a database that implements it internally (CockroachDB, TiDB).

---

## Failure Modes

| Failure | Description | Effect |
|---|---|---|
| Crash stop | Node stops and never recovers | Simple to handle — node just disappears |
| Crash recovery | Node crashes but comes back | Must persist state, handle re-joining |
| Byzantine | Node sends arbitrary/malicious messages | Hardest — blockchain uses BFT consensus |
| Network partition | Two groups can't communicate | CAP theorem applies |
| Slow node | Responds eventually but slowly | Causes tail latency; timeout and hedge |
| Clock skew | Clocks disagree (up to 200ms in practice) | Ordering events by timestamp unreliable

> **→** [Request Flow Anatomy](/synthesis/request-flow-anatomy) — maps failure modes to the exact layer they occur in a live request chain. [Debugging Systems](/cs-fundamentals/debugging-systems) — how to trace a cascade failure using correlation IDs and distributed traces. |

---

## Idempotency

Operations that can be applied multiple times with the same result as applying once. Critical for retries.

```python
# Non-idempotent — duplicate request double-charges
def charge_card(amount: float) -> str:
    return stripe.charge(amount)  # returns new charge_id each time

# Idempotent — duplicate request returns same result
def charge_card(amount: float, idempotency_key: str) -> str:
    return stripe.charge(amount, idempotency_key=idempotency_key)
    # Stripe returns the same charge_id if key was used before

# Your own idempotency key store
def process_order(order_id: str) -> Result:
    existing = db.get_idempotency_record(order_id)
    if existing:
        return existing.result       # return cached result, don't re-process

    result = actually_process_order(order_id)
    db.save_idempotency_record(order_id, result)
    return result
```

---

## Distributed Tracing

Correlates requests across services using a trace context passed in HTTP headers.

```
Client → API Gateway → Order Service → Payment Service → Inventory Service
         traceId=abc   traceId=abc      traceId=abc       traceId=abc
         spanId=1       spanId=2         spanId=3          spanId=4
                        parentId=1       parentId=2        parentId=2

Timeline shows: total latency, which service is slow, where errors occurred
```

```python
# OpenTelemetry propagates trace context automatically when using instrumented HTTP clients
from opentelemetry.propagate import inject

def call_payment_service(order: Order) -> ChargeResult:
    headers = {}
    inject(headers)   # adds traceparent, tracestate headers
    response = httpx.post("http://payment-service/charge", json=order.dict(), headers=headers)
    return ChargeResult(**response.json())
```

---

## Back-pressure

Prevent fast producers from overwhelming slow consumers.

```python
# asyncio queue with bounded size — producer blocks when consumer is slow
import asyncio

queue = asyncio.Queue(maxsize=100)   # back-pressure: producer blocks at 100

async def producer():
    for item in source:
        await queue.put(item)        # blocks if queue is full

async def consumer():
    while True:
        item = await queue.get()
        await process(item)
        queue.task_done()
```

---

## Two-Phase Commit (2PC) vs Sagas

| | 2PC | Saga |
|---|---|---|
| Coordinator | Yes (blocks all participants) | No (choreographed or orchestrated) |
| Blocking | Yes — waits for all participants | No — async |
| Failure handling | Rollback all or commit all | Compensating transactions |
| Performance | Slow, locks resources | Fast, eventually consistent |
| Use when | Strong consistency required | High availability required |

---

## Common Failure Cases

**Split-brain during partition: two leaders accept writes**  
Why: the election timeout fires on a minority partition before it realises it can't form a quorum; both sides elect a leader.  
Detect: conflicting writes on the same key in two nodes; data divergence visible in replication lag metrics.  
Fix: require quorum acknowledgement before confirming any write; never commit without majority.

**Read-your-writes broken with load balancer routing reads to replica**  
Why: client writes to the leader, subsequent read is routed to a replica that hasn't yet received the replication.  
Detect: users report seeing stale data immediately after an update; the lag is consistent with replica lag (check `pg_stat_replication`).  
Fix: for session-critical reads, use sticky routing to the leader or pass a minimum LSN/version that the replica must have applied.

**Clock skew causes causally-incorrect event ordering**  
Why: two nodes disagree on wall clock time by more than the precision of the timestamps used for ordering events.  
Detect: log entries appear out of causal order; event A that triggered B shows a later timestamp than B.  
Fix: use logical clocks (Lamport timestamps, vector clocks) or hybrid logical clocks (HLC) for event ordering; never rely on wall clock for causality.

**Cascading timeout: one slow service stalls the whole chain**  
Why: Service A times out waiting for B; A's caller also times out waiting for A; the timeout propagates upstream without shedding load.  
Detect: p99 latency spikes on every service simultaneously; traces show a single slow span at the leaf of the call graph.  
Fix: implement circuit breakers at each service boundary; set timeouts shorter than the upstream's timeout; use bulkheads to isolate slow dependencies.

**Idempotency key collision causes duplicate processing**  
Why: idempotency keys are generated from non-unique inputs (e.g., timestamp-only) and two different requests share the same key.  
Detect: orders or charges processed twice; idempotency record exists for a key but with different payload than the current request.  
Fix: generate idempotency keys from a UUID or a hash of the full request content; validate payload matches on reuse.

## Connections
[[se-hub]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/database-design]] · [[cs-fundamentals/caching-strategies]] · [[cloud/aws-sqs-sns]] · [[cloud/service-mesh]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
