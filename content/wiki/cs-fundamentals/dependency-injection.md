---
type: concept
category: cs-fundamentals
para: resource
tags: [dependency-injection, ioc, di-container, fastapi, testing, inversion-of-control]
sources: []
updated: 2026-05-01
tldr: Providing dependencies from outside rather than creating them inside — the key to testable, composable code.
---

# Dependency Injection

Providing dependencies from outside rather than creating them inside. The key to testable, composable code.

---

## The Core Idea

```
Without DI (tight coupling):
  class OrderService:
      def __init__(self):
          self.db = PostgresDatabase()       # hardcoded
          self.email = SendGridEmailClient() # hardcoded

With DI (loose coupling):
  class OrderService:
      def __init__(self, db: Database, email: EmailClient):
          self.db = db       # injected from outside
          self.email = email # injected from outside

Benefits:
  - Swap implementations without changing the class (test doubles, stubs)
  - Classes express what they need, not how to get it
  - Inversion of Control: the composition root decides what to wire up
  - Testability: inject fakes in tests, real clients in production
```

---

## Python Without a Framework

```python
from typing import Protocol

# Define interfaces (Protocols — structural typing, no inheritance needed)
class Database(Protocol):
    async def execute(self, query: str, params: dict) -> list[dict]: ...

class EmailClient(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...

# Domain class depends only on the interfaces
class OrderService:
    def __init__(self, db: Database, email: EmailClient) -> None:
        self._db = db
        self._email = email

    async def place_order(self, user_id: str, product_id: str) -> dict:
        order = await self._db.execute(
            "INSERT INTO orders (user_id, product_id) VALUES (:uid, :pid) RETURNING *",
            {"uid": user_id, "pid": product_id},
        )
        await self._email.send(
            to=f"user+{user_id}@example.com",
            subject="Order confirmed",
            body=f"Your order {order[0]['id']} has been placed.",
        )
        return order[0]

# Composition root — one place that wires everything together
async def create_app() -> OrderService:
    db = AsyncPostgresDatabase(dsn=settings.DATABASE_URL)
    email = SendGridClient(api_key=settings.SENDGRID_KEY)
    return OrderService(db=db, email=email)

# In tests — inject fakes
class FakeDatabase:
    def __init__(self) -> None:
        self.orders: list[dict] = []

    async def execute(self, query: str, params: dict) -> list[dict]:
        row = {"id": "fake-id", **params}
        self.orders.append(row)
        return [row]

class FakeEmailClient:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject})

async def test_place_order_sends_email():
    db = FakeDatabase()
    email = FakeEmailClient()
    service = OrderService(db=db, email=email)
    await service.place_order("user-1", "prod-abc")
    assert len(email.sent) == 1
    assert "user-1" in email.sent[0]["to"]
```

---

## FastAPI Dependency Injection

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

app = FastAPI()
engine = create_async_engine(settings.DATABASE_URL)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

# --- Dependency functions ---
async def get_db() -> AsyncSession:
    async with SessionFactory() as session:
        yield session   # FastAPI handles cleanup

async def get_order_repo(db: AsyncSession = Depends(get_db)) -> OrderRepository:
    return OrderRepository(db)

async def get_order_service(
    repo: OrderRepository = Depends(get_order_repo),
    email: EmailClient = Depends(get_email_client),
) -> OrderService:
    return OrderService(repo=repo, email=email)

# --- Route ---
@app.post("/orders")
async def create_order(
    payload: CreateOrderRequest,
    service: OrderService = Depends(get_order_service),
) -> dict:
    return await service.place_order(payload.user_id, payload.product_id)
```

```python
# Override dependencies in tests — no monkey-patching required
from fastapi.testclient import TestClient

def override_get_db():
    yield fake_session   # from a test fixture

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# async overrides with httpx + pytest-asyncio
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client(fake_db_session):
    app.dependency_overrides[get_db] = lambda: fake_db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

---

## Scoped Dependencies

```python
# FastAPI dependency lifetimes:
#   function scope: new instance per request (default)
#   use_cache=False: new instance per Depends() call within same request
#   global: module-level singleton (dangerous for mutable state)

# Singleton pattern for clients that should not be recreated per request
@lru_cache
def get_settings() -> Settings:
    return Settings()   # reads .env once, reused for all requests

# Request-scoped: database sessions, request contexts
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionFactory() as session:
        yield session   # one session per request, closed after response

# Per-call: cheap, stateless helpers
async def get_pagination(page: int = 1, size: int = 20) -> Pagination:
    return Pagination(page=page, size=min(size, 100))
```

---

## Dependency Injection Containers

```python
# For large applications, use a DI container to manage wiring automatically.
# lagom is a lightweight Python DI container.

from lagom import Container

container = Container()

# Register bindings
container.define(Database, lambda: AsyncPostgresDatabase(settings.DATABASE_URL))
container.define(EmailClient, lambda: SendGridClient(settings.SENDGRID_KEY))

# Container resolves the full dependency graph automatically
order_service = container[OrderService]   # injects Database + EmailClient

# With FastAPI integration
from lagom.integrations.fast_api import FastApiIntegration

integration = FastApiIntegration(container)

@app.post("/orders")
async def create_order(
    payload: CreateOrderRequest,
    service: OrderService = integration.depends(OrderService),
) -> dict:
    return await service.place_order(payload.user_id, payload.product_id)
```

---

## Common DI Anti-Patterns

```
Anti-pattern: Service Locator (global registry)
  service = ServiceLocator.get(OrderService)  # hidden dependency
  Problem: dependencies are implicit, testing is harder

Anti-pattern: Constructor over-injection
  class OrderService:
      def __init__(self, db, email, cache, logger, metrics, pubsub, ...):
  Problem: too many dependencies = too many responsibilities (SRP violation)
  Fix: split into smaller services

Anti-pattern: Injecting the container
  class OrderService:
      def __init__(self, container: Container):
          self.db = container.get(Database)
  Problem: circular dependency on the container itself; defeats DI's purpose

Anti-pattern: Mutable shared state in singletons
  global_cache = {}   # shared across requests — race conditions guaranteed
  Fix: use Redis or per-request state
```

---

## Common Failure Cases

**Session leaked across requests (wrong dependency scope)**
Why: a database session declared as a module-level singleton is shared across concurrent requests, causing one request to see another's uncommitted data or exhaust the connection pool.
Detect: intermittent data corruption or `DetachedInstanceError` under load; single-threaded tests pass cleanly.
Fix: declare DB sessions as request-scoped `yield` dependencies so each request gets its own session that is closed on response.

**Circular dependency deadlock**
Why: Service A depends on Service B, which depends on Service A; the DI container cannot resolve either.
Detect: application raises a `RecursionError` or container resolution error at startup.
Fix: introduce an interface (Protocol) that both services depend on, or extract the shared logic into a third, lower-level service that neither depends on the other.

**`dependency_overrides` not cleared between tests**
Why: a FastAPI override registered in one test leaks into subsequent tests because `app.dependency_overrides.clear()` is not called in teardown.
Detect: tests pass in isolation but fail when run in sequence; failures are non-deterministic.
Fix: call `app.dependency_overrides.clear()` in a `yield` fixture's teardown block, or use `monkeypatch` which auto-resets after each test.

**Constructor over-injection hiding design problems**
Why: a class with 8+ injected dependencies is a sign it has too many responsibilities, not a DI configuration problem.
Detect: the constructor signature keeps growing; mocking all dependencies in a test requires 10+ lines of setup.
Fix: split the class along responsibility boundaries so each resulting class needs 2-4 dependencies.

## Connections

[[cs-fundamentals/se-hub]] · [[cs-fundamentals/software-design-principles]] · [[cs-fundamentals/tdd-se]] · [[cs-fundamentals/clean-code]] · [[web-frameworks/fastapi]] · [[cs-fundamentals/design-patterns]]
