---
type: concept
category: cs-fundamentals
para: resource
tags: [event-driven, events, kafka, pub-sub, event-sourcing, cqrs, choreography]
sources: []
updated: 2026-05-01
---

# Event-Driven Architecture

Systems that communicate by producing and consuming events rather than direct calls. Temporal decoupling: producer doesn't wait for consumer; spatial decoupling: producer doesn't know who consumes.

---

## Core Patterns

```
Event notification:
  Something happened. Consumer decides what to do. No data in event.
  Example: OrderPlaced { order_id: "abc" }
  Consumer must call back to get order details → tight coupling risk

Event-carried state transfer:
  Event contains all data consumers need. No callbacks.
  Example: OrderPlaced { order_id: "abc", user_id: "u1", items: [...], total: 99.99 }
  Larger events, but fully decoupled consumption

Event sourcing:
  State is derived by replaying events. Current state = fold over event log.
  Append-only event store. No UPDATE/DELETE. Complete audit trail.

CQRS + event sourcing:
  Write side: commands → events → event store
  Read side: projections built by consuming the event stream
```

---

## Event Schema Design

```python
# events/models.py
from dataclasses import dataclass
from datetime import datetime
from typing import Any
import uuid

@dataclass
class Event:
    event_id: str
    event_type: str
    aggregate_id: str
    aggregate_type: str
    version: int
    timestamp: datetime
    payload: dict[str, Any]
    metadata: dict[str, Any]  # correlation_id, causation_id, user_id

def make_event(event_type: str, aggregate_id: str, aggregate_type: str,
               version: int, payload: dict) -> Event:
    return Event(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        aggregate_id=aggregate_id,
        aggregate_type=aggregate_type,
        version=version,
        timestamp=datetime.utcnow(),
        payload=payload,
        metadata={},
    )

# Example events
ORDER_PLACED = "order.placed"
ORDER_PAYMENT_RECEIVED = "order.payment_received"
ORDER_FULFILLMENT_STARTED = "order.fulfillment_started"
ORDER_SHIPPED = "order.shipped"
ORDER_CANCELLED = "order.cancelled"
```

---

## Kafka Producer and Consumer (Python)

```python
# events/producer.py
from confluent_kafka import Producer
from confluent_kafka.serialization import SerializationContext, MessageField
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
import json

class EventPublisher:
    def __init__(self, bootstrap_servers: str):
        self.producer = Producer({"bootstrap.servers": bootstrap_servers})

    def publish(self, topic: str, event: Event, key: str = None):
        self.producer.produce(
            topic=topic,
            key=(key or event.aggregate_id).encode(),
            value=json.dumps({
                "event_id": event.event_id,
                "event_type": event.event_type,
                "aggregate_id": event.aggregate_id,
                "version": event.version,
                "timestamp": event.timestamp.isoformat(),
                "payload": event.payload,
            }),
            headers={"correlation-id": event.metadata.get("correlation_id", "")},
            callback=self._delivery_report,
        )
        self.producer.flush()

    def _delivery_report(self, err, msg):
        if err:
            raise RuntimeError(f"Event delivery failed: {err}")

# events/consumer.py
from confluent_kafka import Consumer, KafkaError

class EventConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str, topics: list[str]):
        self.consumer = Consumer({
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,   # manual commit after processing
        })
        self.consumer.subscribe(topics)
        self.handlers: dict[str, callable] = {}

    def register_handler(self, event_type: str, handler: callable):
        self.handlers[event_type] = handler

    def run(self):
        while True:
            msg = self.consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(msg.error())

            event = json.loads(msg.value())
            handler = self.handlers.get(event["event_type"])
            if handler:
                handler(event)

            self.consumer.commit(msg)  # commit after successful processing
```

---

## Event Sourcing — Aggregate

```python
# domain/order.py
from dataclasses import dataclass, field
from typing import ClassVar

@dataclass
class Order:
    id: str
    status: str = "pending"
    items: list = field(default_factory=list)
    total: float = 0.0
    version: int = 0
    _uncommitted_events: list = field(default_factory=list, repr=False)

    # Event sourcing: apply events to rebuild state
    def apply(self, event: dict):
        handlers = {
            "order.placed": self._on_placed,
            "order.payment_received": self._on_payment_received,
            "order.cancelled": self._on_cancelled,
        }
        handler = handlers.get(event["event_type"])
        if handler:
            handler(event["payload"])
        self.version += 1

    def _on_placed(self, payload):
        self.items = payload["items"]
        self.total = payload["total"]
        self.status = "pending"

    def _on_payment_received(self, payload):
        self.status = "paid"

    def _on_cancelled(self, payload):
        self.status = "cancelled"

    # Command handlers — validate, then raise events
    def place(self, items: list, total: float):
        if self.version > 0:
            raise ValueError("Order already exists")
        event = make_event("order.placed", self.id, "order", self.version + 1,
                           {"items": items, "total": total})
        self.apply(event)
        self._uncommitted_events.append(event)

    def cancel(self, reason: str):
        if self.status not in ("pending", "paid"):
            raise ValueError(f"Cannot cancel order in status {self.status}")
        event = make_event("order.cancelled", self.id, "order", self.version + 1,
                           {"reason": reason})
        self.apply(event)
        self._uncommitted_events.append(event)

    @classmethod
    def reconstitute(cls, events: list) -> "Order":
        order = cls(id=events[0]["aggregate_id"])
        for event in events:
            order.apply(event)
        return order
```

---

## Outbox Pattern — Guaranteed Delivery

```python
# Publish events atomically with DB changes — no lost events on crash

def place_order(order_data: dict, db_session):
    with db_session.begin():
        # Write business data
        order = Order(**order_data)
        db_session.add(order)

        # Write event to outbox in same transaction
        outbox_event = OutboxEvent(
            event_type="order.placed",
            aggregate_id=str(order.id),
            payload=json.dumps({"order_id": str(order.id), "total": order.total}),
        )
        db_session.add(outbox_event)
    # Transaction committed atomically — DB has both order AND outbox entry

# Separate outbox relay process
async def outbox_relay():
    while True:
        events = db.query(OutboxEvent).filter_by(published=False).limit(100).all()
        for event in events:
            publisher.publish("orders", event)
            event.published = True
        db.commit()
        await asyncio.sleep(0.1)
```

---

## Dead Letter Queue Handling

```python
# Consumer with DLQ fallback
def process_with_dlq(event: dict, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            process_event(event)
            return
        except Exception as e:
            if attempt == max_retries - 1:
                dlq_publisher.publish("orders.dlq", {**event, "error": str(e)})
                logger.error(f"Event sent to DLQ after {max_retries} attempts", exc_info=True)
            else:
                time.sleep(2 ** attempt)  # exponential backoff
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/distributed-systems]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-step-functions]] · [[llms/ae-hub]]
