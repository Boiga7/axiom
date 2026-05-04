---
type: concept
category: test-automation
para: resource
tags: [testcontainers, docker, integration-testing, junit5, pytest, databases, containers]
tldr: Testcontainers spins up real Docker containers (databases, queues, services) from test code, giving integration tests genuine infrastructure without mocks or shared environments.
sources: []
updated: 2026-05-04
---

# Testcontainers

Testcontainers is a library for spinning up real Docker containers from test code. It enables integration tests to run against genuine infrastructure — real PostgreSQL, real Redis, real Kafka — without mocks, without shared test environments, and without manual setup. When the test finishes, containers are torn down automatically.

The core value proposition: integration tests that use real databases and message brokers catch an entire class of bugs that unit tests with mocks miss. Testcontainers makes running those tests as easy as running unit tests.

---

## How It Works

Each Testcontainers container is a `GenericContainer` configured with an image, exposed ports, and optionally a wait strategy. The test framework starts the container before tests run and stops it after. JUnit 5 and pytest-docker provide lifecycle integration so container startup happens at the appropriate fixture scope.

Wait strategies are the critical piece: Testcontainers must know the container is ready before tests run. The most reliable wait strategies are `waitingFor(Wait.forListeningPort())` for simple services and `waitingFor(Wait.forLogMessage(...))` for services that log a readiness message.

---

## JUnit 5 (Java)

```java
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("orders")
        .withUsername("test")
        .withPassword("test");

    @BeforeEach
    void setUp() {
        DataSource ds = DataSourceBuilder.create()
            .url(postgres.getJdbcUrl())
            .username(postgres.getUsername())
            .password(postgres.getPassword())
            .build();
        // configure your repository with ds
    }

    @Test
    void persistsOrder() {
        // test against a real PostgreSQL instance
    }
}
```

`@Testcontainers` activates the Testcontainers JUnit 5 extension. `@Container` on a `static` field gives class-level scope (one container per test class, reused across test methods). On an instance field it gives method-level scope (fresh container per test — slower but fully isolated).

---

## pytest (Python)

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg

def test_create_order(postgres):
    url = postgres.get_connection_url()
    # use url to configure your ORM or connection pool
    assert True  # replace with real assertion
```

The `testcontainers` Python package (`pip install testcontainers`) provides typed container classes for common services. `scope="session"` reuses the container across all tests in the session — appropriate for databases where tests manage their own data isolation via transactions or schema recreation.

---

## Common Container Patterns

| Service | Image | Typed class |
|---|---|---|
| PostgreSQL | `postgres:16` | `PostgreSQLContainer` (Java), `PostgresContainer` (Python) |
| MySQL | `mysql:8` | `MySQLContainer` |
| Redis | `redis:7` | `GenericContainer` with port 6379 |
| Kafka | `confluentinc/cp-kafka` | `KafkaContainer` |
| MinIO (S3-compatible) | `minio/minio` | `GenericContainer` |
| LocalStack (AWS) | `localstack/localstack` | `LocalStackContainer` |
| WireMock | `wiremock/wiremock` | `GenericContainer` with port 8080 |

For services without a typed class, use `GenericContainer`:

```java
GenericContainer<?> redis = new GenericContainer<>("redis:7")
    .withExposedPorts(6379)
    .waitingFor(Wait.forListeningPort());
```

---

## CI Integration

Testcontainers requires Docker on the CI runner. GitHub Actions `ubuntu-latest` runners include Docker by default. The library respects the `DOCKER_HOST` environment variable for remote Docker daemons and `TESTCONTAINERS_HOST_OVERRIDE` for host-to-container networking on non-standard setups.

Ryuk (the Testcontainers resource reaper) runs as a sidecar container and cleans up orphaned containers after the test process exits — important in CI where JVM crashes or process kills can leave containers running. Disable with `TESTCONTAINERS_RYUK_DISABLED=true` only in environments where Docker cleanup is managed externally.

---

## Connections

- [[technical-qa/docker-ci-testing]] — Docker service containers in GitHub Actions as an alternative to Testcontainers
- [[test-automation/playwright]] — Playwright for browser-level E2E testing; Testcontainers handles the infrastructure layer beneath it
