---
type: concept
category: cs-fundamentals
para: resource
tags: [architecture, hexagonal, clean-architecture, layered, monolith, ports-adapters]
sources: []
updated: 2026-05-01
---

# Architecture Patterns

Structural approaches to organising application code. The right architecture makes code easier to test, change, and understand. The wrong one creates coupling that makes every change expensive.

---

## Layered Architecture

```
Traditional N-tier: Presentation → Business Logic → Data Access

  HTTP Request
      ↓
  [Controller / Route Handler]
      ↓
  [Service / Use Case]
      ↓
  [Repository / DAO]
      ↓
  [Database]

Dependencies flow downward only. Each layer knows only about the layer below it.

Problems:
  - DB leaks up through layers (ORM models in controllers)
  - Business logic ends up in the DB (stored procedures)
  - Hard to test business logic without a DB
```

---

## Hexagonal Architecture (Ports and Adapters)

```
                      [HTTP Adapter]
                           ↓
[CLI Adapter] → [Port] → [Application Core] → [Port] → [DB Adapter]
                                                   ↗
                                            [Cache Adapter]
                                            [Email Adapter]

Application core: pure domain logic. No framework imports. No DB imports.
Port: interface the core expects (Python: Protocol or ABC)
Adapter: concrete implementation of the port (HTTP, DB, Redis, CLI)

Key property: core can be tested without any infrastructure.
Swap Postgres for SQLite in tests → core doesn't care.
Swap HTTP for CLI → core doesn't care.
```

```python
# Domain: pure Python, no framework
# domain/order.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Order:
    id: str
    user_id: str
    items: list
    status: str = "pending"
    created_at: datetime = None

# Port: what the use case needs (interface)
# ports/order_repository.py
from typing import Protocol

class OrderRepository(Protocol):
    def save(self, order: Order) -> Order: ...
    def get(self, order_id: str) -> Order | None: ...
    def list_for_user(self, user_id: str) -> list[Order]: ...

# Application: use case, depends on port not adapter
# application/place_order.py
class PlaceOrderUseCase:
    def __init__(self, orders: OrderRepository, events: EventPublisher):
        self.orders = orders
        self.events = events

    def execute(self, user_id: str, items: list) -> Order:
        order = Order(id=generate_id(), user_id=user_id, items=items)
        saved = self.orders.save(order)
        self.events.publish("order.placed", {"order_id": saved.id})
        return saved

# Adapter: concrete implementation
# adapters/db/postgres_order_repository.py
class PostgresOrderRepository:
    def __init__(self, session):
        self.session = session

    def save(self, order: Order) -> Order:
        db_record = OrderRecord(id=order.id, user_id=order.user_id, status=order.status)
        self.session.add(db_record)
        self.session.commit()
        return order

    def get(self, order_id: str) -> Order | None:
        record = self.session.query(OrderRecord).get(order_id)
        if not record:
            return None
        return Order(id=record.id, user_id=record.user_id, items=[], status=record.status)

# Test: use fake adapter — no DB needed
def test_place_order_emits_event():
    orders = FakeOrderRepository()
    events = FakeEventPublisher()
    use_case = PlaceOrderUseCase(orders=orders, events=events)

    order = use_case.execute(user_id="u1", items=[{"product_id": "p1", "qty": 2}])

    assert order.status == "pending"
    assert events.published[0]["event_type"] == "order.placed"
```

---

## Clean Architecture (Uncle Bob)

```
         [Frameworks & Drivers]    ← outermost: web, DB, UI
              [Interface Adapters] ← controllers, gateways, presenters
                  [Use Cases]      ← application business rules
                      [Entities]   ← enterprise business rules (innermost)

Dependency Rule: source code dependencies only point INWARD.
Nothing in an inner circle knows about an outer circle.
```

---

## Monolith vs Services Decision

```
Start with a modular monolith:
  - One deployable unit, clear internal module boundaries
  - No network hops between modules (just function calls)
  - Easy to refactor — move code between modules without a migration
  - Extract to services when:
      a) a module has genuinely different scaling needs
      b) a team owns it and deploys independently
      c) it uses a different tech stack with good reason

Premature microservices anti-patterns:
  - Nano-services: 3-line services that have no reason to exist alone
  - Chatty services: services that make 10 calls to each other per request
  - Shared database: services are independent in name only
  - No service mesh: discovering services via hardcoded IPs
```

---

## Module Boundary Rules

```python
# Enforce module boundaries in Python with explicit __all__ and imports

# products/service.py — public API of the products module
from products._repository import ProductRepository
from products._models import Product, CreateProductInput

class ProductService:
    def list_products(self, category: str = None) -> list[Product]: ...
    def create_product(self, input: CreateProductInput) -> Product: ...

# products/__init__.py — only export the public surface
from products.service import ProductService
from products._models import Product, CreateProductInput

__all__ = ["ProductService", "Product", "CreateProductInput"]

# Other modules import from the public API only
from products import ProductService   # OK
from products._repository import ProductRepository  # VIOLATION — accessing internals
```

---

## CQRS — Command Query Separation

```python
# Reads and writes use different models and paths

# Write side — append-only, validated, normalised
class PlaceOrderCommand:
    user_id: str
    items: list[dict]

class PlaceOrderHandler:
    def handle(self, cmd: PlaceOrderCommand) -> str:  # returns order_id
        order = Order.create(user_id=cmd.user_id, items=cmd.items)
        self.event_store.append(order.uncommitted_events)
        return order.id

# Read side — denormalised for the specific view
class OrderSummaryQuery:
    user_id: str

class OrderSummaryHandler:
    def handle(self, query: OrderSummaryQuery) -> list[dict]:
        # Read from a separate read model (projection)
        return self.read_db.fetch_order_summaries(user_id=query.user_id)
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/design-patterns]] · [[cs-fundamentals/ddd-se]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/clean-code]]
