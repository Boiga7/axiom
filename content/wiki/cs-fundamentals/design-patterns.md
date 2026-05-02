---
type: concept
category: cs-fundamentals
para: resource
tags: [design-patterns, creational, structural, behavioural, gof]
sources: []
updated: 2026-05-01
tldr: "Reusable solutions to recurring design problems. The GoF (Gang of Four) catalogue: 23 patterns in three categories. Knowing when NOT to use a pattern is as valuable as knowing the pattern itself."
---

# Design Patterns

Reusable solutions to recurring design problems. The GoF (Gang of Four) catalogue: 23 patterns in three categories. Knowing when NOT to use a pattern is as valuable as knowing the pattern itself.

---

## Creational Patterns

### Factory Method

```python
from abc import ABC, abstractmethod

class Notifier(ABC):
    @abstractmethod
    def send(self, message: str, recipient: str) -> None: ...

class EmailNotifier(Notifier):
    def send(self, message: str, recipient: str) -> None:
        send_email(to=recipient, body=message)

class SMSNotifier(Notifier):
    def send(self, message: str, recipient: str) -> None:
        send_sms(to=recipient, text=message)

def create_notifier(channel: str) -> Notifier:
    match channel:
        case "email": return EmailNotifier()
        case "sms": return SMSNotifier()
        case _: raise ValueError(f"Unknown channel: {channel}")
```

Use when: object creation logic is complex, varies by type, or should be decoupled from usage.

### Builder

```python
@dataclass
class QueryBuilder:
    _table: str = ""
    _conditions: list[str] = field(default_factory=list)
    _limit: int | None = None
    _order_by: str | None = None

    def from_table(self, table: str) -> "QueryBuilder":
        return replace(self, _table=table)

    def where(self, condition: str) -> "QueryBuilder":
        return replace(self, _conditions=[*self._conditions, condition])

    def limit(self, n: int) -> "QueryBuilder":
        return replace(self, _limit=n)

    def order_by(self, column: str) -> "QueryBuilder":
        return replace(self, _order_by=column)

    def build(self) -> str:
        sql = f"SELECT * FROM {self._table}"
        if self._conditions:
            sql += " WHERE " + " AND ".join(self._conditions)
        if self._order_by:
            sql += f" ORDER BY {self._order_by}"
        if self._limit:
            sql += f" LIMIT {self._limit}"
        return sql

# Usage
query = (
    QueryBuilder()
    .from_table("orders")
    .where("status = 'pending'")
    .where("user_id = 42")
    .order_by("created_at DESC")
    .limit(10)
    .build()
)
```

### Singleton

```python
# Thread-safe singleton using module-level instance (Pythonic)
# settings.py
class Settings:
    def __init__(self):
        self.db_url = os.environ["DATABASE_URL"]
        self.debug = os.environ.get("DEBUG", "false") == "true"

settings = Settings()  # module-level instance — import this, not the class
```

Use sparingly. Singletons make testing harder. Prefer dependency injection.

---

## Structural Patterns

### Adapter

```python
# Legacy payment gateway has a different interface
class LegacyPaymentGateway:
    def make_payment(self, card_number: str, expiry: str, cents: int) -> bool: ...

# Your system expects this interface
class PaymentProvider(ABC):
    @abstractmethod
    def charge(self, amount_pence: int, card: Card) -> ChargeResult: ...

# Adapter wraps the legacy system
class LegacyGatewayAdapter(PaymentProvider):
    def __init__(self, gateway: LegacyPaymentGateway) -> None:
        self._gateway = gateway

    def charge(self, amount_pence: int, card: Card) -> ChargeResult:
        success = self._gateway.make_payment(card.number, card.expiry, amount_pence)
        return ChargeResult(success=success)
```

### Decorator

```python
# Add behaviour to objects without subclassing
from functools import wraps

def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except (ConnectionError, TimeoutError) as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (2 ** attempt))  # exponential backoff
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def fetch_user(user_id: str) -> User:
    return http_client.get(f"/users/{user_id}")
```

### Facade

```python
# Simplifies a complex subsystem behind a clean interface
class OrderFacade:
    def __init__(self, inventory: InventoryService, payment: PaymentService,
                 shipping: ShippingService, email: EmailService):
        self._inventory = inventory
        self._payment = payment
        self._shipping = shipping
        self._email = email

    def place_order(self, cart: Cart, payment_method: PaymentMethod) -> Order:
        self._inventory.reserve(cart.items)
        charge = self._payment.charge(cart.total, payment_method)
        order = Order.create(cart, charge)
        label = self._shipping.create_label(order)
        self._email.send_confirmation(order, label)
        return order
```

---

## Behavioural Patterns

### Strategy

```python
# Swap algorithms at runtime
class SortStrategy(Protocol):
    def sort(self, items: list) -> list: ...

class QuickSort:
    def sort(self, items: list) -> list:
        if len(items) <= 1:
            return items
        pivot = items[len(items) // 2]
        left = [x for x in items if x < pivot]
        right = [x for x in items if x > pivot]
        return self.sort(left) + [pivot] + self.sort(right)

class DataProcessor:
    def __init__(self, sort_strategy: SortStrategy) -> None:
        self._sort = sort_strategy

    def process(self, data: list) -> list:
        return self._sort.sort(data)
```

### Observer

```python
# Event-driven — subscribers react to publisher events
from typing import Callable

class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event: str, handler: Callable) -> None:
        self._handlers[event].append(handler)

    def publish(self, event: str, data: dict) -> None:
        for handler in self._handlers[event]:
            handler(data)

bus = EventBus()
bus.subscribe("order.placed", lambda e: send_confirmation_email(e["order_id"]))
bus.subscribe("order.placed", lambda e: update_inventory(e["items"]))
bus.publish("order.placed", {"order_id": "123", "items": [...]})
```

### Command

```python
# Encapsulate requests as objects — enables undo, queuing, logging
class Command(Protocol):
    def execute(self) -> None: ...
    def undo(self) -> None: ...

@dataclass
class CreateProductCommand:
    repo: ProductRepository
    name: str
    price: float
    _created_id: str = field(default="", init=False)

    def execute(self) -> None:
        product = self.repo.create(name=self.name, price=self.price)
        self._created_id = product.id

    def undo(self) -> None:
        self.repo.delete(self._created_id)
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/clean-code]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/architecture-patterns-se]] · [[python/ecosystem]]
