---
type: concept
category: cs-fundamentals
para: resource
tags: [api-security, rate-limiting, jwt-attacks, oauth, input-validation, cors, owasp]
sources: []
updated: 2026-05-01
tldr: Securing APIs against authentication attacks, injection, abuse, and data exposure.
---

# API Security

Securing APIs against authentication attacks, injection, abuse, and data exposure.

---

## OWASP API Security Top 10 (2023)

```
API1:  Broken Object Level Authorization (BOLA / IDOR)
       User A accesses User B's data by changing an ID in the URL
       Fix: check ownership on every request, not just at login

API2:  Broken Authentication
       Weak passwords, missing rate limits on login, session fixation
       Fix: strong password policy, lockout, refresh token rotation

API3:  Broken Object Property Level Authorization
       API returns more fields than the caller should see (mass assignment)
       Fix: explicitly allowlist response fields; never auto-serialize ORM objects

API4:  Unrestricted Resource Consumption
       No rate limits; attacker drains quota or causes cost explosion
       Fix: rate limits per user + per IP; request size limits; pagination

API5:  Broken Function Level Authorization
       Non-admin accesses admin endpoints because role check is missing
       Fix: RBAC middleware checked on every endpoint, not just business logic

API6:  Unrestricted Access to Sensitive Business Flows
       Bot buys all inventory, exhausts promo codes
       Fix: CAPTCHA, per-user quotas on sensitive actions, anomaly detection

API7:  Server-Side Request Forgery (SSRF)
       API fetches user-supplied URL — attacker points it at internal services
       Fix: allowlist permitted hosts; block 169.254.x.x, 10.x.x.x, etc.

API8:  Security Misconfiguration
       Debug endpoints exposed, verbose errors, default credentials
       Fix: env-specific config, suppress stack traces in prod, scan headers

API9:  Improper Inventory Management
       Deprecated v1 API still running with no auth
       Fix: track all API versions; deprecation/sunset policy

API10: Unsafe Consumption of APIs
       Trusting third-party API responses without validation
       Fix: validate and sanitise all external data before processing
```

---

## BOLA / IDOR Prevention

```python
# WRONG — checks authentication but not ownership
@app.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404)
    return order   # BUG: any authenticated user can read any order

# CORRECT — ownership check mandatory
@app.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)   # ownership
        .first()
    )
    if not order:
        raise HTTPException(404)   # return 404, not 403 (don't leak existence)
    return order
```

---

## Rate Limiting

```python
# slowapi — production rate limiting for FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/auth/token")
@limiter.limit("5/minute")         # strict: login brute-force prevention
async def login(request: Request, credentials: LoginCredentials):
    ...

@app.get("/products")
@limiter.limit("200/minute")       # generous: public browsing
async def list_products(request: Request):
    ...

@app.post("/orders")
@limiter.limit("10/minute")        # moderate: abuse prevention
async def create_order(request: Request, order: OrderCreate,
                       user: User = Depends(get_current_user)):
    ...

# Per-user rate limiting (not per-IP):
def get_user_id(request: Request) -> str:
    user = extract_user_from_token(request)
    return str(user.id) if user else get_remote_address(request)

limiter_by_user = Limiter(key_func=get_user_id)
```

---

## JWT Security

```python
import jwt
from datetime import datetime, timedelta, timezone
from typing import Any

SECRET_KEY = "use-a-long-random-secret-from-env-never-hardcode"
ALGORITHM = "HS256"

def create_access_token(user_id: str) -> str:
    return jwt.encode(
        {
            "sub": user_id,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "jti": str(uuid.uuid4()),    # unique ID — enables revocation
            "type": "access",            # prevent refresh token used as access
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def verify_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Invalid token: {e}")

    if payload["type"] != "access":
        raise HTTPException(401, "Wrong token type")
    if is_token_revoked(payload["jti"]):    # check revocation list in Redis
        raise HTTPException(401, "Token revoked")

    return payload

# Common JWT attacks to defend against:
#   alg:none attack      — never allow {"alg": "none"} in JWT header
#                          (algorithms=[ALGORITHM] in decode prevents this)
#   RS256 confusion      — if you use RS256, verify only RS256, never HS256
#   kid injection        — if using key IDs, validate kid against an allowlist
#   token leakage        — never log tokens; store in httpOnly cookie not localStorage
```

---

## Input Validation at the Boundary

```python
from pydantic import BaseModel, field_validator, constr, conint
import re

SAFE_STRING = re.compile(r"^[\w\s\-.,!?@]+$")

class CreateOrderRequest(BaseModel):
    product_id: str                        # validated: non-empty
    quantity: conint(ge=1, le=100)         # 1 to 100
    discount_code: constr(max_length=20) | None = None
    shipping_address: str

    @field_validator("product_id")
    @classmethod
    def product_id_format(cls, v: str) -> str:
        if not re.match(r"^prod_[a-zA-Z0-9]{8,32}$", v):
            raise ValueError("Invalid product ID format")
        return v

    @field_validator("shipping_address")
    @classmethod
    def no_script_injection(cls, v: str) -> str:
        if "<" in v or ">" in v or "javascript:" in v.lower():
            raise ValueError("Invalid characters in address")
        return v.strip()

# Pydantic models reject unknown fields by default in strict mode:
class StrictModel(BaseModel):
    model_config = {"extra": "forbid"}   # raises if unknown fields present
```

---

## CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

# WRONG: allow all origins in production
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# CORRECT: explicit allowlist
ALLOWED_ORIGINS = [
    "https://myapp.com",
    "https://www.myapp.com",
    "https://admin.myapp.com",
]

if os.getenv("ENVIRONMENT") == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,            # required for cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,                       # preflight cache: 10 minutes
)
```

---

## Security Headers

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self' https://api.myapp.com"
            ),
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        })
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

## Common Failure Cases

**BOLA: ownership not checked on every request**
Why: authentication middleware verifies identity but route handlers query by resource ID without filtering to the current user, so any authenticated user can access any record.
Detect: security test — log in as user A, capture a resource ID belonging to user B, and request it; if it succeeds, BOLA is present.
Fix: always include `user_id = current_user.id` in the DB filter, not just an existence check.

**JWT algorithm confusion (alg:none or RS256/HS256 confusion)**
Why: if the server accepts any algorithm named in the token header, an attacker can forge tokens using `alg:none` or sign an RS256 token with the public key as an HS256 secret.
Detect: review whether `jwt.decode` specifies an explicit `algorithms=["HS256"]` allowlist, or accepts the algorithm from the header.
Fix: always pass `algorithms=[EXPECTED_ALGORITHM]` to the decode call; never allow `none`.

**Rate limiting applied per-IP but not per-authenticated-user**
Why: IP-based limits are trivially bypassed via rotating proxies; a single attacker with many IPs can brute-force credentials or drain quotas.
Detect: attempt login 100 times from different IPs against the same account; if all succeed without blocking, the control is IP-only.
Fix: add a per-user-id (or per-email) rate limit as a second layer alongside the IP limit.

**CORS wildcard left in production**
Why: `allow_origins=["*"]` is set during development and never tightened; combined with `allow_credentials=True` this allows any origin to make credentialed cross-site requests.
Detect: inspect the `Access-Control-Allow-Origin` response header from a production request.
Fix: replace the wildcard with an explicit allowlist; note that `allow_credentials=True` and `allow_origins=["*"]` together is a CORS spec violation that browsers block anyway — but the intent is still dangerous.

**Stack traces exposed in production error responses**
Why: framework debug mode is left enabled, or exception handlers are not overridden, so internal paths, library versions, and SQL queries leak in 500 responses.
Detect: send a malformed request and inspect the response body for file paths or tracebacks.
Fix: set `debug=False` in production config and add a global exception handler that returns a generic error message without internal detail.

## Connections

[[se-hub]] · [[cs-fundamentals/auth-patterns]] · [[cs-fundamentals/security-fundamentals-se]] · [[security/owasp-llm-top10]] · [[cs-fundamentals/api-versioning]] · [[cloud/cloud-security]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
