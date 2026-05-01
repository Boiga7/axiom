---
type: concept
category: technical-qa
para: resource
tags: [api-testing, postman, rest-assured, http, rest, graphql, schema-validation]
sources: []
updated: 2026-05-01
---

# API Testing

Validating HTTP APIs at the integration layer — below the UI, above the database. API tests are faster than E2E tests, more realistic than unit tests, and catch contract and data handling bugs that unit tests miss.

---

## Why API Testing

The middle of the testing pyramid. APIs are:
- The contract between frontend and backend (or between microservices)
- The point where business logic is exercised without UI complexity
- The fastest way to test backend behaviour (no browser rendering)
- Stable interfaces — API tests survive UI redesigns

A suite of 200 API tests typically runs in under 60 seconds vs 20–30 minutes for equivalent E2E coverage.

---

## What to Test in an API

For every endpoint, test:

**Happy paths:**
- Correct inputs → correct response (status, body, headers)
- All required fields present
- Optional fields with and without values

**Negative paths:**
- Missing required fields → 400 Bad Request
- Invalid types (string where int expected) → 400
- Authentication missing → 401 Unauthorized
- Valid auth but insufficient permissions → 403 Forbidden
- Non-existent resource → 404 Not Found
- Business rule violations → 422 Unprocessable Entity

**Edge cases:**
- Empty collections (`[]` not `null`)
- Pagination with empty last page
- Maximum field lengths
- Special characters in string fields
- Concurrent requests to the same resource (if state mutation)

**Response validation:**
- HTTP status code correct
- Response body matches schema (not just spot-checking fields)
- Content-Type header is correct
- Sensitive fields absent (no password hash in GET /user response)
- IDs reference valid resources

---

## REST Assured (Java)

The Java standard for API testing. Fluent DSL, integrates with JUnit/TestNG.

```java
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

class ProductApiTest {

    @BeforeEach
    void setup() {
        RestAssured.baseURI = "https://staging.api.example.com";
        RestAssured.port = 443;
    }

    @Test
    void getProduct_returnsCorrectStructure() {
        given()
            .header("Authorization", "Bearer " + getAuthToken())
            .contentType("application/json")
        .when()
            .get("/products/123")
        .then()
            .statusCode(200)
            .body("id", equalTo(123))
            .body("name", notNullValue())
            .body("price", greaterThan(0.0f))
            .body("inStock", isA(Boolean.class))
            .body("$", not(hasKey("internal_cost")));  // sensitive field absent
    }

    @Test
    void createProduct_withMissingName_returns400() {
        given()
            .header("Authorization", "Bearer " + getAuthToken())
            .contentType("application/json")
            .body("""
                {
                  "price": 29.99,
                  "category": "electronics"
                }
                """)
        .when()
            .post("/products")
        .then()
            .statusCode(400)
            .body("error.code", equalTo("MISSING_REQUIRED_FIELD"))
            .body("error.field", equalTo("name"));
    }

    @Test
    void getProduct_withoutAuth_returns401() {
        when()
            .get("/products/123")
        .then()
            .statusCode(401);
    }
}
```

**Response extraction for chaining:**
```java
// Create, then retrieve
String productId = given()
    .header("Authorization", "Bearer " + token)
    .contentType("application/json")
    .body(createProductPayload())
    .post("/products")
    .then()
    .statusCode(201)
    .extract()
    .path("id");

// Use the ID in a follow-up request
given()
    .header("Authorization", "Bearer " + token)
    .get("/products/" + productId)
    .then()
    .statusCode(200);
```

---

## Python (httpx + pytest)

```python
import httpx
import pytest

BASE_URL = "https://staging.api.example.com"

@pytest.fixture(scope="session")
def auth_token():
    response = httpx.post(f"{BASE_URL}/auth/token", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    return response.json()["access_token"]

@pytest.fixture
def client(auth_token):
    return httpx.Client(
        base_url=BASE_URL,
        headers={"Authorization": f"Bearer {auth_token}"}
    )

def test_get_product_returns_200(client):
    response = client.get("/products/1")
    assert response.status_code == 200

def test_get_product_response_schema(client):
    response = client.get("/products/1")
    body = response.json()
    assert "id" in body
    assert isinstance(body["price"], float)
    assert "internal_cost" not in body

def test_create_product_missing_name_returns_400(client):
    response = client.post("/products", json={"price": 9.99})
    assert response.status_code == 400
    error = response.json()["error"]
    assert error["field"] == "name"

@pytest.mark.parametrize("price", [-1, 0, "free", None])
def test_create_product_invalid_price_returns_400(client, price):
    response = client.post("/products", json={"name": "Widget", "price": price})
    assert response.status_code == 400
```

---

## Schema Validation

Validate response shapes against a schema rather than spot-checking fields. Catches missing fields and wrong types that manual assertions miss.

**JSON Schema (Python):**
```python
from jsonschema import validate

PRODUCT_SCHEMA = {
    "type": "object",
    "required": ["id", "name", "price", "inStock"],
    "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string", "minLength": 1},
        "price": {"type": "number", "minimum": 0},
        "inStock": {"type": "boolean"},
        "description": {"type": "string"}
    },
    "additionalProperties": False   # no extra fields allowed
}

def test_product_matches_schema(client):
    response = client.get("/products/1")
    validate(instance=response.json(), schema=PRODUCT_SCHEMA)
```

**Pydantic (Python):**
```python
from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    id: int
    name: str
    price: float
    inStock: bool
    description: Optional[str] = None

def test_product_schema_pydantic(client):
    response = client.get("/products/1")
    product = Product.model_validate(response.json())  # raises ValidationError if invalid
    assert product.price >= 0
```

---

## GraphQL Testing

```python
GRAPHQL_ENDPOINT = "https://api.example.com/graphql"

def test_get_user_graphql(client):
    query = """
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        profile {
          displayName
        }
      }
    }
    """
    response = client.post(GRAPHQL_ENDPOINT, json={
        "query": query,
        "variables": {"id": "123"}
    })
    assert response.status_code == 200
    data = response.json()
    assert "errors" not in data
    assert data["data"]["user"]["email"] is not None
```

Key GraphQL test considerations:
- Always check `data.errors` — GraphQL returns 200 even for errors
- Test variables/arguments (required, optional, type coercion)
- Test nested resolvers
- Test N+1 query behaviour under multiple requests

---

## Postman Collections for API Testing

For manual and exploratory API testing, Postman. For automated regression, prefer code (httpx/REST Assured) — code is version-controlled, more maintainable.

Postman is valuable for:
- Exploratory API testing (understanding undocumented behaviour)
- Sharing test collections across team members
- Newman CLI for CI where code-based tests don't exist yet
- API documentation (generate from collection)

---

## API Testing in CI

```yaml
# GitHub Actions — pytest API tests
- name: Run API tests
  env:
    BASE_URL: https://staging.api.example.com
    API_KEY: ${{ secrets.STAGING_API_KEY }}
  run: pytest tests/api/ -v --tb=short --junitxml=results/api-tests.xml

- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  with:
    files: results/api-tests.xml
```

---

## Connections

- [[technical-qa/contract-testing]] — Pact enforces API contracts between consumer and provider
- [[technical-qa/performance-testing]] — k6 uses HTTP requests; API testing patterns apply
- [[qa/qa-tools]] — Postman for exploratory API testing; REST Assured for automation
- [[qa/test-case-design]] — EP and BVA apply directly to API input validation
- [[web-frameworks/fastapi]] — FastAPI's TestClient for in-process API testing
