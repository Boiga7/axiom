---
type: concept
category: cloud
para: resource
tags: [eventbridge, event-bus, rules, pipes, schema-registry, aws, serverless]
sources: []
updated: 2026-05-01
tldr: Serverless event bus for decoupling producers from consumers across AWS services, SaaS, and custom applications.
---

# Amazon EventBridge

Serverless event bus for decoupling producers from consumers across AWS services, SaaS, and custom applications.

---

## Core Concepts

```
Event bus types:
  Default:    AWS service events land here automatically (EC2 state, CodePipeline, etc.)
  Custom:     Your application events; create one per domain boundary
  Partner:    SaaS events (Zendesk, Datadog, PagerDuty) — subscribe from partner console

Event anatomy:
  {
    "source": "com.myapp.orders",
    "detail-type": "OrderPlaced",
    "detail": {
      "orderId": "abc-123",
      "userId": "user-456",
      "total": 149.99
    }
  }

Rules:
  Evaluate incoming events and route to targets.
  Up to 300 rules per bus (soft limit).
  Multiple targets per rule (up to 5 by default).

Targets (150+ supported):
  Lambda, SQS, SNS, Step Functions, Kinesis,
  API Gateway, ECS task, EventBridge bus (cross-account/region)
```

---

## Sending Events

```python
import boto3
import json

events = boto3.client("eventbridge")

def publish_order_placed(order_id: str, user_id: str, total: float) -> None:
    response = events.put_events(
        Entries=[
            {
                "EventBusName": "arn:aws:events:eu-west-1:123456789:event-bus/orders",
                "Source": "com.myapp.orders",
                "DetailType": "OrderPlaced",
                "Detail": json.dumps({
                    "orderId": order_id,
                    "userId": user_id,
                    "total": total,
                }),
            }
        ]
    )
    if response["FailedEntryCount"] > 0:
        raise RuntimeError(f"Failed entries: {response['Entries']}")
```

```python
# Batch publish (up to 10 entries per call, max 256KB total)
def publish_batch(events_list: list[dict]) -> None:
    entries = [
        {
            "EventBusName": "orders",
            "Source": "com.myapp.orders",
            "DetailType": item["type"],
            "Detail": json.dumps(item["payload"]),
        }
        for item in events_list
    ]
    # Split into chunks of 10
    for i in range(0, len(entries), 10):
        events.put_events(Entries=entries[i:i+10])
```

---

## Event Rules — CDK

```python
from aws_cdk import (
    aws_events as events,
    aws_events_targets as targets,
    aws_lambda as lambda_,
    aws_sqs as sqs,
)

# Custom event bus
order_bus = events.EventBus(self, "OrderBus",
    event_bus_name="orders",
)

# Lambda target for order placed events
fulfillment_fn = lambda_.Function(...)

rule = events.Rule(self, "OrderPlacedRule",
    event_bus=order_bus,
    event_pattern=events.EventPattern(
        source=["com.myapp.orders"],
        detail_type=["OrderPlaced"],
        detail={
            "total": [{"numeric": [">=", 100]}]    # filter: only high-value orders
        },
    ),
    targets=[targets.LambdaFunction(fulfillment_fn)],
)

# DLQ for failed deliveries
dlq = sqs.Queue(self, "OrderDLQ", retention_period=Duration.days(14))

rule_with_dlq = events.Rule(self, "OrderCancelledRule",
    event_bus=order_bus,
    event_pattern=events.EventPattern(
        source=["com.myapp.orders"],
        detail_type=["OrderCancelled"],
    ),
    targets=[
        targets.LambdaFunction(
            refund_fn,
            dead_letter_queue=dlq,
            retry_attempts=2,
        )
    ],
)
```

---

## EventBridge Pipes

```
Pipes: point-to-point integration with filtering, enrichment, and transformation.
Source → Filter → Enrich → Transform → Target

Sources: SQS, Kinesis, DynamoDB Streams, Kafka, RabbitMQ
Enrichment: Lambda, Step Functions, API Gateway, EventBridge API Destinations
Targets: EventBridge bus, SQS, Kinesis, Lambda, Step Functions, ECS, HTTP endpoint

Use pipes when: you need to consume from a stream/queue and transform before routing.
Use rules when: you need fan-out (1 event → many targets).
```

```python
# CDK Pipe: SQS → Lambda enrichment → EventBridge bus
from aws_cdk import aws_pipes as pipes

pipe = pipes.CfnPipe(self, "OrderPipe",
    role_arn=pipe_role.role_arn,
    source=order_queue.queue_arn,
    source_parameters=pipes.CfnPipe.PipeSourceParametersProperty(
        sqs_queue_parameters=pipes.CfnPipe.PipeSourceSqsQueueParametersProperty(
            batch_size=10,
            maximum_batching_window_in_seconds=5,
        ),
    ),
    enrichment=enrichment_fn.function_arn,
    target=order_bus.event_bus_arn,
    target_parameters=pipes.CfnPipe.PipeTargetParametersProperty(
        event_bridge_event_bus_parameters=pipes.CfnPipe.PipeTargetEventBridgeEventBusParametersProperty(
            detail_type="OrderEnriched",
            source="com.myapp.orders",
        ),
    ),
)
```

---

## Schema Registry

```python
# EventBridge automatically discovers event schemas from your bus.
# Enable on custom buses and it builds a discoverable schema registry.

# Create a schema manually (OpenAPI 3 format):
schemas = boto3.client("schemas")

schemas.create_schema(
    RegistryName="discovered-schemas",
    SchemaName="com.myapp.orders@OrderPlaced",
    Type="OpenApi3",
    Content=json.dumps({
        "openapi": "3.0.0",
        "info": {"title": "OrderPlaced", "version": "1.0.0"},
        "paths": {},
        "components": {
            "schemas": {
                "AWSEvent": {
                    "type": "object",
                    "properties": {
                        "detail": {"$ref": "#/components/schemas/OrderPlaced"},
                    },
                },
                "OrderPlaced": {
                    "type": "object",
                    "properties": {
                        "orderId": {"type": "string"},
                        "userId": {"type": "string"},
                        "total": {"type": "number"},
                    },
                    "required": ["orderId", "userId", "total"],
                },
            }
        },
    }),
)

# Download code bindings (Python dataclasses auto-generated from schema)
# aws schemas get-code-binding-source --registry-name discovered-schemas \
#   --schema-name com.myapp.orders@OrderPlaced --language Python36
```

---

## Cross-Account Event Routing

```python
# Allow another account to put events on your bus
order_bus.add_to_resource_policy(iam.PolicyStatement(
    principals=[iam.AccountPrincipal("987654321098")],
    actions=["events:PutEvents"],
    resources=[order_bus.event_bus_arn],
))

# In the source account — target the remote bus directly
events.Rule(self, "CrossAccountRule",
    event_bus=source_bus,
    event_pattern=events.EventPattern(detail_type=["OrderPlaced"]),
    targets=[
        targets.EventBus(
            events.EventBus.from_event_bus_arn(
                self, "RemoteBus",
                "arn:aws:events:eu-west-1:123456789:event-bus/orders",
            )
        )
    ],
)
```

---

## Common Failure Cases

**Events published but no Lambda invocations — rule not matching**
Why: the `source` or `detail-type` in the event pattern uses a different case or format than what the publisher sends (e.g., `com.myapp.orders` vs `myapp.orders`), so no rule matches.
Detect: EventBridge CloudWatch metrics show `MatchedEvents = 0` for the rule despite `InvocationCount` being non-zero on the bus.
Fix: use the EventBridge console "Event pattern tester" with a sample event payload to confirm the pattern matches before deploying; check every field for exact string equality.

**Silent event loss — no DLQ on rule targets**
Why: EventBridge retries Lambda invocations for up to 24 hours on throttles/errors, but if the Lambda is consistently failing, events are eventually discarded with no alert.
Detect: Lambda `Throttles` or `Errors` CloudWatch metrics are non-zero and the DLQ is not filling (because no DLQ is configured).
Fix: add a `dead_letter_queue` to every EventBridge rule target that invokes Lambda; alarm on DLQ depth > 0.

**Cross-account event routing fails with 403**
Why: the target event bus in the destination account does not have a resource policy granting `events:PutEvents` to the source account's principal.
Detect: EventBridge `FailedInvocations` metric rises; CloudTrail in the destination account shows `AccessDenied` for `PutEvents`.
Fix: add the resource policy shown in the cross-account section to the destination bus, scoped to the specific source account ID.

**Pipe stops delivering — source SQS queue depth grows**
Why: the enrichment Lambda is throwing unhandled exceptions, causing the Pipe to enter a retry loop and stop polling the source queue.
Detect: the source SQS `ApproximateNumberOfMessagesNotVisible` climbs; Pipe execution history shows `FAILED` status.
Fix: add a try/except in the enrichment Lambda that returns a valid (possibly enriched but flagged) payload rather than throwing; configure a DLQ on the Pipe source.

## Connections

[[cloud-hub]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-step-functions]] · [[cloud/aws-lambda-patterns]] · [[cloud/serverless-patterns]]
