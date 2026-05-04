---
type: concept
category: cs-fundamentals
para: resource
tags: [ddd, domain-driven-design, aggregate, bounded-context, ubiquitous-language, value-object]
sources: []
updated: 2026-05-01
tldr: Aligning software design with the business domain. DDD provides a vocabulary and set of patterns for modelling complex business domains — making the code reflect the real world rather than database ta...
---

# Domain-Driven Design

Aligning software design with the business domain. DDD provides a vocabulary and set of patterns for modelling complex business domains. Making the code reflect the real world rather than database tables.

---

## Strategic Design

```
Bounded Context:
  A explicit boundary within which a domain model applies consistently.
  "Customer" in the Sales context is different from "Customer" in the Support context.
  Each BC has its own code, team, and data model.

Ubiquitous Language:
  A shared vocabulary between developers and domain experts.
  Used in: code (class names, method names), tests, conversations, documentation.
  "Place an order" not "insert into orders table"
  "Cancel a booking" not "set status=0"

Context Map:
  Documents relationships between bounded contexts.
  Relationship types:
    - Shared Kernel: two BCs share a common model
    - Customer/Supplier: upstream BC defines API for downstream
    - Conformist: downstream adopts upstream model entirely
    - Anti-Corruption Layer: downstream translates to its own model
    - Separate Ways: no integration, duplicate if needed
```

---

## Tactical Design Patterns

```
Entity:
  Has a unique identity that persists across state changes.
  Two customers with the same name are still different entities.
  Identity is what makes them the same, not attribute equality.

Value Object:
  Defined entirely by its attributes. No identity.
  Two Money(100, "GBP") instances are equal.
  Immutable — no setters, only create new instances.
  Money(100, "GBP").add(Money(50, "GBP")) → Money(150, "GBP")

Aggregate:
  A cluster of entities and value objects treated as a unit.
  Has a single Aggregate Root — the only entry point for external interaction.
  Ensures consistency within its boundary.
  Loaded and saved as a whole.

Domain Event:
  Something that happened in the domain. Past tense. Immutable.
  OrderPlaced, PaymentReceived, ItemShipped.
  Events cross bounded context boundaries.

Repository:
  Abstraction for storing and retrieving aggregates.
  Collection-like interface. Hides persistence details.
  One repository per aggregate root.

Domain Service:
  Operation that doesn't belong on any single entity.
  Stateless. Named after a domain concept.
  "Transfer funds from account A to account B" (involves two entities).
```

---

## Value Objects

```python
# Value objects: immutable, equality by value
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)  # frozen=True makes it immutable
class Money:
    amount: Decimal
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be 3-letter ISO code")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        return Money(self.amount * factor, self.currency)

    def __str__(self) -> str:
        return f"{self.amount:.2f} {self.currency}"

@dataclass(frozen=True)
class Address:
    line1: str
    city: str
    country: str
    postcode: str

    def __post_init__(self):
        if not self.country or len(self.country) != 2:
            raise ValueError("Country must be 2-letter ISO code")

@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self):
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', self.value):
            raise ValueError(f"Invalid email: {self.value}")
```

---

## Aggregate Root

```python
# Order aggregate — enforces all order invariants
class Order:
    """Aggregate root for the Order aggregate.
    All changes to order or its items go through this class."""

    def __init__(self, order_id: str, customer_id: str):
        self.id = order_id
        self.customer_id = customer_id
        self._items: list[OrderItem] = []
        self._status = OrderStatus.DRAFT
        self._events: list = []

    def add_item(self, product_id: str, quantity: int, unit_price: Money):
        if self._status != OrderStatus.DRAFT:
            raise DomainError(f"Cannot add items to {self._status} order")
        if quantity <= 0:
            raise DomainError("Quantity must be positive")

        existing = next((i for i in self._items if i.product_id == product_id), None)
        if existing:
            existing.increase_quantity(quantity)
        else:
            self._items.append(OrderItem(product_id=product_id, quantity=quantity,
                                         unit_price=unit_price))

    def submit(self):
        if not self._items:
            raise DomainError("Cannot submit an empty order")
        self._status = OrderStatus.SUBMITTED
        self._events.append(OrderSubmitted(order_id=self.id, total=self.total()))

    def cancel(self, reason: str):
        if self._status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
            raise DomainError(f"Cannot cancel {self._status} order")
        self._status = OrderStatus.CANCELLED
        self._events.append(OrderCancelled(order_id=self.id, reason=reason))

    def total(self) -> Money:
        if not self._items:
            return Money(Decimal("0"), "GBP")
        totals = [item.subtotal() for item in self._items]
        result = totals[0]
        for t in totals[1:]:
            result = result.add(t)
        return result

    def uncommitted_events(self) -> list:
        events = list(self._events)
        self._events.clear()
        return events
```

---

## Repository

```python
from typing import Protocol

class OrderRepository(Protocol):
    def save(self, order: Order) -> None: ...
    def get(self, order_id: str) -> Order | None: ...
    def find_by_customer(self, customer_id: str) -> list[Order]: ...

# Concrete implementation
class PostgresOrderRepository:
    def __init__(self, session):
        self.session = session
        self.mapper = OrderMapper()  # maps between domain model and DB row

    def save(self, order: Order) -> None:
        db_row = self.mapper.to_db(order)
        self.session.merge(db_row)
        self.session.commit()

    def get(self, order_id: str) -> Order | None:
        db_row = self.session.query(OrderRecord).get(order_id)
        return self.mapper.to_domain(db_row) if db_row else None
```

---

## Bounded Context Example

```
E-commerce platform — three bounded contexts:

Catalogue BC:
  Language: Product, Category, Variant, SKU, Availability
  Owns: product DB, search index
  Events emitted: ProductCreated, PriceChanged, ProductDiscontinued

Orders BC:
  Language: Order, LineItem, Customer, Payment, Shipping
  "Product" here is a snapshot (price locked at order time), not the live Catalogue product
  Events emitted: OrderPlaced, OrderShipped, OrderCancelled

Inventory BC:
  Language: StockItem, Warehouse, Reservation, Replenishment
  "Product" here is a physical thing in a location
  Events consumed: OrderPlaced → reserve stock
  Events emitted: StockReserved, StockDepleted
```

---

## Common Failure Cases

**Domain logic leaking into the repository**
Why: a `save()` method that also validates business rules, sends events, or updates related aggregates mixes persistence concerns with domain logic; the repository becomes untestable in isolation.
Detect: a repository method contains `if` branches that enforce domain invariants rather than simply persisting and loading the aggregate.
Fix: keep repositories to a single responsibility — load and store aggregates; move all invariant checks and domain rule enforcement into the aggregate or a domain service.

**Aggregate boundary too large, causing lock contention**
Why: an `Order` aggregate that includes all line items, the customer, payment details, and shipping history must be loaded and saved atomically; concurrent writes from different parts of the UI fight over the same aggregate root.
Detect: high update conflict rates in the `optimistic_lock_version` column, or slow aggregate saves under load.
Fix: split the aggregate along natural consistency boundaries — `Order` (items, status), `Payment` (payment attempts, result), and `ShipmentTracking` are separate aggregates that communicate via domain events.

**Ubiquitous language not reflected in the code**
Why: developers use `record`, `entry`, and `data` as variable names while the domain experts say `order`, `booking`, and `reservation`; divergence makes conversations between developers and domain experts confusing.
Detect: sit in a domain expert conversation and note every time you have to mentally translate between what they say and what the code is called.
Fix: rename code identifiers to match the ubiquitous language immediately when a mismatch is found; this is not a cosmetic change — it is the primary benefit of DDD.

**Value objects mutated by callers**
Why: a `Money` object is passed to a function which modifies its `amount` attribute directly (possible if `frozen=False`); other holders of the same object see unexpected state changes.
Detect: a unit test modifies an attribute on a value object and checks whether another reference sees the change.
Fix: declare all value objects with `@dataclass(frozen=True)`; any "mutation" must produce a new instance via methods like `.add()` or `.multiply()`.

## Connections
[[se-hub]] · [[cs-fundamentals/architecture-patterns-se]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/event-driven-architecture]] · [[cs-fundamentals/oop-patterns]] · [[cs-fundamentals/database-design]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
