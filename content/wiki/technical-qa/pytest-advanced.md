---
type: concept
category: technical-qa
para: resource
tags: [pytest, fixtures, plugins, parametrize, conftest, markers, hooks, coverage]
sources: []
updated: 2026-05-01
tldr: Beyond basic fixtures and assertions — plugins, custom hooks, fixture architecture, and test organisation at scale.
---

# Advanced pytest Patterns

Beyond basic fixtures and assertions. Plugins, custom hooks, fixture architecture, and test organisation at scale.

---

## Fixture Scoping and Dependencies

```python
# Scope hierarchy: session > package > module > class > function (default)
# Higher scope = created once, shared across many tests
# Lower scope = created fresh for each test

import pytest

# session: database connection (expensive to create)
@pytest.fixture(scope="session")
def db_engine():
    from sqlalchemy import create_engine
    engine = create_engine("postgresql+psycopg2://user:pass@localhost/testdb")
    yield engine
    engine.dispose()

# module: transaction that rolls back after each module
@pytest.fixture(scope="module")
def db_transaction(db_engine):
    conn = db_engine.connect()
    trans = conn.begin()
    yield conn
    trans.rollback()
    conn.close()

# function: isolated session per test (uses savepoint for nested rollback)
@pytest.fixture
def db_session(db_transaction):
    from sqlalchemy.orm import Session
    session = Session(bind=db_transaction)
    savepoint = db_transaction.begin_nested()   # SAVEPOINT
    yield session
    savepoint.rollback()                        # ROLLBACK TO SAVEPOINT
    session.close()

# Ordering: pytest respects scope hierarchy automatically.
# session fixtures run before module before function.
```

---

## conftest.py Architecture

```
tests/
  conftest.py              ← session-scope: engine, base_url, test user creation
  unit/
    conftest.py            ← mock factories, in-memory fakes
    test_order.py
  integration/
    conftest.py            ← real DB fixtures, seeded data
    test_checkout.py
  e2e/
    conftest.py            ← Playwright browser, authenticated page, test data
    test_checkout_flow.py
```

```python
# tests/conftest.py
import pytest

def pytest_configure(config):
    """Register custom markers so -W error::pytest.PytestUnknownMarkWarning doesn't fire."""
    config.addinivalue_line("markers", "slow: marks test as slow (> 5s)")
    config.addinivalue_line("markers", "integration: requires database")
    config.addinivalue_line("markers", "e2e: full browser test")

def pytest_collection_modifyitems(config, items):
    """Auto-mark based on path — no need to decorate every test."""
    for item in items:
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        if "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
            item.add_marker(pytest.mark.slow)
```

---

## Parametrize Patterns

```python
# 1. Simple parametrize
@pytest.mark.parametrize("discount_pct,price,expected", [
    (10, 100.00, 90.00),
    (25, 80.00, 60.00),
    (100, 50.00, 0.00),
    (0, 100.00, 100.00),
])
def test_apply_discount(discount_pct: int, price: float, expected: float) -> None:
    result = apply_discount(price, discount_pct)
    assert abs(result - expected) < 0.001

# 2. Indirect parametrize (fixture receives parameter)
@pytest.fixture
def user(request) -> dict:
    role = request.param   # receives the parametrize value
    return create_test_user(role=role)

@pytest.mark.parametrize("user", ["admin", "buyer", "guest"], indirect=True)
def test_dashboard_access(user: dict, client) -> None:
    response = client.get("/dashboard", headers={"Authorization": f"Bearer {user['token']}"})
    expected = 200 if user["role"] in ("admin", "buyer") else 403
    assert response.status_code == expected

# 3. Parametrize with IDs
ERROR_CASES = [
    pytest.param("", id="empty-string"),
    pytest.param(None, id="none"),
    pytest.param(" " * 256, id="too-long"),
    pytest.param("a@", id="invalid-email"),
]

@pytest.mark.parametrize("email", ERROR_CASES)
def test_invalid_email_rejected(email, client) -> None:
    response = client.post("/users", json={"email": email})
    assert response.status_code == 422

# 4. Matrix parametrize (cartesian product)
@pytest.mark.parametrize("env", ["dev", "staging"])
@pytest.mark.parametrize("method", ["GET", "POST"])
def test_cors_headers_present(env: str, method: str) -> None:
    # runs 2 × 2 = 4 combinations
    ...
```

---

## Custom Fixtures with Factory Pattern

```python
# tests/factories.py — composable test data factories
from dataclasses import dataclass, field
from typing import Any
import uuid

@dataclass
class OrderFactory:
    user_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"
    total: float = 99.99
    items: list[dict] = field(default_factory=lambda: [
        {"product_id": "prod_123", "quantity": 1, "price": 99.99}
    ])

    def build(self) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "status": self.status,
            "total": self.total,
            "items": self.items,
        }

    def create(self, db_session) -> dict:
        order = self.build()
        db_session.execute("INSERT INTO orders ...", order)
        return order

# In conftest.py
@pytest.fixture
def make_order(db_session):
    """Factory fixture — call it like: order = make_order(status='shipped')."""
    def _factory(**kwargs):
        return OrderFactory(**kwargs).create(db_session)
    return _factory

# In tests:
def test_shipped_order_cannot_be_cancelled(make_order, client) -> None:
    order = make_order(status="shipped")
    response = client.delete(f"/orders/{order['id']}")
    assert response.status_code == 409
```

---

## pytest Hooks for Custom Behaviour

```python
# conftest.py — custom hooks
import pytest

def pytest_runtest_setup(item):
    """Run before each test — log which test is starting."""
    print(f"\n[setup] {item.nodeid}")

def pytest_runtest_teardown(item, nextitem):
    """Run after each test — useful for cleanup."""
    pass

def pytest_runtest_makereport(item, call):
    """Called after each test phase (setup/call/teardown).
    Use to attach custom data to test reports."""
    if call.when == "call" and call.failed:
        # Attach screenshot path to the report for Allure/HTML reporter
        screenshot = item.config.rootdir / "screenshots" / f"{item.nodeid}.png"
        if screenshot.exists():
            item._report_sections.append(("call", "screenshot", str(screenshot)))

def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Print custom summary after all tests finish."""
    passed = len(terminalreporter.stats.get("passed", []))
    failed = len(terminalreporter.stats.get("failed", []))
    flaky = len(terminalreporter.stats.get("rerun", []))
    print(f"\nCustom summary: {passed} passed, {failed} failed, {flaky} rerun (flaky)")
```

---

## Coverage Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = """
  --cov=src
  --cov-report=term-missing:skip-covered
  --cov-report=html:htmlcov
  --cov-report=xml:coverage.xml
  --cov-fail-under=85
  --tb=short
  -q
"""
testpaths = ["tests"]
markers = [
    "slow: marks tests as slow",
    "integration: requires database or external services",
    "e2e: full browser tests",
]

[tool.coverage.run]
source = ["src"]
omit = [
    "src/**/migrations/**",
    "src/**/__init__.py",
    "src/**/conftest.py",
]
branch = true      # branch coverage (not just line coverage)

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "@abstractmethod",
    "raise NotImplementedError",
]
```

---

## Useful Plugins

```
pytest-xdist        — parallel test execution (-n auto)
pytest-asyncio      — async test support (mode = auto in pyproject.toml)
pytest-cov          — coverage integration
pytest-benchmark    — performance benchmarks
pytest-randomly     — randomise test order (catches order dependencies)
pytest-repeat       — run tests N times (flakiness detection: --count=10)
pytest-timeout      — per-test timeout (--timeout=30)
pytest-mock         — mocker fixture (thin wrapper around unittest.mock)
respx               — mock httpx requests
time-machine        — freeze/travel time in tests
dirty-equals        — flexible equality helpers (IsStr(), IsDict(), IsNow())

pyproject.toml config:
[tool.pytest.ini_options]
asyncio_mode = "auto"         # all async tests auto-detected
timeout = 30                  # global timeout, override per test
```

---

## Common Failure Cases

**Fixture teardown silently skipped after test exception**
Why: if a fixture body raises before `yield`, pytest skips teardown for that fixture scope entirely.
Detect: resources (DB connections, temp files) accumulate in CI and cause out-of-resource failures on later runs.
Fix: wrap the fixture body in `try/finally` so teardown always executes regardless of setup errors.

**Session-scoped fixture caches stale state across parametrized runs**
Why: `scope="session"` creates the fixture once; if a test mutates shared state, subsequent tests see contaminated data.
Detect: tests pass individually but fail when the full suite runs; order changes produced by `pytest-randomly` expose the bug.
Fix: downscope to `"module"` or `"function"`, or use a savepoint/rollback pattern so mutations are never committed.

**`pytest-asyncio` auto-mode skips async fixtures silently**
Why: `asyncio_mode = "auto"` applies to test functions but not to fixtures in older versions; async fixtures without `@pytest.fixture` and explicit `asyncio_mode` are collected as sync and never awaited.
Detect: async fixture always returns a coroutine object rather than the intended value; tests pass with wrong data.
Fix: upgrade to `pytest-asyncio >= 0.23` and verify `asyncio_mode = "auto"` is set under `[tool.pytest.ini_options]` in `pyproject.toml`.

**`--cov-fail-under` never triggers because coverage runs on the wrong source root**
Why: `--cov=src` resolves relative to the directory pytest is invoked from; running pytest from a subdirectory or inside a Docker container shifts the root.
Detect: coverage report shows 0% or omits expected modules even though tests pass.
Fix: set `source = ["src"]` under `[tool.coverage.run]` as an absolute anchor and always invoke pytest from the project root.

**Parametrized test IDs collide and produce duplicate node IDs**
Why: auto-generated IDs use `repr()` of the parameter; two parameters with identical `repr` (e.g., two different objects that both print as `<object>`) produce the same ID, causing pytest to skip the duplicate.
Detect: fewer test invocations than expected; `pytest --collect-only` shows fewer nodes than the parametrize list length.
Fix: always supply explicit `pytest.param(..., id="...")` strings for complex parameter types.

## Connections

[[tqa-hub]] · [[test-automation/pytest-patterns]] · [[technical-qa/parallel-test-execution]] · [[technical-qa/mock-strategies]] · [[technical-qa/flaky-test-management]] · [[qa/continuous-testing]]
## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?
