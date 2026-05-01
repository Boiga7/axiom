---
type: concept
category: cloud
para: resource
tags: [cloud-native, twelve-factor, sidecar, service-mesh, immutable, stateless]
sources: []
updated: 2026-05-01
---

# Cloud-Native Patterns

Design principles and patterns for applications built to run on cloud infrastructure: containerised, dynamically orchestrated, microservices-oriented, and built for scale and resilience.

---

## The Twelve-Factor App

```
I.   Codebase       — one repo, many deploys (dev/staging/prod from same code)
II.  Dependencies   — explicitly declared (requirements.txt, package.json), never system-installed
III. Config         — in environment variables, not code (DATABASE_URL, API_KEY)
IV.  Backing services — attached as resources (DB, Redis, S3 treated identically)
V.   Build/release/run — strictly separated stages; releases are immutable
VI.  Processes      — stateless and share-nothing; state in backing services
VII. Port binding   — app exports HTTP on a port; no external web server
VIII.Concurrency    — scale out by adding processes, not threads
IX.  Disposability  — fast startup (< 5s), graceful shutdown (SIGTERM handling)
X.   Dev/prod parity — keep environments as similar as possible
XI.  Logs           — treat as event streams, write to stdout/stderr
XII. Admin processes — one-off admin tasks in the same environment as the app
```

---

## Health Checks — Liveness vs Readiness

```python
# FastAPI health endpoints — Kubernetes probes
from fastapi import FastAPI, Response

app = FastAPI()

@app.get("/health/live")
async def liveness():
    """Kubernetes liveness probe: is the process alive?
    If this fails, Kubernetes restarts the pod."""
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness(response: Response):
    """Kubernetes readiness probe: is the pod ready to serve traffic?
    If this fails, Kubernetes removes the pod from the load balancer."""
    checks = {
        "database": await check_database(),
        "cache": await check_redis(),
        "external_api": await check_payment_api(),
    }
    all_healthy = all(checks.values())
    if not all_healthy:
        response.status_code = 503
    return {"status": "ready" if all_healthy else "not_ready", "checks": checks}

@app.get("/health/startup")
async def startup():
    """Kubernetes startup probe: has the app finished initialising?
    Only checked during startup; prevents liveness killing a slow-starting app."""
    return {"status": "started"}
```

```yaml
# Kubernetes probe configuration
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health/startup
    port: 8000
  failureThreshold: 30    # allow 5 minutes (30 * 10s) to start
  periodSeconds: 10
```

---

## Graceful Shutdown

```python
import signal
import asyncio

class GracefulShutdown:
    def __init__(self, app):
        self.app = app
        self.shutdown_event = asyncio.Event()

    def handle_sigterm(self, *args):
        print("SIGTERM received — beginning graceful shutdown")
        self.shutdown_event.set()

    async def run(self):
        loop = asyncio.get_event_loop()
        loop.add_signal_handler(signal.SIGTERM, self.handle_sigterm)

        # Start server
        server_task = asyncio.create_task(self.app.start())

        # Wait for shutdown signal
        await self.shutdown_event.wait()

        print("Draining in-flight requests (max 30s)...")
        await asyncio.wait_for(self.app.drain(), timeout=30)
        await self.app.shutdown()
```

---

## Sidecar Pattern

```yaml
# Inject a proxy sidecar alongside the main container
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      # Main application
      - name: myapp
        image: myapp:1.2.3
        ports:
        - containerPort: 8000

      # Sidecar: metrics exporter
      - name: prometheus-exporter
        image: prom/statsd-exporter:v0.26.0
        ports:
        - containerPort: 9102

      # Sidecar: log forwarder (Fluent Bit)
      - name: fluent-bit
        image: fluent/fluent-bit:3.0
        volumeMounts:
        - name: log-volume
          mountPath: /var/log/app
        env:
        - name: LOKI_URL
          value: "http://loki.monitoring:3100"
```

---

## Circuit Breaker Pattern

```python
# Prevent cascade failures when a downstream service is down
import asyncio
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"       # normal operation
    OPEN = "open"           # failing fast
    HALF_OPEN = "half_open" # testing recovery

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60, success_threshold=2):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        self.failure_count = 0
        self.success_count = 0
        self.state = CircuitState.CLOSED
        self.opened_at: float = None

    async def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.opened_at > self.timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise RuntimeError(f"Circuit OPEN — rejecting call to {func.__name__}")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = max(0, self.failure_count - 1)

    def _on_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = time.time()

# Usage
payment_breaker = CircuitBreaker(failure_threshold=5, timeout=60)

async def charge_payment(amount: float, token: str):
    return await payment_breaker.call(payment_gateway.charge, amount=amount, token=token)
```

---

## Retry with Exponential Backoff

```python
import asyncio
import random
from functools import wraps

def retry(max_attempts=3, base_delay=1.0, max_delay=30.0, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts - 1:
                        raise
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    jitter = random.uniform(0, delay * 0.2)  # prevent thundering herd
                    await asyncio.sleep(delay + jitter)
        return wrapper
    return decorator

@retry(max_attempts=3, base_delay=1.0, exceptions=(httpx.TimeoutException, httpx.ConnectError))
async def fetch_product_data(product_id: str):
    async with httpx.AsyncClient() as client:
        return await client.get(f"https://api.products.internal/{product_id}", timeout=5.0)
```

---

## Connections
[[cloud-hub]] · [[cloud/kubernetes-operators]] · [[cloud/serverless-patterns]] · [[cloud/service-mesh]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/microservices-patterns]] · [[llms/ae-hub]]
