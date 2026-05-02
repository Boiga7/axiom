---
type: concept
category: cs-fundamentals
para: resource
tags: [error-handling, exceptions, result-types, error-propagation, fastapi, custom-exceptions]
sources: []
updated: 2026-05-01
tldr: Designing error handling that is informative, testable, and does not silently swallow failures.
---

# Error Handling Patterns

Designing error handling that is informative, testable, and does not silently swallow failures.

---

## Exception Hierarchy Design

```python
# Define a clear exception hierarchy for your domain
# Base exception catches all domain errors; subclasses provide specificity

class AppError(Exception):
    """Base for all application errors."""
    def __init__(self, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code or self.__class__.__name__

class NotFoundError(AppError):
    """Resource not found."""

class ValidationError(AppError):
    """Input validation failure."""

class ConflictError(AppError):
    """State conflict — duplicate, optimistic lock, etc."""

class AuthorizationError(AppError):
    """Caller does not have permission."""

class ExternalServiceError(AppError):
    """Downstream service failed."""
    def __init__(self, service: str, message: str) -> None:
        super().__init__(f"{service}: {message}")
        self.service = service

# Domain-specific subclasses
class OrderNotFoundError(NotFoundError):
    def __init__(self, order_id: str) -> None:
        super().__init__(f"Order {order_id} not found", code="ORDER_NOT_FOUND")
        self.order_id = order_id

class InsufficientStockError(ConflictError):
    def __init__(self, product_id: str, requested: int, available: int) -> None:
        super().__init__(
            f"Product {product_id}: requested {requested}, available {available}",
            code="INSUFFICIENT_STOCK",
        )
```

---

## FastAPI Error Handlers

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import structlog

app = FastAPI()
log = structlog.get_logger()

@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": exc.code, "message": exc.message},
    )

@app.exception_handler(ValidationError)
async def validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": exc.code, "message": exc.message},
    )

@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"error": exc.code, "message": exc.message},
    )

@app.exception_handler(AuthorizationError)
async def auth_handler(request: Request, exc: AuthorizationError) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"error": exc.code, "message": exc.message},
    )

@app.exception_handler(ExternalServiceError)
async def external_handler(request: Request, exc: ExternalServiceError) -> JSONResponse:
    log.error("external_service_error", service=exc.service, message=exc.message)
    return JSONResponse(
        status_code=502,
        content={"error": "EXTERNAL_SERVICE_ERROR", "message": "Upstream service unavailable"},
        # Never expose the internal message — it may leak implementation details
    )

@app.exception_handler(Exception)
async def catch_all_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled_exception")
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
    )
```

---

## Result Type Pattern

```python
# Alternative to exceptions for expected failure paths.
# Makes failures visible in the function signature rather than hidden in raises.
# Useful when the caller MUST handle the failure case.

from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T
    ok: bool = True

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E
    ok: bool = False

type Result[T, E] = Ok[T] | Err[E]   # Python 3.12+ type alias

# Usage
async def charge_card(amount: int, card_token: str) -> Result[str, str]:
    try:
        charge_id = await stripe.charge(amount, card_token)
        return Ok(charge_id)
    except stripe.CardDeclinedError as e:
        return Err(str(e))
    except stripe.NetworkError:
        return Err("Payment network unavailable")

# Caller must handle both cases — no silent exception propagation
result = await charge_card(1000, card_token)
match result:
    case Ok(value=charge_id):
        await record_payment(charge_id)
    case Err(error=message):
        await notify_user_of_failure(message)
```

---

## Error Propagation Rules

```
1. Only catch what you can handle.
   Never: except Exception: pass  — silently discards all errors
   
2. Catch at the right layer.
   Infrastructure layer: catch DB/HTTP errors, convert to domain errors
   Domain layer: raise domain errors, don't catch them
   API layer: catch domain errors, convert to HTTP responses

3. Add context when re-raising.
   try:
       await payment_service.charge(order.total)
   except ExternalServiceError as e:
       raise PaymentFailedError(order_id=order.id) from e   # preserves cause

4. Never swallow exceptions in async code.
   asyncio.gather(*tasks, return_exceptions=True) collects exceptions as values —
   iterate results and re-raise or log them; don't ignore them.

5. Log at the boundary, not inside.
   log.error() belongs in the exception handler, not in every function that raises.
   Otherwise you log the same error multiple times.
```

---

## Retry with Exponential Backoff

```python
import asyncio
import random
from functools import wraps
from typing import Callable, TypeVar

T = TypeVar("T")

def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    exceptions: tuple = (ExternalServiceError,),
) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                    await asyncio.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, base_delay=0.5, exceptions=(ExternalServiceError,))
async def fetch_user_profile(user_id: str) -> dict:
    return await profile_service.get(user_id)
```

---

## Testing Error Handling

```python
import pytest
from httpx import AsyncClient

async def test_order_not_found_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/orders/non-existent-id")
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "ORDER_NOT_FOUND"
    assert "non-existent-id" in body["message"]

async def test_payment_failure_returns_409_not_500(
    client: AsyncClient, mocker
) -> None:
    mocker.patch(
        "app.services.payment.charge",
        side_effect=InsufficientStockError("prod_abc", 5, 2),
    )
    response = await client.post("/api/orders", json={"product_id": "prod_abc", "quantity": 5})
    assert response.status_code == 409
    assert "INSUFFICIENT_STOCK" in response.json()["error"]

async def test_external_service_error_does_not_leak_details(
    client: AsyncClient, mocker
) -> None:
    mocker.patch(
        "app.services.payment.charge",
        side_effect=ExternalServiceError("Stripe", "Internal Stripe error XYZ"),
    )
    response = await client.post("/api/orders", json={"product_id": "prod_abc", "quantity": 1})
    assert response.status_code == 502
    # Must not leak "Stripe" or internal error details
    assert "Stripe" not in response.text
    assert "XYZ" not in response.text
```

---

## Common Failure Cases

**Bare `except Exception: pass` swallows a critical failure**  
Why: developer intended to suppress one specific transient error and used a catch-all; a completely different exception (DB down, config missing) is silently discarded.  
Detect: operation appears to succeed (no error returned) but produces no output or side effect; add logging inside the except block.  
Fix: always catch the most specific exception class; if you must catch broadly, at minimum `log.exception(...)` before continuing.

**Error logged at the wrong layer — same error logged 3 times**  
Why: each function in the call stack logs the exception before re-raising; the aggregator shows 3 entries for one user-visible error.  
Detect: log search for a request ID shows identical error messages from multiple functions.  
Fix: log only at the boundary where the exception is handled (the API layer); functions that raise or re-raise should not log.

**`ExternalServiceError` leaks internal detail in the response**  
Why: the API handler passes `str(exc)` directly into the JSON response; the exception message contains internal service names, stack traces, or IDs.  
Detect: curl the endpoint while it's failing and inspect the response body for internal hostnames, SQL, or stack traces.  
Fix: always return a generic user-facing message for 5xx errors; log the full internal detail server-side with the request ID.

**Retry with backoff retries non-retryable errors**  
Why: the retry decorator catches all exceptions including validation errors (400) that will never succeed on retry; the caller blocks for 3 × backoff before getting an error.  
Detect: 400-class errors take 3–5 seconds instead of being immediate; retry count in logs for requests that should fail fast.  
Fix: whitelist only retryable exception classes in the `exceptions` tuple (`ExternalServiceError`, `TimeoutError`); raise validation errors immediately.

**Result type `Err` variant ignored by caller**  
Why: caller pattern-matches only on `Ok` and has no `case Err` branch; the error is silently dropped when the function fails.  
Detect: mypy/pyright reports unhandled cases in the match statement; or operation silently produces no output on failure.  
Fix: use exhaustive pattern matching; pyright with `--strict` will flag missing `Err` cases as unreachable code warnings.

## Connections

[[cs-fundamentals/se-hub]] · [[cs-fundamentals/clean-code]] · [[cs-fundamentals/api-design]] · [[cs-fundamentals/software-design-principles]] · [[web-frameworks/fastapi]] · [[cs-fundamentals/logging-best-practices]]
