---
type: concept
category: data
tags: [hub, data-engineering, etl, pipelines, orchestration, storage]
sources: []
updated: 2026-05-04
para: resource
tldr: Hub page for data engineering — pipelines, transformation, orchestration (Airflow, Prefect, dbt), storage patterns, and the specific requirements that AI workloads add to traditional data infrastructure.
---

# Data Engineering Hub

> **TL;DR** Hub page for data engineering — pipelines, transformation, orchestration (Airflow, Prefect, dbt), storage patterns, and the specific requirements that AI workloads add to traditional data infrastructure.

Data engineering for AI differs from traditional data engineering in one critical way: data quality bugs silently degrade model quality with no visible error. A bad SQL join in a BI pipeline produces a wrong number; the same bug in a training pipeline produces a miscalibrated model that looks fine until you evaluate it.

---

## The AI Data Stack

```
Sources (logs, databases, APIs, user feedback)
        ↓
Ingestion (Kafka, Fivetran, Airbyte, custom scrapers)
        ↓
Storage (data lake, warehouse, feature store)
        ↓
Transformation (dbt, Spark, DuckDB)
        ↓
Validation (Great Expectations, dbt tests, custom evals)
        ↓
Serving (vector stores, feature stores, S3/GCS for training data)
        ↓
Consumption (training jobs, RAG pipelines, online inference)
```

---

## Pipeline Orchestration

### Airflow

Mature, widely deployed. DAG-based. Best when you have a large operations team comfortable with Python DAG authorship and need enterprise monitoring.

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG("embedding_refresh", schedule_interval="@daily", start_date=datetime(2026, 1, 1)) as dag:
    extract = PythonOperator(task_id="extract", python_callable=extract_new_documents)
    embed = PythonOperator(task_id="embed", python_callable=generate_embeddings)
    load = PythonOperator(task_id="load", python_callable=upsert_to_vector_store)

    extract >> embed >> load
```

### Prefect

Pythonic, cloud-native. Easier local development than Airflow. Better for teams that want flow-as-code without a full Airflow deployment.

```python
from prefect import flow, task

@task
def extract() -> list[str]: ...

@task
def embed(texts: list[str]) -> list[list[float]]: ...

@flow
def embedding_pipeline():
    texts = extract()
    vectors = embed(texts)
    upsert_to_store(vectors)
```

### dbt

SQL-first transformation layer. Not a scheduler itself — pairs with Airflow/Prefect/dbt Cloud for orchestration. The standard tool for warehouse-layer transformation.

---

## Data Storage for AI

| Layer | Tool | Use |
|---|---|---|
| Raw storage | S3, GCS | Training data lake, model artefacts |
| Structured data | PostgreSQL, Snowflake, BigQuery | Features, labels, metadata |
| Vector store | pgvector, Qdrant, Pinecone | Embedding index for RAG |
| Feature store | Feast, Tecton, SageMaker FS | Online/offline feature serving |
| Cache | Redis | Low-latency feature serving |

---

## Data Quality for AI

Standard data quality checks are necessary but insufficient. Add AI-specific validation:

1. **Embedding quality checks** — cosine similarity distribution of new embeddings vs baseline; sudden distribution shift signals upstream text quality degradation
2. **Label consistency** — for RLHF datasets, inter-annotator agreement should stay above a threshold (Cohen's κ > 0.6)
3. **Deduplication** — near-duplicate training examples bias models toward overrepresented patterns; MinHash deduplication before training
4. **PII detection** — run regex + model-based PII checks before any data enters a training pipeline

---

## Data Versioning

```bash
# DVC — Git for data
dvc init
dvc add data/embeddings/corpus_v3.parquet
git add data/embeddings/corpus_v3.parquet.dvc .gitignore
git commit -m "Add corpus v3 embeddings"
dvc push  # pushes to S3/GCS remote
```

---

## Key Pages

- [[data/pipelines]] — full pipeline orchestration treatment (Airflow, Prefect, dbt)
- [[data/synthetic-data]] — generating synthetic training data with LLMs
- [[data/rlhf-datasets]] — preference data for RLHF and DPO training
- [[data/datasets]] — HuggingFace datasets, data sources, and dataset quality
- [[data/distilabel]] — Argilla's synthetic data generation pipeline
- [[data/annotation-tooling]] — Label Studio, Argilla for human annotation
- [[infra/vector-stores]] — where embeddings live after generation
- [[sql/sql-for-ai]] — SQL patterns for querying AI datasets and training metadata
- [[sql/window-functions]] — window functions for time-series data engineering tasks
