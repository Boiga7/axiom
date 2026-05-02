---
type: concept
category: cs-fundamentals
para: resource
tags: [sql, databases, postgresql, joins, indexes, transactions, acid, orm, sqlalchemy]
tldr: SQL fundamentals for software engineers — querying, joining, aggregating, indexing, transactions, and how ORMs map on top. PostgreSQL-focused.
sources: []
updated: 2026-05-01
---

# SQL

> **TL;DR** SQL fundamentals for software engineers — querying, joining, aggregating, indexing, transactions, and how ORMs map on top. PostgreSQL-focused.

## Core Queries

```sql
-- Basic SELECT
SELECT name, email FROM users WHERE active = true ORDER BY name LIMIT 10;

-- Wildcards
SELECT * FROM products WHERE name LIKE 'Claude%';   -- starts with "Claude"
SELECT * FROM products WHERE price BETWEEN 10 AND 50;

-- NULL checks — always use IS NULL, never = NULL
SELECT * FROM users WHERE last_login IS NULL;

-- DISTINCT
SELECT DISTINCT country FROM users;

-- Aliases
SELECT u.name AS user_name, o.total AS order_total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

---

## Joins

Combine rows from two or more tables based on a related column.

```sql
-- INNER JOIN — only rows with a match in both tables
SELECT u.name, o.id, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN — all users, even those with no orders
SELECT u.name, o.id
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
-- o.id will be NULL for users with no orders

-- RIGHT JOIN — all orders, even if the user was deleted
SELECT u.name, o.id
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;

-- FULL OUTER JOIN — all rows from both tables
SELECT u.name, o.id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

**Visual rule:** LEFT JOIN = all rows from the left table, with NULLs on the right where there's no match. Most real queries are INNER or LEFT.

---

## Aggregations and GROUP BY

```sql
-- Count, sum, average
SELECT
    country,
    COUNT(*) AS user_count,
    AVG(age) AS avg_age,
    MAX(created_at) AS latest_signup
FROM users
GROUP BY country
ORDER BY user_count DESC;

-- HAVING — filter on aggregated values (WHERE runs before grouping, HAVING after)
SELECT country, COUNT(*) AS user_count
FROM users
GROUP BY country
HAVING COUNT(*) > 100;  -- only countries with more than 100 users
```

**Order of execution (not the same as order you write it):**
1. FROM / JOIN
2. WHERE
3. GROUP BY
4. HAVING
5. SELECT
6. ORDER BY
7. LIMIT

This explains why you can't use a SELECT alias in WHERE, WHERE runs before SELECT.

---

## Subqueries and CTEs

```sql
-- Subquery in WHERE
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);

-- CTE (Common Table Expression) — more readable for complex queries
WITH high_value_users AS (
    SELECT user_id FROM orders WHERE total > 1000
),
active_users AS (
    SELECT id FROM users WHERE active = true
)
SELECT u.name
FROM users u
WHERE u.id IN (SELECT user_id FROM high_value_users)
  AND u.id IN (SELECT id FROM active_users);
```

**Prefer CTEs over nested subqueries** — same performance, much more readable.

---

## Window Functions

Operate on a set of rows related to the current row without collapsing them into one (unlike GROUP BY).

```sql
-- Rank users by total spend within their country
SELECT
    name,
    country,
    total_spend,
    RANK() OVER (PARTITION BY country ORDER BY total_spend DESC) AS country_rank
FROM user_spend;

-- Running total
SELECT
    date,
    revenue,
    SUM(revenue) OVER (ORDER BY date) AS cumulative_revenue
FROM daily_revenue;

-- Lag/Lead — access previous or next row
SELECT
    date,
    revenue,
    LAG(revenue) OVER (ORDER BY date) AS prev_day_revenue,
    revenue - LAG(revenue) OVER (ORDER BY date) AS day_over_day_change
FROM daily_revenue;
```

---

## Indexes

An index is a separate data structure (typically a B-tree) that stores column values in sorted order to speed up lookups.

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index — order matters: this helps queries that filter on (country) or (country, city)
CREATE INDEX idx_users_location ON users(country, city);

-- Unique index — enforces uniqueness + enables fast lookup
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Partial index — index only a subset of rows
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
```

**Use EXPLAIN ANALYZE to check if an index is being used:**

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';
-- Look for "Index Scan" vs "Seq Scan" in the output
```

**Index tradeoffs:**
- Speeds up SELECT; slows down INSERT/UPDATE/DELETE (index must be updated)
- Uses disk space
- Useful on columns in WHERE, JOIN ON, ORDER BY, GROUP BY
- Avoid indexing low-cardinality columns (e.g., boolean) — not selective enough

---

## Transactions and ACID

A transaction is a group of SQL statements that succeed or fail together.

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;  -- both updates apply

-- If anything fails:
ROLLBACK;  -- neither update applies
```

### ACID Properties

| Property | Meaning | Example |
|---|---|---|
| **Atomicity** | All or nothing | Transfer either fully completes or fully reverts |
| **Consistency** | DB constraints always satisfied | Balance can't go negative if that constraint exists |
| **Isolation** | Concurrent transactions don't interfere | Two simultaneous transfers don't corrupt each other |
| **Durability** | Committed data survives crashes | After COMMIT, data is on disk |

### Isolation Levels (PostgreSQL)

| Level | Dirty reads | Non-repeatable reads | Phantom reads |
|---|---|---|---|
| READ UNCOMMITTED | Yes | Yes | Yes |
| READ COMMITTED (default) | No | Yes | Yes |
| REPEATABLE READ | No | No | Yes |
| SERIALIZABLE | No | No | No |

**Default (READ COMMITTED)** is fine for most applications. Use SERIALIZABLE for financial transactions or inventory management where phantoms matter.

---

## Schema Design and Normalisation

**Normalisation** removes data duplication by splitting tables and using foreign keys.

```sql
-- Unnormalised: city stored on every user row
users: id | name | city_name | city_country | city_population

-- Normalised: cities in their own table
cities: id | name | country | population
users:  id | name | city_id → cities.id
```

**Normal forms (practical summary):**
- **1NF:** one value per cell, no repeating groups
- **2NF:** no partial dependency on composite key (all non-key columns depend on the full key)
- **3NF:** no transitive dependencies (non-key columns depend only on the key, not on each other)

**Denormalisation:** deliberately introduce redundancy for read performance. Common in analytics (data warehouses) and high-read systems.

---

## Common Schema Patterns

```sql
-- Timestamps on every table
CREATE TABLE posts (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT,
    author_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Many-to-many via join table
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)  -- composite primary key
);

-- Soft delete (don't actually delete rows)
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP;
-- Then filter: WHERE deleted_at IS NULL
```

---

## SQLAlchemy (Python ORM)

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Session, relationship

engine = create_engine("postgresql://user:pass@localhost/dbname")

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    orders = relationship("Order", back_populates="user")

# Query
with Session(engine) as session:
    # ORM query
    users = session.query(User).filter(User.active == True).all()

    # Raw SQL when ORM is awkward
    result = session.execute(
        text("SELECT id, name FROM users WHERE country = :country"),
        {"country": "UK"}
    ).fetchall()
```

**When to use raw SQL vs ORM:**
- Simple CRUD: ORM (less code, safer against SQL injection)
- Complex analytics / reporting: raw SQL (more control, readable)
- Performance-critical hot path: raw SQL (avoid N+1 query problem)

---

## N+1 Query Problem

```python
# BAD — 1 query for users + N queries for each user's orders
users = session.query(User).all()
for user in users:
    print(user.orders)  # triggers a new query for each user

# GOOD — eager load with JOIN
users = session.query(User).options(joinedload(User.orders)).all()
# Now a single query fetches users + orders
```

## Common Failure Cases

**N+1 query pattern slows pages to a crawl under load**
Why: accessing a relationship attribute inside a loop issues one SQL query per row rather than a single JOIN, causing hundreds of queries for a page that should use one.
Detect: enable SQLAlchemy query logging or use `EXPLAIN` — a page load shows dozens of identical `SELECT` statements differing only in the ID parameter.
Fix: use `joinedload()` or `selectinload()` in the initial query to eager-load the relationship in one round trip.

**Missing index on a heavily filtered or joined column**
Why: without an index, PostgreSQL performs a sequential table scan (O(n)) on every query; at millions of rows this dominates latency.
Detect: `EXPLAIN ANALYZE` shows `Seq Scan` with high actual rows; query time degrades linearly as the table grows.
Fix: add a `CREATE INDEX` on the column(s) used in `WHERE`, `JOIN ON`, and `ORDER BY`; for multi-column filters, match the column order to the query's selectivity pattern.

**Transaction isolation level too loose for concurrent writes**
Why: the default `READ COMMITTED` level allows non-repeatable reads; two concurrent transactions can both read the same inventory count as positive and both decrement past zero.
Detect: negative balances or oversold inventory despite application-level checks; race conditions that only appear under concurrent load tests.
Fix: use `SERIALIZABLE` isolation or explicit `SELECT ... FOR UPDATE` row-level locking for inventory, financial balances, or any check-then-act pattern.

**Using `WHERE column = NULL` instead of `IS NULL`**
Why: SQL `NULL` comparisons with `=` always return `NULL` (not `TRUE`), so the condition never matches any row.
Detect: a query filtering for missing values returns zero rows even though the table has nulls in that column.
Fix: always write `WHERE column IS NULL` or `WHERE column IS NOT NULL`.

**Soft-delete filter omitted from a query, leaking deleted rows**
Why: when rows are soft-deleted via `deleted_at IS NULL`, forgetting the filter in any query or ORM scope returns deleted data to the application.
Detect: deleted records appear in API responses or counts; `SELECT COUNT(*) FROM table` is higher than the application's displayed total.
Fix: use a default query scope (SQLAlchemy `@declared_attr` filter or Django model manager) that appends `WHERE deleted_at IS NULL` automatically.

## Connections

- [[cs-fundamentals/system-design]] — databases are the persistence layer in every architecture
- [[cs-fundamentals/data-structures]] — indexes are B-trees; query plans use data structure intuitions
- [[infra/vector-stores]] — pgvector extends PostgreSQL with vector column types for AI workloads
- [[web-frameworks/django]] — Django ORM sits on top of SQL; understanding SQL makes ORM debugging tractable
- [[cs-fundamentals/nosql-databases]] — when to reach beyond relational: MongoDB, DynamoDB, Cassandra, Redis, Neo4j
- [[web-frameworks/fastapi]] — SQLAlchemy async engine integrates directly with FastAPI's dependency injection
