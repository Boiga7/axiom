---
type: concept
category: protocols
tags: [oauth, rfc-7591, dynamic-client-registration, mcp, authentication]
sources: []
updated: 2026-05-03
para: resource
tldr: RFC 7591 lets OAuth clients register themselves programmatically by POSTing metadata to a /register endpoint — the mechanism that allows generic MCP clients to work with any auth server without pre-configuration.
---

# OAuth 2.0 Dynamic Client Registration (RFC 7591)

> **TL;DR** RFC 7591 lets OAuth clients register themselves programmatically by POSTing metadata to a `/register` endpoint — the mechanism that allows generic MCP clients to work with any auth server without pre-configuration.

> [Source: WebSearch, 2026-05-03] [Source: RFC Editor rfc7591, datatracker.ietf.org] [Source: modelcontextprotocol.io/specification/2025-03-26]

---

## What It Does

Before RFC 7591, every OAuth client had to be manually registered with each authorization server — a developer would log into an admin console, create a client entry, and receive a `client_id` and `client_secret` out-of-band. This is unworkable when clients are generic tools (like MCP clients) that may connect to hundreds of different servers they have no prior relationship with.

RFC 7591 (published July 2015) standardises a `POST /register` endpoint where any OAuth client can self-register by submitting its metadata at runtime. The server responds with a `client_id` and optionally a `client_secret` or `registration_access_token`. The client can then proceed with the standard OAuth auth code + PKCE flow using the freshly issued `client_id`.

This is sometimes called Dynamic Client Registration (DCR).

---

## Registration Request

The client sends a `POST` to the `registration_endpoint` URL (discovered via RFC 8414 server metadata). The body is a JSON object of client metadata.

**Required by RFC 7591:**
None of the client metadata fields are strictly required by the spec. However, for auth code flows, `redirect_uris` is practically mandatory.

**Common fields:**

| Field | Description |
|---|---|
| `redirect_uris` | Array of redirect URIs the client will use. MUST register all values used in flows. |
| `client_name` | Human-readable name shown on the consent screen. |
| `grant_types` | Array of grant types: `authorization_code`, `refresh_token`, `client_credentials`. Defaults to `["authorization_code"]`. |
| `response_types` | Array of response types: `code`. Defaults to `["code"]`. |
| `token_endpoint_auth_method` | How the client authenticates at the token endpoint: `none` (public client), `client_secret_basic`, `client_secret_post`, `private_key_jwt`. |
| `scope` | Space-separated string of scopes the client may request. Server may restrict this. |
| `contacts` | Array of email addresses for the client developer. |
| `software_id` | Stable identifier for this client software across all instances. Unlike `client_id`, it does not change per registration. [unverified — implementation-defined] |
| `software_version` | Version string for the client software. |

**Minimal registration request for a public MCP client:**

```http
POST /register HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "read:tools write:tools"
}
```

The request may optionally include an `Authorization: Bearer <initial_access_token>` header if the server requires one to gate registration (see Security Considerations).

---

## Registration Response

A successful registration returns HTTP 201 with the registered metadata plus server-assigned fields:

```json
{
  "client_id": "s6BhdRkqt3",
  "client_id_issued_at": 1719792000,
  "client_secret": "cf136dc3c1fc93f31185e5885805d",
  "client_secret_expires_at": 0,
  "registration_access_token": "reg-23410913-abewfq.123483",
  "registration_client_uri": "https://auth.example.com/register/s6BhdRkqt3",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none"
}
```

**Key response fields:**

| Field | Description |
|---|---|
| `client_id` | REQUIRED. The unique identifier the client uses in all subsequent OAuth requests. |
| `client_id_issued_at` | Unix timestamp when `client_id` was issued. |
| `client_secret` | Only present for confidential clients. Absent for `token_endpoint_auth_method: none`. |
| `client_secret_expires_at` | `0` means never expires. Non-zero means the secret must be rotated. |
| `registration_access_token` | Bearer token the client uses to read or update its own registration (per RFC 7592). |
| `registration_client_uri` | URL of the client configuration endpoint (RFC 7592) for managing this registration. |

The server may return metadata fields with different values than what the client requested — it may restrict scope, override grant types, or add defaults. The client must use the server's response values, not its original request.

---

## Public vs Confidential Clients

**Confidential clients** (server-to-server, backend services) receive a `client_secret`. They authenticate at the token endpoint using this secret, making them harder to impersonate. `token_endpoint_auth_method` is typically `client_secret_basic` or `client_secret_post`.

**Public clients** (SPAs, CLI tools, desktop apps, MCP agents running locally) cannot safely store a secret. They set `token_endpoint_auth_method: none` and receive no `client_secret`. PKCE (RFC 7636) compensates — the `code_challenge`/`code_verifier` pair prevents auth code interception even without a shared secret.

MCP clients connecting from user machines are almost always public clients. MCP servers deployed as backend services may register as confidential clients if they use client credentials flow. [unverified — MCP spec does not prescribe client type]

---

## How MCP Uses It

MCP's OAuth flow (introduced in spec 2025-03-26) uses RFC 7591 as the client bootstrapping step. The full sequence:

1. MCP client connects to a remote server over HTTP.
2. Server returns HTTP 401 with a `WWW-Authenticate` header pointing to the authorization server.
3. MCP client fetches `/.well-known/oauth-authorization-server` (RFC 8414) to discover the server's endpoints.
4. If the metadata document contains a `registration_endpoint`, and the client has no pre-provisioned `client_id` for this server, it calls that endpoint to self-register (RFC 7591).
5. Client receives a `client_id` and proceeds with auth code + PKCE flow using the discovered `authorization_endpoint` and `token_endpoint`.
6. Client exchanges the auth code for a token and presents it on subsequent MCP requests.

This chain is what allows a generic MCP client to work with any compliant authorization server without any out-of-band configuration. The spec says MCP clients and authorization servers SHOULD support RFC 7591.

The November 2025 MCP spec update added Client ID Metadata Documents (CIMD) as an alternative mechanism, but DCR remains supported and is still the primary path for environments that don't use CIMD. [unverified — November 2025 spec details evolving]

See [[protocols/oauth-server-metadata]] for the RFC 8414 discovery step that precedes this.

---

## Security Considerations

**Unauthenticated registration endpoints.** By default, RFC 7591 allows open registration — anyone can POST to the endpoint and receive a `client_id`. On a public internet-facing authorization server, this enables registration flooding (an attacker registers thousands of clients, consuming storage and degrading performance). Mitigations:

- Require an `initial_access_token` in the `Authorization` header. The server issues these tokens out-of-band (e.g., after email verification). Without one, registration is rejected with HTTP 401.
- Rate-limit the registration endpoint by IP.
- Mark registered-but-never-used clients for expiry.

**Wildcard redirect URIs.** Accepting patterns like `https://*.example.com/*` as valid redirect URIs allows an attacker who controls any subdomain to intercept auth codes. The spec requires servers to validate redirect URIs exactly (no wildcards). An attacker who can register with a wildcard redirect and then control a matching subdomain can receive the auth code.

**Registration access token leakage.** The `registration_access_token` grants read, update, and delete access to the client's own registration record (via RFC 7592). If this token leaks, an attacker can modify the client's `redirect_uris` — turning the legitimate client into a target for auth code interception on the next auth flow. The token must be stored with the same care as the client secret.

**Scope restriction bypass.** Some servers accept a `scope` in the registration request and later allow the client to request any subset. Others lock the client to exactly the declared scope. Test that the server correctly enforces the registered scope at the token endpoint — a client that registered with `scope: read` should not be able to obtain `write` tokens.

**TLS is mandatory.** The spec requires TLS for all calls to the registration endpoint, because the request may contain sensitive metadata and the response contains credentials.

---

## Security Testing with mcpindex

For an MCP server security scanner, the registration endpoint is an auth boundary that warrants explicit testing.

**Checks to run against a `registration_endpoint`:**

```python
import httpx

async def test_registration_endpoint(registration_url: str):
    """
    Probe the registration endpoint for common misconfiguration patterns.
    """

    # 1. Open registration — should require initial_access_token or return 401
    resp = await httpx.post(
        registration_url,
        json={
            "client_name": "mcpindex-probe",
            "redirect_uris": ["http://localhost:9999/callback"],
            "grant_types": ["authorization_code"],
            "token_endpoint_auth_method": "none",
        },
    )
    if resp.status_code == 201:
        findings.append("OPEN_REGISTRATION: no initial_access_token required")

    # 2. Wildcard redirect URI acceptance
    resp = await httpx.post(
        registration_url,
        json={
            "redirect_uris": ["https://*.attacker.example.com/callback"],
        },
    )
    if resp.status_code == 201:
        findings.append("WILDCARD_REDIRECT_URI: server accepted glob pattern")

    # 3. Scope escalation — register with narrow scope, check what was stored
    resp = await httpx.post(
        registration_url,
        json={
            "redirect_uris": ["http://localhost:9999/callback"],
            "scope": "read:tools",
        },
    )
    if resp.status_code == 201:
        registered_scope = resp.json().get("scope", "")
        if "write" in registered_scope or "admin" in registered_scope:
            findings.append("SCOPE_EXPANSION: server granted more scope than requested")

    return findings
```

**What to check:**

| Test | Pass condition | Fail signal |
|---|---|---|
| Open registration | 401 or 403 without initial_access_token | 201 — any client can register |
| Wildcard `redirect_uri` | 400 with `invalid_redirect_uri` error | 201 — wildcard accepted |
| Scope enforcement | Registered `scope` matches or is a subset of requested | Server expands scope on registration |
| Registration access token entropy | Token is at least 128 bits (32 hex chars) | Short or sequential token |
| TLS enforcement | HTTPS only; HTTP returns 301 or connection refused | HTTP 200 — credentials sent in clear text |
| Rate limiting | 429 after N registrations per IP | No rate limit — flooding possible |

---

## Key Facts

- Published: RFC 7591, July 2015. Authors include Justin Richer (primary) and others.
- Companion RFC: RFC 7592 adds a client configuration endpoint for reading and updating registrations using the `registration_access_token`.
- The `registration_endpoint` field in RFC 8414 metadata documents is how clients discover the DCR endpoint.
- MCP spec (2025-03-26) says clients and servers SHOULD support RFC 7591 — it is recommended but not strictly mandatory.
- Public clients receive no `client_secret`; they use PKCE instead. Confidential clients receive a `client_secret`.
- The server's registered metadata values take precedence over the client's requested values — always use the response, not the request, as the source of truth.

---

## Common Failure Cases

**Client reuses request values instead of response values**
The server may narrow the granted `scope` or override `grant_types`. A client that ignores the response and uses its original request values will attempt flows the server has not authorised.

**Registration access token not persisted**
The `registration_access_token` is returned once at registration time. If the client discards it, it cannot use RFC 7592 to update its registration (e.g., rotating a `client_secret` or adding a new `redirect_uri`). Persist it alongside the `client_id`.

**`client_secret_expires_at` ignored**
A non-zero `client_secret_expires_at` means the secret has a TTL. Clients that never check this field will start failing authentication silently after the secret expires.

**Multiple registrations per server**
A naive client that calls the registration endpoint on every startup will accumulate many `client_id` entries on the server, each consuming resources. Persist the `client_id` per authorization server and only register once (or re-register if the previous `client_id` is rejected).

**Open registration on a sensitive server**
Deploying an authorization server with an unauthenticated `registration_endpoint` on a public URL means any party can issue themselves a `client_id`. In enterprise deployments, gate registration with an `initial_access_token` or remove the endpoint from the RFC 8414 metadata document entirely if self-registration is not intended.

---

## Connections

- [[protocols/oauth-server-metadata]] — RFC 8414 discovery step; the `registration_endpoint` field in the metadata document points here
- [[protocols/mcp]] — MCP 2025-03-26 auth flow; RFC 7591 is the client bootstrapping step within it
- [[security/oauth-boundary-testing]] — PKCE enforcement and scope bypass testing for MCP servers; DCR adds registration endpoint boundary tests
- [[cs-fundamentals/auth-patterns]] — OAuth 2.0 overview, PKCE, JWT — the broader auth landscape

---

## Open Questions

- Does the November 2025 MCP spec update deprecate RFC 7591 in favour of CIMD, or do both remain supported as parallel mechanisms?
- Should mcpindex treat open registration as a CRITICAL finding or a WARNING? The severity depends on whether the MCP server's authorization server is internet-facing.
- RFC 7592 (management protocol) is rarely implemented — should mcpindex skip testing it, or flag its absence as a gap in the server's DCR support?
