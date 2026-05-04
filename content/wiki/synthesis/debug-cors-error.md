---
type: synthesis
category: synthesis
para: resource
tags: [debugging, cors, browser, preflight, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing CORS errors blocking browser requests to an API.
---

# Debug: CORS Error

**Symptom:** Browser console shows "CORS policy" error. Requests blocked before reaching the server. Works with curl or Postman but not from the browser.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| All requests blocked from one origin | That origin not in `Access-Control-Allow-Origin` |
| Only POST/PUT blocked, GET works | Preflight OPTIONS request failing |
| Works in dev, fails in prod | Different origins between environments not configured |
| Error mentions credentials | `withCredentials: true` requires exact origin, not wildcard |
| Intermittent — sometimes passes | CDN or proxy stripping CORS headers from cached responses |

---

## Likely Causes (ranked by frequency)

1. Origin not listed in allowed origins — server not configured for the requesting domain
2. Preflight OPTIONS request not handled — server returns 404 or 405 on OPTIONS
3. `Access-Control-Allow-Origin: *` with `credentials: true` — browsers reject this combination
4. CORS headers missing from error responses — server adds headers to 200s but not 4xx/5xx
5. Proxy or CDN stripping CORS headers before response reaches the browser

---

## First Checks (fastest signal first)

- [ ] Open browser DevTools Network tab — find the failed request and check the response headers for `Access-Control-Allow-Origin`
- [ ] Check whether a preflight OPTIONS request was made — if it failed, that is the root cause, not the actual request
- [ ] Confirm the exact `Origin` header the browser is sending — must match the server's allowed list exactly (scheme + domain + port)
- [ ] Check whether `credentials: true` is set — if so, wildcard origin will not work
- [ ] Check whether CORS headers are present on error responses, not just successful ones

**Signal example:** POST blocked with CORS error — DevTools shows OPTIONS preflight returns 404; server framework has CORS middleware but it only runs after routing, and the OPTIONS route is not defined.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| CORS configuration in FastAPI | [[web-frameworks/fastapi]] |
| CORS configuration in Django | [[web-frameworks/django-drf]] |
| API Gateway handling preflight | [[cloud/aws-api-gateway]] |
| Security implications of wildcard CORS | [[cs-fundamentals/api-security]] |

---

## Fix Patterns

- List allowed origins explicitly — avoid wildcard in production; enumerate the exact origins
- Handle OPTIONS preflight before auth middleware — auth should not block OPTIONS requests
- Add CORS headers to all response types — including 4xx and 5xx; browsers check headers regardless of status
- Never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` — use exact origin instead
- Test CORS from the browser, not curl — curl does not enforce CORS; only browsers do

---

## When This Is Not the Issue

If CORS headers are present and correct but requests still fail:

- Check Content-Type — `application/json` triggers a preflight; `text/plain` does not; if the server rejects the content type, CORS looks like the cause but is not
- Check whether a service worker or browser extension is intercepting requests

Pivot to [[synthesis/debug-auth-failing]] — a 401 from auth middleware before CORS headers are set looks identical to a CORS failure in the browser.

---

## Connections

[[web-frameworks/fastapi]] · [[cs-fundamentals/api-security]] · [[cloud/aws-api-gateway]] · [[synthesis/debug-auth-failing]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
