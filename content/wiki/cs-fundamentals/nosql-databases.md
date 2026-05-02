---
type: concept
category: cs-fundamentals
tags: [nosql, mongodb, dynamodb, cassandra, redis, neo4j, databases, key-value, document, wide-column, graph]
sources: [raw/inbox/nosql-databases-websearch-2026-05-02.md]
updated: 2026-05-02
para: resource
tldr: NoSQL covers four distinct families (document, key-value, wide-column, graph) each with different consistency models and query trade-offs. PostgreSQL + Redis is the most common 2026 production stack; NoSQL wins when data shape is variable, write throughput is extreme, or relationship traversal dominates.
---

# NoSQL Databases

> **TL;DR** NoSQL covers four distinct families (document, key-value, wide-column, graph) each with different consistency and query trade-offs. PostgreSQL + Redis is the most common 2026 production stack; NoSQL wins when data shape is variable, write throughput is extreme, or relationship traversal dominates.

SQL vs NoSQL is not either/or — it is choosing the right tool. Most production systems use both. The vault covers relational databases in [[cs-fundamentals/sql]], [[cs-fundamentals/database-design]], and [[cs-fundamentals/database-transactions]]; this page covers the four NoSQL families.

---

## The Four Families

| Family | Database | Data Model | Query Model |
|---|---|---|---|
| **Document** | MongoDB, Firestore, Couchbase | JSON/BSON documents | Rich queries, aggregation pipeline |
| **Key-Value** | Redis, DynamoDB | Key → value/document | Point lookups + range scans |
| **Wide-Column** | Cassandra, ScyllaDB, HBase | Tables with dynamic columns | Partition key + clustering key |
| **Graph** | Neo4j, Amazon Neptune | Nodes + edges with properties | Cypher / Gremlin traversal |

---

## MongoDB

Document database. Stores data as flexible BSON documents (binary JSON). No rigid schema — a `laptop` document can have 40 fields while a `t-shirt` in the same collection has 8.

### When to Use

- Product catalogs where items have heterogeneous attributes
- CMS content where articles, videos, and podcasts have different metadata
- API response caching where upstream payload shape varies by provider
- Any schema that you expect to evolve frequently

### Key Concepts

**Collections → Documents → Fields.** No `ALTER TABLE` — add fields to documents without a migration.

**Indexing:** Create indexes before queries run at scale. Compound indexes cover multi-field queries. Text indexes for full-text search. `explain()` to verify index usage.

```python
from pymongo import MongoClient, ASCENDING, DESCENDING

client = MongoClient("mongodb://localhost:27017")
db = client["ecommerce"]
products = db["products"]

# Create compound index (category first for filter; price for sort)
products.create_index([("category", ASCENDING), ("price", DESCENDING)])

# Query — uses the compound index
results = products.find(
    {"category": "laptop", "price": {"$lt": 2000}},
    {"name": 1, "price": 1, "_id": 0}  # projection
).sort("price", DESCENDING).limit(10)
```

### Aggregation Pipeline

The `$match → $group → $project` pattern:

```python
pipeline = [
    {"$match": {"category": "laptop", "in_stock": True}},   # filter first — uses index
    {"$group": {
        "_id": "$brand",
        "avg_price": {"$avg": "$price"},
        "count": {"$sum": 1}
    }},
    {"$sort": {"avg_price": -1}},
    {"$limit": 10}
]

results = list(products.aggregate(pipeline))
```

Rules:
- `$match` as early as possible — the query planner hoists it to the top to leverage indexes
- Each stage can use up to 100MB RAM; add `allowDiskUse=True` for large aggregations
- `$vectorSearch` (MongoDB 8.0+) enables semantic search within the aggregation pipeline

---

## DynamoDB

AWS-managed serverless key-value/document store. Single-digit millisecond reads at any scale. Pricing by RCUs (read capacity units) and WCUs (write capacity units).

### When to Use

- AWS-native applications with known, stable access patterns
- High-scale session storage, shopping carts, event sourcing
- Simple key-value workloads where flexibility > query power

### Partition Key Design

Each partition delivers max **3,000 RCUs/s and 1,000 WCUs/s**. Partition key choice controls which node holds data.

**Hot partition problem:** If all `ORDER` items share the same PK value, all reads hit one partition. Avoid keys that concentrate similar entities.

```
Bad:  PK = "ORDER"          SK = "ORDER#2026-05-02#abc123"   # all orders → one partition
Good: PK = "USER#alice"     SK = "ORDER#2026-05-02#abc123"   # orders spread by user
```

### Single Table Design

Store multiple entity types in one table using composite keys. Identify access patterns before designing keys.

```
Entity: User      → PK: USER#<id>        SK: PROFILE
Entity: Order     → PK: USER#<id>        SK: ORDER#<date>#<order_id>
Entity: OrderItem → PK: ORDER#<order_id> SK: ITEM#<sku>
```

Query "all orders for user alice" → `PK = USER#alice, SK begins_with ORDER#`

### Global Secondary Indexes (GSIs)

A GSI creates a sidecar table with data rewritten for a secondary access pattern. Populated asynchronously (eventual consistency). GSIs have their own RCU/WCU provisioning.

```python
import boto3

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table("Orders")

# Query primary key
response = table.get_item(Key={"PK": "USER#alice", "SK": "ORDER#2026-05-01#ord123"})

# Query GSI — finds all orders with a given status
response = table.query(
    IndexName="StatusDateIndex",
    KeyConditionExpression="order_status = :s AND order_date > :d",
    ExpressionAttributeValues={":s": "PENDING", ":d": "2026-05-01"}
)
```

Project only needed attributes onto the GSI to minimise storage cost.

---

## Cassandra / ScyllaDB

Wide-column store. Designed for hundreds of thousands of writes per second across distributed clusters with no single point of failure. Multi-datacenter replication built in.

### When to Use

- IoT telemetry, time-series data (sensor readings, metrics)
- Event logs where you need high write throughput and simple queries
- Multi-datacenter deployments needing tunable consistency
- Write-heavy workloads that would create a bottleneck on a single primary

### When NOT to Use

- Complex ad-hoc queries (no joins, no aggregations without materialised views)
- ACID transactions across multiple partitions (use Postgres)
- Small-scale applications (operational complexity not worth it below ~millions of writes/day)

### Data Model

**Keyspace → Table → Row.** Rows identified by a **partition key** (which node) and optional **clustering key** (order within partition).

```sql
-- Cassandra Query Language (CQL)
CREATE TABLE sensor_readings (
    device_id   UUID,
    recorded_at TIMESTAMP,
    temperature FLOAT,
    humidity    FLOAT,
    PRIMARY KEY (device_id, recorded_at)   -- device_id = partition, recorded_at = clustering
) WITH CLUSTERING ORDER BY (recorded_at DESC);

-- Query: last 100 readings for device X (single-partition — fast)
SELECT * FROM sensor_readings WHERE device_id = ? LIMIT 100;
```

Wide-column: each row can have different column values. Efficient for sparse data.

**ScyllaDB** is a drop-in C++ reimplementation of Cassandra — 10x faster throughput per node. Preferred for new deployments where Cassandra compatibility is needed.

---

## Redis Data Structures

Redis is covered as a caching tool in [[infra/caching]]. This section covers its data structure capabilities beyond caching.

Redis stores data entirely in memory with optional persistence (RDB snapshots, AOF log). Sub-millisecond latency for all operations.

### Data Structures

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# HASH — field:value pairs; good for user sessions, object caching
r.hset("user:alice", mapping={"name": "Alice", "plan": "pro", "credits": "100"})
r.hincrby("user:alice", "credits", -10)  # atomic decrement

# SORTED SET — scored members with range queries
r.zadd("leaderboard", {"alice": 9850, "bob": 7200, "carol": 11000})
top3 = r.zrevrange("leaderboard", 0, 2, withscores=True)

# SET — unique members; deduplication, tags
r.sadd("active_sessions", "sess:abc", "sess:def")
r.sismember("active_sessions", "sess:abc")  # True

# LIST — ordered; queues, activity feeds
r.lpush("job_queue", "job:123")   # enqueue
r.brpop("job_queue", timeout=30)  # blocking dequeue

# STREAM — append-only event log
r.xadd("events", {"type": "order.placed", "user": "alice", "order": "ord123"})
entries = r.xrange("events", "-", "+", count=100)

# GEOSPATIAL — proximity queries
r.geoadd("stores", (longitude, latitude, "store:london-bridge"))
nearby = r.geosearch("stores", longitude=0.0, latitude=51.5, radius=5, unit="km")
```

### Redis as a Rate Limiter

```python
def is_rate_limited(user_id: str, limit: int, window_seconds: int) -> bool:
    key = f"rate:{user_id}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window_seconds)
    return current > limit
```

---

## Neo4j (Graph Databases)

Property graph model: **nodes** (entities), **edges** (relationships), and **properties** on both. Query language: **Cypher**.

### When to Use

- Social graphs: friends, followers, recommendations (friends-of-friends queries)
- Fraud detection: money flow graphs, circular transaction detection
- Knowledge graphs for AI RAG pipelines
- Identity/access management with complex permission hierarchies
- Any domain where "how things relate to each other" is the core query

### Cypher Examples

```cypher
-- Friends of friends (2 hops) that Alice is not already connected to
MATCH (alice:Person {name: 'Alice'})-[:FRIENDS_WITH*2]-(fof)
WHERE NOT (alice)-[:FRIENDS_WITH]-(fof) AND alice <> fof
RETURN DISTINCT fof.name, fof.city

-- Shortest path between two users
MATCH path = shortestPath((a:Person {name: 'Alice'})-[:KNOWS*]-(b:Person {name: 'Carol'}))
RETURN path

-- Find all paths in a fraud ring (circular transactions)
MATCH p = (a:Account)-[:TRANSFER*1..5]->(a)
WHERE ALL(r IN relationships(p) WHERE r.amount > 10000)
RETURN p LIMIT 10
```

### Python Driver

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))

with driver.session() as session:
    result = session.run(
        "MATCH (p:Person {name: $name})-[:FRIENDS_WITH]->(friend) RETURN friend.name",
        name="Alice"
    )
    friends = [record["friend.name"] for record in result]
```

---

## Decision Guide

| Scenario | Best Choice | Why |
|---|---|---|
| Variable-schema documents | MongoDB | Schema flexibility, rich queries |
| AWS serverless, stable access patterns | DynamoDB | Managed, cheap at scale, single-digit ms |
| Write-heavy time-series, multi-datacenter | Cassandra/ScyllaDB | Linear write scaling, no SPOF |
| Sub-ms caching, sessions, real-time | Redis | In-memory, rich data structures |
| Relationship traversal | Neo4j | Cypher makes graph queries natural |
| Existing Postgres, need vectors | pgvector | No extra service, SQL + vectors |
| Existing Postgres, need search | PostgreSQL full-text / Elasticsearch | |

**Default recommendation:** Start with PostgreSQL. Add Redis for caching and sessions. Reach for MongoDB when schema genuinely varies. Use DynamoDB only if you are already committed to AWS and have stable access patterns you can model up front.

---

## Key Facts

- MongoDB 8.0 adds `$vectorSearch` in aggregation pipelines for AI applications
- DynamoDB: 3,000 RCUs/s and 1,000 WCUs/s per partition — hot partition is the #1 design failure
- Cassandra: designed for 100k+ writes/second; no joins, no ad-hoc aggregation
- Redis: sub-1ms latency; Sorted Sets make leaderboards and rate limiting trivial
- Neo4j: Cypher's `*2` hop notation makes friend-of-friend queries a single line vs complex SQL self-joins
- PostgreSQL + Redis is the most common production stack in 2026

---

## Connections

- [[cs-fundamentals/sql]] — relational databases: the default choice before reaching for NoSQL
- [[cs-fundamentals/database-design]] — normalisation, indexes, schema patterns
- [[cs-fundamentals/database-transactions]] — ACID, isolation levels; contrast with NoSQL eventual consistency
- [[cs-fundamentals/caching-strategies]] — Redis cache-aside, TTL, stampede prevention
- [[infra/caching]] — Redis semantic and exact caching for LLM pipelines
- [[infra/vector-stores]] — pgvector, Qdrant, Weaviate — vector databases for RAG
- [[cloud/aws-elasticache]] — managed Redis on AWS
- [[cs-fundamentals/system-design]] — when NoSQL fits into larger system architecture

## Open Questions

- When does MongoDB Atlas Vector Search compete meaningfully with dedicated vector databases like Qdrant for RAG workloads?
- Is ScyllaDB now the default recommendation over Apache Cassandra for new deployments?
- How does DynamoDB's PartiQL support change the "no ad-hoc queries" constraint for teams familiar with SQL?
