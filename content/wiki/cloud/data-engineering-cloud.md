---
type: concept
category: cloud
para: resource
tags: [data-engineering, s3, glue, athena, redshift, dbt, data-lake, etl]
sources: []
updated: 2026-05-01
tldr: Building data pipelines and analytics infrastructure on AWS. From S3 data lake to queryable analytics with Athena, Glue, and Redshift.
---

# Data Engineering on Cloud

Building data pipelines and analytics infrastructure on AWS. From S3 data lake to queryable analytics with Athena, Glue, and Redshift.

---

## Data Lake Architecture

```
Raw zone (S3):        Immutable. Exact copy of source data. Partitioned by date.
                      s3://my-datalake/raw/orders/year=2026/month=05/day=01/
Curated zone (S3):    Cleaned, deduplicated, schema-validated. Parquet format.
                      s3://my-datalake/curated/orders/
Analytics zone (S3):  Aggregates, pre-joined, ready for BI tools.
                      s3://my-datalake/analytics/

Format choice:
  Parquet:  columnar, 70-90% compression, fast analytical queries
  JSON/CSV: raw ingestion zone only — never store in curated/analytics
  Delta/Iceberg: add ACID transactions, time travel, schema evolution to S3
```

---

## AWS Glue — ETL

```python
# glue_job.py — runs on AWS Glue
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql.functions import col, to_timestamp, year, month, dayofmonth

args = getResolvedOptions(sys.argv, ["JOB_NAME", "source_path", "target_path"])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# Read raw JSON from S3
raw_df = spark.read.json(args["source_path"])

# Transform
curated_df = (raw_df
    .filter(col("order_id").isNotNull())
    .withColumn("order_date", to_timestamp(col("created_at")))
    .withColumn("year", year(col("order_date")))
    .withColumn("month", month(col("order_date")))
    .withColumn("day", dayofmonth(col("order_date")))
    .select("order_id", "user_id", "total", "status", "order_date", "year", "month", "day")
    .dropDuplicates(["order_id"])
)

# Write Parquet partitioned by date
curated_df.write.mode("overwrite").partitionBy("year", "month", "day").parquet(
    args["target_path"]
)

# Update Glue catalogue for Athena to see the new partition
glueContext.purge_s3_path(args["target_path"], {"retentionPeriod": 0})
job.commit()
```

---

## Amazon Athena — Serverless SQL

```sql
-- Query the S3 data lake directly via Athena
-- No ETL needed — Athena reads Parquet files in place

CREATE EXTERNAL TABLE orders (
    order_id STRING,
    user_id  STRING,
    total    DOUBLE,
    status   STRING,
    order_date TIMESTAMP
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET
LOCATION 's3://my-datalake/curated/orders/'
TBLPROPERTIES ("parquet.compress"="SNAPPY");

-- Load partitions (or use partition projection to skip this)
MSCK REPAIR TABLE orders;

-- Analytical query — Athena reads only the relevant partitions
SELECT
    status,
    COUNT(*) as order_count,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value
FROM orders
WHERE year = 2026 AND month = 5       -- partition pruning: only reads May 2026
GROUP BY status
ORDER BY total_revenue DESC;
```

```python
# Query Athena programmatically
import boto3
import time

athena = boto3.client("athena")

def run_athena_query(query: str, database: str, output_location: str) -> list[dict]:
    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": database},
        ResultConfiguration={"OutputLocation": output_location},
    )
    execution_id = response["QueryExecutionId"]

    # Wait for completion
    while True:
        status = athena.get_query_execution(QueryExecutionId=execution_id)
        state = status["QueryExecution"]["Status"]["State"]
        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            break
        time.sleep(1)

    if state != "SUCCEEDED":
        raise RuntimeError(f"Query failed: {status['QueryExecution']['Status']['StateChangeReason']}")

    results = athena.get_query_results(QueryExecutionId=execution_id)
    columns = [col["Label"] for col in results["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]]
    rows = []
    for row in results["ResultSet"]["Rows"][1:]:  # skip header row
        rows.append(dict(zip(columns, [d.get("VarCharValue", "") for d in row["Data"]])))
    return rows
```

---

## dbt — Data Transformation

```sql
-- models/orders/daily_revenue.sql
-- dbt manages dependencies, incremental builds, testing

{{ config(
    materialized='incremental',
    unique_key='order_date',
    incremental_strategy='merge'
) }}

WITH orders AS (
    SELECT *
    FROM {{ source('raw', 'orders') }}
    {% if is_incremental() %}
    WHERE created_at > (SELECT MAX(order_date) FROM {{ this }})
    {% endif %}
)

SELECT
    DATE_TRUNC('day', created_at) as order_date,
    COUNT(*) as total_orders,
    COUNT(DISTINCT user_id) as unique_customers,
    SUM(total) as revenue,
    AVG(total) as avg_order_value,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
FROM orders
WHERE status != 'test'
GROUP BY 1
```

```yaml
# models/orders/schema.yml — dbt tests
version: 2
models:
  - name: daily_revenue
    columns:
      - name: order_date
        tests:
          - unique
          - not_null
      - name: revenue
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 1000000
```

---

## S3 Event-Driven Pipeline

```python
# Lambda triggered by S3 PutObject event — process immediately on ingest
import boto3
import json

def handler(event, context):
    s3 = boto3.client("s3")
    glue = boto3.client("glue")

    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]

        # Validate the new file
        validate_schema(s3, bucket, key)

        # Trigger Glue job to process it
        glue.start_job_run(
            JobName="raw-to-curated",
            Arguments={
                "--source_path": f"s3://{bucket}/{key}",
                "--target_path": "s3://my-datalake/curated/orders/",
            }
        )

        print(f"Triggered Glue job for: s3://{bucket}/{key}")
```

---

## Common Failure Cases

**Athena query scanning entire table due to missing partition filter**
Why: A query omits the partition predicate (`WHERE year = ... AND month = ...`), causing Athena to scan every partition and incurring large data scan costs (billed at $5/TB).
Detect: Athena query history shows `Data scanned` in the tens to hundreds of GB for queries that should only touch a single day's data; query takes minutes instead of seconds.
Fix: Always include partition columns in WHERE clauses; use partition projection to prevent `MSCK REPAIR TABLE` and enforce partition discovery; set workgroup data scan limits to reject runaway queries above a threshold.

**Glue job failing silently on schema evolution without alerting**
Why: New fields added to source JSON are ignored by Spark if the schema is inferred once and cached in the Glue catalogue; deleted fields cause null columns silently rather than job failure.
Detect: Curated Parquet files have all-null columns or missing columns compared to what the source data contains; downstream Athena queries return unexpected nulls.
Fix: Enable Glue schema evolution options (`ALLOW_COLUMN_CHANGE`); run dbt schema tests after each Glue job run to catch unexpected nulls or type changes; alert on test failures before downstream consumers read the data.

**dbt incremental model merging the wrong rows due to a missing unique key**
Why: If the `unique_key` field is not truly unique in the source (e.g., duplicate event IDs from a replay), the incremental merge produces incorrect row counts or double-counts revenue.
Detect: dbt tests show `unique` test failures on the model's key column after an incremental run; aggregate metrics diverge from the raw source count.
Fix: Define the correct composite unique key (e.g., `order_id + event_type + event_date`) in the dbt model config; add a `not_null` + `unique` dbt test and run it on every CI merge.

**S3 event-driven pipeline creating duplicate Glue job runs on large multi-part uploads**
Why: S3 multipart uploads emit one `s3:ObjectCreated` event per part completion and one on final assembly; if the Lambda trigger is on `s3:ObjectCreated:*`, multiple Glue jobs start for the same file.
Detect: Glue job run history shows multiple concurrent runs for the same `source_path`; the curated partition has duplicate rows or the job fails with `file already exists`.
Fix: Trigger only on `s3:ObjectCreated:CompleteMultipartUpload` and `s3:ObjectCreated:Put` (not wildcard); add an idempotency check in the Lambda that records the S3 ETag in DynamoDB before starting the Glue job and skips if already processed.

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/serverless-patterns]] · [[cloud/aws-step-functions]] · [[cloud/finops-cost-management]] · [[llms/ae-hub]]
