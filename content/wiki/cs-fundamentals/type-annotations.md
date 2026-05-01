---
type: concept
category: cs-fundamentals
para: resource
tags: [type-hints, typing, generics, protocol, typevar, mypy, pyright, typeddict]
sources: []
updated: 2026-05-01
---

# Python Type Annotations

Advanced typing patterns that make code self-documenting, statically verifiable, and composable.

---

## Core Concepts

```python
# Type hints are documentation + tooling — not runtime enforcement
# mypy / pyright catch type errors before they reach production

from typing import Any

# Basic annotations
def greet(name: str) -> str:
    return f"Hello, {name}"

# Optional — value or None
def find_user(user_id: str) -> str | None:   # Python 3.10+
    ...

# Union types
def process(value: int | str | float) -> str:
    return str(value)

# Any — opt out of type checking (use sparingly)
def legacy_api(data: Any) -> dict[str, Any]:
    ...
```

---

## Collections and Generics

```python
# Python 3.9+: use built-in types directly
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# Nested generics
def group_by_status(orders: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    ...

# Tuple — fixed-length with types for each position
def parse_coordinates(s: str) -> tuple[float, float]:
    lat, lon = s.split(",")
    return float(lat), float(lon)

# Variable-length homogeneous tuple
def get_ids() -> tuple[int, ...]:
    return (1, 2, 3)

# Callable
from typing import Callable

def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# Type aliases (Python 3.12)
type UserId = str
type OrderId = str
type PriceMap = dict[str, float]

# Pre-3.12
UserId = str
```

---

## TypeVar and Generics

```python
from typing import TypeVar, Generic

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Generic function — works on any type, preserves the type relationship
def first(items: list[T]) -> T | None:
    return items[0] if items else None

result: str | None = first(["a", "b", "c"])   # inferred as str | None

# Bounded TypeVar — T must be a subtype of SomeBase
from decimal import Decimal
Number = TypeVar("Number", int, float, Decimal)

def add(a: Number, b: Number) -> Number:
    return a + b

# Generic class
class Repository(Generic[T]):
    def __init__(self) -> None:
        self._store: dict[str, T] = {}

    def save(self, key: str, value: T) -> None:
        self._store[key] = value

    def get(self, key: str) -> T | None:
        return self._store.get(key)

class Order:
    ...

order_repo: Repository[Order] = Repository()
order_repo.save("ord_1", Order())
found: Order | None = order_repo.get("ord_1")
```

---

## Protocol — Structural Subtyping

```python
from typing import Protocol, runtime_checkable

# Protocol = structural typing (duck typing, but checked by the type checker)
# No inheritance required — if it has the right methods, it satisfies the Protocol

class Sendable(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...

class EmailClient:
    async def send(self, to: str, subject: str, body: str) -> None:
        ...  # satisfies Sendable without inheriting from it

class SlackClient:
    async def send(self, to: str, subject: str, body: str) -> None:
        ...  # also satisfies Sendable

def notify(notifier: Sendable, recipient: str) -> None:
    ...  # accepts ANY object with a send() method

notify(EmailClient())   # OK
notify(SlackClient())   # OK

# runtime_checkable: allows isinstance() checks (limited — only checks method names)
@runtime_checkable
class Serialisable(Protocol):
    def to_dict(self) -> dict: ...

isinstance(my_obj, Serialisable)   # True if my_obj has to_dict
```

---

## TypedDict

```python
from typing import TypedDict, NotRequired, Required

# TypedDict: typed dictionary shape — better than dict[str, Any]
class UserProfile(TypedDict):
    user_id: str
    name: str
    email: str
    age: int

# With optional fields (Python 3.11+: NotRequired)
class CreateOrderRequest(TypedDict):
    product_id: str
    quantity: int
    notes: NotRequired[str]         # optional field

# Functional syntax for keys that conflict with Python identifiers
ErrorResponse = TypedDict("ErrorResponse", {
    "error": str,
    "error-code": str,              # hyphen in key — can't use class syntax
    "message": str,
})
```

---

## Literal and Final

```python
from typing import Literal, Final, overload

# Literal: restrict a value to specific constants
OrderStatus = Literal["pending", "confirmed", "shipped", "cancelled"]

def update_status(order_id: str, status: OrderStatus) -> None:
    ...

update_status("ord_1", "shipped")    # OK
update_status("ord_1", "returned")  # type error

# Final: constant that cannot be reassigned
MAX_RETRIES: Final = 3
APP_NAME: Final[str] = "OrderService"

# Overload: different signatures for different input types
@overload
def process(value: int) -> str: ...
@overload
def process(value: str) -> int: ...
def process(value: int | str) -> str | int:
    if isinstance(value, int):
        return str(value)
    return len(value)
```

---

## ParamSpec and Concatenate

```python
from typing import ParamSpec, Concatenate
from functools import wraps

P = ParamSpec("P")

# Preserve the signature of the wrapped function in decorators
def log_calls(func: Callable[P, T]) -> Callable[P, T]:
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@log_calls
def add(a: int, b: int) -> int:
    return a + b

# Type checker knows add still takes (int, int) -> int after decoration
result: int = add(1, 2)    # OK
```

---

## mypy Configuration

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true                   # enables all strict checks
ignore_missing_imports = true   # don't error on untyped third-party libs
warn_return_any = true
warn_unused_ignores = true
disallow_any_explicit = false   # Any is sometimes needed for FFI/legacy code

# Per-module overrides
[[tool.mypy.overrides]]
module = ["tests.*"]
disallow_untyped_defs = false   # relax in tests

[[tool.mypy.overrides]]
module = ["legacy_module.*"]
ignore_errors = true            # temporary — fix gradually
```

```bash
# Run mypy
mypy src/

# With diff (only check changed files in CI)
mypy $(git diff --name-only origin/main -- '*.py')
```

---

## Connections

[[cs-fundamentals/se-hub]] · [[cs-fundamentals/data-validation]] · [[cs-fundamentals/software-design-principles]] · [[cs-fundamentals/dependency-injection]] · [[python/ecosystem]]
