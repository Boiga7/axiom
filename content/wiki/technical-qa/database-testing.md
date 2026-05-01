---
type: concept
category: technical-qa
para: resource
tags: [database-testing, schema-testing, migration-testing, data-integrity, postgresql]
sources: []
updated: 2026-05-01
---

# Database Testing

Testing database schema, migrations, constraints, stored procedures, and data integrity — not just whether the application layer works. Database bugs discovered in production are expensive and often irreversible.

---

## What to Test in the Database

```
Schema correctness
  - Tables, columns, types exist as expected
  - Constraints (NOT NULL, UNIQUE, FK, CHECK) are correct
  - Indexes exist on queried columns

Migration safety
  - Migration runs forward without error
  - Migration is reversible (if required)
  - Migration is non-destructive with production-scale data volume
  - Migration doesn't lock tables for too long under load

Data integrity
  - FK constraints catch orphaned rows
  - CHECK constraints reject invalid data
  - UNIQUE constraints prevent duplicate business entities
  - Cascade behaviour on DELETE is correct

Query correctness
  - Complex queries return expected results
  - Edge cases (NULL, empty sets, max values) are handled
  - Performance doesn't degrade with realistic data volumes
```

---

## Schema Testing with pytest + testcontainers

```python
# tests/db/test_schema.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, inspect, text

@pytest.fixture(scope="module")
def db_engine():
    with PostgresContainer("postgres:15.6") as pg:
        engine = create_engine(pg.get_connection_url())
        with engine.begin() as conn:
            with open("migrations/001_initial_schema.sql") as f:
                conn.execute(text(f.read()))
        yield engine

def test_users_table_exists(db_engine):
    inspector = inspect(db_engine)
    assert "users" in inspector.get_table_names()

def test_users_email_is_unique(db_engine):
    with db_engine.begin() as conn:
        conn.execute(text("INSERT INTO users (email, name) VALUES ('a@test.com', 'A')"))
        with pytest.raises(Exception, match="unique"):
            conn.execute(text("INSERT INTO users (email, name) VALUES ('a@test.com', 'B')"))

def test_orders_cascade_delete_removes_items(db_engine):
    with db_engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id, email, name) VALUES (1, 'u@test.com', 'User')"))
        conn.execute(text("INSERT INTO orders (id, user_id) VALUES (1, 1)"))
        conn.execute(text("INSERT INTO order_items (order_id, sku, qty) VALUES (1, 'A1', 2)"))

        conn.execute(text("DELETE FROM orders WHERE id = 1"))

        items = conn.execute(text("SELECT COUNT(*) FROM order_items WHERE order_id = 1")).scalar()
        assert items == 0, "order_items should cascade delete with the order"

def test_price_check_constraint_rejects_negative(db_engine):
    with db_engine.begin() as conn:
        with pytest.raises(Exception, match="check"):
            conn.execute(text("INSERT INTO products (name, price) VALUES ('Widget', -1.00)"))
```

---

## Migration Testing

```python
# tests/db/test_migrations.py
def test_migration_runs_cleanly_on_empty_db(db_engine):
    # Migration 001 already run in fixture — test 002
    with db_engine.begin() as conn:
        with open("migrations/002_add_product_categories.sql") as f:
            conn.execute(text(f.read()))   # must not raise

        # Verify the migration's expected outcome
        inspector = inspect(db_engine)
        columns = {c["name"] for c in inspector.get_columns("products")}
        assert "category_id" in columns

def test_migration_is_idempotent(db_engine):
    # Run migration twice — should not error (IF NOT EXISTS, CREATE OR REPLACE)
    with db_engine.begin() as conn:
        with open("migrations/002_add_product_categories.sql") as f:
            sql = f.read()
        conn.execute(text(sql))
        conn.execute(text(sql))   # second run must not fail

def test_migration_does_not_drop_existing_data(db_engine):
    with db_engine.begin() as conn:
        conn.execute(text("INSERT INTO products (id, name, price) VALUES (1, 'Widget', 9.99)"))

        with open("migrations/002_add_product_categories.sql") as f:
            conn.execute(text(f.read()))

        row = conn.execute(text("SELECT name FROM products WHERE id = 1")).fetchone()
        assert row[0] == "Widget", "Migration must preserve existing product data"
```

---

## Performance / Volume Testing

```python
def test_search_query_returns_fast_on_large_dataset(db_engine):
    import time

    # Seed 100k products
    with db_engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO products (name, price, category)
            SELECT
              'Product ' || generate_series,
              random() * 1000,
              (ARRAY['electronics', 'clothing', 'food'])[floor(random() * 3 + 1)]
            FROM generate_series(1, 100000)
        """))
        conn.execute(text("ANALYZE products"))   # update planner stats

    start = time.perf_counter()
    with db_engine.connect() as conn:
        results = conn.execute(text(
            "SELECT * FROM products WHERE category = 'electronics' ORDER BY price LIMIT 20"
        )).fetchall()
    elapsed = time.perf_counter() - start

    assert elapsed < 0.1, f"Query took {elapsed:.3f}s — index may be missing"
    assert len(results) > 0
```

---

## Checking Query Plans

```python
def test_search_uses_index(db_engine):
    with db_engine.connect() as conn:
        plan = conn.execute(text(
            "EXPLAIN SELECT * FROM products WHERE category = 'electronics'"
        )).fetchall()

    plan_text = " ".join(str(row) for row in plan)
    assert "Index Scan" in plan_text or "Index Only Scan" in plan_text, \
        f"Expected index scan but got: {plan_text}"
    assert "Seq Scan" not in plan_text, "Sequential scan detected — add index on category"
```

---

## Connections
[[tqa-hub]] · [[technical-qa/testcontainers]] · [[technical-qa/test-architecture]] · [[cs-fundamentals/database-design]] · [[qa/test-data-management]] · [[cloud/aws-rds-aurora]]
