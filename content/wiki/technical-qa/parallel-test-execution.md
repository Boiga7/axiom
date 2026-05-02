---
type: concept
category: technical-qa
para: resource
tags: [parallelism, sharding, pytest-xdist, playwright-sharding, ci-matrix, test-isolation]
sources: []
updated: 2026-05-01
tldr: Running tests concurrently to compress feedback time — without introducing isolation failures.
---

# Parallel Test Execution

Running tests concurrently to compress feedback time — without introducing isolation failures.

---

## Why Parallelism Is Hard

```
Tests pass in serial but fail in parallel → almost always a shared state problem.

Shared state that causes parallel failures:
  - Same database row modified by two tests simultaneously
  - Global singleton (cached object, registry, counter) mutated by multiple workers
  - Same test user or account used across test files
  - Files written to the same path by parallel workers
  - Environment variables mutated by one test, read by another
  - Fixed ports (server starts on :8000, two workers conflict)

Rule: a test that can't be run twice simultaneously is not actually isolated.
Fixing parallelism means fixing isolation — the parallelism just surfaces the bug.
```

---

## pytest-xdist

```bash
pip install pytest-xdist

# Run with N workers (auto = one per CPU core)
pytest -n auto tests/
pytest -n 4 tests/
pytest -n 4 --dist=loadscope tests/   # group by module (good for shared fixtures)
pytest -n 4 --dist=loadfile tests/    # group by file (simplest isolation)
```

```python
# conftest.py — worker-aware fixtures
import pytest
import os

@pytest.fixture(scope="session")
def worker_id(request) -> str:
    """Returns 'master' (no -n) or 'gw0', 'gw1', ... with xdist."""
    return getattr(request.config, "workerinput", {}).get("workerid", "master")

@pytest.fixture(scope="session")
def db_url(worker_id: str) -> str:
    """Each worker gets its own database schema."""
    if worker_id == "master":
        schema = "test"
    else:
        schema = f"test_{worker_id}"   # e.g. test_gw0, test_gw1
    
    base_url = os.environ["DATABASE_URL"]
    return f"{base_url}?options=-c search_path={schema}"

@pytest.fixture(scope="session", autouse=True)
def setup_worker_schema(db_url: str, worker_id: str) -> None:
    """Create and seed schema for this worker, drop on teardown."""
    import psycopg2
    schema = f"test_{worker_id}" if worker_id != "master" else "test"
    
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    # Run migrations into this schema
    run_migrations(schema)
    yield
    cur.execute(f"DROP SCHEMA {schema} CASCADE")
    conn.close()
```

---

## Playwright Sharding

```bash
# Split the test suite into N shards — each shard runs independently on its own runner
# Shard 1 of 4
npx playwright test --shard=1/4
# Shard 2 of 4
npx playwright test --shard=2/4
```

```yaml
# .github/workflows/e2e-sharded.yml
name: E2E Sharded

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false         # don't cancel sibling shards on first failure
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run shard ${{ matrix.shard }}
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports/
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter=html ./all-blob-reports

      - uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report/
```

---

## pytest-xdist with Playwright

```python
# conftest.py — parallel Playwright with isolated browser contexts
import pytest
from playwright.sync_api import sync_playwright, Browser

@pytest.fixture(scope="session")
def browser(worker_id: str):
    """One browser process per xdist worker."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

@pytest.fixture
def page(browser: Browser, worker_id: str):
    """Fresh context per test — each test gets an isolated storage state."""
    context = browser.new_context(
        base_url="http://localhost:3000",
        # Each worker uses a different port if running local servers
    )
    page = context.new_page()
    yield page
    page.close()
    context.close()
```

---

## Port Management for Parallel Services

```python
import socket
import pytest

def find_free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]

@pytest.fixture(scope="session")
def app_port(worker_id: str) -> int:
    """Assign a unique port per xdist worker."""
    base_port = 8000
    if worker_id == "master":
        return base_port
    # gw0 → 8000, gw1 → 8001, etc.
    worker_num = int(worker_id.replace("gw", ""))
    return base_port + worker_num

@pytest.fixture(scope="session")
def app_server(app_port: int):
    """Start a test server on a worker-specific port."""
    import subprocess
    proc = subprocess.Popen(
        ["uvicorn", "app:app", "--port", str(app_port), "--host", "127.0.0.1"],
        env={**os.environ, "DATABASE_URL": db_url_for_worker()},
    )
    wait_for_port(app_port)
    yield f"http://127.0.0.1:{app_port}"
    proc.terminate()
```

---

## Measuring Speedup

```python
# Amdahl's Law for test suites:
# Speedup = 1 / (S + (1-S)/N)
# where S = fraction that must run serially, N = number of workers

# Practical measurement
import time, subprocess

def measure_parallel_speedup(test_path: str) -> dict:
    results = {}
    for workers in [1, 2, 4, 8]:
        start = time.time()
        subprocess.run(
            ["pytest", test_path, f"-n={workers}", "-q", "--tb=no"],
            capture_output=True,
        )
        results[workers] = time.time() - start

    serial_time = results[1]
    return {
        n: {"time": t, "speedup": serial_time / t, "efficiency": (serial_time / t) / n}
        for n, t in results.items()
    }

# Typical results:
#   1 worker:  300s (serial baseline)
#   4 workers: 90s  (3.3× speedup, 83% efficiency)
#   8 workers: 55s  (5.5× speedup, 69% efficiency — diminishing returns)
```

---

## Connections

[[tqa-hub]] · [[technical-qa/playwright-advanced]] · [[technical-qa/test-architecture]] · [[technical-qa/flaky-test-management]] · [[qa/continuous-testing]] · [[qa/end-to-end-testing]]
