---
type: concept
category: python
para: resource
tags: [polars, duckdb, dataframes, analytics, python, data-processing]
sources: []
updated: 2026-05-01
---

# Polars + DuckDB

The two workhorses of Python data processing for AI engineers. Polars is a DataFrame library (pandas replacement) built on Apache Arrow — lazy evaluation, parallel by default, no GIL. DuckDB is an in-process analytical SQL engine — run SQL directly on Parquet, CSV, JSON, or Polars DataFrames without a server.

Use Polars when you need Python-native DataFrame transformations. Use DuckDB when the query is naturally SQL or the data is too large to load at once.

---

## Polars — Why Not Pandas

| | pandas | polars |
|---|---|---|
| Execution | Eager, single-threaded | Lazy + parallel (all cores) |
| Memory | Copies on slice/filter | Zero-copy Arrow slices |
| Type safety | Mixed types per column | Strict Arrow types |
| Large files | Loads fully into RAM | `scan_parquet()` streams |
| Speed | Baseline | 5–50× faster in practice |

---

## Polars — Eager vs Lazy

```python
import polars as pl

# Eager: evaluate immediately (small datasets, interactive use)
df = pl.read_csv("data.csv")
result = df.filter(pl.col("score") > 0.8).select(["model", "score"])

# Lazy: build a query plan, execute with .collect() (large datasets)
result = (
    pl.scan_parquet("eval_results/*.parquet")   # doesn't read files yet
    .filter(pl.col("score") > 0.8)
    .group_by("model")
    .agg(
        pl.col("score").mean().alias("avg_score"),
        pl.col("score").count().alias("n"),
    )
    .sort("avg_score", descending=True)
    .collect()   # executes the plan — parallelised across all cores
)
```

---

## Polars — Expression API

Expressions are the core abstraction. They describe transformations without executing them.

```python
import polars as pl

df = pl.DataFrame({
    "model": ["claude", "gpt-4", "gemini", "claude", "gpt-4"],
    "score": [0.92, 0.88, 0.85, 0.94, 0.91],
    "tokens": [1500, 2100, 1800, 1200, 1950],
    "pass": [True, True, False, True, True],
})

# with_columns: add/replace columns
df = df.with_columns(
    (pl.col("score") * 100).alias("score_pct"),
    pl.col("tokens").cast(pl.Float64).alias("tokens_f"),
    pl.when(pl.col("score") > 0.9).then(pl.lit("A")).otherwise(pl.lit("B")).alias("grade"),
)

# Aggregation
summary = df.group_by("model").agg(
    pl.col("score").mean().alias("mean_score"),
    pl.col("score").std().alias("std_score"),
    pl.col("pass").sum().alias("pass_count"),
    pl.col("tokens").median().alias("median_tokens"),
)

# Multiple operations at once (all run in parallel)
df.select(
    pl.col("score").mean().alias("global_mean"),
    pl.col("tokens").sum().alias("total_tokens"),
    pl.col("model").n_unique().alias("unique_models"),
)
```

---

## Polars — Window Functions and Joins

```python
# Window functions — rank within group
df = df.with_columns(
    pl.col("score").rank(descending=True).over("model").alias("rank_in_model"),
    pl.col("score").mean().over("model").alias("model_mean"),
)

# Joins
other = pl.DataFrame({"model": ["claude", "gpt-4", "gemini"], "org": ["Anthropic", "OpenAI", "Google"]})

joined = df.join(other, on="model", how="left")

# Anti-join: rows in df with no match in other
missing = df.join(other, on="model", how="anti")
```

---

## Polars — I/O Patterns

```python
# Read formats
df = pl.read_parquet("data.parquet")
df = pl.read_csv("data.csv", infer_schema_length=10_000)
df = pl.read_json("data.json")
df = pl.read_ndjson("data.ndjson")   # newline-delimited JSON (common for LLM logs)

# Lazy scan (streams, never fully in RAM)
lf = pl.scan_parquet("data/*.parquet")
lf = pl.scan_csv("data/*.csv")

# Write
df.write_parquet("output.parquet", compression="zstd")
df.write_csv("output.csv")
df.write_ndjson("output.ndjson")

# Partitioned write (Hive-style)
df.write_parquet(
    "output/",
    use_pyarrow=True,
    partition_by=["model"],   # creates output/model=claude/data.parquet etc.
)

# Streaming large files (never loads all at once)
(
    pl.scan_parquet("huge_file.parquet")
    .filter(pl.col("score") > 0.9)
    .sink_parquet("filtered.parquet")   # streaming write
)
```

---

## DuckDB — In-Process SQL Engine

```python
import duckdb

# In-memory database (default)
conn = duckdb.connect()

# File-backed (persists)
conn = duckdb.connect("analytics.db")

# Query Parquet directly — no loading
result = conn.execute("""
    SELECT
        model,
        AVG(score) AS avg_score,
        COUNT(*) AS n,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY score) AS p95_score
    FROM 'eval_results/*.parquet'
    WHERE created_at >= '2026-01-01'
    GROUP BY model
    ORDER BY avg_score DESC
""").df()   # returns pandas DataFrame; use .pl() for polars

# Or use .pl() for Polars (faster, no pandas dependency)
result = conn.execute("SELECT * FROM 'data.parquet' LIMIT 100").pl()
```

---

## DuckDB + Polars Integration

```python
import polars as pl
import duckdb

# Register a Polars DataFrame as a DuckDB table
df = pl.read_parquet("evals.parquet")
conn = duckdb.connect()
conn.register("evals", df)

# Now query the Polars DataFrame with SQL
result = conn.execute("""
    SELECT
        model,
        task_type,
        AVG(score) as avg,
        STDDEV(score) as std
    FROM evals
    WHERE score IS NOT NULL
    GROUP BY 1, 2
    HAVING COUNT(*) > 10
    ORDER BY 1, 3 DESC
""").pl()

# DuckDB can also write results back to Polars
conn.execute("COPY evals TO 'output.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)")
```

---

## Practical AI Use Cases

**Eval result analysis:**
```python
# Aggregate pass rates across models and tasks
results = (
    pl.scan_parquet("runs/*/results.parquet")
    .group_by(["model", "task", "date"])
    .agg(
        pl.col("passed").mean().alias("pass_rate"),
        pl.col("latency_ms").median().alias("p50_latency"),
        pl.col("input_tokens").sum().alias("total_tokens"),
    )
    .collect()
)
```

**Token cost estimation:**
```python
PRICING = {"claude-sonnet-4-6": (3.0, 15.0), "gpt-4o": (2.5, 10.0)}  # $/M tokens in/out

cost_df = df.with_columns(
    (
        pl.col("input_tokens") / 1_000_000 * pl.col("model").map_elements(
            lambda m: PRICING.get(m, (0, 0))[0], return_dtype=pl.Float64
        )
        + pl.col("output_tokens") / 1_000_000 * pl.col("model").map_elements(
            lambda m: PRICING.get(m, (0, 0))[1], return_dtype=pl.Float64
        )
    ).alias("cost_usd")
)
```

**JSONL LLM log parsing:**
```python
# Process structured log files from LLM calls
df = (
    pl.scan_ndjson("logs/*.jsonl")
    .select([
        pl.col("timestamp").str.to_datetime(),
        pl.col("model"),
        pl.col("usage").struct.field("input_tokens"),
        pl.col("usage").struct.field("output_tokens"),
        pl.col("duration_ms"),
    ])
    .filter(pl.col("duration_ms") < 30_000)
    .collect()
)
```

---

## When to Use Which

| Scenario | Use |
|---|---|
| Columnar transforms in Python code | Polars |
| Complex SQL aggregations | DuckDB |
| Files too large for RAM | `pl.scan_parquet()` or DuckDB |
| Joining many Parquet files | DuckDB (optimised partition pruning) |
| Streaming writes | Polars `sink_parquet()` |
| Ad-hoc data exploration | DuckDB (SQL is fast to write) |
| Production pipeline with type safety | Polars (strict schema) |

---

## Connections

[[python/python-hub]] · [[python/ecosystem]] · [[evals/methodology]] · [[data/datasets]] · [[infra/vector-stores]]
