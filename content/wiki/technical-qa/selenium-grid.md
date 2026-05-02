---
type: concept
category: technical-qa
para: resource
tags: [selenium, grid, selenium-grid-4, docker, dynamic-grid, remote-webdriver, hub-node]
sources: []
updated: 2026-05-01
tldr: Running Selenium tests across browsers and machines in parallel with Grid 4's router/hub/node architecture.
---

# Selenium Grid 4

Running Selenium tests across browsers and machines in parallel with Grid 4's router/hub/node architecture.

---

## Grid 4 Architecture

```
Selenium Grid 4 components:

Router:   Entry point — routes requests to the right node
Hub:      Session management and queue
Node:     Machine that runs browsers and executes tests
Distributor: Manages which node gets which session

Deployment modes:
  Standalone:   Single process — all components together (dev/small scale)
  Hub+Node:     Classic split — hub on one machine, nodes on others
  Fully Distributed: Each component deployed separately (large scale, K8s)
  Docker Grid:  Nodes are Docker containers, spun up dynamically
```

---

## Standalone Mode (Local Dev)

```bash
# Download the Grid jar
curl -L https://github.com/SeleniumHQ/selenium/releases/download/selenium-4.20.0/selenium-server-4.20.0.jar \
    -o selenium-server.jar

# Start standalone
java -jar selenium-server.jar standalone \
    --port 4444 \
    --max-sessions 4 \
    --node-max-sessions 4

# Verify
curl http://localhost:4444/status | python3 -m json.tool
```

```python
# Run tests against the standalone Grid
from selenium import webdriver
from selenium.webdriver.remote.remote_connection import RemoteConnection

options = webdriver.ChromeOptions()
options.add_argument("--headless=new")

driver = webdriver.Remote(
    command_executor="http://localhost:4444",
    options=options,
)

driver.get("https://example.com")
assert "Example Domain" in driver.title
driver.quit()
```

---

## Docker Compose Grid

```yaml
# docker-compose.yml — Grid with dynamic scaling
version: "3.8"

services:
  selenium-hub:
    image: selenium/hub:4.20.0
    container_name: selenium-hub
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    environment:
      SE_NODE_MAX_SESSIONS: 1
      SE_SESSION_REQUEST_TIMEOUT: 120

  chrome:
    image: selenium/node-chrome:4.20.0
    shm_size: 2g
    depends_on:
      - selenium-hub
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: 2
    deploy:
      replicas: 3   # 3 Chrome nodes = 6 parallel sessions

  firefox:
    image: selenium/node-firefox:4.20.0
    shm_size: 2g
    depends_on:
      - selenium-hub
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: 2
    deploy:
      replicas: 2

  # Grid UI for monitoring
  # http://localhost:4444/ui
```

```bash
# Start the Grid
docker-compose up -d --scale chrome=3 --scale firefox=2

# Scale dynamically during CI
docker-compose up -d --scale chrome=6

# Stop all
docker-compose down
```

---

## pytest with Remote Grid

```python
# conftest.py
import pytest
from selenium import webdriver

GRID_URL = "http://selenium-hub:4444"

@pytest.fixture(params=["chrome", "firefox"])
def driver(request):
    browser = request.param
    if browser == "chrome":
        options = webdriver.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
    else:
        options = webdriver.FirefoxOptions()
        options.add_argument("--headless")

    driver = webdriver.Remote(
        command_executor=GRID_URL,
        options=options,
    )
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

# test_checkout.py
def test_checkout_page_loads(driver):
    driver.get("https://staging.example.com/checkout")
    assert "Checkout" in driver.title

# Run: pytest --workers=6 (pytest-xdist for parallel)
# Each worker gets its own Grid session
```

---

## CI Integration

```yaml
# .github/workflows/selenium-grid.yml
name: Cross-Browser Tests

on:
  push:
    branches: [main]

services:
  selenium-hub:
    image: selenium/hub:4.20.0
    ports:
      - 4444:4444
      - 4442:4442
      - 4443:4443

  chrome-node:
    image: selenium/node-chrome:4.20.0
    options: --shm-size=2g
    env:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

  firefox-node:
    image: selenium/node-firefox:4.20.0
    options: --shm-size=2g
    env:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

jobs:
  cross-browser:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements-test.txt
      - name: Wait for Grid
        run: |
          until curl -s http://localhost:4444/status | grep '"ready":true'; do
            sleep 2
          done
      - name: Run cross-browser tests
        env:
          GRID_URL: http://localhost:4444
        run: pytest tests/e2e/ -n 4 -v --tb=short
```

---

## Grid vs Playwright

```
Choose Selenium Grid when:
  - Legacy test suite already uses Selenium WebDriver
  - You need IE11 or older browser testing
  - Tests written in Java (Selenium Grid has better Java ecosystem)
  - Team has existing Grid infrastructure

Choose Playwright when:
  - Starting a new test suite (Playwright is faster, more reliable)
  - You need cross-browser without the Grid complexity
  - You need network interception, trace viewer, component testing
  - Python or TypeScript is your primary language

Migration path: new tests → Playwright; existing Selenium → migrate gradually.
```

---

## Common Failure Cases

**Node registers with the hub but never receives sessions**
Why: event bus ports (4442/4443) are not reachable from the node container; nodes appear in `GET /status` but the distributor cannot route to them.
Detect: `curl http://localhost:4444/status` shows nodes listed but `sessionCount` stays 0 while test queue grows.
Fix: verify `SE_EVENT_BUS_HOST` resolves correctly (use the Docker service name, not `localhost`) and that ports 4442 and 4443 are exposed and not firewalled between containers.

**Tests time out waiting for a Grid session under load**
Why: `SE_SESSION_REQUEST_TIMEOUT` defaults to 300 seconds; if all node slots are occupied and the queue depth exceeds available slots, tests block until timeout.
Detect: tests fail with `SessionNotCreatedException: Timeout waiting for a node to become available`; Grid UI shows a non-empty queue.
Fix: scale node replicas (`docker-compose up --scale chrome=N`) before the test run, or set `--max-sessions` on each node to match available CPU; add a pre-test readiness check that polls `/status` until slot count meets the required concurrency.

**Chrome node crashes due to insufficient shared memory**
Why: Chrome uses `/dev/shm` for rendering; the default Docker shared memory (64 MB) is too small and causes the renderer process to crash silently.
Detect: tests fail with `unknown error: session deleted because of page crash` or `ERR_INCOMPLETE_CHUNKED_ENCODING`.
Fix: set `shm_size: 2g` on the Chrome node service in `docker-compose.yml`, or pass `--disable-dev-shm-usage` via `ChromeOptions`.

**Cross-browser tests pass on Chrome but fail on Firefox due to driver API differences**
Why: certain WebDriver commands behave differently across browsers (e.g., `send_keys` on file inputs, `execute_script` return types); tests written against Chrome behaviour break on Firefox.
Detect: Firefox-parameterized test variants fail consistently while Chrome variants pass.
Fix: write tests against the W3C WebDriver standard only; avoid browser-specific `execute_script` workarounds and use explicit Selenium locator strategies that are browser-neutral.

## Connections

[[technical-qa/tqa-hub]] · [[test-automation/selenium]] · [[technical-qa/parallel-test-execution]] · [[technical-qa/playwright-advanced]] · [[qa/cross-browser-testing]] · [[technical-qa/e2e-framework-design]]
