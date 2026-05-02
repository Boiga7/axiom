---
type: concept
category: qa
para: resource
tags: [test-data, factories, fixtures, anonymisation, synthetic-data]
sources: []
updated: 2026-05-01
tldr: How to get good test data reliably without coupling tests to each other or exposing production PII.
---

# Test Data Management

How to get good test data reliably without coupling tests to each other or exposing production PII. The failure mode: tests that depend on specific database rows, hard-coded IDs, or production snapshots that go stale.

---

## The Test Data Problem

```
Shared state test data:
  Test A creates user → Test B fails because "user already exists"
  Test C deletes an order → Test D fails because "order not found"

Hard-coded IDs:
  productId = 12345  ← deleted 3 months ago; tests have been red since

Production data copies:
  Contains real PII → compliance violation
  Goes stale → test failures that aren't real bugs
```

Solution: each test creates and owns its data, cleans up after itself.

---

## Factory Pattern (Python — factory_boy)

```python
# tests/factories.py
import factory
from factory.django import DjangoModelFactory
from myapp.models import User, Order, Product

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.LazyAttribute(lambda obj: obj.email.split("@")[0])
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True

class ProductFactory(DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    price = factory.Faker("pydecimal", left_digits=2, right_digits=2, positive=True)
    stock = factory.Faker("random_int", min=0, max=100)
    category = "electronics"

class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    status = "pending"
    total = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)

    @factory.post_generation
    def items(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for item in extracted:
                self.items.add(item)
        else:
            ProductFactory.create_batch(2)
```

```python
# Using factories in tests
def test_order_cancellation():
    user = UserFactory()
    order = OrderFactory(user=user, status="pending")

    result = cancel_order(order.id, user.id)

    order.refresh_from_db()
    assert order.status == "cancelled"
    assert result.refund_initiated

# Create many with specific overrides
admins = UserFactory.create_batch(5, is_staff=True)
vip_orders = OrderFactory.create_batch(10, user=admins[0], status="completed")
```

---

## Factory Pattern (TypeScript — Fishery)

```typescript
// tests/factories.ts
import { Factory } from 'fishery';
import { User, Order } from '../src/types';

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: `user_${sequence}`,
  email: `user${sequence}@example.com`,
  name: `Test User ${sequence}`,
  createdAt: new Date(),
  role: 'customer',
}));

export const orderFactory = Factory.define<Order>(({ sequence, associations }) => ({
  id: `order_${sequence}`,
  userId: associations.user?.id ?? userFactory.build().id,
  status: 'pending',
  total: 99.99,
  items: [],
  createdAt: new Date(),
}));

// Usage
const user = userFactory.build({ role: 'admin' });
const orders = orderFactory.buildList(5, { userId: user.id, status: 'completed' });
```

---

## Database Seeding

```python
# management/commands/seed_test_data.py (Django)
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Seed database with test fixtures"

    def handle(self, *args, **options):
        # Create predictable, named entities for integration tests
        admin = UserFactory(email="admin@testco.com", is_staff=True)
        customer = UserFactory(email="customer@testco.com")
        products = ProductFactory.create_batch(20)
        OrderFactory.create_batch(5, user=customer, status="completed")
        self.stdout.write("Seeded test data")
```

---

## Data Anonymisation

For production data copies used in lower environments:

```python
# anonymise.py — transform PII before loading into staging
import hashlib
from faker import Faker

fake = Faker()

def anonymise_users(df):
    df["email"] = df["email"].apply(
        lambda e: f"anon_{hashlib.md5(e.encode()).hexdigest()[:8]}@example.com"
    )
    df["name"] = df["name"].apply(lambda _: fake.name())
    df["phone"] = df["phone"].apply(lambda _: fake.phone_number())
    df["address"] = df["address"].apply(lambda _: fake.address())
    # Preserve relationship keys (user_id, etc.) unchanged
    return df
```

Tools: AWS Database Migration Service (transformation rules), Gretel.ai (synthetic data generation), Faker (locale-aware PII generation).

---

## Synthetic Data Generation

```python
# Generate realistic LLM training/eval data synthetically
import anthropic

client = anthropic.Anthropic()

def generate_synthetic_orders(n: int) -> list[dict]:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"Generate {n} realistic e-commerce orders as JSON array. "
                       f"Each order: id, customer_email, items (list of product+qty+price), "
                       f"total, status (pending/shipped/delivered/cancelled), created_at."
        }]
    )
    return json.loads(message.content[0].text)
```

---

## Test Data Cleanup Strategies

```python
# Strategy 1: Transactional rollback (fastest)
@pytest.fixture
def db(django_db_setup, django_test_environment):
    with transaction.atomic():
        yield
        transaction.set_rollback(True)   # rolls back after test

# Strategy 2: Explicit delete in teardown
@pytest.fixture
def user():
    u = UserFactory()
    yield u
    u.delete()

# Strategy 3: Test database isolation (separate DB per test run)
# pytest-django: --reuse-db or --create-db flags
```

---

## Common Failure Cases

**Factory sequences collide across parallel test workers**
Why: `factory.Sequence(lambda n: f"user{n}@example.com")` resets to `n=0` in each worker process, so parallel pytest-xdist workers create duplicate emails and trigger unique-constraint errors.
Detect: tests pass when run serially with `pytest` but fail intermittently with `pytest -n auto` on email or username uniqueness constraint violations.
Fix: use `factory.LazyFunction(lambda: f"user_{uuid.uuid4().hex[:8]}@example.com")` for fields that must be globally unique, or configure factory_boy's sequence to use a per-worker offset seeded from the worker ID.

**Transactional rollback fixture leaks data when the code under test spawns a background task**
Why: if the code creates a database record inside a Celery task or async background job, that write occurs outside the transaction scope and is not rolled back, leaving residue in the test database.
Detect: test count in the database grows over multiple test runs even with rollback fixtures in place; subsequent test runs fail on unexpected row counts.
Fix: for tests involving background tasks, use explicit teardown (`yield u; u.delete()`) instead of transactional rollback, or mock the background task dispatcher in the test layer.

**Anonymised data retains re-identifiable combinations**
Why: individual fields (name, phone, email) are anonymised, but combinations like (postcode + date-of-birth + gender) can still uniquely identify a person in a small dataset.
Detect: run a k-anonymity check on the anonymised dataset; any record that is unique after removing direct identifiers is a re-identification risk.
Fix: apply generalisation to quasi-identifiers (truncate postcodes to district level, replace exact birth dates with birth year) in addition to masking direct identifiers; or use Gretel.ai to generate fully synthetic data that preserves statistical distributions without any real records.

**LLM-generated synthetic data produces unrealistic edge cases silently**
Why: `generate_synthetic_orders` via `client.messages.create` returns plausible-looking JSON but may produce negative prices, future-dated past events, or logically inconsistent field combinations that pass type validation but break business-logic assertions.
Detect: synthetic data passes schema validation but causes test failures in assertions about business invariants (e.g., total != sum of line items).
Fix: run a validation pass on LLM-generated data using Pydantic validators that encode business rules before loading it into tests; treat any validation failure as a generation failure and retry with a stricter prompt.

## Connections
[[qa-hub]] · [[qa/test-environments]] · [[qa/agile-qa]] · [[technical-qa/test-architecture]] · [[technical-qa/database-testing]] · [[llms/ae-hub]]
