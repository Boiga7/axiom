---
type: concept
category: data
tags: [data-pipelines, dbt, airflow, prefect, dvc, etl, data-quality, ai-data]
sources: []
updated: 2026-04-29
para: resource
tldr: Data pipelines for AI (dbt, Airflow, Prefect, DVC) differ from traditional ETL because data quality bugs silently degrade model quality, making validation checkpoints and eval-as-a-pipeline-stage mandatory.
---

# Data Pipelines for AI

> **TL;DR** Data pipelines for AI (dbt, Airflow, Prefect, DVC) differ from traditional ETL because data quality bugs silently degrade model quality, making validation checkpoints and eval-as-a-pipeline-stage mandatory.

Building and maintaining the data flows that feed AI systems. Training data, evaluation sets, RAG knowledge bases, and online feedback loops all need pipelines. The difference from traditional ETL: data quality bugs silently degrade model quality, often with no obvious error.

---

## The AI Data Stack

```
Sources          Transform         Store            Serve
──────────       ─────────────     ──────────────   ──────────
Web crawl  →                       
PDFs       →  dbt / Spark   →   PostgreSQL     →  RAG retrieval
Databases  →  Airflow tasks →   S3 / GCS       →  Training jobs
User logs  →  Python pipes  →   Vector store   →  Fine-tuning
Feedback   →                   Feature store   →  Eval pipeline
```

---

## dbt (Data Build Tool)

SQL-first transformation layer. Transforms raw data in your warehouse into clean, documented, tested tables.

```bash
pip install dbt-postgres dbt-duckdb
dbt init my_ai_project
```

```sql
-- models/training_data/clean_conversations.sql
-- Cleans raw chat logs for fine-tuning dataset
WITH raw AS (
    SELECT * FROM {{ source('raw', 'chat_logs') }}
),
filtered AS (
    SELECT
        conversation_id,
        user_message,
        assistant_message,
        rating,
        created_at
    FROM raw
    WHERE
        LENGTH(user_message) > 10
        AND LENGTH(assistant_message) > 20
        AND rating >= 4                    -- only high-quality conversations
        AND user_message NOT LIKE '%test%' -- exclude test data
),
deduped AS (
    SELECT DISTINCT ON (user_message) *   -- remove near-duplicates by exact match
    FROM filtered
    ORDER BY user_message, rating DESC
)
SELECT * FROM deduped
```

```yaml
# models/training_data/schema.yml
models:
  - name: clean_conversations
    description: "High-quality conversation pairs for SFT fine-tuning"
    columns:
      - name: conversation_id
        tests: [unique, not_null]
      - name: rating
        tests:
          - accepted_range:
              min_value: 4
              max_value: 5
```

```bash
dbt run --select training_data      # run transformations
dbt test --select training_data     # run data quality tests
dbt docs generate && dbt docs serve # generate docs
```

---

## Apache Airflow

Workflow orchestration for scheduled and dependency-driven pipelines.

```python
# dags/embedding_pipeline.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def extract_new_documents(**context):
    """Pull documents updated since last run."""
    last_run = context["data_interval_start"]
    docs = db.query(f"SELECT * FROM documents WHERE updated_at > '{last_run}'")
    context["ti"].xcom_push(key="doc_ids", value=[d.id for d in docs])

def embed_documents(**context):
    """Embed documents and upsert to vector store."""
    doc_ids = context["ti"].xcom_pull(key="doc_ids")
    for doc_id in doc_ids:
        doc = db.get_document(doc_id)
        embedding = embed(doc.content)
        vector_store.upsert(doc_id, embedding, doc.metadata)

def run_eval_suite(**context):
    """Run RAG eval after embedding to catch quality regressions."""
    results = run_ragas_eval(eval_questions)
    if results["faithfulness"] < 0.8:
        raise ValueError(f"RAG quality regression: faithfulness={results['faithfulness']:.2f}")

with DAG(
    "embedding_pipeline",
    schedule="@hourly",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=5)},
) as dag:
    extract = PythonOperator(task_id="extract", python_callable=extract_new_documents)
    embed = PythonOperator(task_id="embed", python_callable=embed_documents)
    eval_check = PythonOperator(task_id="eval", python_callable=run_eval_suite)

    extract >> embed >> eval_check
```

---

## Prefect

Lighter-weight alternative to Airflow. Better Python-native experience, easier local testing.

```python
from prefect import flow, task
from prefect.tasks import task_input_hash
from datetime import timedelta

@task(cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def fetch_documents(source: str) -> list[dict]:
    return db.get_documents(source=source, limit=1000)

@task(retries=3, retry_delay_seconds=60)
def embed_and_store(docs: list[dict]) -> int:
    embedded = 0
    for doc in docs:
        embedding = embed(doc["content"])
        vector_store.upsert(doc["id"], embedding)
        embedded += 1
    return embedded

@task
def validate_quality(count: int) -> None:
    results = run_quick_eval()
    if results["score"] < 0.75:
        raise ValueError(f"Quality below threshold: {results['score']:.2f}")

@flow(name="knowledge-base-refresh", log_prints=True)
def refresh_knowledge_base(source: str = "confluence"):
    docs = fetch_documents(source)
    print(f"Fetched {len(docs)} documents")
    count = embed_and_store(docs)
    validate_quality(count)
    print(f"Embedded {count} documents successfully")

if __name__ == "__main__":
    refresh_knowledge_base.serve(name="kb-refresh", cron="0 * * * *")  # hourly
```

---

## DVC (Data Version Control)

Git for datasets and model artifacts. Tracks large files in object storage (S3, GCS) while keeping metadata in Git.

```bash
# Initialise
dvc init
dvc remote add -d myremote s3://my-bucket/dvc-store

# Track datasets
dvc add data/training/conversations.jsonl
git add data/training/conversations.jsonl.dvc .gitignore
git commit -m "add training dataset v1"

# Push data to remote
dvc push

# Pull data on another machine
git pull
dvc pull
```

```yaml
# dvc.yaml — pipeline stages
stages:
  clean:
    cmd: python scripts/clean_data.py
    deps:
      - scripts/clean_data.py
      - data/raw/conversations.jsonl
    outs:
      - data/processed/clean_conversations.jsonl

  embed:
    cmd: python scripts/embed.py
    deps:
      - scripts/embed.py
      - data/processed/clean_conversations.jsonl
    outs:
      - data/processed/embeddings.npy

  eval:
    cmd: python scripts/eval.py
    deps:
      - data/processed/embeddings.npy
    metrics:
      - metrics/eval_results.json:
          cache: false
```

```bash
dvc repro        # run changed stages
dvc metrics show # compare metrics across versions
dvc dag          # visualise pipeline
```

---

## RLHF Feedback Loops

Collecting and processing production feedback for continuous improvement:

```python
# Feedback collection API endpoint
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class FeedbackEvent(BaseModel):
    conversation_id: str
    message_id: str
    rating: int           # 1-5
    feedback_text: str | None = None
    user_id: str

@app.post("/feedback")
async def collect_feedback(event: FeedbackEvent):
    # Write to database
    await db.execute("""
        INSERT INTO feedback (conversation_id, message_id, rating, feedback_text, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
    """, event.conversation_id, event.message_id, event.rating, event.feedback_text, event.user_id)

    # Trigger pipeline if enough new feedback accumulated
    count = await db.fetchval("SELECT COUNT(*) FROM feedback WHERE processed = FALSE")
    if count >= 1000:
        trigger_preference_dataset_build.delay()  # Celery/async task

    return {"status": "recorded"}
```

```python
# Pipeline: convert feedback to DPO preference pairs
async def build_preference_pairs():
    """Build DPO dataset from production feedback."""
    # Get conversations with high-low rating pairs
    pairs = await db.fetch("""
        SELECT
            f1.conversation_id,
            f1.message_id AS chosen_id,
            f2.message_id AS rejected_id
        FROM feedback f1
        JOIN feedback f2 USING (conversation_id)
        WHERE f1.rating >= 4 AND f2.rating <= 2
    """)

    dataset = []
    for pair in pairs:
        chosen_msg = await db.fetchrow("SELECT content FROM messages WHERE id = $1", pair["chosen_id"])
        rejected_msg = await db.fetchrow("SELECT content FROM messages WHERE id = $1", pair["rejected_id"])
        dataset.append({
            "prompt": await get_conversation_context(pair["conversation_id"]),
            "chosen": chosen_msg["content"],
            "rejected": rejected_msg["content"],
        })

    # Write JSONL for DPO training
    with open("data/preference_pairs.jsonl", "w") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")
```

---

## Data Quality for AI

Standard data quality checks insufficient for AI training data. AI-specific checks:

```python
from datasets import Dataset
import numpy as np

def validate_training_dataset(path: str) -> dict:
    ds = Dataset.from_json(path)
    issues = []

    # Length distribution
    lengths = [len(ex["response"].split()) for ex in ds]
    if np.percentile(lengths, 5) < 5:
        issues.append("5th percentile response length < 5 words — possible empty/stub responses")

    # Duplicate detection
    seen = set()
    duplicates = 0
    for ex in ds:
        key = ex["prompt"][:100]
        if key in seen:
            duplicates += 1
        seen.add(key)
    if duplicates / len(ds) > 0.05:
        issues.append(f"Duplicate rate {duplicates/len(ds):.1%} exceeds 5% threshold")

    # Label balance (for classification)
    if "label" in ds.column_names:
        from collections import Counter
        counts = Counter(ds["label"])
        max_ratio = max(counts.values()) / min(counts.values())
        if max_ratio > 10:
            issues.append(f"Label imbalance ratio {max_ratio:.1f}x — consider upsampling minority class")

    return {"total": len(ds), "issues": issues, "passed": len(issues) == 0}
```

---

## Key Facts

- dbt: SQL-first, runs transformations in-warehouse; `dbt test` validates data quality after transforms
- Airflow: dependency-driven DAGs with `retries` and `retry_delay`; `xcom_push/pull` for inter-task state
- Prefect: `@task(cache_key_fn=task_input_hash)` provides result caching to skip expensive reruns
- DVC: stores large files in S3/GCS, keeps `.dvc` metadata in Git for reproducible pipelines
- Duplicate rate > 5% in training data warrants deduplication before training
- Label imbalance ratio > 10x requires upsampling the minority class
- Inter-annotator agreement target: κ > 0.7 for preference pairs

## Common Failure Cases

**Airflow `xcom_push` stores a list of thousands of document IDs in the metadata database, causing the database to bloat and slow task scheduling**  
Why: XCom is designed for small inter-task metadata, not large payloads; storing 10,000+ IDs as a serialised Python list writes megabytes to Airflow's metadata DB per DAG run, causing query slowdowns and eventually disk exhaustion.  
Detect: Airflow web UI becomes sluggish; the `xcom` table in the metadata DB grows unboundedly; DAG scheduling latency increases over weeks.  
Fix: write document IDs to a temporary file in S3/GCS and pass only the file path via XCom; or use Airflow's task result backend (S3 or GCS XCom backend) for large payloads.

**dbt model silently passes `dbt test` on an empty table because `not_null` tests pass when there are zero rows**  
Why: `dbt test` validates constraints on existing rows; if the upstream source is empty (a failed extraction, a first-run edge case), the downstream model is also empty and all column tests trivially pass with no rows to fail.  
Detect: `dbt test` reports green on a model that has zero rows; adding a `relationships` test or a minimum row count test reveals the empty table.  
Fix: add a `dbt_utils.at_least_one` test to critical models to assert the table is non-empty; add a row count validation step in the extract task that fails the DAG if the source returns zero rows.

**Prefect task cache is never invalidated after an upstream data change because `task_input_hash` only hashes the Python argument, not the database content it points to**  
Why: `cache_key_fn=task_input_hash` computes the cache key from the function's arguments; if the argument is a source name string like `"confluence"`, the key is always the same regardless of whether new documents exist in Confluence, so the cached result is returned indefinitely.  
Detect: new documents added to the source never appear in the vector store; manual cache invalidation (`prefect task invalidate-cache`) triggers a run that finds new documents.  
Fix: include a content fingerprint (row count, latest `updated_at` timestamp from the source) in the cache key; or set a short `cache_expiration` (e.g., `timedelta(hours=1)`) to force regular re-runs.

**DVC pipeline stage runs on every `dvc repro` call because an output file is modified by a step that reads it, creating a circular dependency**  
Why: if a pipeline step reads and writes the same file (e.g., appending to a JSONL that is both a dependency and an output), DVC detects the file as changed after every run and marks the stage as stale, forcing a re-run on every `dvc repro` invocation.  
Detect: `dvc repro` never reports "Stage ... cached"; every run re-executes all stages even when no input has changed; inspecting the stage shows the same file in both `deps` and `outs`.  
Fix: separate read and write files — use `data/raw/input.jsonl` as input and `data/processed/output.jsonl` as output; never have a stage both depend on and produce the same file path.

## Connections

- [[data/synthetic-data]] — generating training data when real data is scarce
- [[data/rlhf-datasets]] — preference datasets for alignment training
- [[infra/huggingface]] — HuggingFace datasets library for loading and processing
- [[evals/methodology]] — eval pipelines that plug into these data flows; eval-as-gate pattern

## Open Questions

- What are the scalability limits of dbt for very large training dataset transformations (TB-scale)?
- How does Prefect compare to Airflow for ML pipelines specifically — where does the UX advantage break down?
- Are there standard DVC pipeline templates for RAG knowledge base refresh workflows?
