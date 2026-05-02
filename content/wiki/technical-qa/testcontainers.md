---
type: concept
category: technical-qa
para: resource
tags: [testcontainers, integration-testing, docker, postgresql, kafka]
sources: []
updated: 2026-05-01
tldr: Library that spins up real Docker containers in tests — actual PostgreSQL, Redis, Kafka, etc. instead of mocks. Tests talk to real services; no fakes, no mocks, no in-memory substitutes.
---

# Testcontainers

Library that spins up real Docker containers in tests — actual PostgreSQL, Redis, Kafka, etc. instead of mocks. Tests talk to real services; no fakes, no mocks, no in-memory substitutes.

---

## Why Testcontainers

```
In-memory databases (H2, SQLite):
  - Different SQL dialect — tests pass but prod queries fail
  - Missing features (JSON columns, window functions, materialized views)
  - No realistic performance characteristics

Mocked clients:
  - Verify your code calls the right methods, not that the integration works
  - Redis mock won't catch pipeline ordering bugs
  - Kafka mock won't catch serialisation issues

Testcontainers:
  - Real Postgres 15 in CI; same version as production
  - Tests run against actual behaviour
  - Container isolated per test class; no shared state between test files
```

---

## Python — testcontainers-python

```python
# tests/integration/test_user_repository.py
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text
from myapp.repositories import UserRepository

@pytest.fixture(scope="module")
def postgres():
    with PostgresContainer("postgres:15.6") as pg:
        yield pg

@pytest.fixture(scope="module")
def db_engine(postgres):
    engine = create_engine(postgres.get_connection_url())
    # Run migrations
    with engine.begin() as conn:
        conn.execute(text(open("migrations/001_create_users.sql").read()))
    return engine

@pytest.fixture
def repo(db_engine):
    return UserRepository(db_engine)

def test_create_and_retrieve_user(repo):
    user_id = repo.create(email="test@example.com", name="Test User")
    user = repo.find_by_id(user_id)

    assert user.email == "test@example.com"
    assert user.name == "Test User"

def test_unique_email_constraint(repo):
    repo.create(email="dupe@example.com", name="First")

    with pytest.raises(Exception, match="unique"):
        repo.create(email="dupe@example.com", name="Second")

def test_find_by_email_is_case_insensitive(repo):
    repo.create(email="case@example.com", name="Test")
    user = repo.find_by_email("CASE@EXAMPLE.COM")
    assert user is not None
```

---

## Python — Redis Container

```python
from testcontainers.redis import RedisContainer
import redis

@pytest.fixture(scope="module")
def redis_client():
    with RedisContainer("redis:7.2") as r:
        client = redis.Redis.from_url(r.get_connection_url())
        yield client

def test_cache_sets_and_gets_value(redis_client, cache_service):
    cache_service.set("key", {"data": "value"}, ttl=60)
    result = cache_service.get("key")
    assert result["data"] == "value"

def test_cache_expires_after_ttl(redis_client, cache_service):
    cache_service.set("short_key", "value", ttl=1)
    time.sleep(2)
    assert cache_service.get("short_key") is None
```

---

## Java / Kotlin — JUnit 5 Integration

```kotlin
// UserRepositoryTest.kt
@Testcontainers
class UserRepositoryTest {

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:15.6")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass")
            .withInitScript("migrations/001_schema.sql")
    }

    private lateinit var repo: UserRepository

    @BeforeEach
    fun setUp() {
        val ds = PGSimpleDataSource().apply {
            setURL(postgres.jdbcUrl)
            user = postgres.username
            password = postgres.password
        }
        repo = UserRepository(ds)
    }

    @Test
    fun `creates user and retrieves by email`() {
        val id = repo.create(email = "test@example.com", name = "Test User")
        val user = repo.findByEmail("test@example.com")

        assertThat(user).isNotNull
        assertThat(user!!.email).isEqualTo("test@example.com")
    }
}
```

---

## Kafka Container

```python
from testcontainers.kafka import KafkaContainer

@pytest.fixture(scope="module")
def kafka():
    with KafkaContainer("confluentinc/cp-kafka:7.6.0") as k:
        yield k

def test_order_event_published(kafka, order_service):
    from kafka import KafkaConsumer

    consumer = KafkaConsumer(
        "orders",
        bootstrap_servers=kafka.get_bootstrap_server(),
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        consumer_timeout_ms=5000,
    )

    order_service.create_order(user_id="user_1", items=[{"sku": "A1", "qty": 2}])

    messages = list(consumer)
    assert len(messages) == 1
    assert messages[0].value["event"] == "order.created"
    assert messages[0].value["user_id"] == "user_1"
```

---

## Generic Container

```python
from testcontainers.core.container import DockerContainer

@pytest.fixture(scope="module")
def wiremock():
    with DockerContainer("wiremock/wiremock:3.5.4") \
            .with_exposed_ports(8080) \
            .with_volume_mapping("./wiremock", "/home/wiremock") as w:
        wait_for_http(f"http://localhost:{w.get_exposed_port(8080)}/__admin/health")
        yield w
```

---

## CI Performance

Testcontainers pull images on first run — cache Docker images in CI:

```yaml
# GitHub Actions — cache Docker images
- name: Cache Docker images
  uses: ScribeMD/docker-cache@0.5.0
  with:
    key: docker-${{ runner.os }}-${{ hashFiles('**/requirements.txt') }}
```

Use `scope="module"` or `scope="session"` for containers shared across tests in a class/session. Starting one Postgres per test function is slow; one per module is fast.

---

## Connections
[[tqa-hub]] · [[technical-qa/database-testing]] · [[technical-qa/api-testing]] · [[technical-qa/wiremock]] · [[technical-qa/contract-testing]] · [[cloud/docker]]
