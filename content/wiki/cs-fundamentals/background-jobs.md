---
type: concept
category: cs-fundamentals
para: resource
tags: [celery, arq, background-tasks, job-queue, redis, beat, retry, dlq]
sources: []
updated: 2026-05-01
tldr: Offloading work from the request/response cycle — email sending, report generation, data processing.
---

# Background Jobs and Task Queues

Offloading work from the request/response cycle. Email sending, report generation, data processing.

---

## When to Use Background Jobs

```
Use a background job when:
  - Operation takes > 200ms and user shouldn't wait (email, PDF generation)
  - Operation is retryable (network call to third party)
  - Operation should be deferred (send daily digest at 9am)
  - Operation is high volume and should be processed concurrently
  - Operation is not critical to the current response (analytics event)

Don't use a background job when:
  - User needs the result immediately (most CRUD)
  - The operation is fast and simple (< 50ms computation)
  - Ordering guarantees are impossible to maintain with your queue
```

---

## FastAPI BackgroundTasks (Simple Cases)

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

def send_welcome_email(email: str, name: str) -> None:
    # Runs in the same process after response is sent
    email_client.send(to=email, subject="Welcome!", body=f"Hi {name}...")

@app.post("/users", status_code=201)
async def create_user(user: UserCreate, background_tasks: BackgroundTasks):
    created = await user_service.create(user)
    # Response sent to client, then send_welcome_email runs
    background_tasks.add_task(send_welcome_email, user.email, user.name)
    return created

# Limitation: runs in the same process; if the server crashes, the task is lost.
# Use Celery/arq for reliability, persistence, and retry logic.
```

---

## Celery

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab
import os

app = Celery(
    "myapp",
    broker=os.environ["REDIS_URL"],      # Redis or RabbitMQ as broker
    backend=os.environ["REDIS_URL"],     # Store task results
    include=["myapp.tasks"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    timezone="UTC",
    task_acks_late=True,             # ack only after task completes (safer)
    task_reject_on_worker_lost=True, # re-queue if worker dies
    worker_prefetch_multiplier=1,    # pull one task at a time (fair scheduling)
    task_routes={
        "myapp.tasks.send_email": {"queue": "email"},
        "myapp.tasks.generate_report": {"queue": "reports"},
    },
    # Scheduled tasks (Celery Beat)
    beat_schedule={
        "send-daily-digest": {
            "task": "myapp.tasks.send_daily_digest",
            "schedule": crontab(hour=9, minute=0),
        },
        "cleanup-expired-sessions": {
            "task": "myapp.tasks.cleanup_sessions",
            "schedule": 3600.0,   # every hour
        },
    },
)
```

```python
# tasks.py
from celery_app import app
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,         # 60s between retries
    autoretry_for=(Exception,),     # auto-retry on any exception
    retry_backoff=True,             # exponential backoff
    retry_backoff_max=600,          # cap backoff at 10 minutes
    retry_jitter=True,              # add random jitter
)
def send_order_confirmation(self, order_id: str, email: str) -> dict:
    try:
        order = fetch_order(order_id)
        email_client.send(
            to=email,
            subject=f"Order #{order_id} confirmed",
            body=render_template("order_confirmation.html", order=order),
        )
        return {"sent": True, "order_id": order_id}
    except EmailServiceDown as exc:
        logger.warning(f"Email service down, retrying: {exc}")
        raise self.retry(exc=exc)

# Calling tasks
result = send_order_confirmation.delay("ord_123", "user@example.com")
result = send_order_confirmation.apply_async(
    args=["ord_123", "user@example.com"],
    countdown=300,          # delay 5 minutes
    expires=3600,           # expire if not started within 1 hour
    priority=9,             # 0-9, higher = higher priority
)

# Checking result
if result.ready():
    print(result.get(timeout=10))   # blocks up to 10s
```

---

## arq (Async Celery Alternative)

```python
# pip install arq — pure async, Redis-backed, simpler than Celery
# arq/tasks.py
import arq
from arq import create_pool, ArqRedis
from arq.connections import RedisSettings

async def send_email(ctx: dict, recipient: str, subject: str, body: str) -> bool:
    """ctx contains {'redis': ArqRedis, 'job_id': str, ...}"""
    try:
        await email_client.send(to=recipient, subject=subject, body=body)
        return True
    except Exception as exc:
        raise   # arq retries automatically based on WorkerSettings.retry_jobs

async def generate_report(ctx: dict, report_id: str) -> dict:
    report = await build_report(report_id)
    await ctx["redis"].set(f"report:{report_id}", report.to_json())
    return {"report_id": report_id, "size": len(report.rows)}

class WorkerSettings:
    functions = [send_email, generate_report]
    redis_settings = RedisSettings(host="localhost", port=6379)
    max_jobs = 10
    retry_jobs = True
    job_timeout = 300          # 5 minutes max per job
    keep_result = 3600         # keep results for 1 hour
    queue_read_limit = 100

# Enqueueing
async def enqueue_email(pool: ArqRedis, **kwargs) -> None:
    job = await pool.enqueue_job("send_email", **kwargs)
    return job.job_id

# In FastAPI startup
@app.on_event("startup")
async def startup() -> None:
    app.state.arq_pool = await create_pool(RedisSettings())

@app.post("/orders/{order_id}/notify")
async def notify_order(order_id: str, request: Request) -> dict:
    job_id = await enqueue_email(
        request.app.state.arq_pool,
        recipient="user@example.com",
        subject=f"Order {order_id} confirmed",
        body="...",
    )
    return {"job_id": job_id}
```

---

## Dead Letter Queue Pattern

```python
# Celery: route exhausted-retry tasks to a DLQ
@app.task(
    max_retries=3,
    acks_late=True,
)
def process_payment(self, payment_id: str) -> dict:
    try:
        return payment_service.process(payment_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            # Final failure: send to DLQ for manual inspection
            failed_payments_queue.delay(
                payment_id=payment_id,
                error=str(exc),
                attempts=self.request.retries,
            )
            return {"status": "failed_to_dlq"}
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))

@app.task(queue="dlq")
def failed_payments_queue(payment_id: str, error: str, attempts: int) -> None:
    # Alert on-call, create Jira ticket, notify finance team
    alert_on_call(f"Payment {payment_id} failed after {attempts} attempts: {error}")
    create_manual_review_ticket(payment_id, error)
```

---

## Monitoring Celery

```python
# Flower — Celery web monitor
# pip install flower
# celery -A celery_app flower --port=5555

# Programmatic monitoring
from celery.app.control import Control

control = Control(app)

def get_worker_stats() -> dict:
    inspect = app.control.inspect()
    return {
        "active": inspect.active() or {},       # tasks currently running
        "reserved": inspect.reserved() or {},   # tasks queued per worker
        "scheduled": inspect.scheduled() or {}, # ETA tasks
    }

# Queue length monitoring (via Redis directly)
import redis

def get_queue_lengths() -> dict[str, int]:
    r = redis.from_url(os.environ["REDIS_URL"])
    queues = ["celery", "email", "reports", "dlq"]
    return {q: r.llen(q) for q in queues}
```

---

## Common Failure Cases

**Task acknowledged before completion, lost on worker crash**
Why: the default Celery setting `task_acks_early=True` (pre-4.x default) acknowledges the task when it is received, not when it finishes; if the worker process dies mid-execution the task is silently dropped.
Detect: kill a worker mid-task and check whether the task re-runs; if it does not, acks are early.
Fix: set `task_acks_late=True` and `task_reject_on_worker_lost=True` in Celery config so tasks are only acknowledged after successful completion.

**Unbounded retry loop exhausting the broker queue**
Why: `autoretry_for=(Exception,)` with `max_retries=None` or a very high limit retries indefinitely on a permanent failure (e.g., malformed payload), filling the queue and starving other tasks.
Detect: queue length grows without bound; the same task ID appears in Flower logs hundreds of times.
Fix: set an explicit `max_retries` (3-5 is typical), use exponential backoff with `retry_backoff=True`, and route exhausted tasks to a DLQ for human inspection.

**FastAPI `BackgroundTasks` used for work that must survive a crash**
Why: `BackgroundTasks` runs in the same process and thread pool as the web server; a server restart or crash drops all pending tasks with no recovery.
Detect: restart the server while a background task is pending and verify whether it completed.
Fix: use Celery or arq for any task that must complete reliably; reserve `BackgroundTasks` only for best-effort fire-and-forget work (e.g., logging an analytics event).

**Multiple Celery Beat instances running simultaneously**
Why: deploying more than one Celery Beat process against the same Redis broker causes every scheduled task to fire multiple times — once per beat instance.
Detect: scheduled tasks show duplicate rows in result backend; beat logs from two different hosts have overlapping schedule timestamps.
Fix: ensure exactly one Beat process runs at any time — use a deployment constraint (single replica), a distributed lock (RedBeat), or a managed scheduler like AWS EventBridge.

## Connections

[[se-hub]] · [[cs-fundamentals/concurrency]] · [[cs-fundamentals/event-driven-architecture]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-step-functions]] · [[web-frameworks/fastapi]]
