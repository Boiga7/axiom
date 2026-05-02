---
type: synthesis
category: synthesis
para: resource
tags: [debugging, auth, jwt, 401, 403, oauth, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing 401 and 403 errors, JWT failures, token expiry, and OAuth misconfiguration.
---

# Debug: Auth Failing

**Symptom:** 401 Unauthorized or 403 Forbidden responses. Users logged out unexpectedly. Token validation failing. OAuth flow broken.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| 401 on every request | Token missing, expired, or sent in wrong header |
| 401 only after some time | Short token TTL, no refresh logic |
| 403 on specific endpoints | User authenticated but lacks permission for that resource |
| 401 in production, works locally | Environment-specific secret or issuer mismatch |
| OAuth redirect loop | Redirect URI mismatch or state parameter missing |

---

## Likely Causes (ranked by frequency)

1. Token expired — short TTL with no refresh token flow
2. Wrong secret used to sign or verify JWT — env var mismatch between services
3. Missing or malformed `Authorization` header — `Bearer ` prefix missing or double-encoded
4. CORS preflight blocked before auth header reaches the server
5. RBAC misconfiguration — role assigned but permission check uses wrong attribute

---

## First Checks (fastest signal first)

- [ ] Decode the JWT at jwt.io — check `exp`, `iss`, `aud` fields; confirm it is not already expired
- [ ] Confirm the `Authorization` header is present and formatted correctly — `Bearer <token>`, not `bearer` or `Token`
- [ ] Check whether the signing secret matches between the issuer and validator — different env vars in different services
- [ ] Check CORS preflight — is the 401 actually a CORS block before auth is even checked?
- [ ] For 403: confirm the user's role or permission is actually set — check DB or identity provider, not just the token

**Signal example:** 401 on all requests in staging — JWT secret in the auth service is `JWT_SECRET` but the API service reads `JWT_SIGNING_KEY`; both exist but have different values.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| JWT structure and claims | [[cs-fundamentals/auth-patterns]] |
| CORS blocking before auth | [[synthesis/debug-cors-error]] |
| Secrets not matching across services | [[cloud/secrets-management]] |
| OAuth flow misconfiguration | [[cs-fundamentals/auth-patterns]] |
| RBAC permission model | [[cs-fundamentals/auth-patterns]] |

---

## Fix Patterns

- Always decode the token first — most auth failures are visible in the claims without any code change
- Centralise JWT secret as a single shared secret in a secrets manager — never hardcode or duplicate
- Implement refresh token rotation — short-lived access tokens (15 min) with longer-lived refresh tokens (7 days)
- Return `401` for unauthenticated, `403` for unauthorised — do not use 401 for permission failures
- For OAuth: validate `state` parameter on callback to prevent CSRF; log the exact redirect URI used

---

## When This Is Not the Issue

If the token is valid and the permission is correctly assigned but requests still fail:

- A middleware or proxy may be stripping the `Authorization` header before it reaches the service
- A CDN or API gateway may be caching a 401 response and serving it to authenticated users

Pivot to [[cloud/aws-api-gateway]] to check whether the gateway is consuming or rejecting the auth header before it reaches the backend.

---

## Connections

[[cs-fundamentals/auth-patterns]] · [[cs-fundamentals/api-security]] · [[cloud/secrets-management]] · [[cloud/aws-api-gateway]] · [[synthesis/debug-cors-error]]
