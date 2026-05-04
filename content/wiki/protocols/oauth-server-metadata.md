---
type: concept
category: protocols
tags: [oauth, rfc-8414, discovery, mcp, authentication, authorization]
sources: []
updated: 2026-05-03
para: resource
tldr: RFC 8414 defines a discovery endpoint at /.well-known/oauth-authorization-server that lets OAuth clients fetch server endpoints and capabilities automatically — required by MCP 2025-03-26 for dynamic auth configuration.
---

# OAuth 2.0 Server Metadata (RFC 8414)

> **TL;DR** RFC 8414 defines a discovery endpoint at `/.well-known/oauth-authorization-server` that lets OAuth clients fetch server endpoints and capabilities automatically — required by MCP 2025-03-26 for dynamic auth configuration.

> [Source: WebSearch, 2026-05-03] [Source: RFC Editor rfc8414, datatracker.ietf.org]

---

## What It Does

Before RFC 8414, OAuth clients had to hardcode every authorization server endpoint: the authorization URL, token URL, JWKS URL, and supported scopes. This broke whenever servers changed configuration and made multi-tenant deployments awkward.

RFC 8414 (published June 2018) standardises a JSON metadata document that any OAuth 2.0 authorization server exposes at a well-known URL. Clients fetch it once on startup, discover all endpoints dynamically, and adapt to the server's capabilities without hardcoding.

The well-known endpoint path:

```
GET /.well-known/oauth-authorization-server
```

For servers with a path prefix (e.g., `https://auth.example.com/tenant-a`), the document lives at:

```
GET /.well-known/oauth-authorization-server/tenant-a
```

The response is always `Content-Type: application/json` with no authentication required.

---

## The Metadata Document

A minimal compliant response. Fields marked `*` are REQUIRED by the spec; the rest are OPTIONAL or RECOMMENDED.

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "registration_endpoint": "https://auth.example.com/register",
  "scopes_supported": ["openid", "read", "write"],
  "response_types_supported": ["code"],
  "response_modes_supported": ["query", "fragment"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post",
    "none"
  ],
  "code_challenge_methods_supported": ["S256"],
  "service_documentation": "https://auth.example.com/docs",
  "ui_locales_supported": ["en-US"]
}
```

**Field reference:**

| Field | Required | Description |
|---|---|---|
| `issuer` | REQUIRED | HTTPS URL identifying the authorization server. Must exactly match the URL used to fetch the document. |
| `authorization_endpoint` | REQUIRED* | URL for the authorization endpoint. *Required unless no grant type uses it. |
| `token_endpoint` | REQUIRED* | URL for the token endpoint. *Required unless only implicit grant is supported. |
| `jwks_uri` | RECOMMENDED | URL of the JWK Set document clients use to validate server-signed tokens. |
| `registration_endpoint` | OPTIONAL | URL for Dynamic Client Registration (RFC 7591). |
| `scopes_supported` | RECOMMENDED | JSON array of supported scope values. |
| `response_types_supported` | REQUIRED | JSON array of supported `response_type` values (e.g., `["code"]`). |
| `grant_types_supported` | OPTIONAL | Defaults to `["authorization_code", "implicit"]` if omitted. |
| `token_endpoint_auth_methods_supported` | OPTIONAL | Client auth methods for the token endpoint. Defaults to `["client_secret_basic"]`. |
| `code_challenge_methods_supported` | OPTIONAL | PKCE methods supported. Presence of `S256` signals PKCE support. |
| `service_documentation` | OPTIONAL | URL to human-readable documentation for developers. |
| `revocation_endpoint` | OPTIONAL | URL for the token revocation endpoint (RFC 7009). |
| `introspection_endpoint` | OPTIONAL | URL for the token introspection endpoint (RFC 7662). |

---

## How Clients Use It

The standard client flow:

1. **Fetch on startup** — `GET /.well-known/oauth-authorization-server` against the known server origin.
2. **Validate issuer** — confirm `issuer` in the document exactly matches the URL used to fetch it. Mismatch indicates a misconfigured or malicious server.
3. **Extract endpoints** — read `authorization_endpoint`, `token_endpoint`, `jwks_uri` rather than using hardcoded values.
4. **Check capabilities** — inspect `code_challenge_methods_supported` to confirm PKCE is available before starting an auth flow. Inspect `grant_types_supported` to select a compatible grant.
5. **Cache** — cache the document with a reasonable TTL (typically 24 hours). Re-fetch on 401 responses to catch rotation events.
6. **Proceed with auth** — use the discovered `authorization_endpoint` to redirect the user; exchange the code at `token_endpoint`.

If the well-known endpoint returns 404, clients fall back to convention-based paths, though this is not spec-compliant.

---

## RFC 8414 vs OIDC Discovery

Both standards solve the same discovery problem. They are related but distinct.

| Aspect | RFC 8414 | OIDC Discovery 1.0 |
|---|---|---|
| Well-known path | `/.well-known/oauth-authorization-server` | `/.well-known/openid-configuration` |
| Scope | Generic OAuth 2.0 servers | Identity providers (adds `userinfo_endpoint`, `id_token` fields) |
| Origin | IETF, June 2018 | OpenID Foundation, predates RFC 8414 |
| Relationship | Generalises OIDC Discovery for pure OAuth use cases | Superset; OIDC fields extend the RFC 8414 base |
| Path handling | When issuer has a path, appends it after the well-known prefix | Appends well-known prefix after the path |

In practice, many identity providers expose both paths pointing to the same document. Pure OAuth 2.0 authorization servers (not identity providers) should use `/.well-known/oauth-authorization-server`. MCP clients should handle both. [unverified — MCP spec language on fallback is evolving]

---

## MCP and OAuth Server Metadata

MCP spec 2025-03-26 added OAuth 2.0 as the recommended auth mechanism for HTTP-based MCP servers. RFC 8414 is the discovery layer that makes this workable in practice.

**How MCP uses it:**

1. An MCP client connecting to a remote server first fetches `/.well-known/oauth-authorization-server` (and optionally `/.well-known/oauth-protected-resource` per RFC 9728) to discover the authorization server's endpoints.
2. The client checks `code_challenge_methods_supported` — if `S256` is absent, the client must refuse to proceed. PKCE is mandatory in MCP auth flows.
3. The client uses `registration_endpoint` to register dynamically via RFC 7591 (Dynamic Client Registration) if no `client_id` is pre-provisioned.
4. Auth proceeds via the discovered `authorization_endpoint` and `token_endpoint` with PKCE.

**Why it matters for AI tools:** MCP servers are deployed by many parties (SaaS vendors, teams, individuals). Hardcoding auth endpoints per server would be unscalable. RFC 8414 lets a generic MCP client work with any compliant auth server without per-server configuration.

See [[protocols/mcp]] for the full MCP transport and security model. See [[protocols/rfc-7591-dynamic-client-registration]] for the registration step that follows discovery — the client uses the discovered `registration_endpoint` to obtain a `client_id` via RFC 7591.

---

## Implementation

Minimal Python client that fetches and validates metadata:

```python
import httpx

async def fetch_server_metadata(issuer: str) -> dict:
    # Build the well-known URL per RFC 8414 section 3
    if issuer.rstrip("/") == issuer:
        url = f"{issuer}/.well-known/oauth-authorization-server"
    else:
        # Issuer has path component — insert well-known before the path
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(issuer)
        url = urlunparse(parsed._replace(
            path=f"/.well-known/oauth-authorization-server{parsed.path}"
        ))

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()
        metadata = resp.json()

    # Validate issuer claim matches what we fetched from
    if metadata.get("issuer") != issuer.rstrip("/"):
        raise ValueError(f"Issuer mismatch: got {metadata.get('issuer')!r}")

    return metadata


async def check_pkce_support(metadata: dict) -> bool:
    methods = metadata.get("code_challenge_methods_supported", [])
    return "S256" in methods
```

Minimal Python server exposing the endpoint (FastAPI):

```python
from fastapi import FastAPI

app = FastAPI()

SERVER_METADATA = {
    "issuer": "https://auth.example.com",
    "authorization_endpoint": "https://auth.example.com/authorize",
    "token_endpoint": "https://auth.example.com/token",
    "response_types_supported": ["code"],
    "grant_types_supported": ["authorization_code", "refresh_token"],
    "code_challenge_methods_supported": ["S256"],
    "token_endpoint_auth_methods_supported": ["none", "client_secret_basic"],
}

@app.get("/.well-known/oauth-authorization-server")
async def oauth_metadata():
    return SERVER_METADATA
```

---

## Security Considerations

**HTTPS is mandatory.** RFC 8414 requires the issuer and all endpoint URLs use HTTPS. A client fetching the metadata document over HTTP is vulnerable to a MITM replacing endpoint URLs with attacker-controlled ones.

**Issuer validation.** After fetching the document, validate that `issuer` exactly matches the URL you used to fetch it. This prevents a misconfigured reverse proxy from serving one server's metadata to clients of another.

**Token endpoint auth methods.** The `token_endpoint_auth_methods_supported` field governs how clients authenticate at the token endpoint. For public clients (SPAs, CLI tools, MCP agents), `none` is listed; PKCE compensates for the absent client secret. For confidential clients (server-to-server), `client_secret_basic` or `private_key_jwt` are more appropriate.

**Cache invalidation.** Caching metadata indefinitely can serve stale endpoint URLs after a server migration. Implement TTL-based refresh and re-fetch on unexpected 401 responses.

**JWKS rotation.** If validating JWTs, re-fetch `jwks_uri` when encountering an unknown `kid` claim — do not cache the key set forever.

---

## Key Facts

- Published: RFC 8414, June 2018
- Discovery path: `GET /.well-known/oauth-authorization-server`
- Only `issuer` and `response_types_supported` are REQUIRED fields; most others are optional
- `code_challenge_methods_supported: ["S256"]` signals PKCE support — MCP clients check this before proceeding
- HTTPS is mandatory for the issuer URL and all endpoint URLs in the document
- Complements RFC 7591 (Dynamic Client Registration) and RFC 7636 (PKCE)

---

## Common Failure Cases

**Wrong well-known path**
Some servers expose `/.well-known/openid-configuration` but not `/.well-known/oauth-authorization-server`. Clients written strictly to RFC 8414 will get a 404. Handle by falling back to the OIDC discovery path, or accept both in order.

**Issuer URL trailing slash mismatch**
`https://auth.example.com` and `https://auth.example.com/` are different strings. If the server sets `issuer` with a trailing slash and the client strips it (or vice versa), issuer validation fails. Normalise both sides before comparing.

**Caching stale metadata after rotation**
When an authorization server rotates its token endpoint URL (after a domain migration), clients with indefinitely-cached metadata keep hitting the old URL. Always set a TTL and re-fetch on auth failures.

**HTTP instead of HTTPS in development**
Local dev setups sometimes expose the endpoint over HTTP. RFC 8414 requires HTTPS; clients enforcing this will refuse to proceed. Use a local TLS proxy (mkcert) or disable the HTTPS check in dev only — never in production.

**Missing `code_challenge_methods_supported`**
The field is optional per RFC 8414, but MCP clients treat its absence as "PKCE not supported" and refuse to authorise. Any MCP-targeted authorization server must include it.

---

## Connections

- [[protocols/mcp]] — MCP 2025-03-26 requires OAuth 2.0 auth for HTTP servers; RFC 8414 is the discovery mechanism
- [[security/owasp-llm-top10]] — Agentic Top 10 includes delegated trust failures; proper OAuth discovery is part of the mitigation
- [[apis/anthropic-api]] — Anthropic API uses API keys, not OAuth; RFC 8414 applies to MCP server auth, not the Messages API itself
- [[cs-fundamentals/auth-patterns]] — OAuth 2.0 overview, PKCE, JWT, OIDC — the broader auth landscape this sits within
- [[security/oauth-boundary-testing]] — PKCE enforcement and scope bypass test patterns for MCP servers

---

## Open Questions

- Will MCP formalise a requirement to fall back to `/.well-known/openid-configuration` when the RFC 8414 path returns 404?
- How should MCP clients handle authorization servers that list `code_challenge_methods_supported: ["plain", "S256"]` — should they prefer S256 even if plain is listed first?
- Does RFC 8414 metadata caching interact poorly with short-lived MCP sessions that never hit a re-fetch trigger?
