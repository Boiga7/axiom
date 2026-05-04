---
type: concept
category: technical-qa
tags: [docker, ci-cd, integration-testing, github-actions, testcontainers]
updated: 2026-05-04
para: resource
tldr: Run ephemeral Docker service containers (Postgres, Redis, WireMock, RabbitMQ) inside CI jobs so every test run starts from a clean, isolated state with no shared infrastructure.
---

# Docker Service Containers for CI Testing

Running integration tests against real infrastructure — databases, caches, message brokers, mock HTTP servers — in CI without leaking state between runs or managing long-lived shared instances. Service containers give every CI job its own ephemeral stack, torn down automatically when the job ends.

Related: [[technical-qa/testcontainers]] | [[wiremock]] | [[ci-cd-quality-gates]] | [[parallel-test-execution]] | [[database-testing]] | [[mock-strategies]]

---

## Core Concept

A service container is a Docker container that the CI platform starts alongside the job, on the same network, before the test runner executes. The test runner connects to it by hostname (the service name) or `localhost` (GitHub Actions maps service ports to the host). When the job ends, the container and its data are discarded.

Why ephemeral by default: shared test databases accumulate state. One test's dirty data becomes another test's failing assertion. Ephemeral containers eliminate that class of failure entirely — every run starts from a known clean state.

---

## GitHub Actions `services:` Block

The `services:` key is a sibling of `steps:` under a job. Each entry is a Docker container that starts before any steps run.

### Minimal structure

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/postgres
```

Port mapping is implicit for `runs-on: ubuntu-latest` (Linux runners). The service exposes its declared port on `localhost` inside the job. No explicit `ports:` entry is needed unless you want to remap to a different host port.

---

## Worked Examples

### PostgreSQL

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: testdb
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U test -d testdb"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 10
      --health-start-period 10s
```

Connection string for the test runner: `postgresql://test:secret@localhost:5432/testdb`

The `--health-start-period` flag gives Postgres time to initialise before the health check starts counting failures. Without it, the check can fire before Postgres has finished writing its data directory, causing spurious `--health-retries` exhaustion.

Running migrations before tests:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-python@v5
    with:
      python-version: "3.12"
  - run: pip install -r requirements.txt
  - run: alembic upgrade head
    env:
      DATABASE_URL: postgresql://test:secret@localhost:5432/testdb
  - run: pytest tests/integration/
    env:
      DATABASE_URL: postgresql://test:secret@localhost:5432/testdb
```

---

### Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 5
```

Test runner environment variable: `REDIS_URL=redis://localhost:6379/0`

For Redis with authentication:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli -a testpass ping"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 5
      --entrypoint redis-server
    env:
      REDIS_PASSWORD: testpass
```

Note: Redis doesn't read `REDIS_PASSWORD` as an env var natively. Pass auth via the command argument: `options: --requirepass testpass` appended to the health check command.

---

### WireMock

```yaml
services:
  wiremock:
    image: wiremock/wiremock:3.5.4
    ports:
      - 8080:8080
    options: >-
      --health-cmd "curl -sf http://localhost:8080/__admin/health"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 10
```

To pre-load stubs, mount a mappings directory. GitHub Actions service containers support volume mounts via `options`:

```yaml
services:
  wiremock:
    image: wiremock/wiremock:3.5.4
    ports:
      - 8080:8080
    options: >-
      --health-cmd "curl -sf http://localhost:8080/__admin/health"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 10
      -v ${{ github.workspace }}/test-stubs:/home/wiremock/mappings
```

Test runner environment variable: `WIREMOCK_URL=http://localhost:8080`

See [[wiremock]] for stub file format and dynamic response configuration.

---

### RabbitMQ

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports:
      - 5672:5672
      - 15672:15672
    env:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    options: >-
      --health-cmd "rabbitmq-diagnostics -q ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 10
      --health-start-period 20s
```

RabbitMQ is the slowest of the common services to become healthy — the `--health-start-period 20s` prevents premature failure. The management plugin (port 15672) is useful during local debugging but not needed in CI.

Connection string: `amqp://guest:guest@localhost:5672/`

---

### Full multi-service example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: apptest
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U app -d apptest"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
          --health-start-period 10s

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

      wiremock:
        image: wiremock/wiremock:3.5.4
        ports:
          - 8080:8080
        options: >-
          --health-cmd "curl -sf http://localhost:8080/__admin/health"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - run: pip install -r requirements.txt

      - name: Run migrations
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/apptest

      - name: Load WireMock stubs
        run: |
          curl -sf -X POST http://localhost:8080/__admin/mappings/import \
            -H "Content-Type: application/json" \
            -d @test-stubs/mappings.json

      - name: Run integration tests
        run: pytest tests/integration/ -v
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/apptest
          REDIS_URL: redis://localhost:6379/0
          PAYMENT_API_URL: http://localhost:8080
```

---

## Healthcheck Polling

GitHub Actions waits for all service containers to pass their health checks before running any steps. If a container never becomes healthy, the job fails with a timeout error.

The `options` block is passed verbatim to `docker run`. All `--health-*` flags are standard Docker health check options:

| Flag | Default | Notes |
|---|---|---|
| `--health-cmd` | none (no check) | Shell command; exit 0 = healthy, non-zero = unhealthy |
| `--health-interval` | 30s | Time between checks |
| `--health-timeout` | 30s | Timeout for one check execution |
| `--health-retries` | 3 | Consecutive failures before marking unhealthy |
| `--health-start-period` | 0s | Grace period before failures count |

For slow-starting services (Postgres, RabbitMQ, Elasticsearch), set `--health-start-period` to at least 10–20s. Without it, early failures consume retries before the service has had any chance to initialise.

If there is no suitable health check command (e.g., a custom service without a health endpoint), use a TCP probe:

```yaml
options: >-
  --health-cmd "timeout 1 bash -c 'cat < /dev/null > /dev/tcp/localhost/8080'"
  --health-interval 5s
  --health-timeout 2s
  --health-retries 10
```

---

## Network Aliases and Container Communication

On GitHub Actions Linux runners, service containers share a Docker bridge network. Services can reach each other by their service name as hostname. The test runner (executing in the job's shell, not inside a container) reaches services on `localhost` with the mapped port.

If your test runner itself runs inside a container (e.g., a custom `container:` block), use the service name as the hostname instead of `localhost`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: python:3.12-slim
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: secret
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
    steps:
      - run: pytest tests/
        env:
          # hostname is the service name, not localhost
          DATABASE_URL: postgresql://postgres:secret@postgres:5432/postgres
```

The service name `postgres` resolves inside the network because Docker assigns it as a network alias automatically. This is the same mechanism WireMock and RabbitMQ use when services need to call each other.

---

## Environment Variable Injection

Inject connection strings and credentials into the test runner via the `env:` block on individual steps or the job level. Job-level `env:` applies to all steps:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://app:secret@localhost:5432/apptest
      REDIS_URL: redis://localhost:6379/0
    services:
      ...
    steps:
      - run: pytest tests/
      - run: ./scripts/smoke-test.sh
```

Use GitHub Actions secrets for passwords rather than hardcoding them in the workflow file, even for CI-only credentials:

```yaml
env:
  POSTGRES_PASSWORD: ${{ secrets.CI_DB_PASSWORD }}
```

For credentials that exist only in CI (never in production), a static test password in the workflow file is acceptable — the database is discarded after the job. Use secrets for anything that might also exist in production environments.

---

## Docker Compose vs the `services:` Block

| Aspect | `services:` block | Docker Compose |
|---|---|---|
| Setup overhead | Zero — CI-native, no file needed | Requires `docker-compose.yml` checked in |
| Port mapping | Automatic for Linux runners | Explicit in `ports:` |
| Health checks | Via `options:` flags | Via `healthcheck:` key (cleaner syntax) |
| Custom networks | Not configurable | Full control |
| Service dependencies | No `depends_on` | `depends_on` with condition |
| Reuse locally | No — CI-only syntax | Yes — run locally with `docker compose up` |
| Complex topologies | Awkward | Natural |
| Multi-container apps | Cumbersome | Purpose-built |

**Use `services:` when** the dependency list is short (1–4 services), images are standard, and you want zero additional files to maintain.

**Use Docker Compose when** you have complex inter-service dependencies, need custom networking, want to mirror the local dev setup in CI, or are managing 5+ services.

Running Docker Compose in GitHub Actions:

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Start services
    run: docker compose -f docker-compose.test.yml up -d --wait

  - name: Run tests
    run: pytest tests/integration/
    env:
      DATABASE_URL: postgresql://app:secret@localhost:5432/apptest

  - name: Stop services
    if: always()
    run: docker compose -f docker-compose.test.yml down -v
```

The `--wait` flag (Docker Compose v2.1+) blocks until all services with health checks report healthy. The `if: always()` ensures teardown runs even if tests fail.

---

## Testcontainers: Code-First Alternative

[[technical-qa/testcontainers]] embeds container lifecycle management inside test code. No CI configuration changes needed — the test itself starts and stops the container.

### Java (JUnit 5)

```java
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("secret");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void savesOrder() {
        // postgres is guaranteed healthy here
    }
}
```

`@Container` on a `static` field means the container is shared across all tests in the class. On an instance field, a new container starts per test — more isolation, more overhead.

### Python (pytest)

```python
import pytest
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg

@pytest.fixture(scope="session")
def redis():
    with RedisContainer("redis:7-alpine") as r:
        yield r

def test_order_persists(postgres):
    engine = create_engine(postgres.get_connection_url())
    # ...
```

`scope="session"` starts one container per pytest session, shared across all tests that use the fixture. `scope="function"` would start a fresh container per test — rarely worth the overhead unless you specifically need isolation at that granularity.

### Go

```go
func TestOrderRepository(t *testing.T) {
    ctx := context.Background()

    pgContainer, err := postgres.Run(ctx, "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("secret"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second)),
    )
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)

    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    require.NoError(t, err)
    // use connStr ...
}
```

Testcontainers-Go uses a `wait.Strategy` pattern instead of Docker health check flags. `ForLog` waits for a specific string in stdout — more precise than a TCP poll for services that print a ready message.

**Testcontainers vs `services:` block tradeoffs:**

- Testcontainers works in any environment (local, CI, any platform) with no CI-specific config.
- The `services:` block requires zero test code changes and starts containers before any steps run.
- For polyglot repos or repos with many CI platforms, Testcontainers removes CI-specific coupling.
- For simple single-platform setups, the `services:` block is less code overall.

---

## Seeding Test Data in CI

### Schema-only (most common)

Apply migrations, then let tests create their own data. Best for integration tests that exercise the full CRUD surface:

```yaml
- run: alembic upgrade head   # schema only, no data
  env:
    DATABASE_URL: ${{ env.DATABASE_URL }}
- run: pytest tests/integration/
```

### Fixture files

Load a fixed dataset after migrations. Use this when tests query data they didn't create (e.g., reporting queries, search tests):

```yaml
- run: alembic upgrade head
- run: psql $DATABASE_URL -f tests/fixtures/seed.sql
- run: pytest tests/integration/
```

Or via a Django management command, Rails db:seed equivalent, or framework-native fixture loader.

### Factory-based seeding

Preferred over static SQL fixtures for most applications. Factories (factory_boy, FactoryBot, go-factory) generate data programmatically inside tests, giving each test precisely the state it needs:

```python
# No global seed — each test builds its own state
def test_search_returns_active_orders(db_session):
    OrderFactory.create_batch(3, status="active", customer_id=1)
    OrderFactory.create(status="cancelled", customer_id=1)

    results = search_orders(customer_id=1, status="active")
    assert len(results) == 3
```

This avoids the most common fixture maintenance problem: a new feature adds a non-nullable column, breaking every existing fixture file.

---

## Common Failures

### Port conflicts

Symptom: `Error: address already in use` or the service container starts but the test can't connect.

Cause: A previous job on the same runner left a container running (rare with hosted runners, common with self-hosted runners that don't clean up).

Fix: Use dynamic port mapping — let Docker assign a random host port, then read it from the container:

With Testcontainers this is automatic. With the `services:` block, omit the host port:

```yaml
ports:
  - 5432   # maps to a random host port
```

Then read the assigned port:

```bash
docker inspect <container_id> --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}'
```

This is cumbersome with the `services:` block; Testcontainers handles it transparently. For the `services:` block on GitHub-hosted runners, port conflicts are uncommon because each job gets a fresh VM.

### Healthcheck timeouts

Symptom: `Error: Service 'rabbitmq' failed to become healthy. Details: health check exceeded timeout.`

Fix in order of preference:
1. Increase `--health-start-period` to give the service more time before checks count.
2. Increase `--health-retries` (retries × interval = total wait time).
3. Switch to a more reliable health command — `pg_isready` is more reliable than `psql -c "SELECT 1"` for Postgres.
4. Pin to a lighter image variant (`-alpine`) to reduce pull time.

### Image pull rate limits

Symptom: `Error: toomanyrequests: Rate limit reached for ...`

Docker Hub enforces pull limits: 100 pulls/6h for unauthenticated, 200 for free accounts.

Fix options:
- Authenticate with a Docker Hub account in the workflow:
```yaml
- uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```
- Mirror commonly used images to GitHub Container Registry (ghcr.io) or AWS ECR Public.
- Use GitHub Actions' built-in image caching (some images are pre-cached on `ubuntu-latest`).

### Container exits before health check passes

Symptom: Container transitions to `exited` state immediately.

Cause: The image's default command exits (e.g., a `CMD ["echo", "done"]`), or the entrypoint errors on a bad environment variable.

Fix: Check the container logs:

```yaml
- name: Debug service logs
  if: failure()
  run: docker ps -a && docker logs <container_name>
```

For GitHub Actions, service container names follow the pattern `<service_name>` — check `docker ps -a` output.

---

## Parallel Job Isolation

Each job in a GitHub Actions workflow gets its own runner VM and its own service container stack. Jobs that run in parallel don't share containers, databases, or ports — they are fully isolated by default.

For a matrix strategy across multiple database versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        postgres-version: [14, 15, 16]
    services:
      postgres:
        image: postgres:${{ matrix.postgres-version }}-alpine
        env:
          POSTGRES_PASSWORD: secret
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/integration/
        env:
          DATABASE_URL: postgresql://postgres:secret@localhost:5432/postgres
```

Each matrix entry spawns a separate job with its own Postgres container — no shared state, no port conflicts.

---

## GitLab CI Equivalent

GitLab CI uses the same `services:` key at the job level. The service container hostname is the image name with `:` and `/` replaced by `__` (double underscore), or overridden with `alias:`.

```yaml
integration-tests:
  image: python:3.12-slim
  services:
    - name: postgres:16-alpine
      alias: postgres
      variables:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: secret
        POSTGRES_DB: testdb
    - name: redis:7-alpine
      alias: redis
    - name: wiremock/wiremock:3.5.4
      alias: wiremock
  variables:
    DATABASE_URL: postgresql://test:secret@postgres:5432/testdb
    REDIS_URL: redis://redis:6379/0
    WIREMOCK_URL: http://wiremock:8080
  script:
    - pip install -r requirements.txt
    - alembic upgrade head
    - pytest tests/integration/
```

Key difference from GitHub Actions: in GitLab CI the test runner itself runs inside a container (specified by `image:`), so service hostnames use the alias, not `localhost`.

GitLab doesn't have a native health check polling mechanism equivalent to GitHub's `options: --health-cmd`. Services are considered ready when the container starts, not when the application inside is ready. Workaround: add a wait script as the first step:

```yaml
script:
  - until pg_isready -h postgres -U test; do sleep 1; done
  - pytest tests/integration/
```

---

## CircleCI Equivalent

CircleCI calls them `services:` under the `docker:` executor. The primary container is the first entry; additional entries are services:

```yaml
version: 2.1

jobs:
  integration-tests:
    docker:
      - image: cimg/python:3.12
      - image: postgres:16-alpine
        environment:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: testdb
      - image: redis:7-alpine
    steps:
      - checkout
      - run:
          name: Wait for Postgres
          command: dockerize -wait tcp://localhost:5432 -timeout 60s
      - run: pip install -r requirements.txt
      - run:
          command: pytest tests/integration/
          environment:
            DATABASE_URL: postgresql://test:secret@localhost:5432/testdb
            REDIS_URL: redis://localhost:6379/0
```

`dockerize` is a CircleCI-provided utility for waiting on TCP ports. Services are accessible on `localhost` from the primary container (same as GitHub Actions Linux runners).

---

## Azure DevOps Equivalent

Azure Pipelines uses `containers:` at the job level and references them in `services:`:

```yaml
jobs:
  - job: IntegrationTests
    pool:
      vmImage: ubuntu-latest

    container: python:3.12-slim

    services:
      postgres:
        image: postgres:16-alpine
        ports:
          - 5432:5432
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: testdb
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - script: pip install -r requirements.txt
      - script: alembic upgrade head
        env:
          DATABASE_URL: postgresql://test:secret@postgres:5432/testdb
      - script: pytest tests/integration/
        env:
          DATABASE_URL: postgresql://test:secret@postgres:5432/testdb
          REDIS_URL: redis://redis:6379/0
```

When a `container:` is set on the job, services are accessed by their service name as hostname (same as GitLab). Without a job-level container, services are on `localhost`.

---

## Connections

- [[technical-qa/testcontainers]] — code-first alternative to the `services:` block; runs containers inside the test process
- [[technical-qa/wiremock]] — common service container used for HTTP dependency stubbing
- [[technical-qa/database-testing]] — seeding strategies and schema management for DB service containers
- [[technical-qa/ci-cd-quality-gates]] — how service container test results feed into pass/fail gates
- [[technical-qa/tqa-hub]] — central index for all technical QA pages

## Open Questions

- When GitLab CI adds native health-check polling (equivalent to GitHub Actions `options: --health-cmd`), does the workaround wait script become redundant or still preferred for portability?
- At what service count does Docker Compose's `--wait` flag become more reliable than the `services:` block health-check mechanism?
- Is Testcontainers' Ryuk resource reaper compatible with rootless Docker on all major CI platforms?

## Decision Reference

| Need | Recommendation |
|---|---|
| 1–3 standard services, single CI platform | GitHub Actions `services:` block |
| Complex topology or local/CI parity | Docker Compose with `--wait` |
| Polyglot repo or multi-platform CI | Testcontainers |
| Self-hosted runners with persistent state risk | Testcontainers (avoids runner-level port conflicts) |
| Matrix testing across service versions | `services:` block with matrix variable |
| Service-to-service communication needed | Docker Compose or `container:` job with service aliases |
