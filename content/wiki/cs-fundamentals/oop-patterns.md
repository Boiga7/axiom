---
type: concept
category: cs-fundamentals
para: resource
tags: [oop, design-patterns, solid, python, classes, inheritance, composition, factory, observer, repository]
tldr: Object-oriented programming and design patterns — classes, inheritance, composition, SOLID principles, and the four patterns that appear most in real codebases.
sources: []
updated: 2026-05-01
---

# OOP and Design Patterns

> **TL;DR** Object-oriented programming and design patterns — classes, inheritance, composition, SOLID principles, and the four patterns that appear most in real codebases.

## Classes and Objects

A class is a blueprint. An object is an instance of that blueprint.

```python
class LLMClient:
    # Class variable — shared across all instances
    default_model = "claude-sonnet-4-6"

    def __init__(self, api_key: str, model: str = None):
        # Instance variables — unique to each object
        self.api_key = api_key
        self.model = model or self.default_model
        self._client = None  # convention: _ prefix means "internal"

    def complete(self, prompt: str) -> str:
        # Instance method — has access to self
        raise NotImplementedError

    @classmethod
    def from_env(cls) -> "LLMClient":
        # Class method — factory, returns an instance, no self
        import os
        return cls(api_key=os.environ["ANTHROPIC_API_KEY"])

    @staticmethod
    def count_tokens(text: str) -> int:
        # Static method — utility, no self or cls
        return len(text.split()) * 1.3  # rough estimate
```

---

## Inheritance

A subclass inherits attributes and methods from a parent class.

```python
class LLMClient:
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def complete(self, prompt: str) -> str:
        raise NotImplementedError("Subclasses must implement complete()")

class AnthropicClient(LLMClient):
    def complete(self, prompt: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=self.api_key)
        message = client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

class OpenAIClient(LLMClient):
    def complete(self, prompt: str) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
```

**`super()`** — call the parent's method:

```python
class LoggingClient(AnthropicClient):
    def complete(self, prompt: str) -> str:
        print(f"Calling {self.model}...")
        result = super().complete(prompt)  # calls AnthropicClient.complete
        print(f"Got {len(result)} chars")
        return result
```

---

## Composition Over Inheritance

Inheritance models "is-a" relationships. Composition models "has-a" relationships. Prefer composition. It's more flexible and avoids deep inheritance hierarchies.

```python
# Inheritance approach (brittle — what if we want different retry AND different logging?)
class RetryingLoggingAnthropicClient(AnthropicClient):
    ...

# Composition approach (flexible — mix and match behaviours)
class RetryStrategy:
    def __init__(self, max_retries: int = 3, backoff: float = 2.0):
        self.max_retries = max_retries
        self.backoff = backoff

    def execute(self, func, *args, **kwargs):
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(self.backoff ** attempt)

class ResilientClient:
    def __init__(self, client: LLMClient, retry: RetryStrategy = None):
        self.client = client          # "has-a" LLMClient
        self.retry = retry or RetryStrategy()

    def complete(self, prompt: str) -> str:
        return self.retry.execute(self.client.complete, prompt)
```

---

## Abstract Base Classes and Protocols

```python
from abc import ABC, abstractmethod

class LLMClient(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str:
        """Send prompt and return response text."""
        ...

    @abstractmethod
    def stream(self, prompt: str):
        """Yield response tokens as they arrive."""
        ...

# Python 3.8+ Protocol — structural subtyping (duck typing, explicit)
from typing import Protocol

class Completable(Protocol):
    def complete(self, prompt: str) -> str: ...

# Any class with a .complete(prompt) method satisfies Completable — no need to inherit
```

**Use `ABC`** when you want inheritance + guaranteed interface. **Use `Protocol`** when you want duck typing — any class that has the right methods, regardless of inheritance.

---

## SOLID Principles

Five principles for writing maintainable object-oriented code.

### S — Single Responsibility

Each class has one reason to change.

```python
# Violates SRP — three responsibilities in one class
class UserManager:
    def create_user(self, data): ...
    def send_welcome_email(self, user): ...    # email responsibility
    def save_to_db(self, user): ...           # persistence responsibility

# Follows SRP
class UserRepository:
    def save(self, user): ...

class EmailService:
    def send_welcome(self, user): ...

class UserService:
    def __init__(self, repo: UserRepository, email: EmailService):
        self.repo = repo
        self.email = email

    def create_user(self, data):
        user = User(**data)
        self.repo.save(user)
        self.email.send_welcome(user)
        return user
```

### O — Open/Closed

Open for extension, closed for modification. Add new behaviour by adding new code, not changing existing code.

```python
# Violates OCP — add new provider = modify this function
def complete(provider: str, prompt: str) -> str:
    if provider == "anthropic": ...
    elif provider == "openai": ...   # must modify for each new provider

# Follows OCP — add new provider by adding a new class
class AnthropicClient(LLMClient):
    def complete(self, prompt): ...

class OpenAIClient(LLMClient):
    def complete(self, prompt): ...
# Never touch the calling code — it works with any LLMClient
```

### L — Liskov Substitution

Any subclass can replace its parent without breaking callers.

```python
# Violates LSP — RateLimitedClient raises an exception not in parent's contract
class RateLimitedClient(AnthropicClient):
    def complete(self, prompt: str) -> str:
        if self._is_rate_limited():
            raise RateLimitError()  # caller doesn't expect this
        return super().complete(prompt)

# Follows LSP — handle rate limiting internally, return a result
class RateLimitedClient(AnthropicClient):
    def complete(self, prompt: str) -> str:
        self._wait_for_rate_limit()  # blocks if needed, doesn't throw
        return super().complete(prompt)
```

### I — Interface Segregation

Don't force clients to implement interfaces they don't use. Split large interfaces into smaller, focused ones.

### D — Dependency Inversion

Depend on abstractions (interfaces), not concrete implementations.

```python
# Depends on concrete class — hard to test, hard to swap
class EvalRunner:
    def __init__(self):
        self.client = AnthropicClient(api_key="...")  # concrete

# Depends on abstraction — inject the dependency
class EvalRunner:
    def __init__(self, client: LLMClient):   # accepts any LLMClient
        self.client = client

# In tests:
runner = EvalRunner(client=MockClient())
# In production:
runner = EvalRunner(client=AnthropicClient(api_key=os.environ["KEY"]))
```

---

## Key Design Patterns

### Factory

Creates objects without specifying the exact class. Useful when the type of object depends on runtime conditions.

```python
class LLMClientFactory:
    _registry: dict[str, type] = {}

    @classmethod
    def register(cls, name: str, client_class: type):
        cls._registry[name] = client_class

    @classmethod
    def create(cls, provider: str, **kwargs) -> LLMClient:
        if provider not in cls._registry:
            raise ValueError(f"Unknown provider: {provider}")
        return cls._registry[provider](**kwargs)

LLMClientFactory.register("anthropic", AnthropicClient)
LLMClientFactory.register("openai", OpenAIClient)

client = LLMClientFactory.create("anthropic", api_key="sk-...")
```

### Observer

Objects subscribe to events on another object. The publisher doesn't know who's listening.

```python
from typing import Callable

class EvalRunner:
    def __init__(self):
        self._handlers: list[Callable] = []

    def on_result(self, handler: Callable):
        self._handlers.append(handler)
        return self  # allow chaining

    def _emit(self, result):
        for handler in self._handlers:
            handler(result)

    def run(self, eval_cases):
        for case in eval_cases:
            result = self._run_single(case)
            self._emit(result)  # all subscribers notified

# Usage
runner = EvalRunner()
runner.on_result(lambda r: print(f"Score: {r.score}"))
runner.on_result(lambda r: db.save(r))
runner.run(cases)
```

### Strategy

Encapsulate interchangeable algorithms. Pass the strategy in at runtime.

```python
from typing import Protocol

class ChunkingStrategy(Protocol):
    def chunk(self, text: str) -> list[str]: ...

class FixedSizeChunker:
    def __init__(self, size: int = 512):
        self.size = size
    def chunk(self, text: str) -> list[str]:
        words = text.split()
        return [" ".join(words[i:i+self.size]) for i in range(0, len(words), self.size)]

class SemanticChunker:
    def chunk(self, text: str) -> list[str]:
        # sentence-boundary-aware chunking
        ...

class DocumentProcessor:
    def __init__(self, chunker: ChunkingStrategy):
        self.chunker = chunker  # strategy injected

    def process(self, text: str):
        chunks = self.chunker.chunk(text)
        return [self.embed(c) for c in chunks]
```

### Repository

Abstracts data access behind a clean interface. Application code never writes raw SQL or ORM queries directly.

```python
from abc import ABC, abstractmethod

class EvalResultRepository(ABC):
    @abstractmethod
    def save(self, result: EvalResult) -> EvalResult: ...

    @abstractmethod
    def find_by_run_id(self, run_id: str) -> list[EvalResult]: ...

    @abstractmethod
    def find_regressions(self, threshold: float) -> list[EvalResult]: ...

class PostgresEvalResultRepository(EvalResultRepository):
    def __init__(self, session):
        self.session = session

    def save(self, result: EvalResult) -> EvalResult:
        self.session.add(result)
        self.session.commit()
        return result

    def find_by_run_id(self, run_id: str) -> list[EvalResult]:
        return self.session.query(EvalResult).filter_by(run_id=run_id).all()

class InMemoryEvalResultRepository(EvalResultRepository):
    def __init__(self):
        self._store: list[EvalResult] = []

    def save(self, result: EvalResult) -> EvalResult:
        self._store.append(result)
        return result

    def find_by_run_id(self, run_id: str) -> list[EvalResult]:
        return [r for r in self._store if r.run_id == run_id]
```

The application code uses `EvalResultRepository`. It never knows whether it's talking to Postgres or an in-memory store. Tests use `InMemoryEvalResultRepository`.

---

### Builder

Constructs complex objects step-by-step via a fluent interface. Each call returns `self` (or a new copy), making the construction readable.

```python
from dataclasses import dataclass, field, replace

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

One instance per process. In Python, the module-level instance pattern is the idiomatic approach.

```python
# settings.py
class Settings:
    def __init__(self):
        self.db_url = os.environ["DATABASE_URL"]
        self.debug = os.environ.get("DEBUG", "false") == "true"

settings = Settings()  # module-level — import this, not the class
```

Use sparingly. Singletons make testing harder. Prefer dependency injection.

### Adapter

Wraps an incompatible interface so it matches the one callers expect.

```python
class LegacyPaymentGateway:
    def make_payment(self, card_number: str, expiry: str, cents: int) -> bool: ...

class PaymentProvider(ABC):
    @abstractmethod
    def charge(self, amount_pence: int, card: Card) -> ChargeResult: ...

class LegacyGatewayAdapter(PaymentProvider):
    def __init__(self, gateway: LegacyPaymentGateway) -> None:
        self._gateway = gateway

    def charge(self, amount_pence: int, card: Card) -> ChargeResult:
        success = self._gateway.make_payment(card.number, card.expiry, amount_pence)
        return ChargeResult(success=success)
```

### Decorator (structural)

Adds behaviour to objects at runtime without subclassing.

```python
from functools import wraps

def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except (ConnectionError, TimeoutError):
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (2 ** attempt))
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def fetch_user(user_id: str) -> User:
    return http_client.get(f"/users/{user_id}")
```

### Facade

Simplifies a complex subsystem behind a single clean interface.

```python
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

### Command

Encapsulates a request as an object. Enables undo, queuing, and logging.

```python
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

## Dataclasses and Pydantic (Modern Python)

In Python, prefer `dataclasses` or `pydantic.BaseModel` over hand-rolled `__init__` for data-holding classes.

```python
from dataclasses import dataclass
from pydantic import BaseModel

@dataclass
class EvalCase:
    input: str
    expected: str
    weight: float = 1.0

class EvalResult(BaseModel):
    case_id: str
    score: float
    passed: bool
    latency_ms: int
    model: str = "claude-sonnet-4-6"
    # Pydantic validates types on construction and can serialise to JSON
```

## Common Failure Cases

**Deep inheritance hierarchy breaks on new requirement**
Why: six-level inheritance chains mean a change to a base class silently affects every subclass, usually in unexpected ways.
Detect: you're adding an `if isinstance(self, SubclassX)` guard inside a parent method.
Fix: flatten to two levels maximum and move divergent behaviour into composed strategy objects.

**Violating LSP by raising unexpected exceptions in a subclass**
Why: callers depend on the parent's implicit contract (no unexpected exceptions), and subclasses that add new failure modes break that assumption.
Detect: callers catch exceptions that aren't declared in the parent class's docstring or type hints.
Fix: handle the new failure mode internally in the subclass and return a safe default, or update the parent's contract explicitly.

**Factory registry not thread-safe**
Why: a class-level `dict` mutated by `register()` can be corrupted if two threads call it concurrently during startup.
Detect: intermittent `KeyError` or partial registration under load.
Fix: populate the registry at import time (module-level) rather than lazily at runtime.

**Observer leaking references and preventing garbage collection**
Why: storing handler callbacks in a list holds a strong reference to the subscriber, keeping it alive even after it should be collected.
Detect: memory grows monotonically as subscribers are added; `gc.get_referrers()` shows the handler list as the only remaining reference.
Fix: use `weakref.WeakSet` or `weakref.ref` for handler storage, or provide an explicit `off()` / `unsubscribe()` method.

**Repository returning ORM objects outside the session scope**
Why: SQLAlchemy lazy-loads relationships on attribute access; accessing them after the `Session` is closed raises `DetachedInstanceError`.
Detect: `sqlalchemy.orm.exc.DetachedInstanceError` when reading a relationship attribute in a service or test.
Fix: eager-load all needed relationships inside the repository method (`joinedload`/`selectinload`), or return plain dataclasses/Pydantic models rather than ORM instances.

## Connections

- [[cs-fundamentals/system-design]] — SOLID principles apply to system-level component design as well as class design
- [[python/ecosystem]] — Python's `abc`, `dataclasses`, `typing.Protocol` are the implementation tools
- [[evals/methodology]] — evalcheck uses repository and strategy patterns internally
- [[test-automation/pytest-patterns]] — dependency injection (DI) makes code testable; pytest fixtures are a DI mechanism
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
