---
type: concept
category: cloud
para: resource
tags: [aws, lambda, serverless, event-driven, api-gateway, sqs, patterns]
sources: []
updated: 2026-05-01
tldr: Lambda beyond hello-world. Cold starts, concurrency, event sources, and deployment patterns that matter for production workloads.
---

# AWS Lambda — Patterns and Production

Lambda beyond hello-world. Cold starts, concurrency, event sources, and deployment patterns that matter for production workloads.

---

## Cold Start Anatomy

```
Cold start: download code package → start runtime → init handler → execute
Warm start: execute (only this step)

Cold start latency by runtime:
  Python 3.12:  100–300ms
  Node.js 20:   100–200ms
  Java 21:      500ms–2s (JVM startup)
  Go (custom):  50–100ms
```

**Mitigation:**
- Provisioned Concurrency — pre-warmed instances, eliminates cold starts. Cost: pay even when idle.
- SnapStart (Java) — snapshot the initialised JVM, restore on cold start. Reduces Java cold start to ~200ms.
- Keep functions small — smaller deployment package = faster download.
- Move SDK clients outside the handler — initialised once, reused across warm invocations.

```python
import boto3

# Outside handler — initialised once per container lifecycle
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("my-table")

def handler(event, context):
    # s3 and table are already initialised — no cold start penalty here
    result = table.get_item(Key={"id": event["id"]})
    return result["Item"]
```

---

## Concurrency Model

```
Reserved concurrency: hard limit for a function (protect downstream DBs)
Provisioned concurrency: pre-warmed instances (eliminate cold starts)
Account-level burst limit: 3,000 initial, +500/minute after (per region)

Throttling: when concurrency limit hit → 429 → caller must retry
```

```bash
# Reserve 50 concurrent executions for this function
aws lambda put-function-concurrency \
  --function-name my-api \
  --reserved-concurrent-executions 50

# Provision 10 warm instances
aws lambda put-provisioned-concurrency-config \
  --function-name my-api \
  --qualifier production \
  --provisioned-concurrent-executions 10
```

---

## Event Sources

### API Gateway → Lambda (Sync)
```python
def handler(event, context):
    method = event["httpMethod"]
    path = event["path"]
    body = json.loads(event.get("body") or "{}")

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"result": "ok"})
    }
```

### SQS → Lambda (Async, batch)
```python
def handler(event, context):
    failed = []
    for record in event["Records"]:
        try:
            body = json.loads(record["body"])
            process(body)
        except Exception as e:
            # Return failed IDs — they'll be retried (not deleted from queue)
            failed.append({"itemIdentifier": record["messageId"]})

    return {"batchItemFailures": failed}
```

Enable `ReportBatchItemFailures` on the SQS trigger to use partial batch failure reporting. Only failed messages are retried, not the whole batch.

### S3 Event → Lambda
```python
def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        # Process the uploaded file
        process_file(bucket, key)
```

### EventBridge Scheduled Rule (Cron)
```python
def handler(event, context):
    # Runs on schedule — event contains {"source": "aws.events", ...}
    run_nightly_cleanup()
```

---

## Lambda Layers

Share code across functions without bundling it in every deployment package.

```bash
# Create a layer
zip -r dependencies.zip python/
aws lambda publish-layer-version \
  --layer-name my-dependencies \
  --zip-file fileb://dependencies.zip \
  --compatible-runtimes python3.12

# Reference in function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:eu-west-1:123456789:layer:my-dependencies:3
```

Layers are mounted at `/opt/`. Python libraries go in `python/lib/python3.12/site-packages/`.

---

## Lambda URLs

Direct HTTPS endpoint without API Gateway. Simpler and cheaper for single-function APIs. Supports streaming responses.

```bash
aws lambda create-function-url-config \
  --function-name my-api \
  --auth-type AWS_IAM   # or NONE for public
```

Streaming response from Lambda URL:
```python
def handler(event, context):
    def generate():
        for chunk in llm_stream():
            yield chunk

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/event-stream"},
        "body": generate()  # streaming with response streaming enabled
    }
```

---

## Deployment with SAM

AWS Serverless Application Model. CloudFormation extension for Lambda.

```yaml
# template.yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.12
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        ENV: !Ref Environment

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: main.handler
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref DataBucket
```

```bash
sam build && sam deploy --guided
```

---

## Common Failure Cases

**Lambda throttled — 429 errors spike under load**
Why: the function hit the account-level concurrency limit or its own reserved concurrency cap; new invocations are rejected rather than queued.
Detect: CloudWatch `Throttles` metric rises; callers receive `TooManyRequestsException` (429); SQS trigger shows messages backing up.
Fix: request a concurrency limit increase via Service Quotas, or add reserved concurrency to isolate this function from noisy neighbours; for SQS triggers, use `ReportBatchItemFailures` so throttled messages retry without poisoning the whole batch.

**Cold starts exceed SLA — 1-2s latency spikes on Java/Python**
Why: infrequent invocations let containers expire and the next call triggers a full cold start including SDK client initialization inside the handler.
Detect: CloudWatch `InitDuration` dimension on Lambda `Duration` metric shows spikes; p99 latency is orders of magnitude above p50.
Fix: move SDK client initialization outside the handler (module-level) so it's reused on warm invocations; for Java, enable SnapStart; for latency-critical paths, add Provisioned Concurrency.

**SQS trigger processes the same message multiple times**
Why: the Lambda execution time exceeds the queue's `VisibilityTimeout`, causing SQS to make the message visible again and another Lambda instance picks it up before the first finishes.
Detect: downstream systems receive duplicate records; CloudWatch shows the same message processed by multiple concurrent Lambda invocations.
Fix: set `VisibilityTimeout` to at least 6× the Lambda function timeout, and design the handler to be idempotent using a deduplication key stored in DynamoDB or ElastiCache.

**Lambda times out accessing RDS — connection exhaustion**
Why: each Lambda invocation opens a new database connection that is held for the function lifetime; under load, the DB's `max_connections` is exhausted.
Detect: Lambda logs show `connection timeout` or `too many connections` errors from the DB driver; RDS `DatabaseConnections` metric is at or near `max_connections`.
Fix: use RDS Proxy in front of the database; the proxy pools and multiplexes connections so Lambda bursts don't exhaust the DB.

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-api-gateway]] · [[cloud/aws-sqs-sns]] · [[cloud/secrets-management]] · [[cloud/cloud-monitoring]]
