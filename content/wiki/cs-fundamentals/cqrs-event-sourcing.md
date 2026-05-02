---
type: concept
category: cs-fundamentals
para: resource
tags: [cqrs, event-sourcing, commands, queries, projections, event-store, snapshots]
sources: []
updated: 2026-05-01
tldr: Separating reads from writes, and storing state as a sequence of events rather than current values.
---

# CQRS and Event Sourcing

Separating reads from writes, and storing state as a sequence of events rather than current values.

---

## CQRS — Command Query Responsibility Segregation

```
Core principle:
  Commands: change state, return nothing (or only an ID)
  Queries:  read state, change nothing

Why separate them?
  - Commands and queries have different consistency requirements
  - Reads can be scaled independently of writes
  - Read models can be optimised for query patterns (denormalised)
  - Write models can be optimised for consistency and validation

When NOT to use CQRS:
  - Simple CRUD with no complex business logic
  - Small teams where the indirection adds complexity without benefit
  - When you don't have separate read/write scaling needs
```

---

## CQRS in Python

```python
# commands.py — Command side: validation and state change
from dataclasses import dataclass
from uuid import UUID, uuid4
from decimal import Decimal

@dataclass(frozen=True)
class CreateOrderCommand:
    user_id: UUID
    product_id: str
    quantity: int
    unit_price: Decimal

@dataclass(frozen=True)
class CancelOrderCommand:
    order_id: UUID
    reason: str

# command_handler.py
from sqlalchemy.ext.asyncio import AsyncSession

class OrderCommandHandler:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def handle_create(self, cmd: CreateOrderCommand) -> UUID:
        order = Order(
            id=uuid4(),
            user_id=cmd.user_id,
            product_id=cmd.product_id,
            quantity=cmd.quantity,
            status="pending",
            total=cmd.unit_price * cmd.quantity,
        )
        self._session.add(order)
        await self._session.flush()
        return order.id

    async def handle_cancel(self, cmd: CancelOrderCommand) -> None:
        order = await self._session.get(Order, cmd.order_id)
        if order is None:
            raise OrderNotFoundError(cmd.order_id)
        if order.status not in ("pending", "confirmed"):
            raise InvalidStateTransitionError(order.status, "cancelled")
        order.status = "cancelled"
        order.cancellation_reason = cmd.reason
```

```python
# queries.py — Query side: optimised read models
from sqlalchemy import text

class OrderQueryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_order_summary(self, order_id: UUID) -> dict | None:
        # Read model can be denormalised — join at query time or use a separate view
        result = await self._session.execute(
            text("""
                SELECT o.id, o.status, o.total,
                       u.name as user_name, u.email,
                       p.name as product_name
                FROM orders o
                JOIN users u ON u.id = o.user_id
                JOIN products p ON p.id = o.product_id
                WHERE o.id = :order_id
            """),
            {"order_id": str(order_id)},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def list_user_orders(
        self, user_id: UUID, status: str | None = None
    ) -> list[dict]:
        where = "WHERE o.user_id = :user_id"
        params: dict = {"user_id": str(user_id)}
        if status:
            where += " AND o.status = :status"
            params["status"] = status
        result = await self._session.execute(
            text(f"SELECT id, status, total, created_at FROM orders {where}"),
            params,
        )
        return [dict(row) for row in result.mappings()]
```

---

## Event Sourcing

```
Core principle:
  Instead of storing CURRENT state:
    orders: {id: 1, status: "shipped", quantity: 2}

  Store the SEQUENCE OF EVENTS that produced it:
    OrderPlaced   {order_id: 1, quantity: 2, at: T1}
    OrderShipped  {order_id: 1, tracking: "ABC", at: T2}

Benefits:
  - Complete audit trail — you know every state transition and why
  - Temporal queries — reconstruct state at any point in time
  - Event replay — rebuild projections, fix bugs by replaying
  - Decoupling — event consumers can evolve independently

Costs:
  - More complex to implement and query
  - Eventual consistency between write model and read projections
  - Snapshot needed for aggregates with long event histories
```

---

## Event Store Pattern

```python
# events.py
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import Any
from uuid import UUID, uuid4
import json

@dataclass
class DomainEvent:
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    aggregate_id: UUID = None
    event_type: str = ""
    payload: dict = field(default_factory=dict)
    version: int = 0   # optimistic concurrency

@dataclass
class OrderPlaced(DomainEvent):
    event_type: str = "OrderPlaced"

@dataclass
class OrderConfirmed(DomainEvent):
    event_type: str = "OrderConfirmed"

@dataclass
class OrderShipped(DomainEvent):
    event_type: str = "OrderShipped"

@dataclass
class OrderCancelled(DomainEvent):
    event_type: str = "OrderCancelled"

# event_store.py
class EventStore:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def append(
        self, aggregate_id: UUID, events: list[DomainEvent], expected_version: int
    ) -> None:
        # Optimistic concurrency check
        current = await self._session.execute(
            text("SELECT MAX(version) FROM events WHERE aggregate_id = :id"),
            {"id": str(aggregate_id)},
        )
        current_version = current.scalar() or 0
        if current_version != expected_version:
            raise ConcurrencyError(expected_version, current_version)

        for i, event in enumerate(events):
            await self._session.execute(
                text("""
                    INSERT INTO events (event_id, aggregate_id, event_type, payload, version, occurred_at)
                    VALUES (:eid, :aid, :type, :payload, :version, :at)
                """),
                {
                    "eid": str(event.event_id),
                    "aid": str(aggregate_id),
                    "type": event.event_type,
                    "payload": json.dumps(event.payload),
                    "version": expected_version + i + 1,
                    "at": event.occurred_at,
                },
            )

    async def load(self, aggregate_id: UUID) -> list[DomainEvent]:
        result = await self._session.execute(
            text("""
                SELECT event_type, payload, version, occurred_at
                FROM events WHERE aggregate_id = :id ORDER BY version
            """),
            {"id": str(aggregate_id)},
        )
        events = []
        for row in result.mappings():
            event = DomainEvent(
                aggregate_id=aggregate_id,
                event_type=row["event_type"],
                payload=json.loads(row["payload"]),
                version=row["version"],
                occurred_at=row["occurred_at"],
            )
            events.append(event)
        return events
```

---

## Aggregate with Event Sourcing

```python
class OrderAggregate:
    def __init__(self) -> None:
        self.id: UUID | None = None
        self.status: str = "new"
        self.quantity: int = 0
        self.version: int = 0
        self._pending_events: list[DomainEvent] = []

    @classmethod
    def reconstitute(cls, events: list[DomainEvent]) -> "OrderAggregate":
        agg = cls()
        for event in events:
            agg._apply(event)
        return agg

    def place(self, order_id: UUID, quantity: int, user_id: UUID) -> None:
        if self.status != "new":
            raise InvalidStateTransitionError(self.status, "placed")
        event = DomainEvent(
            aggregate_id=order_id,
            event_type="OrderPlaced",
            payload={"quantity": quantity, "user_id": str(user_id)},
        )
        self._apply(event)
        self._pending_events.append(event)

    def ship(self, tracking_number: str) -> None:
        if self.status != "confirmed":
            raise InvalidStateTransitionError(self.status, "shipped")
        event = DomainEvent(
            aggregate_id=self.id,
            event_type="OrderShipped",
            payload={"tracking": tracking_number},
        )
        self._apply(event)
        self._pending_events.append(event)

    def _apply(self, event: DomainEvent) -> None:
        match event.event_type:
            case "OrderPlaced":
                self.id = event.aggregate_id
                self.status = "pending"
                self.quantity = event.payload["quantity"]
            case "OrderConfirmed":
                self.status = "confirmed"
            case "OrderShipped":
                self.status = "shipped"
            case "OrderCancelled":
                self.status = "cancelled"
        self.version = event.version
```

---

## Snapshots

```python
# For aggregates with hundreds of events, replay becomes slow.
# Snapshot = serialised aggregate state at a point in time.

async def load_with_snapshot(
    event_store: EventStore,
    snapshot_store: SnapshotStore,
    aggregate_id: UUID,
) -> OrderAggregate:
    snapshot = await snapshot_store.load(aggregate_id)
    if snapshot:
        agg = OrderAggregate.from_snapshot(snapshot["state"])
        # Only load events AFTER the snapshot version
        events = await event_store.load_from_version(
            aggregate_id, after_version=snapshot["version"]
        )
    else:
        agg = OrderAggregate()
        events = await event_store.load(aggregate_id)

    for event in events:
        agg._apply(event)
    return agg

# Take a snapshot every N events (e.g., every 100)
async def save_with_snapshot(
    event_store: EventStore,
    snapshot_store: SnapshotStore,
    agg: OrderAggregate,
    SNAPSHOT_THRESHOLD: int = 100,
) -> None:
    await event_store.append(agg.id, agg._pending_events, agg.version)
    if agg.version % SNAPSHOT_THRESHOLD == 0:
        await snapshot_store.save(agg.id, agg.version, agg.to_snapshot())
```

---

## Projections (Read Model Builder)

```python
# A projection consumes events and builds a denormalised read table.
# Run as a background worker or as an event handler.

class OrderProjection:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def handle(self, event: DomainEvent) -> None:
        match event.event_type:
            case "OrderPlaced":
                await self._session.execute(
                    text("""
                        INSERT INTO order_summary (id, status, quantity, user_id)
                        VALUES (:id, 'pending', :qty, :uid)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {"id": str(event.aggregate_id),
                     "qty": event.payload["quantity"],
                     "uid": event.payload["user_id"]},
                )
            case "OrderShipped":
                await self._session.execute(
                    text("UPDATE order_summary SET status='shipped' WHERE id=:id"),
                    {"id": str(event.aggregate_id)},
                )
```

---

## Common Failure Cases

**Optimistic concurrency conflict ignored, events written with duplicate versions**
Why: two concurrent requests load the same aggregate, each sees `expected_version=5`, and both successfully append events — one overwrites the other's changes silently if the version check is not atomic.
Detect: run concurrent write tests against the same aggregate ID and verify only one succeeds; check for version gaps in the events table.
Fix: enforce the version check inside a database transaction with a row-level lock, or use `INSERT ... WHERE version = expected_version` with an affected-rows check.

**Projection lag causing stale reads after a write**
Why: the read model is updated asynchronously by a background worker; a user submits a command and immediately queries the read model before the projection has processed the event.
Detect: write a test that places an order and immediately reads `order_summary` — if the row is missing or shows old state, lag is present.
Fix: either accept eventual consistency and tell the UI to poll, use an event-driven UI update, or for critical paths read directly from the write model on the first request after a command.

**Aggregate replay slows to seconds for long-lived aggregates**
Why: an aggregate with 10,000+ events must replay all of them on every load, and there are no snapshots configured; latency grows linearly with event count.
Detect: measure `EventStore.load()` duration as the event count grows in staging; flag when it exceeds your latency budget (typically 100ms).
Fix: implement snapshot checkpoints at a fixed interval (e.g., every 100 events) and load only the delta between the latest snapshot and the current version.

**Event schema changed without a migration strategy**
Why: an `OrderPlaced` event payload had `product_id: str` in v1 but `product_id: UUID` in v2; old events in the store cannot be deserialised by the new aggregate code.
Detect: run event replay on historical data after a payload field type change; if deserialisation raises, schema migration is needed.
Fix: use an upcasting pattern — a version field on each event, and a chain of upcasters that transform old event shapes into the current schema during `_apply`.

## Connections

[[cs-fundamentals/se-hub]] · [[cs-fundamentals/architecture-patterns-se]] · [[cs-fundamentals/event-driven-architecture]] · [[cs-fundamentals/database-transactions]] · [[cs-fundamentals/microservices-patterns]] · [[llms/ae-hub]]
