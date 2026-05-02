---
type: concept
category: cs-fundamentals
para: resource
tags: [security, owasp, xss, csrf, sql-injection, encryption, tls, secrets]
sources: []
updated: 2026-05-01
tldr: Application security principles every engineer must know — not a specialisation, a baseline.
---

# Security Fundamentals for Software Engineers

Application security principles every engineer must know. Not a specialisation, a baseline. The OWASP Top 10 describes the same classes of vulnerabilities, year after year, because developers keep introducing them.

---

## OWASP Top 10 (2021)

| # | Category | Root Cause |
|---|---|---|
| A01 | Broken Access Control | Missing auth checks on endpoints |
| A02 | Cryptographic Failures | Weak/missing encryption, secrets in code |
| A03 | Injection | SQL, command, LDAP injection |
| A04 | Insecure Design | Security not considered at design time |
| A05 | Security Misconfiguration | Default creds, debug mode in prod, open S3 |
| A06 | Vulnerable Components | Outdated dependencies with known CVEs |
| A07 | Auth and Session Failures | Weak passwords, no MFA, fixated sessions |
| A08 | Software and Data Integrity | Unsigned packages, insecure CI/CD |
| A09 | Logging Failures | No logging, logging passwords |
| A10 | SSRF | Server fetching attacker-controlled URLs |

---

## SQL Injection

```python
# VULNERABLE — never do this
def get_user(username: str):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return db.execute(query)

# Input: ' OR '1'='1  → returns ALL users

# SAFE — parameterised queries
def get_user(username: str):
    return db.execute(
        "SELECT * FROM users WHERE username = :username",
        {"username": username}
    )

# SQLAlchemy ORM — safe by default
def get_user(username: str):
    return db.query(User).filter(User.username == username).first()

# Also vulnerable: LIKE patterns, ORDER BY, table names
# For dynamic ORDER BY, use an allowlist:
ALLOWED_COLUMNS = {"name", "created_at", "price"}
def list_products(sort_by: str):
    if sort_by not in ALLOWED_COLUMNS:
        raise ValueError(f"Invalid sort column: {sort_by}")
    return db.execute(f"SELECT * FROM products ORDER BY {sort_by}")
```

---

## Cross-Site Scripting (XSS)

```python
# VULNERABLE — rendering user input in HTML
@app.get("/search")
def search(q: str):
    return HTMLResponse(f"<h1>Results for: {q}</h1>")
# Input: <script>document.cookie</script>

# SAFE — escape output (Jinja2 auto-escapes by default)
@app.get("/search")
def search(q: str):
    return templates.TemplateResponse("search.html", {"request": request, "query": q})
# Template: <h1>Results for: {{ query }}</h1>  ← auto-escaped

# Content Security Policy header — defence in depth
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; object-src 'none'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response
```

---

## CSRF Protection

```python
# Cross-Site Request Forgery — tricks a logged-in user's browser into making a request

# FastAPI with CSRF middleware
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError

@CsrfProtect.load_config
def get_csrf_config():
    return [("secret_key", settings.SECRET_KEY)]

@app.post("/api/transfer")
async def transfer_funds(request: Request, csrf_protect: CsrfProtect = Depends()):
    await csrf_protect.validate_csrf(request)
    # proceed with transfer

# For SPAs using tokens: use SameSite=Strict cookies + custom header
# Browser won't send SameSite=Strict cookies cross-origin
# Custom header (X-Requested-With) can't be set by cross-origin forms
```

---

## Secrets Management

```python
# NEVER: hardcoded secrets in code
DATABASE_URL = "postgresql://admin:mysecretpassword@prod-db/myapp"

# NEVER: secrets in environment variables baked into Docker images
# (visible in docker inspect, process list, logs)

# CORRECT: load at runtime from secrets manager
import boto3

def get_secret(secret_name: str) -> str:
    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secret_name)
    return response["SecretString"]

DATABASE_URL = get_secret("myapp/prod/database-url")

# Or: use AWS SSM Parameter Store
ssm = boto3.client("ssm")
param = ssm.get_parameter(Name="/myapp/prod/db-password", WithDecryption=True)
db_password = param["Parameter"]["Value"]
```

---

## Password Hashing

```python
from passlib.context import CryptContext

# bcrypt with a work factor of 12 (2^12 iterations)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# NEVER use: MD5, SHA1, SHA256 for passwords — they're fast, so brute-forceable
# ALWAYS use: bcrypt, argon2, or scrypt — deliberately slow
```

---

## Transport Security (TLS)

```python
# Enforce HTTPS — reject non-TLS in production
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
app.add_middleware(HTTPSRedirectMiddleware)

# HTTP Strict Transport Security
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

# Verify TLS in outbound requests — never disable verification
import httpx
# BAD: httpx.get(url, verify=False)  # disables cert verification
# GOOD:
httpx.get(url, verify=True)  # default, verify server cert
httpx.get(url, verify="/path/to/ca-bundle.pem")  # custom CA
```

---

## Input Validation

```python
from pydantic import BaseModel, validator, constr, conint

class CreateProductRequest(BaseModel):
    name: constr(min_length=1, max_length=200, strip_whitespace=True)
    price: float
    quantity: conint(ge=0, le=10_000)
    category: str

    @validator("price")
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Price must be positive")
        return round(v, 2)

    @validator("category")
    def category_must_be_allowed(cls, v):
        allowed = {"electronics", "clothing", "books", "food"}
        if v not in allowed:
            raise ValueError(f"Category must be one of: {allowed}")
        return v

# Validate at the boundary — HTTP handler, not deep in business logic
@app.post("/api/products")
def create_product(body: CreateProductRequest):  # Pydantic validates on entry
    ...
```

---

## Common Failure Cases

**Parameterised query bypassed for dynamic ORDER BY or table names**
Why: query parameters only protect value positions; column names and table names cannot be parameterised and must be validated by allowlist.
Detect: a `sort_by` or `table` URL parameter is interpolated directly into SQL without an allowlist check.
Fix: validate the value against an explicit set of permitted identifiers before interpolating, as shown in the SQL injection section above.

**Password hashed with a fast algorithm (SHA-256, MD5)**
Why: fast hashing algorithms allow billions of guesses per second on a GPU; a leaked database is cracked in hours.
Detect: the password hashing call is `hashlib.sha256(...)` or `hashlib.md5(...)` rather than bcrypt/argon2/scrypt.
Fix: replace with `passlib.context.CryptContext(schemes=["bcrypt"], bcrypt__rounds=12)` and re-hash on next login.

**TLS verification disabled in outbound HTTP client**
Why: `verify=False` (requests/httpx) or `ssl=False` (aiohttp) eliminates certificate validation, enabling man-in-the-middle attacks on every downstream API call.
Detect: any `verify=False` or `ssl=False` in the codebase; check with `grep -r "verify=False"`.
Fix: remove the flag; if a custom CA is required, pass the CA bundle path: `verify="/etc/ssl/certs/ca-bundle.crt"`.

**Secret exposed through environment variable visible in Docker inspect**
Why: `ENV` instructions in a Dockerfile bake the value into every image layer and are visible via `docker inspect`; passing secrets as `--build-arg` exposes them in the build history.
Detect: `docker inspect <image> | grep -i password` returns a value; or `docker history <image>` shows a build arg containing a credential.
Fix: load secrets at container runtime from a secrets manager (AWS Secrets Manager, Vault) or Docker secrets mount; never set them in `ENV` or `--build-arg`.

**CSRF protection absent on state-changing API endpoints**
Why: APIs using cookie-based session auth are vulnerable to cross-site requests from any origin unless CSRF tokens or `SameSite=Strict` cookies are enforced.
Detect: a `POST /api/transfer` endpoint accepts requests from a third-party domain without any token validation.
Fix: set `SameSite=Strict` on session cookies and add a `X-Requested-With` custom header check, or use a CSRF middleware as shown above.

## Connections
[[se-hub]] · [[cs-fundamentals/auth-patterns]] · [[qa/security-testing-qa]] · [[technical-qa/security-automation]] · [[cloud/cloud-security]] · [[security/owasp-llm-top10]]
