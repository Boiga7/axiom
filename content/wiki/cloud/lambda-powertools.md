---
type: concept
category: cloud
para: resource
tags: [lambda, powertools, logger, tracer, metrics, idempotency, batch-processing, aws]
sources: []
updated: 2026-05-01
tldr: Production-grade observability, idempotency, and batch processing for Lambda — the standard library for serious Lambda work.
---

# AWS Lambda Powertools

Production-grade observability, idempotency, and batch processing for Lambda. The standard library for serious Lambda work.

---

## Setup

```python
# pyproject.toml / requirements.txt
# pip install aws-lambda-powertools

from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger(service="order-service")       # auto-injects Lambda context
tracer = Tracer(service="order-service")       # X-Ray auto-instrumentation
metrics = Metrics(namespace="MyApp", service="order-service")
```

---

## Logger

```python
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger(service="order-service")

@logger.inject_lambda_context(log_event=False)   # log_event=True logs full event (careful with PII)
def handler(event: dict, context: LambdaContext) -> dict:
    order_id = event["order_id"]

    logger.info("Processing order", extra={"order_id": order_id, "amount": event["amount"]})

    try:
        result = process_order(order_id)
        logger.info("Order processed", extra={"result": result})
        return {"statusCode": 200, "body": "ok"}
    except ValueError as e:
        logger.exception("Invalid order", extra={"order_id": order_id})
        return {"statusCode": 400, "body": str(e)}

# Output (structured JSON, CloudWatch-searchable):
# {
#   "level": "INFO",
#   "location": "handler:12",
#   "message": "Processing order",
#   "timestamp": "2026-05-01T09:00:00.000Z",
#   "service": "order-service",
#   "cold_start": true,
#   "function_request_id": "abc-123",
#   "order_id": "ord_456",
#   "amount": 99.99
# }

# Correlation ID — propagate across services
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent

@logger.inject_lambda_context
def api_handler(event: dict, context: LambdaContext) -> dict:
    apigw_event = APIGatewayProxyEvent(event)
    logger.set_correlation_id(apigw_event.request_context.request_id)
    logger.info("API request received")   # correlation ID auto-included
```

---

## Tracer

```python
from aws_lambda_powertools import Tracer

tracer = Tracer(service="order-service")

@tracer.capture_lambda_handler(capture_response=False)   # don't trace response body
def handler(event: dict, context) -> dict:
    order_id = event["order_id"]
    return process_order(order_id)

@tracer.capture_method   # adds a subsegment per method call
def process_order(order_id: str) -> dict:
    tracer.put_annotation("order_id", order_id)        # searchable in X-Ray
    tracer.put_metadata("processing_start", time.time())   # not searchable, just stored

    with tracer.provider.in_subsegment("fetch_from_db") as subsegment:
        order = db.get(order_id)
        subsegment.put_annotation("found", order is not None)

    return {"order": order}
```

---

## Metrics

```python
from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit

metrics = Metrics(namespace="MyApp", service="order-service")

@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context) -> dict:
    metrics.add_metric(name="OrdersReceived", unit=MetricUnit.Count, value=1)

    start = time.time()
    result = process_order(event["order_id"])
    elapsed_ms = (time.time() - start) * 1000

    metrics.add_metric(name="ProcessingTime", unit=MetricUnit.Milliseconds, value=elapsed_ms)
    metrics.add_dimension(name="Environment", value=os.environ["ENVIRONMENT"])

    if result["status"] == "failed":
        metrics.add_metric(name="OrderFailures", unit=MetricUnit.Count, value=1)

    return result

# Single metric flush (useful in loops)
metrics.add_metric(name="ItemsProcessed", unit=MetricUnit.Count, value=100)
metrics.flush_metrics()
```

---

## Idempotency

```python
# Prevent duplicate processing when Lambda retries (SQS, EventBridge, etc.)
from aws_lambda_powertools.utilities.idempotency import (
    idempotent, IdempotencyConfig, DynamoDBPersistenceLayer,
)

persistence_store = DynamoDBPersistenceLayer(table_name="IdempotencyTable")
config = IdempotencyConfig(
    event_key_jmespath="body",              # use request body as idempotency key
    expires_after_seconds=3600,             # idempotency window: 1 hour
    raise_on_no_idempotency_key=True,
)

@idempotent(config=config, persistence_store=persistence_store)
def handler(event: dict, context) -> dict:
    # If Lambda retries with same event, returns cached result without re-executing
    order_id = json.loads(event["body"])["order_id"]
    return process_order_exactly_once(order_id)

# DynamoDB table required:
# Partition key: id (String)
# TTL attribute: expiration (Number)
# Provision with CDK:
# aws_dynamodb.Table(self, "IdempotencyTable",
#     table_name="IdempotencyTable",
#     partition_key=aws_dynamodb.Attribute(name="id", type=aws_dynamodb.AttributeType.STRING),
#     time_to_live_attribute="expiration",
#     billing_mode=aws_dynamodb.BillingMode.PAY_PER_REQUEST,
# )
```

---

## Batch Processing

```python
# Process SQS messages individually; report partial failures (not all-or-nothing)
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor, EventType, process_partial_response,
)
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord

processor = BatchProcessor(event_type=EventType.SQS)

def record_handler(record: SQSRecord) -> dict:
    """Called for each SQS message. Raise to mark as failed (goes to DLQ)."""
    payload = json.loads(record.body)
    return process_order(payload["order_id"])

@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event: dict, context) -> dict:
    return process_partial_response(
        event=event,
        record_handler=record_handler,
        processor=processor,
        context=context,
    )

# SQS → Lambda with partial batch failure:
# - Successful messages: deleted from queue
# - Failed messages: returned as batchItemFailures → retry or DLQ
# Lambda must have: FunctionResponseTypes: [ReportBatchItemFailures]
```

---

## Parser (Event Parsing + Validation)

```python
from aws_lambda_powertools.utilities.parser import event_parser, BaseModel
from aws_lambda_powertools.utilities.parser.models import SqsModel

class OrderEvent(BaseModel):
    order_id: str
    user_id: str
    amount: float

@event_parser(model=SqsModel)
def handler(event: SqsModel, context) -> dict:
    for record in event.Records:
        order = OrderEvent.model_validate_json(record.body)
        process_order(order.order_id, order.amount)
    return {"processed": len(event.Records)}
```

---

## Common Failure Cases

**Idempotency decorator raises `IdempotencyItemAlreadyExistsError` and blocks legitimate retries**
Why: a previous invocation wrote an `INPROGRESS` record to DynamoDB but the Lambda was killed before completing, leaving a stale in-progress lock that has not yet expired.
Detect: idempotency errors appear in logs for requests that are clearly new or retried after a genuine failure; DynamoDB scan shows rows with `status = INPROGRESS` whose TTL has not expired.
Fix: reduce `expires_after_seconds` to a value shorter than the Lambda timeout so stale locks self-clean quickly; implement a manual cleanup job for abnormally stuck records.

**`@tracer.capture_lambda_handler` causes X-Ray errors in unit tests**
Why: the X-Ray SDK requires a running daemon or valid context; when tests invoke the handler directly without a trace context, `capture_lambda_handler` raises `SegmentNotFoundException`.
Detect: unit tests fail with `SegmentNotFoundException` only when the tracer decorator is applied.
Fix: set the environment variable `POWERTOOLS_TRACE_DISABLED=true` in test configuration, or mock the tracer using `tracer.disable_tracer()` in a pytest fixture.

**Batch processor marks all records as failed even when only one record handler raises**
Why: an exception escapes from outside the `record_handler` function (e.g., in shared setup code before the loop), bypassing the per-record failure isolation.
Detect: Lambda returns all items in `batchItemFailures` even though individual records process correctly in isolation; the error originates before `process_partial_response` is called.
Fix: move any shared pre-processing code inside the `record_handler`, or wrap the setup code in a try/except that raises a non-retriable exception to fail fast rather than misreporting partial failure.

**Metrics are silently dropped when `@metrics.log_metrics` is not the outermost decorator**
Why: decorator order matters — if `@logger.inject_lambda_context` is outermost and `@metrics.log_metrics` is inner, an exception in the logger decorator prevents metrics from being flushed.
Detect: metrics are absent in CloudWatch after invocations that raised exceptions; swapping decorator order in a test confirms the metrics appear.
Fix: always place `@metrics.log_metrics` as the outermost decorator so metrics are flushed even when inner decorators raise.

## Connections

[[cloud-hub]] · [[cloud/aws-lambda-patterns]] · [[cloud/serverless-patterns]] · [[cloud/infrastructure-monitoring]] · [[cloud/aws-sqs-sns]] · [[cs-fundamentals/observability-se]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?
