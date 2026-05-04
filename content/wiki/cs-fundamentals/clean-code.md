---
type: concept
category: cs-fundamentals
para: resource
tags: [clean-code, solid, naming, refactoring, code-quality]
sources: []
updated: 2026-05-01
tldr: Writing code that is easy to read, understand, and change. Clean code is not about aesthetics — it's about reducing the cognitive cost of every future change.
---

# Clean Code

Writing code that is easy to read, understand, and change. Clean code is not about aesthetics. It's about reducing the cognitive cost of every future change. The primary audience for code is other engineers (and your future self).

---

## Naming

```python
# Bad
def calc(x, y, z):
    return x * y * (1 - z)

# Good
def calculate_discounted_price(unit_price: float, quantity: int, discount_rate: float) -> float:
    return unit_price * quantity * (1 - discount_rate)
```

Rules:
- Functions: verbs (`get_user`, `send_notification`, `validate_email`)
- Classes: nouns (`UserRepository`, `PaymentProcessor`, `OrderFactory`)
- Variables: meaningful nouns, not abbreviations (`user_id` not `uid`, `total_price` not `tp`)
- Booleans: `is_`, `has_`, `can_`, `should_` prefix (`is_active`, `has_permission`)
- Length: as long as needed, no longer. Short names are fine in short scopes.

---

## Function Design

```python
# Bad: does too many things, hard to test
def process_order(order_id: str, user_email: str, card_token: str) -> dict:
    order = db.get(order_id)
    user = db.get_user(user_email)
    charge_result = stripe.charge(card_token, order.total)
    if charge_result.success:
        order.status = "paid"
        db.save(order)
        email_service.send_confirmation(user.email, order)
        inventory.decrement(order.items)
    return {"status": order.status}

# Good: each function does one thing
def charge_order(order: Order, card_token: str) -> ChargeResult:
    return stripe.charge(card_token, order.total)

def mark_order_paid(order: Order) -> Order:
    order.status = "paid"
    return order

def fulfil_order(order: Order) -> None:
    inventory.decrement(order.items)
    email_service.send_confirmation(order.user_email, order)
```

Rules:
- One level of abstraction per function
- No side effects you can't see from the signature
- Short: if it needs a scroll, consider splitting it
- Arguments: 0 is ideal; 1-2 fine; 3+ raises questions; 4+ usually a signal to introduce a dataclass

---

## SOLID Principles

**S — Single Responsibility:** A class/module has one reason to change.

```python
# Bad: UserService does authentication AND email AND persistence
# Good: AuthService, EmailService, UserRepository are separate

class UserRepository:
    def save(self, user: User) -> None: ...
    def find_by_email(self, email: str) -> User | None: ...

class EmailService:
    def send_welcome(self, user: User) -> None: ...

class RegistrationService:
    def __init__(self, repo: UserRepository, email: EmailService) -> None:
        self._repo = repo
        self._email = email

    def register(self, email: str, password: str) -> User:
        user = User(email=email, password_hash=hash_password(password))
        self._repo.save(user)
        self._email.send_welcome(user)
        return user
```

**O — Open/Closed:** Open for extension, closed for modification. Add new behaviour without changing existing code.

```python
# Bad: adding a new payment type requires editing the same function
def process_payment(method: str, amount: float):
    if method == "card":
        stripe.charge(amount)
    elif method == "paypal":
        paypal.pay(amount)
    elif method == "bank":          # ← modifying existing code
        bank_transfer.send(amount)

# Good: new payment types extend without modifying
from abc import ABC, abstractmethod

class PaymentProvider(ABC):
    @abstractmethod
    def charge(self, amount: float) -> None: ...

class StripeProvider(PaymentProvider):
    def charge(self, amount: float) -> None:
        stripe.charge(amount)

class BankTransferProvider(PaymentProvider):  # ← extension, not modification
    def charge(self, amount: float) -> None:
        bank_transfer.send(amount)
```

**L — Liskov Substitution:** Subclasses must be usable wherever base classes are used.

**I — Interface Segregation:** Clients shouldn't be forced to depend on interfaces they don't use. Prefer many small interfaces over one large one.

**D — Dependency Inversion:** High-level modules don't depend on low-level modules. Both depend on abstractions.

```python
# Bad
class OrderService:
    def __init__(self):
        self.repo = PostgresOrderRepository()   # hardwired concrete class

# Good
class OrderService:
    def __init__(self, repo: OrderRepository):  # depends on abstraction
        self.repo = repo
```

---

## Code Smells

| Smell | Sign | Fix |
|---|---|---|
| Long method | > 20 lines, needs comments to understand sections | Extract method |
| Long parameter list | > 3 parameters | Introduce Parameter Object / dataclass |
| Shotgun surgery | One change requires edits in many files | Consolidate related code |
| Feature envy | Method uses another class's data more than its own | Move method to that class |
| Data clumps | Same 3-4 values always travel together | Extract to a class/dataclass |
| Magic numbers | `if status == 3:` | Named constants |
| Duplicate code | Same logic in 2+ places | Extract to shared function |
| Dead code | Commented-out code, unused functions | Delete it |
| Comments explaining what | `# increment counter by 1` | Rename the code instead |

---

## Comments — The Right Use

```python
# Bad: restates the code
# Check if user is active
if user.is_active:
    send_email(user)

# Good: explains WHY, not WHAT — a non-obvious constraint
# Stripe requires amount in pence, not pounds
amount_pence = int(amount_pounds * 100)

# Good: documents a gotcha
# Note: filter() returns a lazy generator — must convert to list
# before the database session closes, or we get a DetachedInstanceError
users = list(filter(is_eligible, db.query(User).all()))
```

---

## Common Failure Cases

**God class absorbing every responsibility over time**
Why: a `UserService` starts with registration, then authentication, then email, then payments all get added incrementally; no single addition seems large enough to split, but the class ends up with 20 unrelated methods.
Detect: a class that imports from more than 5 unrelated modules, or whose methods cannot be grouped by a single domain noun.
Fix: apply Single Responsibility — extract cohesive clusters of methods into dedicated classes (`AuthService`, `UserEmailService`), each with one reason to change.

**Dependency inversion bypassed by constructing concrete classes internally**
Why: `class OrderService: def __init__(self): self.repo = PostgresOrderRepository()` hardwires the implementation, making unit tests require a live database.
Detect: the class is impossible to test without its full infrastructure dependency; mocking requires monkey-patching rather than injection.
Fix: accept the dependency as a constructor parameter typed against a Protocol or ABC, and inject the concrete implementation at the composition root.

**Comments that restate the code rather than explaining intent**
Why: developers add `# increment counter by 1` out of habit or to look thorough, which adds noise without signal and rots as soon as the code changes.
Detect: read each comment and check whether deleting it loses any information the code itself doesn't already convey.
Fix: delete what-comments; rename the code to be self-explanatory; write why-comments only when there is a non-obvious constraint, gotcha, or deliberate trade-off.

**Premature abstraction creating indirection with no benefit**
Why: a developer extracts a helper after seeing code repeated twice, but the two instances diverge immediately after extraction, leading to a helper full of `if mode == "A"` branches that is harder to read than the originals.
Detect: a shared utility function with more than two boolean flags or mode parameters controlling its behaviour.
Fix: prefer duplication over the wrong abstraction; wait for three or more genuinely identical callsites before extracting, and only when the abstraction boundary is stable.

## Connections
[[se-hub]] · [[cs-fundamentals/oop-patterns]] · [[cs-fundamentals/software-design-principles]] · [[cs-fundamentals/tdd-se]] · [[cs-fundamentals/code-review]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
