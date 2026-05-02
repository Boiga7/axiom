---
type: concept
category: cloud
para: resource
tags: [aws, sqs, sns, messaging, queues, pub-sub, event-driven]
sources: []
updated: 2026-05-01
tldr: The messaging backbone of AWS event-driven architectures. SQS = queue (point-to-point). SNS = pub/sub (one-to-many fan-out).
---

# AWS SQS and SNS

The messaging backbone of AWS event-driven architectures. SQS = queue (point-to-point). SNS = pub/sub (one-to-many fan-out). They compose: SNS fan-out to multiple SQS queues is the most common production pattern.

---

## SQS — Simple Queue Service

Managed message queue. Producers send messages; consumers poll and process; consumers delete after processing. At-least-once delivery.

**Queue types:**
- **Standard** — best-effort ordering, at-least-once delivery, nearly unlimited throughput
- **FIFO** — exactly-once processing, strict ordering, 3,000 msg/s (300 without batching)

```python
import boto3

sqs = boto3.client("sqs", region_name="eu-west-1")
QUEUE_URL = "https://sqs.eu-west-1.amazonaws.com/123456789/my-queue"

# Send
sqs.send_message(
    QueueUrl=QUEUE_URL,
    MessageBody=json.dumps({"order_id": "ORD-123", "total": 49.99}),
    MessageAttributes={
        "priority": {"DataType": "String", "StringValue": "high"}
    }
)

# Receive and process
while True:
    response = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=10,       # batch up to 10
        WaitTimeSeconds=20,           # long polling — reduces empty responses
        VisibilityTimeout=60          # other consumers can't see it for 60s
    )

    for msg in response.get("Messages", []):
        body = json.loads(msg["Body"])
        try:
            process_order(body)
            sqs.delete_message(
                QueueUrl=QUEUE_URL,
                ReceiptHandle=msg["ReceiptHandle"]
            )
        except Exception:
            pass  # message becomes visible again after VisibilityTimeout
```

**Visibility timeout** — how long the message is hidden from other consumers after it's received. Set to 6× your average processing time. If processing takes longer, extend with `ChangeMessageVisibility`.

**Dead Letter Queue (DLQ)** — after N failed processing attempts, messages move to a DLQ. Alert on DLQ depth.

```bash
# Set DLQ on a queue
aws sqs set-queue-attributes \
  --queue-url https://sqs.eu-west-1.amazonaws.com/123456789/my-queue \
  --attributes '{
    "RedrivePolicy": "{
      \"deadLetterTargetArn\": \"arn:aws:sqs:eu-west-1:123456789:my-dlq\",
      \"maxReceiveCount\": \"5\"
    }"
  }'
```

---

## SNS — Simple Notification Service

Pub/sub. Publishers send to a Topic; SNS fans out to all subscribers (SQS queues, Lambda, HTTP endpoints, email, SMS).

```python
sns = boto3.client("sns", region_name="eu-west-1")

# Publish
sns.publish(
    TopicArn="arn:aws:sns:eu-west-1:123456789:order-events",
    Message=json.dumps({
        "event": "ORDER_PLACED",
        "orderId": "ORD-123",
        "total": 49.99
    }),
    MessageAttributes={
        "event_type": {"DataType": "String", "StringValue": "ORDER_PLACED"}
    }
)
```

**SNS message filtering** — subscribers only receive messages matching their filter policy. The fulfillment queue gets ORDER_PLACED; the analytics queue gets all events.

```json
{
  "event_type": ["ORDER_PLACED", "ORDER_SHIPPED"]
}
```

---

## Fan-Out Pattern

SNS topic → multiple SQS queues. Each queue drives an independent microservice. Decouples producers from consumers completely.

```
Order Service
    │
    ▼
SNS: order-events
    ├──► SQS: fulfillment-queue  ──► Fulfillment Lambda
    ├──► SQS: email-queue        ──► Email Lambda
    ├──► SQS: analytics-queue    ──► Analytics Lambda
    └──► SQS: audit-queue        ──► Audit Lambda
```

All four consumers process every order event independently. Adding a new consumer is a new SQS subscription — no change to the Order Service.

---

## SQS as Lambda Trigger

Lambda polls SQS automatically. Configure batch size and concurrency.

```bash
aws lambda create-event-source-mapping \
  --function-name order-processor \
  --event-source-arn arn:aws:sqs:eu-west-1:123456789:fulfillment-queue \
  --batch-size 10 \
  --function-response-types ReportBatchItemFailures
```

At scale, Lambda scales horizontally — one Lambda invocation per SQS batch, up to 60 concurrent invocations per FIFO queue (unlimited for Standard).

---

## EventBridge vs SNS vs SQS

| | SQS | SNS | EventBridge |
|--|--|--|--|
| Pattern | Queue (point-to-point) | Pub/sub fan-out | Event bus (content routing) |
| Consumers | One consumer per message | All subscribers | Rules-based routing |
| Filtering | At consumer level | Message attribute filter | Rich content-based rules |
| Replay | No (DLQ only) | No | Archive + replay (30 days) |
| Sources | Your code | Your code | 200+ AWS services + SaaS |

EventBridge is the modern choice when you need routing based on event content or AWS service events.

---

## Connections
[[cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-lambda-patterns]] · [[cloud/cloud-monitoring]]
