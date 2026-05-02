---
type: synthesis
category: synthesis
para: resource
tags: [data-engineering, data-quality, data-lineage, data-contracts, distributed-systems]
tldr: Data as a first-class system concern — lineage, contracts, freshness, ownership, and consistency across services. Most production bugs are data bugs, not code bugs.
updated: 2026-05-02
---

# Data as a System

Code is deterministic. Data is not. The same code running against different data produces different results. Most production incidents trace to data. Wrong values, stale records, missing fields, inconsistent state across services, schema drift. Treating data as a system rather than an implementation detail is what separates engineers who debug fast from those who find code bugs that were actually data bugs three hours later.

## Data Lineage

Lineage answers: where did this value come from, and what transformed it on the way?

```
Raw event (Kafka)
  → ETL pipeline (Spark/dbt)
    → Warehouse table (Snowflake/BigQuery)
      → Feature store
        → Model input
          → AI output
            → UI
```

When the AI output is wrong, lineage tells you which step introduced the error. Without lineage, you are looking at the output and guessing.

**In practice:**
- Tag every data record with its source and transform version
- Persist ETL job run metadata: which rows processed, which version of the pipeline, timestamp
- For AI systems: log the exact chunks retrieved, the query vector, and the model version used for every inference

Tools that provide lineage: dbt (SQL transforms), Apache Atlas, OpenLineage, Langfuse (for AI inference chains).

## Data Contracts

A data contract is an explicit agreement between a data producer and consumer on: schema (field names, types, nullability), semantics (what `status: "active"` means), freshness guarantees, and SLAs.

**Without contracts:** Service A adds a new nullable field. Service B starts failing with `KeyError` because it assumed the field always existed. Neither team catches it in review because there was no schema to review.

**With contracts:** Producer validates output against the contract before publishing. Consumer validates input. Mismatches fail loudly at the boundary, not silently in production three days later.

**Lightweight implementation:**
- JSON Schema or Pydantic models shared as a library between producer and consumer
- Schema registry (Confluent Schema Registry for Kafka, Buf for gRPC/Protobuf)
- Contract tests: consumer tests assert the producer's real API matches expectations; producer tests assert nothing in their API breaks consumer assertions

**For AI pipelines:**
- Document chunk schema: fields expected, max length, required metadata fields
- Model input schema: token budget, expected structure of the prompt
- Model output schema: what valid output looks like (for downstream parsing)

## Data Freshness

Freshness is the maximum age of data that is acceptable for a given use case.

| Use case | Acceptable staleness |
|---|---|
| Bank account balance | 0 seconds (real-time) |
| Search index | Minutes to hours |
| Analytics dashboard | Hours to days |
| RAG knowledge base | Days to weeks (topic-dependent) |
| Recommendation model | Hours (depends on user behaviour velocity) |

**Freshness SLAs:** Define explicitly. "The search index is updated within 15 minutes of a document change." If you cannot measure freshness, you cannot enforce the SLA.

**Stale RAG is a silent failure.** If the knowledge base is not refreshed after a product change, the model answers questions about the old product. The answer is grammatically correct, confidently stated, and factually wrong. There is no error — only user failure.

**Strategies:**
- Event-driven updates: trigger re-ingestion on change events rather than batch schedule
- Freshness metadata: embed `source_updated_at` in every chunk so the system (and the model) knows how old the knowledge is
- Stale-while-revalidate: serve the cached answer, trigger a background refresh, invalidate on next request

## Data Ownership

Ownership defines who is responsible for correctness, SLA, and schema evolution.

**Single writer principle:** One service owns each piece of data and is the only one that writes it. Other services read it or receive it via events. When two services can write the same record, you will eventually get conflicting writes.

**In microservices:** The Orders service owns order records. The Inventory service owns stock levels. If the checkout flow needs to update both, it coordinates via events — not by having checkout write directly to both databases.

**For AI:** Who owns the knowledge base? Who is responsible when it becomes stale or contains incorrect information? If this is not assigned, it will not be maintained.

## Data Consistency Across Services

When a single user action touches multiple services, consistency is hard.

**The dual write problem:** You write to the database, then publish an event to Kafka. Between the two writes, the process crashes. The DB is updated; the event is not published. Consumers never see the change.

**Solutions:**
- **Transactional outbox:** Write the event to an `outbox` table in the same DB transaction as the business data. A separate process reads the outbox and publishes to the queue. The DB transaction guarantees atomicity; the outbox guarantees eventual delivery.
- **CDC (Change Data Capture):** Capture changes from the DB WAL (write-ahead log) and publish them as events. Tools: Debezium, AWS DMS. The DB write is the single source of truth; the event stream is derived.
- **Saga pattern:** For multi-service transactions, model as a sequence of local transactions with compensating transactions on failure. Service A commits and publishes an event. Service B consumes and commits. If B fails, it publishes a compensating event that triggers Service A to undo.

## ETL Pipelines

ETL (Extract, Transform, Load) is the pattern for moving data between systems.

- **Extract:** Read from source (API, DB, file, event stream)
- **Transform:** Clean, normalise, join, aggregate
- **Load:** Write to destination (warehouse, feature store, vector DB)

**Common failure modes:**
- Source schema changes silently (a field is renamed, a column type changes)
- Transform logic breaks on edge cases in real data (nulls, encoding issues, unexpected values)
- Load fails halfway — destination has partial data that looks complete
- Pipeline runs out of memory on large datasets

**Idempotency:** Design pipelines to be safe to re-run. If a load fails at row 50,000 of 100,000, the next run should be able to start from the beginning without creating duplicates. Use upserts (`INSERT ... ON CONFLICT DO UPDATE`) or partition-level replacement.

## Data Quality as a Discipline

Data quality issues compound. A bad value in a source table propagates through every downstream transform that uses it.

**Four dimensions:**
1. **Completeness** — are required fields present?
2. **Accuracy** — does the value match reality?
3. **Consistency** — is the same entity represented the same way across tables?
4. **Timeliness** — is the data fresh enough to be useful?

**Validation at ingestion** is cheaper than debugging downstream. Assert ranges, types, and referential integrity at the point data enters your system. Tools: Great Expectations, dbt tests, Pydantic at API boundaries.

## Connections

- [[data/pipelines]] — concrete pipeline architecture and tooling
- [[rag/chunking]] — data quality upstream determines RAG quality downstream
- [[rag/pipeline]] — freshness and lineage in AI retrieval systems
- [[cs-fundamentals/distributed-systems]] — consistency models, CAP theorem
- [[cs-fundamentals/error-handling-patterns]] — outbox pattern, compensating transactions
- [[synthesis/request-flow-anatomy]] — where data moves through a live system
- [[synthesis/engineering-tradeoffs]] — consistency vs availability tradeoffs
- [[data/annotation-tooling]] — human-in-the-loop data quality for AI training

## Open Questions

- At what scale does a schema registry become necessary vs sharing Pydantic models directly?
- How do you enforce freshness SLAs for a RAG system where the knowledge base is updated by a third party?
- Is CDC always preferable to the dual write pattern, or are there cases where dual write is simpler and acceptable?
