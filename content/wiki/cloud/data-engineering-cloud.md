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

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/serverless-patterns]] · [[cloud/aws-step-functions]] · [[cloud/cost-optimisation-cloud]] · [[llms/ae-hub]]
