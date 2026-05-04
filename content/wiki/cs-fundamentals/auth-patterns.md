---
type: concept
category: cs-fundamentals
para: resource
tags: [auth, oauth2, jwt, oidc, pkce, api-keys, authentication]
sources: []
updated: 2026-05-01
tldr: Authentication (who are you?) and authorisation (what can you do?). Getting auth wrong is the most common source of security vulnerabilities. Use established protocols rather than inventing your own.
---

# Auth Patterns

Authentication (who are you?) and authorisation (what can you do?). Getting auth wrong is the most common source of security vulnerabilities. Use established protocols rather than inventing your own.

---

## Authentication vs Authorisation

- **Authentication (AuthN):** Verify identity. "Are you who you claim to be?"
- **Authorisation (AuthZ):** Verify permissions. "Are you allowed to do this?"
- **Session:** How the server remembers an authenticated user between requests.

---

## JWT (JSON Web Token)

A self-contained, signed token carrying claims. Servers can verify authenticity without a database lookup.

```
Header.Payload.Signature

Header:  {"alg": "RS256", "typ": "JWT"}
Payload: {"sub": "user_123", "email": "user@example.com", "role": "admin", "exp": 1714556400, "iat": 1714552800}
Signature: RSA_sign(base64(header) + "." + base64(payload), private_key)
```

```python
import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "use-env-variable-not-hardcoded"

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")
```

**JWT pitfalls:**
- Short expiry (15 min) + refresh token pattern. Long-lived JWTs can't be revoked.
- HS256 (symmetric) is fine for single service. Use RS256 (asymmetric) if multiple services verify tokens — only auth service holds private key.
- Never trust `alg: none` — always specify algorithms explicitly.

---

## OAuth 2.0

Authorisation framework. Allows users to grant third-party apps access to their resources without sharing passwords.

```
Roles:
  Resource Owner   — the user
  Client           — the app requesting access
  Authorization Server — issues tokens (Auth0, Okta, Keycloak)
  Resource Server  — the API protected by the token

Flows:
  Authorization Code — web apps with a backend (most secure)
  Authorization Code + PKCE — SPAs and mobile apps
  Client Credentials — service-to-service (no user involved)
  Device Code — TVs, CLIs, devices without browsers
```

### Authorization Code + PKCE Flow

```
1. Client generates code_verifier (random 43-128 char string)
2. Client computes code_challenge = BASE64URL(SHA256(code_verifier))
3. Client redirects user to auth server:
   GET /oauth/authorize
     ?client_id=myapp
     &redirect_uri=https://myapp.com/callback
     &response_type=code
     &scope=openid profile email
     &code_challenge=<hash>
     &code_challenge_method=S256
     &state=<random>   ← CSRF protection

4. User authenticates on auth server, grants consent
5. Auth server redirects to callback with auth code:
   https://myapp.com/callback?code=AUTH_CODE&state=<random>

6. Client exchanges code for tokens:
   POST /oauth/token
     code=AUTH_CODE
     code_verifier=<original random>  ← auth server verifies hash matches
     grant_type=authorization_code

7. Auth server returns: access_token, refresh_token, id_token
```

---

## OIDC (OpenID Connect)

OAuth 2.0 extension that adds identity. The `id_token` is a JWT containing user info; the `userinfo` endpoint returns more claims.

```python
# FastAPI + python-jose OIDC verification
from jose import jwt, JWTError
import httpx

async def get_jwks(issuer: str) -> dict:
    response = await httpx.get(f"{issuer}/.well-known/jwks.json")
    return response.json()

async def verify_id_token(token: str, issuer: str, client_id: str) -> dict:
    jwks = await get_jwks(issuer)
    header = jwt.get_unverified_header(token)
    key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])

    claims = jwt.decode(
        token,
        key,
        algorithms=[header["alg"]],
        audience=client_id,
        issuer=issuer,
    )
    return claims
```

---

## API Key Authentication

For server-to-server, CLI tools, or webhook endpoints. Simpler than OAuth for machine clients.

```python
# Generating secure API keys
import secrets

def generate_api_key() -> tuple[str, str]:
    key = f"sk_{secrets.token_urlsafe(32)}"
    hashed = bcrypt.hashpw(key.encode(), bcrypt.gensalt()).decode()
    # Store only hashed_key in DB; return raw key to user (shown once)
    return key, hashed

# Verifying API key on each request
def authenticate_api_key(key: str) -> ApiKey:
    prefix = key[:8]   # index on prefix for fast lookup
    stored = db.query(ApiKey).filter_by(key_prefix=prefix).first()
    if not stored or not bcrypt.checkpw(key.encode(), stored.hashed_key.encode()):
        raise AuthError("Invalid API key")
    return stored
```

---

## RBAC (Role-Based Access Control)

```python
# FastAPI dependency for role-based access
from fastapi import Depends, HTTPException

def require_role(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return dependency

@router.delete("/products/{id}")
async def delete_product(
    product_id: str,
    user: User = Depends(require_role("admin", "product_manager")),
):
    ...
```

---

## Service-to-Service Auth

```python
# GitHub Actions OIDC to AWS (no stored credentials)
# .github/workflows/deploy.yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
    aws-region: eu-west-1
    # GitHub OIDC provider in AWS → no access keys needed

# K8s service account → AWS IAM role (IRSA)
# Pod gets temporary credentials automatically via EKS IAM Roles for Service Accounts
```

---

## Common Failure Cases

**Long-lived JWTs with no revocation mechanism**
Why: access tokens set to expire in 24 hours or longer cannot be invalidated on logout, account compromise, or role change; the token remains valid until expiry regardless of server-side state.
Detect: log out, then replay the token — if it still returns 200 the token cannot be revoked.
Fix: use 15-minute access tokens with a refresh token rotation pattern, and maintain a Redis revocation list keyed by `jti` that is checked on every request.

**Refresh token not rotated on use**
Why: if an attacker steals a refresh token, they can obtain access tokens indefinitely; non-rotating refresh tokens never expire in practice.
Detect: use the same refresh token twice; if the second request also succeeds, rotation is not implemented.
Fix: invalidate the old refresh token and issue a new one on every `/auth/refresh` call; detect reuse of an invalidated token as a theft signal and revoke the entire session family.

**OAuth state parameter omitted, enabling CSRF on the callback**
Why: without a `state` parameter, an attacker can craft a callback URL with their own auth code and trick a victim's browser into binding the attacker's account.
Detect: initiate an OAuth flow without a `state` parameter; if the callback succeeds without state validation, CSRF is possible.
Fix: generate a cryptographically random `state` value, store it in the session before redirecting, and reject any callback where the returned `state` does not match.

**API keys stored in plaintext in the database**
Why: storing raw API key values means a database read gives an attacker all active keys; they cannot be selectively revoked or audited.
Detect: query the `api_keys` table — if `hashed_key` is absent and `key` is the full raw value, keys are stored insecurely.
Fix: store only a bcrypt or Argon2 hash plus the first 8 characters as a lookup prefix; show the full key to the user exactly once at creation time.

**RBAC checked in business logic but not at the route level**
Why: a role check inside a service method is invisible to the HTTP layer; a developer adds a new endpoint that calls the service without wiring up the `require_role` dependency, leaving it unprotected.
Detect: automated security scan or manual route audit — list all endpoints and verify each has an auth dependency in the FastAPI router definition.
Fix: enforce RBAC as a FastAPI `Depends` at the router or route decorator level, not inside the service, so it is impossible to add a route without specifying access control.

## Connections
[[se-hub]] · [[cs-fundamentals/security-fundamentals-se]] · [[cs-fundamentals/api-design]] · [[cloud/cloud-security]] · [[technical-qa/security-automation]] · [[qa/security-testing-qa]] · [[protocols/mcp]] · [[apis/anthropic-api]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
