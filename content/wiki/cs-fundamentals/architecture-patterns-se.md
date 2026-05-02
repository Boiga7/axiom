---
type: concept
category: cs-fundamentals
para: resource
tags: [architecture, hexagonal, clean-architecture, layered, monolith, ports-adapters]
sources: []
updated: 2026-05-01
tldr: Structural approaches to organising application code. The right architecture makes code easier to test, change, and understand. The wrong one creates coupling that makes every change expensive.
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

## Common Failure Cases

**ORM models leaked into the controller layer**
Why: in layered architecture, returning raw SQLAlchemy model objects from service methods lets the HTTP layer depend on the persistence model, coupling all three layers together.
Detect: controller code references ORM model attributes directly, or lazy-loaded relationships trigger database queries inside JSON serialisation.
Fix: define explicit response schemas (Pydantic models or dataclasses) and map from ORM to schema inside the repository or service layer before the object crosses the boundary.

**Hexagonal core importing framework code**
Why: an import of `fastapi`, `sqlalchemy`, or `celery` inside `domain/` or `application/` violates the port/adapter boundary and makes the core untestable without the full stack.
Detect: run `grep -r "import fastapi\|import sqlalchemy" domain/ application/`; any hit is a violation.
Fix: move the dependency to an adapter, expose only a protocol/interface to the core, and inject the concrete implementation at the composition root.

**Premature microservices extraction creating chatty services**
Why: an application is split into services before domain boundaries are clear; services make multiple synchronous calls to each other per user request, adding network latency and failure points.
Detect: distributed trace shows a single user request fanning out to 5+ downstream service calls in series.
Fix: merge chatty services back into a modular monolith; only extract when a module has a clear bounded context, independent scaling needs, and a dedicated team.

**Shared database between nominally independent services**
Why: two services connect to the same database schema for convenience, creating invisible coupling; a schema migration by one service breaks the other.
Detect: more than one service listed in the connection string for the same database host and schema.
Fix: give each service its own schema or database; share data via events or API calls, not direct table access.

## Connections
[[se-hub]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/design-patterns]] · [[cs-fundamentals/ddd-se]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/clean-code]]
