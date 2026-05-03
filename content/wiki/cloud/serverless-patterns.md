---
type: concept
category: cloud
para: resource
tags: [serverless, lambda, cloud-run, event-driven, cold-start, sam]
sources: []
updated: 2026-05-01
tldr: Architectural patterns for serverless compute — Lambda, Cloud Run, Azure Functions.
---

# Serverless Patterns

Architectural patterns for serverless compute. Lambda, Cloud Run, Azure Functions. Serverless shifts operations overhead to the cloud provider: no VM management, auto-scaling to zero, pay-per-invocation.

---

## When Serverless Fits

```
Good fit:
  - Event-driven workloads (S3 upload triggers, DynamoDB streams, SQS consumers)
  - Webhooks and API backends with spiky or low traffic
  - Scheduled tasks (CloudWatch Events → Lambda)
  - Background processing (image resize, PDF generation, notifications)
  - AI inference APIs — pair with provisioned concurrency to avoid cold starts

Poor fit:
  - Long-running jobs > 15 min (Lambda limit)
  - Stateful applications requiring persistent connections (WebSocket servers)
  - High-throughput, consistent traffic (ECS/Kubernetes is cheaper at scale)
  - Applications requiring GPU (not available in Lambda; use ECS GPU tasks)
```

---

## Lambda — Execution Model

```
Invocation types:
  Synchronous (RequestResponse) — API Gateway, ALB, Lambda URL; caller waits for response
  Asynchronous (Event)         — S3, SNS, EventBridge; Lambda retries on failure
  Polling (Event Source)        — SQS, Kinesis, DynamoDB Streams; Lambda polls and batches

Concurrency:
  Reserved concurrency — guarantees capacity, limits maximum (isolation)
  Provisioned concurrency — pre-warmed instances (eliminates cold starts, costs more)

Timeout:
  Max 15 minutes. Set to 2x your expected p99 latency.
  API workloads: 30s. Background: 5-15 min.
```

---

## SAM Template — API + Lambda Stack

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.12
    MemorySize: 512
    Timeout: 30
    Environment:
      Variables:
        LOG_LEVEL: INFO
        POWERTOOLS_SERVICE_NAME: myapp

Resources:
  ProductsApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  ListProductsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers.products.list_handler
      CodeUri: src/
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /products
            Method: GET
            RestApiId: !Ref ProductsApi
      Policies:
      - DynamoDBReadPolicy:
          TableName: !Ref ProductsTable
      Environment:
        Variables:
          TABLE_NAME: !Ref ProductsTable

  ProductsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      KeySchema:
      - AttributeName: id
        KeyType: HASH
      AttributeDefinitions:
      - AttributeName: id
        AttributeType: S
```

---

## AWS Lambda Powertools

```python
# handlers/products.py
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()
metrics = Metrics()
app = APIGatewayRestResolver()

@app.get("/products")
@tracer.capture_method
def list_products():
    products = table.scan()["Items"]
    metrics.add_metric(name="ProductsListed", unit=MetricUnit.Count, value=len(products))
    return {"products": products}

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics
def list_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
```

---

## Cold Start Mitigation

```python
# Move heavy initialisation outside the handler (runs once per container)
import boto3
from myapp.db import create_engine

# These run at cold start, not per invocation
_engine = create_engine(os.environ["DATABASE_URL"])
_s3_client = boto3.client("s3")
_model = load_model("s3://models/latest")   # load ML model once

def handler(event, context):
    # _engine, _s3_client, _model already initialised
    return process(event, _engine)
```

```bash
# Provisioned concurrency — pre-warm N instances
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier production \
  --provisioned-concurrent-executions 10

# Auto-scaling provisioned concurrency by schedule (morning ramp, evening scale-down)
aws application-autoscaling put-scaling-policy \
  --service-namespace lambda \
  --resource-id function:my-function:production \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    '{"TargetValue": 0.7, "PredefinedMetricSpecification": {"PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"}}'
```

---

## Event-Driven Saga with Lambda

```
Order placement saga (Lambda-native, no Step Functions):
  API Gateway → Lambda (PlaceOrder)
               → DynamoDB (write order, status=pending)
               → EventBridge (publish order.placed)
               → Lambda (ReserveInventory) [triggered by EventBridge]
               → Lambda (ChargePayment) [triggered by EventBridge after inventory OK]
               → Lambda (FulfillOrder) [triggered after payment]
               → Lambda (NotifyCustomer) [triggered after fulfillment]

Each Lambda handles one step. EventBridge is the backbone. Each Lambda publishes
the next event on success, or a compensating event on failure.
```

---

## Google Cloud Run

```bash
# Deploy a container to Cloud Run
gcloud run deploy myapp \
  --image gcr.io/myproject/myapp:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 100 \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 30s \
  --set-env-vars LOG_LEVEL=INFO \
  --set-secrets DATABASE_URL=myapp-db-url:latest
```

---

## Common Failure Cases

**Lambda cold start spikes cause API timeout errors under bursty traffic**
Why: a sudden burst of concurrent requests forces Lambda to spin up many new execution environments simultaneously; each cold start takes 2–5 seconds for Python, causing the API Gateway's 29-second timeout to appear unreachable even though the function works fine in steady state.
Detect: CloudWatch metrics show a spike in `InitDuration` correlating exactly with periods of high `ConcurrentExecutions`; error rate rises only at burst onset and recovers within minutes.
Fix: configure provisioned concurrency scaled to your expected burst level; for AI inference Lambdas, pre-load the model outside the handler so the cold start cost is paid only once per container lifecycle.

**SQS-triggered Lambda accumulates DLQ messages because retry logic is not idempotent**
Why: a transient error causes Lambda to fail a batch, SQS retries all messages in the batch, and the non-idempotent handler processes some messages twice before failing on the duplicate, landing everything in the DLQ.
Detect: DLQ depth grows steadily; DLQ messages have the same `MessageDeduplicationId` as messages already successfully processed elsewhere; downstream effects (charges, emails) appear duplicated.
Fix: use Lambda Powertools idempotency decorator with a DynamoDB persistence store keyed on `messageId`; also set `FunctionResponseTypes: [ReportBatchItemFailures]` so only failed records are retried.

**Event-driven saga leaves the system in an inconsistent state after a downstream Lambda fails**
Why: there is no compensating event handler; if `ChargePayment` fails after `ReserveInventory` has already succeeded, inventory remains reserved with no corresponding order.
Detect: inventory counts drift from expected values; orders in `pending` status with no payment event in the audit trail accumulate over time.
Fix: publish a compensating event (`inventory.reservation.cancelled`) from the payment Lambda's error handler; implement a periodic reconciliation job that detects orphaned `pending` orders older than 5 minutes and triggers rollback.

**Cloud Run container exits immediately after deploy with exit code 1**
Why: the container's startup command fails because an environment variable or secret (`--set-secrets`) was not injected correctly — the secret version does not exist or the service account lacks Secret Manager accessor permission.
Detect: Cloud Run console shows revision deployment failed with "Container failed to start"; Cloud Logging shows the startup error; `gcloud run services describe` shows no active revision.
Fix: verify the secret version exists and is not destroyed; grant the Cloud Run service account the `roles/secretmanager.secretAccessor` IAM role on the specific secret; redeploy.

## Connections
[[cloud-hub]] · [[cloud/aws-lambda-patterns]] · [[cloud/aws-step-functions]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-api-gateway]] · [[cloud/finops-cost-management]] · [[llms/ae-hub]]
