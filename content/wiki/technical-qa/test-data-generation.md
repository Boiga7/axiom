---
type: concept
category: technical-qa
para: resource
tags: [test-data, generation, synthetic-data, faker, factories, data-seeding]
sources: []
updated: 2026-05-01
tldr: Advanced patterns for generating test data at scale — deterministic factories, database seeding strategies, and generating data with the right statistical properties for load and edge case testing.
---

# Test Data Generation (Technical)

Advanced patterns for generating test data at scale. Deterministic factories, database seeding strategies, and generating data with the right statistical properties for load and edge case testing.

---

## Deterministic Test Data

```python
# Seed random — reproducible test data
import random
import string

def seeded_random(seed: str) -> random.Random:
    """Same seed always produces the same data."""
    return random.Random(seed)

def generate_product_id(seed: str) -> str:
    rng = seeded_random(seed)
    return "prod-" + "".join(rng.choices(string.ascii_lowercase + string.digits, k=8))

# test_id is deterministic — same test, same data, no flakiness
def test_with_deterministic_data():
    test_id = "test-case-001"
    product_id = generate_product_id(test_id)  # always "prod-x7k2m9q1"
    assert product_id.startswith("prod-")

# Faker with seed for deterministic output
from faker import Faker
fake = Faker()
fake.seed_instance(42)

print(fake.name())     # always "Ryan Gonzalez"
print(fake.email())    # always "wlong@example.net"
```

---

## Bulk Data Generation

```python
# Generate large volumes of realistic test data efficiently
import asyncio
import asyncpg
from faker import Faker

fake = Faker()

async def seed_products(pool: asyncpg.Pool, count: int = 100_000):
    """Seed 100k products using COPY for maximum throughput."""
    async with pool.acquire() as conn:
        # Generate all data first (fast in Python)
        records = [
            (
                f"prod-{i:08d}",
                fake.bs().title()[:200],
                round(fake.pyfloat(min_value=1, max_value=999, right_digits=2), 2),
                fake.random_element(["electronics", "clothing", "books", "food"]),
                fake.boolean(chance_of_getting_true=80),
            )
            for i in range(count)
        ]

        # Bulk insert via COPY — 10-50x faster than individual INSERTs
        await conn.copy_records_to_table(
            "products",
            records=records,
            columns=["id", "name", "price", "category", "in_stock"],
        )

    print(f"Seeded {count:,} products")

# SQLite/SQLAlchemy equivalent — executemany
def seed_orders(session, count: int = 10_000):
    orders = [
        {
            "id": f"ord-{i:08d}",
            "user_id": f"usr-{fake.random_int(1, 1000):06d}",
            "total": round(fake.pyfloat(min_value=5, max_value=500, right_digits=2), 2),
            "status": fake.random_element(["pending", "paid", "shipped", "delivered"]),
            "created_at": fake.date_time_between(start_date="-1y"),
        }
        for i in range(count)
    ]
    session.execute(Order.__table__.insert(), orders)
    session.commit()
```

---

## Statistically Realistic Data

```python
# Generate data with realistic distributions, not just random
import numpy as np
from datetime import datetime, timedelta

def generate_order_amounts(n: int) -> list[float]:
    """Order amounts follow a log-normal distribution (long tail of high values)."""
    amounts = np.random.lognormal(mean=3.5, sigma=0.8, size=n)
    return [round(float(a), 2) for a in amounts]

def generate_session_times(n: int) -> list[int]:
    """Session durations in seconds — Pareto distribution (most sessions short, some very long)."""
    times = np.random.pareto(a=1.5, size=n) * 60  # 60 second base
    return [int(t) for t in times]

def generate_timestamps_realistic(n: int, days_back: int = 90) -> list[datetime]:
    """Traffic follows a diurnal pattern — more during business hours."""
    timestamps = []
    base = datetime.now() - timedelta(days=days_back)
    for _ in range(n):
        day_offset = np.random.randint(0, days_back)
        # Weight towards business hours (9am-6pm UTC)
        hour = np.random.choice(range(24), p=[
            0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.04, 0.05,
            0.07, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.07,
            0.06, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01,
        ])
        ts = base + timedelta(days=day_offset, hours=hour, minutes=np.random.randint(60))
        timestamps.append(ts)
    return sorted(timestamps)
```

---

## Edge Case Data Sets

```python
# Boundary and edge case generators — parameterise tests with these
EDGE_CASE_PRICES = [
    0.01,        # minimum valid price
    0.99,        # just below threshold
    1.00,        # threshold
    99.99,       # common price point
    100.00,      # potential rounding point
    999.99,      # max before category change
    9999.99,     # high value
]

EDGE_CASE_STRINGS = [
    "",                            # empty
    " ",                           # whitespace only
    "a",                           # single char
    "a" * 200,                     # at max length
    "a" * 201,                     # over max length
    "O'Brien",                     # apostrophe
    '<script>alert(1)</script>',   # XSS attempt
    "'; DROP TABLE products;--",   # SQL injection
    "Ünïcödé strïng",             # unicode
    "日本語テスト",               # non-latin unicode
    "\n\t\r",                      # control characters
    "   leading and trailing   ",  # whitespace edges
]

EDGE_CASE_EMAILS = [
    "a@b.co",                       # minimum valid
    "user+tag@domain.co.uk",        # plus addressing, country code TLD
    "user@sub.domain.example.com",  # subdomain
    "very.long.email.address.for.testing@example.com",
]

@pytest.mark.parametrize("price", EDGE_CASE_PRICES)
def test_price_formatting_handles_edge_cases(price):
    formatted = format_price(price)
    assert formatted.startswith("£")

@pytest.mark.parametrize("string,expected_valid", [
    ("", False),
    (" ", False),
    ("valid name", True),
    ('<script>', False),
])
def test_product_name_validation(string, expected_valid):
    assert validate_product_name(string) == expected_valid
```

---

## Test Data Cleanup

```python
# Track created data for cleanup — especially important for integration tests
class TestDataTracker:
    def __init__(self, session):
        self.session = session
        self.created_ids: dict[str, list[str]] = {}

    def track(self, table: str, id: str):
        self.created_ids.setdefault(table, []).append(id)
        return id

    def cleanup(self):
        # Delete in reverse dependency order (child tables first)
        for table in reversed(["order_items", "orders", "products", "users"]):
            ids = self.created_ids.get(table, [])
            if ids:
                self.session.execute(
                    text(f"DELETE FROM {table} WHERE id = ANY(:ids)"),
                    {"ids": ids}
                )
        self.session.commit()

@pytest.fixture
def data_tracker(db_session):
    tracker = TestDataTracker(db_session)
    yield tracker
    tracker.cleanup()
```

---

## Common Failure Cases

**Faker without a seed produces non-deterministic data, causing intermittent assertion failures**
Why: `Faker()` without `seed_instance()` draws from the global random state; test output varies between runs, so assertions on specific generated values are unreliable.
Detect: a test that asserts a generated email format passes locally but fails in CI after a different test has already consumed random state.
Fix: always call `fake.seed_instance(some_integer)` at the start of any test that asserts on specific generated values, or use deterministic sequences (`factory.Sequence`) rather than `Faker` for identity fields.

**Bulk insert via `executemany` fails silently when a single row violates a constraint**
Why: some database drivers roll back the entire `executemany` batch on the first constraint violation but report success at the Python level; the table remains empty.
Detect: the seed function returns without error but row count queries return zero; assertions on bulk-seeded data fail with "no rows found".
Fix: use `COPY` for PostgreSQL bulk loads (which reports the offending row), or wrap `executemany` in an explicit transaction with per-row error logging.

**`TestDataTracker.cleanup()` deletes in the wrong order, violating foreign key constraints**
Why: the hardcoded delete order in `reversed([...])` must match the actual foreign key dependency graph; any new table added to the schema that was not added to the list causes FK violation errors on cleanup.
Detect: teardown raises `ForeignKeyViolation`; tests themselves pass but the fixture cleanup fails, leaving dirty data.
Fix: query `information_schema.referential_constraints` at test startup to derive deletion order dynamically, or use `ON DELETE CASCADE` on FK constraints and delete only parent rows.

**Statistical distribution parameters produce out-of-range values that fail validation**
Why: log-normal and Pareto distributions have no upper bound; generated `price` or `amount` values can exceed application-level maximums (e.g., `999.99`), causing insert failures or validation errors during load tests.
Detect: bulk seed runs fail partway through with check-constraint violations on numeric columns.
Fix: clamp generated values to valid ranges after sampling (`min(value, MAX)`) and add an assertion in the generator to verify the output distribution stays within expected bounds.

## Connections
[[tqa-hub]] · [[qa/test-data-management]] · [[technical-qa/testcontainers]] · [[technical-qa/database-testing]] · [[technical-qa/load-testing-advanced]] · [[qa/defect-prevention]]
## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?
