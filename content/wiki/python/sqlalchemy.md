---
type: concept
category: python
para: resource
tags: [sqlalchemy, orm, async, postgresql, database, python]
sources: []
updated: 2026-05-01
tldr: Python's standard ORM and SQL toolkit. Version 2.0 (2023) introduced fully type-annotated models via `Mapped[T]` + `mapped_column()`, a unified `select()` API, and first-class async support.
---

# SQLAlchemy 2.0

Python's standard ORM and SQL toolkit. Version 2.0 (2023) introduced fully type-annotated models via `Mapped[T]` + `mapped_column()`, a unified `select()` API, and first-class async support. The old `session.query()` API is legacy.

---

## Setup — Async Engine

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# asyncpg driver for PostgreSQL
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost:5432/dbname",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # test connections before using from pool
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,   # prevents DetachedInstanceError after commit
)
```

---

## Defining Models

```python
from sqlalchemy import String, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationship — lazy loaded by default in async (use selectinload instead)
    orders: Mapped[list["Order"]] = relationship("Order", back_populates="user")

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    total: Mapped[float] = mapped_column()
    status: Mapped[str] = mapped_column(String(50), default="pending")

    user: Mapped["User"] = relationship("User", back_populates="orders")
```

---

## Session Pattern — FastAPI Dependency

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Dependency for FastAPI routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# In routes
from fastapi import Depends

@app.get("/users/{user_id}")
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404)
    return user
```

---

## Querying — select() API

```python
from sqlalchemy import select, update, delete, and_, or_

# Fetch by primary key (preferred)
user = await db.get(User, user_id)

# SELECT with filter
stmt = select(User).where(User.email == "alice@example.com")
result = await db.execute(stmt)
user = result.scalar_one_or_none()

# Multiple conditions
stmt = select(Order).where(
    and_(Order.user_id == user_id, Order.status == "pending")
).order_by(Order.created_at.desc()).limit(10)
orders = (await db.execute(stmt)).scalars().all()

# INSERT
new_user = User(email="bob@example.com", name="Bob")
db.add(new_user)
await db.flush()   # assigns id without committing

# UPDATE (ORM style — mutate and commit)
user.name = "Alice Updated"
await db.commit()

# Bulk UPDATE (more efficient — no ORM overhead)
stmt = update(Order).where(Order.user_id == user_id).values(status="cancelled")
await db.execute(stmt)

# DELETE
await db.delete(user)   # or: await db.execute(delete(User).where(...))
```

---

## Eager Loading — Relationships in Async

Lazy loading (accessing `user.orders` in async) raises `MissingGreenlet`. Always load relationships explicitly.

```python
from sqlalchemy.orm import selectinload, joinedload

# selectinload: issues a second SELECT for the related objects
# Best for one-to-many (avoids Cartesian product)
stmt = (
    select(User)
    .where(User.id == user_id)
    .options(selectinload(User.orders))
)
user = (await db.execute(stmt)).scalar_one()
# user.orders is now populated — safe to access

# joinedload: JOIN in one query
# Best for many-to-one (single related object)
stmt = (
    select(Order)
    .options(joinedload(Order.user))
)
orders = (await db.execute(stmt)).unique().scalars().all()
```

---

## Core API — Raw SQL Without ORM

```python
from sqlalchemy import text

# Parameterised query — always use :param syntax, never f-strings
result = await db.execute(
    text("SELECT id, email FROM users WHERE created_at > :cutoff"),
    {"cutoff": datetime(2026, 1, 1)},
)
rows = result.fetchall()
for row in rows:
    print(row.id, row.email)

# Core select (no ORM mapping)
from sqlalchemy import Table, Column, MetaData

metadata = MetaData()
users_table = Table("users", metadata, autoload_with=engine)  # reflects existing schema
```

---

## Connection Pool — Tuning for Production

```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # base connections kept open
    max_overflow=20,       # extra connections under load
    pool_timeout=30,       # seconds to wait for a connection
    pool_recycle=1800,     # recycle connections older than 30 min (avoids stale TCP)
    pool_pre_ping=True,    # SELECT 1 before each checkout (catches dropped connections)
)

# Check pool state
print(engine.pool.size())
print(engine.pool.checkedout())
```

---

## Schema Creation and Alembic

```python
# Create all tables (dev only — use Alembic in production)
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)

# Drop all (tests)
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.drop_all)
```

Alembic handles production migrations. See [[cs-fundamentals/database-design]] for migration patterns.

---

## Testing — Override the Session

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

@pytest.fixture
async def test_db():
    engine = create_async_engine("postgresql+asyncpg://test:test@localhost/test_db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

# Override FastAPI dependency
app.dependency_overrides[get_db] = lambda: test_db
```

---

## Connections

[[python/python-hub]] · [[python/ecosystem]] · [[cs-fundamentals/database-design]] · [[technical-qa/database-testing]] · [[web-frameworks/fastapi]] · [[cloud/aws-rds-aurora]]
