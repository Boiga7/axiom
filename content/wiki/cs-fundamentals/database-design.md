---
type: concept
category: cs-fundamentals
para: resource
tags: [database-design, normalisation, indexes, schema, partitioning, query-optimisation]
sources: []
updated: 2026-05-01
tldr: Designing relational database schemas for correctness, performance, and maintainability. Good schema design prevents bugs, makes queries fast, and reduces the cost of future changes.
---

# Database Design

Designing relational database schemas for correctness, performance, and maintainability. Good schema design prevents bugs, makes queries fast, and reduces the cost of future changes.

---

## Normalisation

Removing redundancy and ensuring data integrity.

**1NF:** Each column holds atomic values; no repeating groups.
```sql
-- Bad: tags stored as comma-separated string
CREATE TABLE products (id INT, name TEXT, tags TEXT);  -- tags = 'electronics,sale,refurb'

-- Good: separate junction table
CREATE TABLE products (id INT PRIMARY KEY, name TEXT);
CREATE TABLE product_tags (product_id INT, tag TEXT, PRIMARY KEY (product_id, tag));
```

**2NF:** Every non-key column depends on the whole primary key (no partial dependency).

**3NF:** Every non-key column depends only on the primary key (no transitive dependency).
```sql
-- Bad: category_name depends on category_id, not on product_id
CREATE TABLE products (
    id INT PRIMARY KEY,
    category_id INT,
    category_name TEXT    -- ← transitive dependency
);

-- Good: category_name in its own table
CREATE TABLE categories (id INT PRIMARY KEY, name TEXT);
CREATE TABLE products (id INT PRIMARY KEY, category_id INT REFERENCES categories(id));
```

**When to denormalise:** For read-heavy analytics or when joins are too expensive. Keep it intentional and documented.

---

## Schema Design Patterns

```sql
-- UUIDs vs serial integers
-- UUIDs: globally unique, safe for distributed systems, harder to guess (security)
-- Serial: compact, ordered, faster indexes (B-tree is happier with sequential inserts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- or gen_random_uuid() (pg 13+)
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Soft delete: never physically delete rows with audit requirements
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;
-- Query: WHERE deleted_at IS NULL
-- Downside: all queries need the filter; consider partial index

-- Audit columns
ALTER TABLE orders
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN created_by UUID REFERENCES users(id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Indexes

```sql
-- B-tree (default): equality, range, ORDER BY, most uses
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);  -- composite

-- Partial index: only index rows that satisfy a condition (smaller, faster)
CREATE INDEX idx_orders_pending ON orders(created_at)
    WHERE status = 'pending';

-- GIN index: for JSONB and array searches
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);
-- Query: SELECT * FROM products WHERE metadata @> '{"colour": "red"}';

-- Full-text search
ALTER TABLE products ADD COLUMN search_vector TSVECTOR;
CREATE INDEX idx_products_fts ON products USING GIN(search_vector);
UPDATE products SET search_vector = to_tsvector('english', name || ' ' || description);
SELECT * FROM products WHERE search_vector @@ plainto_tsquery('english', 'wireless headphones');

-- Index selection: check what's used
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 'uuid-here';
```

Index pitfalls:
- Index every foreign key (Postgres doesn't do this automatically)
- Too many indexes slow down writes; audit with `pg_stat_user_indexes`
- Unused indexes: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0`

---

## Query Optimisation

```sql
-- N+1 problem: don't select users, then query orders for each user in a loop
-- Bad (N+1):
SELECT * FROM users;   -- then for each user: SELECT * FROM orders WHERE user_id = ?

-- Good (single query with JOIN):
SELECT u.id, u.email, o.id AS order_id, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id = ANY(ARRAY['uuid1', 'uuid2', 'uuid3']);

-- Use EXPLAIN ANALYZE to see query plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 'uuid' ORDER BY created_at DESC LIMIT 10;

-- Covering index: index includes all columns the query needs (no heap access)
CREATE INDEX idx_orders_covering ON orders(user_id, status)
    INCLUDE (total, created_at);
```

---

## Partitioning

Split large tables across partitions for query performance and easier data lifecycle management.

```sql
-- Range partitioning by date (common for time-series data)
CREATE TABLE orders (
    id UUID,
    created_at TIMESTAMPTZ NOT NULL,
    total NUMERIC(10,2)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE orders_2026 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Postgres automatically routes inserts and prunes partitions in queries:
-- WHERE created_at BETWEEN '2026-01-01' AND '2026-03-01'
-- → only scans orders_2026, not orders_2025
```

---

## Migrations (Alembic)

```python
# alembic/versions/20260501_add_product_sku.py
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    op.add_column('products', sa.Column('sku', sa.String(50), nullable=True))
    # Backfill existing rows before making NOT NULL
    op.execute("UPDATE products SET sku = 'SKU-' || id::text WHERE sku IS NULL")
    op.alter_column('products', 'sku', nullable=False)
    op.create_unique_constraint('uq_products_sku', 'products', ['sku'])

def downgrade() -> None:
    op.drop_constraint('uq_products_sku', 'products')
    op.drop_column('products', 'sku')
```

Safe migration checklist:
- [ ] Add columns as nullable (existing rows have no value)
- [ ] Backfill before making NOT NULL
- [ ] Create indexes `CONCURRENTLY` (doesn't lock table)
- [ ] Drop columns in a separate migration (after code no longer uses them)
- [ ] Test migration on production-size data in staging first

---

## Connections
[[se-hub]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/caching-strategies]] · [[technical-qa/database-testing]] · [[cloud/aws-rds-aurora]] · [[python/ecosystem]]
