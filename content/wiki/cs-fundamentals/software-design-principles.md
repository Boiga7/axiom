---
type: concept
category: cs-fundamentals
para: resource
tags: [design-principles, yagni, dry, kiss, solid, coupling, cohesion]
sources: []
updated: 2026-05-01
tldr: Heuristics for making code decisions. Not laws — principles that, when violated, should have a reason. Knowing when NOT to apply them is as important as applying them.
---

# Software Design Principles

Heuristics for making code decisions. Not laws. Principles that, when violated, should have a reason. Knowing when NOT to apply them is as important as applying them.

---

## SOLID

```
S — Single Responsibility Principle
    A class should have one reason to change.
    Violation: UserService that handles auth, profiles, email, billing, and reports.
    Fix: UserService, EmailService, BillingService — each with one concern.

O — Open/Closed Principle
    Open for extension, closed for modification.
    Adding new behaviour should not require changing existing code.
    Violation: if/elif chains that grow with every new type.
    Fix: polymorphism — new types implement an interface rather than adding branches.

L — Liskov Substitution Principle
    Subtypes must be substitutable for their base types.
    Violation: Square extends Rectangle but breaks width/height invariant.
    Fix: don't use inheritance for "is-a" when behaviour differs.

I — Interface Segregation Principle
    Clients shouldn't depend on interfaces they don't use.
    Violation: IAnimal with fly(), swim(), run() — penguins can't fly.
    Fix: ICanFly, ICanSwim, ICanRun — implement what's relevant.

D — Dependency Inversion Principle
    High-level modules shouldn't depend on low-level modules. Both depend on abstractions.
    Violation: OrderService directly imports PostgresOrderRepository.
    Fix: OrderService depends on OrderRepository interface; inject concrete implementation.
```

---

## DRY — Don't Repeat Yourself

```python
# BAD — same logic in multiple places
def calculate_checkout_vat(subtotal: float) -> float:
    return subtotal * 0.20

def calculate_invoice_vat(amount: float) -> float:
    return amount * 0.20   # duplicated

def calculate_refund_vat(price: float) -> float:
    return price * 0.20   # duplicated again

# GOOD — one authoritative source
VAT_RATE = Decimal("0.20")

def calculate_vat(amount: Decimal) -> Decimal:
    return amount * VAT_RATE

# DRY violation to watch for: not just code duplication
# Also applies to: business logic, configuration, schema definitions
# Don't try to eliminate ALL duplication — three similar lines may be fine
# DRY is about knowledge (intent), not just text
```

---

## YAGNI — You Aren't Gonna Need It

```python
# BAD — over-engineered for hypothetical future needs
class ProductRepository:
    def __init__(self, db, cache=None, search_engine=None, event_bus=None,
                 analytics=None, audit_log=None):
        self.db = db
        self.cache = cache           # "we might add caching later"
        self.search_engine = search_engine  # "we'll probably need search"
        self.event_bus = event_bus   # "we should emit events eventually"
        ...

# GOOD — build what you need now, add what you need when you need it
class ProductRepository:
    def __init__(self, db):
        self.db = db

    def get(self, product_id: str) -> Product | None:
        return self.db.query(Product).get(product_id)

# When caching is actually needed — add it
# When search is actually needed — add it
# Not before
```

---

## KISS — Keep It Simple, Stupid

```python
# BAD — clever but hard to understand
def get_active_users(users):
    return list(filter(lambda u: not u.deleted and u.last_seen > 
                datetime.now() - timedelta(days=30) and 
                (u.subscription_end is None or u.subscription_end > datetime.now()), users))

# GOOD — readable
def is_active_user(user: User) -> bool:
    if user.deleted:
        return False
    seen_recently = user.last_seen > datetime.now() - timedelta(days=30)
    has_valid_subscription = (user.subscription_end is None or 
                              user.subscription_end > datetime.now())
    return seen_recently and has_valid_subscription

def get_active_users(users: list[User]) -> list[User]:
    return [u for u in users if is_active_user(u)]
```

---

## Coupling and Cohesion

```
Coupling: how much a module depends on other modules
  High coupling: changing module A forces changes in B, C, D
  Low coupling: modules communicate through stable interfaces
  Target: low coupling

Cohesion: how related the responsibilities within a module are
  High cohesion: all code in a class serves one clear purpose
  Low cohesion: class does authentication, billing, email, and PDF generation
  Target: high cohesion

The tension: increasing cohesion often reduces coupling
  Extract the billing code → PaymentService (high cohesion)
  Now OrderService doesn't know about payment internals (low coupling)

Metrics (informal):
  Would a future engineer understand what this class does from its name?
  How many places change when I change this class?
  How many other classes does this class import?
```

---

## Law of Demeter (Don't Talk to Strangers)

```python
# BAD — reaching through the object graph
class OrderController:
    def process(self, order_id: str):
        order = self.order_repo.get(order_id)
        address = order.user.profile.shipping_address.city  # deep chain
        tax_rate = self.tax_calculator.get_rate(order.user.profile.country.code)

# GOOD — each object knows its own data
class Order:
    def shipping_city(self) -> str:
        return self.user.shipping_city()  # delegate to immediate neighbours

class User:
    def shipping_city(self) -> str:
        return self.profile.shipping_city()

class UserProfile:
    def shipping_city(self) -> str:
        return self.shipping_address.city

# Even better: pass what you need, not the whole object
def calculate_tax(amount: Decimal, country_code: str) -> Decimal:
    rate = TAX_RATES[country_code]
    return amount * rate
```

---

## Composition Over Inheritance

```python
# BAD — deep inheritance hierarchy
class Animal: ...
class Mammal(Animal): ...
class Pet(Mammal): ...
class DomesticDog(Pet): ...   # 4 levels deep — fragile

# GOOD — compose behaviours
from dataclasses import dataclass

@dataclass
class Dog:
    name: str
    can_bark: bool = True
    can_swim: bool = False      # some dogs can, some can't
    is_domestic: bool = True

# Or with protocols
class Swimmable(Protocol):
    def swim(self) -> None: ...

class Barkable(Protocol):
    def bark(self) -> None: ...

# Dog composes the behaviours it needs
# No inheritance required
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/clean-code]] · [[cs-fundamentals/oop-patterns]] · [[cs-fundamentals/architecture-patterns-se]] · [[cs-fundamentals/tdd-se]] · [[cs-fundamentals/code-review]]
