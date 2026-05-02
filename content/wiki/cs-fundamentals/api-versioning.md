---
type: concept
category: cs-fundamentals
para: resource
tags: [api-versioning, backward-compatibility, deprecation, semver, openapi]
sources: []
updated: 2026-05-01
tldr: "Evolving APIs without breaking existing clients. The hardest constraint in API design: you can add anything, but removing or changing existing behaviour will break someone."
---

# API Versioning and Backward Compatibility

Evolving APIs without breaking existing clients. The hardest constraint in API design: you can add anything, but removing or changing existing behaviour will break someone.

---

## Versioning Strategies

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| URL path | `/v1/products` | Explicit, easy to document | URL pollution, branching |
| Header | `API-Version: 2024-11-01` | Clean URLs | Less visible, harder to test |
| Query param | `?version=2` | Easy to test | Caching complexity |
| Content negotiation | `Accept: application/vnd.myapp.v2+json` | HTTP standard | Most complex |
| Date-based | `2024-11-01` | Intuitive changelog | Never-ending versions |

**Recommendation:** URL path versioning for REST APIs. Simple, visible, easy to route.

---

## What Counts as a Breaking Change

```
Breaking (never do without a major version bump):
  - Remove a field from a response
  - Change a field's type (string → int)
  - Change a field's name
  - Remove an endpoint
  - Change required HTTP method
  - Make an optional field required
  - Change URL structure
  - Remove or rename a query parameter
  - Change error response format

Non-breaking (safe to ship without version bump):
  - Add a new optional field to a response
  - Add a new optional query parameter
  - Add a new endpoint
  - Make a required field optional
  - Add a new enum value (careful — strict clients may reject)
  - Return more data than before
  - Reduce latency
  - Fix bugs that were never part of the contract
```

---

## URL Path Versioning

```python
# FastAPI — versioned routers
from fastapi import FastAPI, APIRouter

app = FastAPI()

# v1 router
v1 = APIRouter(prefix="/v1", tags=["v1"])

@v1.get("/products")
def list_products_v1():
    return [{"id": "p1", "name": "Widget", "price": 9.99}]

@v1.get("/products/{id}")
def get_product_v1(id: str):
    return {"id": id, "name": "Widget", "price": 9.99}

# v2 router — extended response
v2 = APIRouter(prefix="/v2", tags=["v2"])

@v2.get("/products")
def list_products_v2():
    return [{"id": "p1", "name": "Widget", "price": 9.99, "currency": "GBP",
             "in_stock": True, "category": {"id": "cat1", "name": "Gadgets"}}]

app.include_router(v1)
app.include_router(v2)
```

---

## Header Versioning (Date-Based)

```python
# Stripe-style: API-Version header with date
from fastapi import Header, Request
from datetime import date

def get_api_version(api_version: str = Header(default="2024-01-01")) -> date:
    try:
        return date.fromisoformat(api_version)
    except ValueError:
        raise HTTPException(422, "Invalid API-Version header format (YYYY-MM-DD)")

@app.get("/products/{id}")
def get_product(id: str, api_version: date = Depends(get_api_version)):
    product = fetch_product(id)

    if api_version >= date(2024, 11, 1):
        # New format with nested category object
        return {"id": product.id, "name": product.name,
                "category": {"id": product.category_id, "name": product.category_name}}
    else:
        # Old format with flat category_id
        return {"id": product.id, "name": product.name,
                "category_id": product.category_id}
```

---

## Deprecation Communication

```python
import warnings
from datetime import date

DEPRECATION_SUNSET = date(2025, 6, 1)

@v1.get("/products")
def list_products_v1(response: Response):
    # Signal deprecation via standard headers
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Sat, 01 Jun 2025 00:00:00 GMT"
    response.headers["Link"] = '</v2/products>; rel="successor-version"'
    # Optionally: Deprecation: Wed, 01 Jan 2025 00:00:00 GMT (when deprecated)

    return legacy_product_list()

# Log who is still using v1 — reach out before sunset
@v1.middleware("http")
async def log_v1_usage(request: Request, call_next):
    response = await call_next(request)
    logger.warning("v1 API called",
                   path=request.url.path,
                   client_id=request.headers.get("X-Client-ID"),
                   days_until_sunset=(DEPRECATION_SUNSET - date.today()).days)
    return response
```

---

## Backward-Compatible Field Addition

```python
# Use Optional + default None for new fields — never break old clients
from pydantic import BaseModel
from typing import Optional

# v1 model
class ProductV1(BaseModel):
    id: str
    name: str
    price: float

# v2 model — adds fields without breaking v1 consumers
class ProductV2(BaseModel):
    id: str
    name: str
    price: float
    currency: str = "GBP"          # default — old clients ignore it
    in_stock: Optional[bool] = None  # None = unknown; old clients ignore
    tags: list[str] = []            # empty list default

# Additive schema evolution in JSON Schema / OpenAPI
# Never change: required fields, field types, field names
# Always OK: add new optional fields, add new non-breaking enum values
```

---

## Version Testing Strategy

```python
# tests/test_backward_compatibility.py
# Run v1 tests against v2 endpoint — v2 must be a superset

@pytest.mark.parametrize("version", ["/v1", "/v2"])
def test_product_list_returns_expected_fields(client, version):
    response = client.get(f"{version}/products")
    assert response.status_code == 200
    products = response.json()["data"]
    for p in products:
        # v1 contract: these fields must always be present
        assert "id" in p
        assert "name" in p
        assert "price" in p

def test_v1_client_works_against_v2(client):
    """Simulate a v1 client making requests to v2."""
    v1_client_fields = {"id", "name", "price"}
    response = client.get("/v2/products")
    for p in response.json()["data"]:
        # All v1 fields must be present in v2 response
        assert v1_client_fields.issubset(set(p.keys()))
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/api-design]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/graphql-se]] · [[cs-fundamentals/grpc]] · [[qa/defect-prevention]]
