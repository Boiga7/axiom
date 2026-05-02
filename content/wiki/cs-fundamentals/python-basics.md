---
type: concept
category: cs-fundamentals
para: resource
tags: [python, basics, fundamentals]
sources: []
updated: 2026-05-01
tldr: The entry point for the vault's 0→SE→AE path. Covers the language features you need before moving on to [[cs-fundamentals/oop-patterns]] and [[python/ecosystem]].
---

# Python Basics

The entry point for the vault's 0→SE→AE path. Covers the language features you need before moving on to [[cs-fundamentals/oop-patterns]] and [[python/ecosystem]].

---

## Variables and Types

```python
# Dynamic typing — the variable holds a reference, not a typed slot
name = "Alice"
age = 30
height = 1.75
is_active = True
nothing = None

# Check type at runtime
type(name)   # <class 'str'>

# Type hints (checked by mypy/pyright, not enforced at runtime)
def greet(name: str) -> str:
    return f"Hello, {name}"
```

### Core types

| Type | Example | Notes |
|------|---------|-------|
| `str` | `"hello"` | Immutable. Use f-strings for formatting. |
| `int` | `42` | Arbitrary precision. |
| `float` | `3.14` | IEEE 754 double. |
| `bool` | `True / False` | Subclass of `int` — `True == 1`. |
| `NoneType` | `None` | The absence of a value. |
| `list` | `[1, 2, 3]` | Mutable ordered sequence. |
| `tuple` | `(1, 2, 3)` | Immutable ordered sequence. |
| `dict` | `{"a": 1}` | Mutable key→value map. Keys must be hashable. |
| `set` | `{1, 2, 3}` | Mutable, unordered, unique values. |

---

## String Formatting

```python
name = "Alice"
score = 95.5

# f-strings (preferred — Python 3.6+)
print(f"Name: {name}, Score: {score:.1f}")

# Format spec mini-language
f"{score:.2f}"      # "95.50"  (2 decimal places)
f"{1000000:,}"      # "1,000,000"  (thousands separator)
f"{'left':<10}"     # "left      "  (left-align, width 10)
f"{42:05d}"         # "00042"  (zero-pad)
```

---

## Control Flow

```python
# if / elif / else
x = 10
if x > 0:
    print("positive")
elif x == 0:
    print("zero")
else:
    print("negative")

# for loop — iterates over any iterable
for item in [1, 2, 3]:
    print(item)

for i, item in enumerate(["a", "b", "c"]):
    print(i, item)  # 0 a, 1 b, 2 c

# while loop
n = 0
while n < 5:
    n += 1

# break / continue
for i in range(10):
    if i == 3:
        continue    # skip 3
    if i == 7:
        break       # stop at 7
```

---

## Functions

```python
# Basic
def add(a: int, b: int) -> int:
    return a + b

# Default arguments
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}"

# *args — collects positional extras into a tuple
def total(*numbers: float) -> float:
    return sum(numbers)

total(1, 2, 3)  # 6.0

# **kwargs — collects keyword extras into a dict
def log(message: str, **metadata) -> None:
    print(message, metadata)

log("started", env="prod", version="1.2")

# Combining
def func(required, *args, keyword_only, **kwargs):
    pass
```

### Return multiple values (returns a tuple)

```python
def min_max(nums: list[int]) -> tuple[int, int]:
    return min(nums), max(nums)

low, high = min_max([3, 1, 4, 1, 5])
```

---

## Comprehensions

```python
numbers = [1, 2, 3, 4, 5]

# List comprehension
squares = [x**2 for x in numbers]                    # [1, 4, 9, 16, 25]
evens   = [x for x in numbers if x % 2 == 0]         # [2, 4]

# Dict comprehension
squared_map = {x: x**2 for x in numbers}             # {1:1, 2:4, 3:9, ...}

# Set comprehension
unique_mods = {x % 3 for x in numbers}               # {0, 1, 2}

# Generator expression (lazy — doesn't build a list in memory)
total = sum(x**2 for x in range(1_000_000))
```

---

## Error Handling

```python
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except (TypeError, ValueError) as e:
    print(f"Bad input: {e}")
else:
    # Runs only if no exception was raised
    print(f"Result: {result}")
finally:
    # Always runs — use for cleanup
    print("done")

# Raise your own exceptions
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("denominator cannot be zero")
    return a / b
```

---

## Context Managers (`with`)

The `with` statement calls `__enter__` on open and `__exit__` on close — guaranteeing cleanup even if an exception occurs.

```python
# File I/O — file is closed automatically
with open("data.txt", "r") as f:
    contents = f.read()

# Multiple context managers
with open("input.txt") as fin, open("output.txt", "w") as fout:
    fout.write(fin.read())

# Write your own
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    import time
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{label}: {elapsed:.3f}s")

with timer("my_function"):
    expensive_operation()
```

---

## Decorators

A decorator wraps a function to add behaviour before/after it runs. The `@` syntax is sugar for `func = decorator(func)`.

```python
import functools

# Logging decorator
def log_calls(func):
    @functools.wraps(func)  # preserves __name__ and __doc__
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"{func.__name__} returned {result}")
        return result
    return wrapper

@log_calls
def add(a, b):
    return a + b

add(2, 3)
# Calling add
# add returned 5
```

Common built-in decorators:
- `@staticmethod` — method with no `self` or `cls`
- `@classmethod` — method receiving the class as first arg (`cls`)
- `@property` — turns a method into an attribute-style getter

---

## Modules and Imports

```python
# Import a module
import os
import json

# Import specific names
from pathlib import Path
from typing import Optional, Union

# Import with alias
import numpy as np
import pandas as pd

# Relative import (inside a package)
from .utils import helper
from ..models import User

# __name__ guard — code only runs when the file is executed directly
if __name__ == "__main__":
    main()
```

### Package structure

```
my_package/
    __init__.py       # makes the folder a package
    core.py
    utils.py
    tests/
        __init__.py
        test_core.py
```

---

## Common Built-ins

```python
# Sequence operations
len([1, 2, 3])          # 3
sorted([3, 1, 2])        # [1, 2, 3]
sorted(items, key=lambda x: x.name, reverse=True)
reversed([1, 2, 3])      # iterator
zip([1,2], ["a","b"])    # [(1,"a"), (2,"b")]
map(str, [1, 2, 3])      # iterator of strings
filter(None, [0, 1, 2])  # iterator dropping falsy values
any([False, True])        # True
all([True, True])         # True
min(3, 1, 4), max(3, 1, 4)

# String methods
"hello world".split()          # ["hello", "world"]
" hello ".strip()              # "hello"
",".join(["a", "b", "c"])     # "a,b,c"
"Hello".lower(), "hello".upper()
"haystack".startswith("hay")   # True
"find me".replace("me", "it")  # "find it"

# Dict operations
d = {"a": 1, "b": 2}
d.get("c", 0)           # 0 (default, no KeyError)
d.items()               # dict_items — iterate as (key, value) pairs
d.keys(), d.values()
{**d, "c": 3}           # merge dicts (Python 3.9+: d | {"c": 3})
```

---

## Connections

- [[cs-fundamentals/oop-patterns]] — classes, SOLID, patterns (next step after this page)
- [[python/ecosystem]] — production Python: async, Pydantic, uv, structlog, polars
- [[synthesis/getting-started]] — first API call using Python
- [[synthesis/learning-path]] — where this page fits in the full 0→AE curriculum
