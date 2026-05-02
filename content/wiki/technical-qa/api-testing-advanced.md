---
type: concept
category: technical-qa
para: resource
tags: [api-testing, schema-drift, fuzz-testing, contract-first, openapi, hypothesis, schemathesis]
sources: []
updated: 2026-05-01
tldr: Schema drift detection, fuzz testing, and contract-first workflows for production-grade APIs.
---

# Advanced API Testing

Schema drift detection, fuzz testing, and contract-first workflows for production-grade APIs.

---

## Contract-First Testing

```
Contract-first: define the API schema (OpenAPI) BEFORE writing code.
Tests are generated from the schema — both sides must conform.

Benefits:
  - Consumers can build against the spec before the server is ready (mocks)
  - Schema becomes the single source of truth — not the code
  - Breaking changes are caught at the schema diff level, not in prod

Workflow:
  1. Team agrees on OpenAPI spec (openapi.yaml)
  2. Server team: implement to satisfy the spec
  3. Client team: build against the mock server (Prism, WireMock)
  4. Contract tests: verify server implementation matches spec
  5. Schema changes require a PR — breaking changes require a version bump
```

---

## Schema Validation with Schemathesis

```bash
# Schemathesis generates and runs tests from your OpenAPI spec automatically
pip install schemathesis

# Run against a live service
schemathesis run http://localhost:8000/openapi.json \
    --checks all \              # not_a_server_error + response_conformance + ...
    --auth "Bearer $TOKEN" \
    --hypothesis-max-examples 100 \
    --stateful links            # follow links between operations (stateful testing)

# Run against a specific endpoint
schemathesis run http://localhost:8000/openapi.json \
    --endpoint /api/orders --method POST \
    --checks response_schema_conformance
```

```python
# Schemathesis as a pytest plugin
import schemathesis

schema = schemathesis.from_path("openapi.yaml", base_url="http://localhost:8000")

@schema.parametrize()                   # generates one test case per endpoint
def test_api_conforms_to_schema(case):
    response = case.call()
    case.validate_response(response)    # verifies response matches schema

# With auth
@schema.parametrize()
def test_authenticated_endpoints(case):
    response = case.call(headers={"Authorization": "Bearer test-token"})
    case.validate_response(response)
```

---

## Schema Drift Detection in CI

```python
# Detect when the implementation diverges from the declared schema
# Run on every PR that touches API routes

import httpx
import json
from pathlib import Path
from jsonschema import validate, ValidationError

async def check_schema_conformance(
    client: httpx.AsyncClient,
    openapi_path: str = "openapi.yaml",
) -> list[str]:
    """Return list of violations."""
    import yaml
    spec = yaml.safe_load(Path(openapi_path).read_text())
    violations = []

    for path, methods in spec.get("paths", {}).items():
        for method, operation in methods.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            # Build a minimal valid request from the schema
            try:
                response = await client.request(method.upper(), path)
            except Exception as e:
                violations.append(f"{method.upper()} {path}: request failed: {e}")
                continue

            # Find expected response schema for this status code
            status = str(response.status_code)
            responses = operation.get("responses", {})
            expected = responses.get(status) or responses.get("default")
            if not expected:
                violations.append(f"{method.upper()} {path}: {status} not in schema")
                continue

            schema = (
                expected.get("content", {})
                .get("application/json", {})
                .get("schema")
            )
            if schema and response.content:
                try:
                    validate(response.json(), schema)
                except ValidationError as e:
                    violations.append(f"{method.upper()} {path} {status}: {e.message}")

    return violations
```

---

## Fuzz Testing with Hypothesis

```python
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
import httpx
import pytest

# Fuzz the order creation endpoint with random valid-ish payloads
# Goal: find inputs that cause 500s, timeouts, or invalid responses

@given(
    quantity=st.integers(min_value=-1000, max_value=100000),
    product_id=st.text(min_size=0, max_size=200),
    user_id=st.text(min_size=0, max_size=100).filter(lambda s: s.isprintable()),
)
@settings(max_examples=200, suppress_health_check=[HealthCheck.too_slow])
def test_create_order_never_500(quantity, product_id, user_id):
    """No matter what we send, the server must not 500."""
    with httpx.Client(base_url="http://localhost:8000") as client:
        response = client.post(
            "/api/orders",
            json={"quantity": quantity, "product_id": product_id, "user_id": user_id},
            headers={"Authorization": "Bearer test-token"},
        )
    # 4xx is acceptable (validation failure), 5xx is not
    assert response.status_code < 500, (
        f"Server error {response.status_code} for: "
        f"quantity={quantity}, product_id={product_id!r}"
    )

@given(
    # Test SQL injection via string fields
    product_id=st.one_of(
        st.just("'; DROP TABLE orders; --"),
        st.just("' OR '1'='1"),
        st.just("../../../etc/passwd"),
        st.just("<script>alert(1)</script>"),
        st.text(alphabet=st.characters(blacklist_categories=["Cs"]), max_size=500),
    )
)
def test_no_injection_via_product_id(product_id):
    """SQL injection and path traversal payloads must be rejected, not cause 500."""
    with httpx.Client(base_url="http://localhost:8000") as client:
        response = client.post(
            "/api/orders",
            json={"quantity": 1, "product_id": product_id, "user_id": "test-user"},
        )
    assert response.status_code in (400, 422), (
        f"Expected 4xx for injection payload, got {response.status_code}"
    )
```

---

## API Versioning Tests

```python
# Verify both API versions behave correctly after a version bump
import pytest
import httpx

@pytest.mark.parametrize("version", ["v1", "v2"])
async def test_create_order_both_versions(
    version: str, client: httpx.AsyncClient
) -> None:
    response = await client.post(
        f"/api/{version}/orders",
        json={"product_id": "prod_abc", "quantity": 1},
    )
    assert response.status_code == 201

async def test_v1_still_accepts_legacy_field_names(client: httpx.AsyncClient) -> None:
    """v1 uses snake_case; v2 uses camelCase. v1 must not break during migration."""
    response = await client.post(
        "/api/v1/orders",
        json={"product_id": "prod_abc", "quantity": 1},  # snake_case
    )
    assert response.status_code == 201

async def test_v2_rejects_legacy_field_names(client: httpx.AsyncClient) -> None:
    """v2 uses camelCase. snake_case should be a 422."""
    response = await client.post(
        "/api/v2/orders",
        json={"product_id": "prod_abc", "quantity": 1},  # snake_case on v2
    )
    assert response.status_code == 422
```

---

## Response Quality Assertions

```python
# Beyond "status 200" — assert that the response is actually correct

async def test_error_responses_are_structured(client: httpx.AsyncClient) -> None:
    """Error responses must be structured and not leak internal details."""
    response = await client.post("/api/orders", json={"quantity": -1})
    assert response.status_code == 422

    body = response.json()
    # Must have structured error
    assert "detail" in body or "error" in body
    # Must not leak implementation
    text = str(body).lower()
    assert "traceback" not in text
    assert "sqlalchemy" not in text
    assert "postgres" not in text
    assert "exception" not in text
    # Must be JSON-serialisable (no datetime objects without .isoformat())
    import json
    json.dumps(body)   # would raise TypeError if not serialisable
```

---

## Common Failure Cases

**Schemathesis generates requests that always hit auth failures, never testing the actual schema**
Why: `schemathesis run` without `--auth` sends unauthenticated requests; every generated request returns 401 and schemathesis marks them as passing because 401 is a valid status code.
Detect: run with `--checks response_schema_conformance`; if every single operation returns 401 and none return 200/422, authentication is not configured.
Fix: pass `--auth "Bearer $TOKEN"` or configure auth via `schemathesis.auth` in the pytest plugin; verify at least one endpoint returns a 2xx in the schemathesis run output.

**Hypothesis fuzz test finds a 500 but the payload is too complex to reproduce manually**
Why: Hypothesis generates a minimised failing example, but the reproduction code path involves a multi-field interaction that isn't obvious from the printed output.
Detect: the Hypothesis output shows a `@given` failing example but re-running the test with those exact values doesn't fail.
Fix: add `@settings(database=ExampleDatabase(".hypothesis"))` to persist failing examples; run with `--hypothesis-seed` to fix the random seed and reproduce the exact sequence.

**Schema drift CI check passes on every PR but catches nothing because it only runs happy-path requests**
Why: the `check_schema_conformance` function sends minimal unauthenticated GET requests; endpoints requiring request bodies or path parameters return 4xx and are skipped as "not in schema".
Detect: the drift check always completes with zero violations even after a developer renames a response field.
Fix: build request fixtures from the OpenAPI `example` values for required parameters and provide auth headers; or use Schemathesis in CI which handles request construction automatically.

**Version migration test `test_v2_rejects_legacy_field_names` is a false safety net**
Why: the test asserts the v2 endpoint rejects `snake_case` with 422, but the actual migration risk is that v1 clients receive a 422 after accidentally being routed to v2 (e.g., after a misconfigured reverse proxy).
Detect: running the v1 client payload against the v2 endpoint returns 422 in tests but goes undetected in production traffic until alerts fire.
Fix: add a routing test that verifies v1 traffic stays on the v1 path end-to-end, not just that v2 rejects v1 fields in isolation.

## Connections

[[technical-qa/tqa-hub]] · [[technical-qa/api-testing]] · [[technical-qa/api-contract-testing]] · [[technical-qa/api-performance-testing]] · [[technical-qa/security-automation]] · [[qa/negative-testing]] · [[cs-fundamentals/api-versioning]]
