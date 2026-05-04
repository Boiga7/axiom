---
type: concept
category: security
para: resource
tags: [oauth, security-testing, pkce, boundary-testing, token-bypass, mcpindex, authorization]
tldr: OAuth boundary testing verifies that scoped tokens can't exceed their declared scope, PKCE can't be downgraded, and tokens can't be replayed or audience-swapped. Test the negative cases, not just the happy path.
sources: []
updated: 2026-05-01
---

# OAuth 2.0 Boundary Testing

> **TL;DR** OAuth boundary testing verifies that scoped tokens can't exceed their declared scope, PKCE can't be downgraded, and tokens can't be replayed or audience-swapped. Test the negative cases, not just the happy path.

Directly relevant to mcpindex Weekend 2. Auth boundary tests are the explicit target.

## Key Facts
- PKCE downgrade attack: if a server supports but doesn't enforce PKCE, attackers bypass it — test that servers reject auth requests without a code_challenge
- Scope enforcement: a token scoped to `read:mcp` must not accept requests requiring `write:mcp` — servers must validate, not just decode
- Resource Indicators (RFC 8707): mandatory in MCP June 2025 spec; limits a token's audience to a single resource — prevents token audience-swap attacks
- OAuth 2.1 makes PKCE mandatory for all public clients; MCP spec mandates PKCE with S256 for all public clients
- Token replay: tokens should be sender-constrained (mTLS or DPoP) to prevent use by anyone who intercepts them
- Testing methodology: test refusals as much as acceptances — boundary tests are about what the server correctly rejects

## The Five Boundaries to Test

### 1. PKCE Enforcement

A server that supports PKCE but doesn't require it is vulnerable to downgrade attacks.

```python
import httpx
import pytest

class TestPKCEBoundary:
    """PKCE must be mandatory, not optional."""

    def test_auth_request_without_code_challenge_rejected(self, server_url):
        """Server must reject authorization requests missing code_challenge."""
        response = httpx.get(
            f"{server_url}/oauth/authorize",
            params={
                "client_id": "test-client",
                "redirect_uri": "http://localhost:8080/callback",
                "response_type": "code",
                "scope": "read:tools",
                # Intentionally omitting code_challenge and code_challenge_method
            },
        )
        assert response.status_code in (400, 302)
        if response.status_code == 302:
            location = response.headers["location"]
            assert "error=invalid_request" in location

    def test_plain_code_challenge_method_rejected(self, server_url):
        """MCP requires S256; plain method must be rejected."""
        response = httpx.get(
            f"{server_url}/oauth/authorize",
            params={
                "client_id": "test-client",
                "redirect_uri": "http://localhost:8080/callback",
                "response_type": "code",
                "scope": "read:tools",
                "code_challenge": "plain_challenge_value",
                "code_challenge_method": "plain",  # Must reject — S256 required
            },
        )
        assert response.status_code in (400, 302)

    def test_code_verifier_mismatch_rejected(self, server_url, valid_auth_code):
        """Token exchange must reject mismatched code_verifier."""
        response = httpx.post(
            f"{server_url}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": valid_auth_code,
                "redirect_uri": "http://localhost:8080/callback",
                "code_verifier": "WRONG_VERIFIER_THIS_SHOULD_FAIL",
                "client_id": "test-client",
            },
        )
        assert response.status_code == 400
        assert response.json()["error"] == "invalid_grant"
```

### 2. Scope Enforcement

A token granted `read:tools` must not be accepted for write operations.

```python
class TestScopeBoundary:
    def test_read_token_rejected_for_write_operation(self, server_url):
        """Read-scoped token must not authorize write operations."""
        read_token = get_token(scope="read:tools")

        response = httpx.post(
            f"{server_url}/tools/execute",  # write operation
            json={"tool": "bash", "args": {"command": "ls"}},
            headers={"Authorization": f"Bearer {read_token}"},
        )
        assert response.status_code == 403
        body = response.json()
        assert "insufficient_scope" in str(body) or response.status_code == 403

    def test_expired_token_rejected(self, server_url):
        """Expired tokens must always be rejected, even if otherwise valid."""
        expired_token = get_expired_token()
        response = httpx.get(
            f"{server_url}/tools/list",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    def test_malformed_token_rejected(self, server_url):
        """Malformed tokens must never cause a 500 — only 401."""
        for malformed in ["not-a-jwt", "Bearer", "eyJ.eyJ.INVALID"]:
            response = httpx.get(
                f"{server_url}/tools/list",
                headers={"Authorization": f"Bearer {malformed}"},
            )
            assert response.status_code == 401
            assert response.status_code != 500  # must never leak stack trace
```

### 3. Token Audience Validation (Resource Indicators)

A token issued for server A must not be accepted by server B.

```python
class TestAudienceBoundary:
    def test_token_for_wrong_resource_rejected(self, server_a_url, server_b_url):
        """Token issued for server A must be rejected by server B."""
        token_for_a = get_token(
            server_url=server_a_url,
            resource=server_a_url,  # RFC 8707 resource indicator
        )
        # Present server A's token to server B
        response = httpx.get(
            f"{server_b_url}/tools/list",
            headers={"Authorization": f"Bearer {token_for_a}"},
        )
        assert response.status_code == 401
```

### 4. Cross-Scope Privilege Escalation

A token should not be usable to obtain a higher-privilege token.

```python
class TestPrivilegeEscalation:
    def test_scope_upgrade_rejected_at_token_endpoint(self, server_url):
        """Cannot upgrade scope by re-presenting an existing token."""
        read_token = get_token(scope="read:tools")
        # Attempt to exchange for a higher-scope token
        response = httpx.post(
            f"{server_url}/oauth/token",
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
                "subject_token": read_token,
                "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
                "scope": "write:tools admin",  # requesting escalated scope
            },
        )
        # Either: not supported (404/400), or: denied with insufficient_scope
        assert response.status_code in (400, 401, 403, 404)
```

### 5. No-Auth Bypass

Every protected endpoint must require auth, even "obviously internal" ones.

```python
class TestAuthBypass:
    PROTECTED_ENDPOINTS = [
        ("/tools/list", "GET"),
        ("/tools/execute", "POST"),
        ("/resources/list", "GET"),
        ("/admin/stats", "GET"),
    ]

    @pytest.mark.parametrize("path,method", PROTECTED_ENDPOINTS)
    def test_unauth_request_rejected(self, server_url, path, method):
        """No protected endpoint should be accessible without a token."""
        response = httpx.request(method, f"{server_url}{path}")
        assert response.status_code in (401, 403)
        assert response.status_code != 200
```

## Testing Tools

| Tool | Use case |
|---|---|
| `httpx` (Python) | Programmatic auth flow testing, good for pytest integration |
| `pytest-httpx` / `respx` | Mocking token validation in unit tests |
| Burp Suite Community | Manual OAuth flow inspection and interception |
| `oauth2-proxy` | Can be deployed as a test harness for auth boundary validation |
| `jwt.io` debugger | Inspect and decode JWT tokens during manual testing |

## MCP-Specific Auth Boundaries

From the MCP spec (2025-03-26) and the June 2025 update:

- PKCE with S256 is mandatory for all MCP public clients
- Resource Indicators (RFC 8707) are mandatory — tokens must carry `aud` matching the MCP server's URL
- Authorization servers must validate `aud` claims on every request
- Scopes are defined per-MCP-server; cross-server scope reuse is a misconfiguration, not a feature

For mcpindex, test these boundaries against every server you scan:
1. Does the server enforce PKCE?
2. Does the server validate `aud` on tokens?
3. Does the server correctly refuse out-of-scope requests?
4. Does the server return proper OAuth error responses (not 500s)?

> [Source: RFC 9700 — Best Current Practice for OAuth 2.0 Security, 2025]
> [Source: MCP Specification 2025-03-26 — Authorization]
> [Source: Security Boulevard — 7 MCP Authentication Vulnerabilities, 2026]

## Common Failure Cases

**PKCE test passes because the server accepts the code without verifying the code_verifier**  
Why: some implementations store the authorization code but skip the `code_verifier` check at the token endpoint — the authorization flow succeeds whether or not the correct verifier is presented.  
Detect: `test_code_verifier_mismatch_rejected` passes with the wrong verifier; the token endpoint returns 200 for any value of `code_verifier`.  
Fix: verify the token endpoint code specifically checks `hash(code_verifier) == code_challenge` before issuing the token; test with an intentionally wrong verifier to confirm rejection.

**Scope enforcement test passes at the API level but the database query ignores the scope**  
Why: the authorization middleware returns 403 for out-of-scope requests, but a direct database access layer (called from a background job or admin endpoint) bypasses the middleware and executes without scope validation.  
Detect: the `/tools/execute` endpoint correctly returns 403 for read-scoped tokens, but a background job endpoint at `/internal/tasks` executes the same operation without auth; out-of-scope operations succeed via the undocumented endpoint.  
Fix: enforce scope validation at the data layer, not just the HTTP middleware layer; audit all endpoints including internal ones against the scope enforcement tests.

**Audience validation test passes in unit tests but fails in production because `aud` claim is not validated**  
Why: the test uses mock tokens where the `aud` claim is pre-set; the real JWT validation code calls `jwt.decode()` without passing `audience=expected_audience`, so any JWT with the right signature is accepted regardless of audience.  
Detect: `test_token_for_wrong_resource_rejected` passes in tests but cross-server token reuse works in production; adding `print(decoded["aud"])` shows it is the wrong server's URL.  
Fix: always pass `audience=server_url` to the JWT decode call; test with real tokens issued by a test OAuth server rather than manually crafted mock tokens.

**`test_unauth_request_rejected` marks admin endpoints as protected but they respond 404 without auth instead of 401**  
Why: returning 404 for unauthenticated requests to admin endpoints is a security-through-obscurity pattern that passes the `response.status_code != 200` assertion but is not correct OAuth behaviour — it hides the existence of the endpoint rather than enforcing auth.  
Detect: admin endpoints return 404 for unauthenticated requests but 200 for authenticated ones; the existence of the endpoint leaks via timing differences.  
Fix: return 401 (with a `WWW-Authenticate` header) for unauthenticated requests to any real endpoint; update the test assertion to check specifically for 401, not just "not 200".

## Connections
- [[protocols/mcp]] — the MCP spec that mandates PKCE and Resource Indicators
- [[protocols/mcp-http-transport]] — the transport layer auth boundaries sit on top of
- [[protocols/rfc-7591-dynamic-client-registration]] — dynamic client registration endpoint is an additional auth boundary to test: open registration, wildcard redirect URIs, scope enforcement
- [[security/owasp-llm-top10]] — OWASP Agentic Top 10 A3: delegated trust failures
- [[security/mcp-cves]] — known MCP CVEs, many auth-related
- [[para/projects]] — mcpindex Weekend 2 target

## Open Questions
- What is the recommended test fixture setup for a full OAuth 2.0 + PKCE flow in pytest without a live auth server?
- Does mcpindex need to test the client side (does the MCP client correctly implement PKCE) or only the server side?
