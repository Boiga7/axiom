---
type: concept
category: cloud
para: resource
tags: [aws, analytics, athena, emr, glue, kinesis, opensearch, quicksight, redshift, clf-c02, saa-c03]
tldr: "AWS analytics services decision guide — Athena (serverless SQL on S3), EMR (managed Spark), Glue (serverless ETL), Kinesis (real-time streaming), OpenSearch (log search), QuickSight (BI), Redshift (data warehouse)."
sources: []
updated: 2026-05-06
---

# AWS Analytics Services

> **TL;DR** AWS analytics services decision guide — Athena (serverless SQL on S3), EMR (managed Spark), Glue (serverless ETL), Kinesis (real-time streaming), OpenSearch (log search), QuickSight (BI), Redshift (data warehouse).

CLF-C02 and SAA-C03 exam questions require selecting the correct analytics service. The differentiator is almost always: real-time vs batch, serverless vs managed cluster, ad-hoc vs repeated queries.

---

## Services at a Glance

| Service | What it is | Key differentiator |
|---|---|---|
| Amazon Athena | Serverless SQL on S3 | No infrastructure, pay per query |
| Amazon EMR | Managed Spark/Hadoop cluster | Custom code, petabyte scale |
| AWS Glue | Serverless ETL + Data Catalog | Schema discovery, no cluster |
| Amazon Kinesis | Real-time streaming | Sub-second processing, ordered |
| Amazon OpenSearch | Log analytics + full-text search | Elasticsearch successor |
| Amazon QuickSight | Serverless BI dashboards | Business users, SPICE engine |
| Amazon Redshift | Columnar data warehouse | Fast repeated structured queries |

---

## Amazon Athena

Serverless interactive SQL query service for data in S3.

- Query CSV, JSON, Parquet, ORC directly in S3 — no ETL required
- Pay per TB of data scanned (Parquet/ORC columnar formats reduce cost by 60–90%)
- Powered by Presto; standard SQL syntax
- Athena results cached; same query within 24h is free if data unchanged

**Exam trigger:** "ad-hoc queries on S3", "serverless SQL", "analyse log files", "no infrastructure to manage"

**vs Redshift:** Athena = occasional ad-hoc queries on S3 without a cluster. Redshift = frequent BI queries on structured data where speed matters.

---

## Amazon EMR (Elastic MapReduce)

Managed big-data cluster running Apache Spark, Hadoop, Hive, or Presto.

- Launch a cluster of EC2 instances running open-source frameworks
- EMR Serverless: no cluster management; auto-scales workers per job
- Use Spot Instances for worker nodes (up to 90% cost savings)
- Best for complex transforms, ML pipelines, custom Spark code at petabyte scale

**Exam trigger:** "existing Spark code", "Hadoop jobs", "petabyte ETL with custom logic", "bring your own Spark"

**vs Glue:** EMR = full cluster control, any Spark code; Glue = simpler managed ETL without managing a cluster.

---

## AWS Glue

Fully managed serverless ETL and data catalogue.

- **Glue Data Catalog:** central metadata store; integrates with Athena, Redshift Spectrum, EMR
- **Glue Crawlers:** automatically discover schema from S3, RDS, DynamoDB, JDBC sources
- **Glue ETL jobs:** write PySpark or Python code; runs serverless
- **Glue DataBrew:** visual, no-code data preparation

**Exam trigger:** "serverless ETL", "catalogue data automatically", "discover schema", "prepare data for Athena/Redshift"

**vs EMR:** Glue = managed, no cluster decisions; EMR = custom Spark with full control.

---

## Amazon Kinesis

Real-time data streaming. Four distinct services:

| Service | What it does | Latency | Key trait |
|---|---|---|---|
| **Kinesis Data Streams** | Real-time ordered stream, custom consumers | ~200ms | Replay up to 7 days |
| **Kinesis Data Firehose** | Load stream to S3/Redshift/OpenSearch | 60–900s | No custom processing |
| **Kinesis Data Analytics** | SQL queries on live streams | Seconds | Apache Flink |
| **Kinesis Video Streams** | Ingest and store video | — | ML on video |

**Exam trigger:** "real-time", "streaming", "process data as it arrives", "clickstream", "IoT telemetry"

**vs SQS:** Kinesis = ordered streaming with replay, multiple consumers; SQS = queue for task decoupling with at-least-once delivery. Kinesis Firehose is load-only — it cannot run custom processing logic.

---

## Amazon OpenSearch Service

Managed search and log analytics (successor to Amazon Elasticsearch Service).

- Full-text search, log analytics, real-time application monitoring
- OpenSearch Dashboards (formerly Kibana) for visualisation
- Integrates with Kinesis Firehose for streaming log ingestion from Lambda, VPC flow logs, CloudTrail

**Exam trigger:** "log analysis", "full-text search", "ELK stack on AWS", "visualise and search logs"

**vs CloudWatch Logs:** CloudWatch = AWS service logs with basic metric filters; OpenSearch = rich custom search and dashboard layer over any log data.

---

## Amazon QuickSight

Serverless business intelligence and visualisation.

- **SPICE:** in-memory query engine; data imported for fast dashboards
- Connects to S3, Athena, Redshift, RDS, Salesforce, on-premises databases
- ML Insights: anomaly detection and forecasting built in
- Pricing: pay per reader session (not per-seat for all users)

**Exam trigger:** "dashboards", "reports for business users", "BI tool", "non-technical reporting", "visualise Redshift or Athena data"

---

## Amazon Redshift

Fully managed columnar data warehouse.

- Columnar storage: reads only the columns a query needs — fast for analytics, slow for OLTP
- **Redshift Spectrum:** query S3 data from within Redshift without loading it
- Result caching: identical queries return instantly from cache
- **Redshift Serverless:** auto-scales, pay per compute-second (no cluster management)
- RA3 nodes: compute and storage scaled independently

**Exam trigger:** "data warehouse", "fast BI queries on large datasets", "replace on-premises warehouse", "structured analytics at scale"

**vs Athena:** Redshift = faster for repeated queries on stable structured data; Athena = cheaper for infrequent ad-hoc exploration of S3.

---

## Decision Framework

```
Data arrives in real time?
├── Yes → Kinesis Data Streams (custom consumers, replay)
│         Kinesis Data Firehose (just load to S3/Redshift)
│         Kinesis Data Analytics (SQL on the stream)
│
└── No (batch/stored) → Where is the data?
    ├── S3, occasional queries → Athena (serverless SQL)
    ├── Complex Spark/Hadoop → EMR
    ├── Serverless ETL, schema discovery → Glue
    └── Repeated BI queries, structured → Redshift

Visualise results for business users → QuickSight
Log search / full-text search → OpenSearch
```

---

## Exam Traps

**Athena vs Redshift:** "Ad-hoc, S3, serverless" → Athena. "Data warehouse, fast repeated queries, BI" → Redshift.

**Glue vs EMR:** "Serverless ETL, no cluster" → Glue. "Custom Spark, full control" → EMR.

**Kinesis Firehose vs Kinesis Data Streams:** Firehose loads data to destinations only (no custom processing). Data Streams supports custom consumers, replay, and ordering.

**QuickSight is always the BI answer.** Any mention of "dashboards for business users" or "non-technical visualisation" points here.

---

## Key Facts

- Athena: serverless SQL on S3, pay per TB scanned; Parquet/ORC reduce cost 60–90%
- EMR: Spark/Hadoop cluster; EMR Serverless available; Spot Instances cut cost up to 90%
- Glue: serverless ETL + Data Catalog; Crawlers auto-discover schema from S3/RDS/DynamoDB
- Kinesis Data Streams: real-time ordered, 7-day replay, multiple consumers, ~200ms latency
- Kinesis Data Firehose: near-real-time load to S3/Redshift/OpenSearch; 60–900s buffer; no custom processing
- Kinesis Data Analytics: SQL on live streams (Apache Flink)
- OpenSearch: managed Elasticsearch; integrates with Kinesis Firehose for log pipelines
- QuickSight: serverless BI; SPICE in-memory engine; ML anomaly detection built in
- Redshift: columnar warehouse; Spectrum queries S3 without loading; RA3 separates compute/storage

## Connections

- [[cloud/aws-sqs-sns]] — SQS vs Kinesis for event streaming vs work queues
- [[cloud/data-engineering-cloud]] — S3 data lake, Glue ETL, Athena, dbt on AWS patterns
- [[cloud/aws-core]] — S3 storage classes underlying Athena and Glue
- [[cloud/aws-rds-aurora]] — RDS as Glue ETL source
- [[landscape/aws-cloud-practitioner]] — CLF-C02 study guide; analytics services in Domain 3
- [[landscape/aws-ai-practitioner]] — AIF-C01 context; Kinesis as real-time ML data ingestion
- [[landscape/aws-solutions-architect-associate]] — SAA-C03 study guide; analytics services heavily tested in Domains 1 and 2

## Open Questions

- At what query frequency does Redshift Serverless become more expensive than a provisioned cluster?
- Is Kinesis Data Analytics (SQL on streams) converging with Apache Flink on EMR Serverless for the same use case?
