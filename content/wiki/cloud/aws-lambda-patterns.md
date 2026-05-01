---
type: concept
category: cloud
para: resource
tags: [aws, lambda, serverless, event-driven, api-gateway, sqs, patterns]
sources: []
updated: 2026-05-01
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

Enable `ReportBatchItemFailures` on the SQS trigger to use partial batch failure reporting — only failed messages are retried, not the whole batch.

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

Layers are mounted at `/opt/` — Python libraries go in `python/lib/python3.12/site-packages/`.

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

AWS Serverless Application Model — CloudFormation extension for Lambda.

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

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-api-gateway]] · [[cloud/aws-sqs-sns]] · [[cloud/secrets-management]] · [[cloud/cloud-monitoring]]
