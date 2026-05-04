---
type: concept
category: sql
para: resource
tags: [sqlalchemy, python, orm, postgresql, async, migrations, alembic]
tldr: SQLAlchemy patterns for production Python — async engine, session management, relationships, bulk operations, Alembic migrations, and common pitfalls.
sources: []
updated: 2026-05-04
---

# SQLAlchemy Patterns

> **TL;DR** SQLAlchemy patterns for production Python — async engine, session management, relationships, bulk operations, Alembic migrations, and common pitfalls.

## Setup and Engine

```python
# Sync engine (Django-like apps, scripts)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(
    "postgresql://user:pass@localhost/dbname",
    pool_size=10,         # max persistent connections
    max_overflow=20,      # burst connections above pool_size
    pool_pre_ping=True,   # check connection health before use
    echo=False,           # set True to log all SQL (dev only)
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# FastAPI dependency pattern
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# Async engine — required for FastAPI/async endpoints
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

async_engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/dbname",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

# FastAPI dependency
async def get_async_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## Models with DeclarativeBase

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, relationship, mapped_column, Mapped
from datetime import datetime

class Base(DeclarativeBase):
    pass

# Modern style (SQLAlchemy 2.0) — type-annotated columns
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # One-to-many relationship
    orders: Mapped[list["Order"]] = relationship(
        "Order", back_populates="user", lazy="select"
    )

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    total: Mapped[float] = mapped_column(nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="orders")
```

---

## Querying — Select API (2.0 style)

```python
from sqlalchemy import select, and_, or_, desc

async with AsyncSessionLocal() as session:
    # Basic select
    stmt = select(User).where(User.active == True).order_by(desc(User.created_at))
    result = await session.execute(stmt)
    users = result.scalars().all()

    # Filter combinations
    stmt = select(User).where(
        and_(
            User.active == True,
            or_(User.name.ilike("%lewis%"), User.email.ilike("%lewis%"))
        )
    )

    # JOIN
    stmt = (
        select(User, Order)
        .join(Order, User.id == Order.user_id)
        .where(Order.total > 100)
    )
    rows = (await session.execute(stmt)).all()

    # Get single row
    user = (await session.execute(select(User).where(User.id == 1))).scalar_one_or_none()
```

---

## Relationships and Eager Loading

```python
from sqlalchemy.orm import selectinload, joinedload, lazyload

# selectinload — emits a second SELECT IN query; best for collections
stmt = select(User).options(selectinload(User.orders))

# joinedload — LEFT OUTER JOIN in one query; best for to-one relationships
stmt = select(Order).options(joinedload(Order.user))

# Deep eager loading
stmt = select(User).options(
    selectinload(User.orders).selectinload(Order.items)
)

# Lazy loading default — avoid in async context (DetachedInstanceError)
# Always explicit-load relationships when using async sessions
```

**Rule:** never rely on lazy loading in async context — it will raise `MissingGreenlet` or `DetachedInstanceError`. Always use `selectinload` or `joinedload` for relationships you need.

---

## Write Operations

```python
async with AsyncSessionLocal() as session:
    async with session.begin():  # auto-commit on exit, rollback on exception
        # INSERT
        new_user = User(email="lewis@example.com", name="Lewis")
        session.add(new_user)
        await session.flush()   # assigns new_user.id without committing
        print(new_user.id)      # available after flush

        # UPDATE
        user = (await session.execute(
            select(User).where(User.id == 1)
        )).scalar_one()
        user.name = "Updated Name"
        # dirty-tracking: SQLAlchemy sees the change, issues UPDATE on commit

        # DELETE
        await session.delete(user)

    # session.begin() auto-commits here
```

```python
# Bulk operations — much faster for large datasets
from sqlalchemy import update, delete

async with session.begin():
    # Bulk update without loading objects
    await session.execute(
        update(User).where(User.active == False).values(deleted_at=func.now())
    )

    # Bulk insert
    await session.execute(
        User.__table__.insert(),
        [{"email": f"user{i}@example.com", "name": f"User {i}"} for i in range(1000)]
    )
```

---

## Raw SQL

```python
from sqlalchemy import text

async with AsyncSessionLocal() as session:
    # Named parameters — safe against SQL injection
    result = await session.execute(
        text("SELECT id, name FROM users WHERE country = :country AND active = :active"),
        {"country": "UK", "active": True}
    )
    rows = result.fetchall()

    # Complex analytics queries where ORM is awkward
    result = await session.execute(text("""
        SELECT
            u.country,
            COUNT(*) AS user_count,
            AVG(o.total) AS avg_order_value
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.country
        ORDER BY user_count DESC
    """))
```

---

## Alembic Migrations

```bash
# Setup
pip install alembic
alembic init alembic

# alembic/env.py — point at your models
from myapp.models import Base
target_metadata = Base.metadata
```

```bash
# Create a migration from model changes
alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# Show current version
alembic current

# Show history
alembic history --verbose
```

```python
# alembic/versions/xxxx_add_users_table.py — generated file
def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

def downgrade() -> None:
    op.drop_table("users")
```

**Never edit the database schema directly in production.** Always use Alembic migrations — they version-control schema changes and make rollback safe.

---

## Connection Pooling and Production Settings

```python
# Production engine config
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,          # concurrent DB connections (match DB max_connections)
    max_overflow=10,       # burst headroom
    pool_timeout=30,       # seconds to wait for a connection from pool
    pool_recycle=1800,     # recycle connections after 30 min (prevents stale connections)
    pool_pre_ping=True,    # reconnect on broken connections (essential for long-lived apps)
)
```

**Detecting pool exhaustion:** `TimeoutError: QueuePool limit of size X overflow Y reached` — increase pool_size, reduce query time, or add read replicas.

---

## Common Pitfalls

**Expired instances after commit**
By default, SQLAlchemy expires all attributes after `session.commit()`. Accessing them triggers lazy loads that fail in async.
Fix: use `expire_on_commit=False` in `async_sessionmaker` for API contexts.

**Using `session.query()` in SQLAlchemy 2.0**
The legacy `session.query(Model)` API still works but is deprecated. Use `select(Model)` + `session.execute()`.

**Mutating a list relationship and not flushing**
```python
user.orders.append(new_order)
# If you read user.orders immediately in same session, you'll get the updated list
# But if you check the DB before flush, it won't be there
await session.flush()  # push to DB within transaction without committing
```

**Not closing sessions in async context**
Always use `async with AsyncSessionLocal() as session:` — the context manager ensures close even on exception.

## Connections

- [[sql/sql-fundamentals]] — SQL foundations: joins, transactions, indexes, ACID
- [[sql/query-optimization]] — EXPLAIN ANALYZE, diagnosing slow queries
- [[web-frameworks/fastapi]] — FastAPI dependency injection pattern for DB sessions
- [[python/async]] — asyncio, async generators, event loop context
