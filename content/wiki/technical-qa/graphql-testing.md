---
type: concept
category: technical-qa
para: resource
tags: [graphql, testing, schema, apollo, mutations, subscriptions]
sources: []
updated: 2026-05-01
---

# GraphQL Testing

Testing GraphQL APIs differs from REST: single endpoint, type system, queries vs mutations vs subscriptions, N+1 loader patterns, and schema-first contracts.

---

## What to Test

```
Schema layer:
  - Schema is valid and introspectable
  - Breaking changes detected (field removal, type changes)
  - Custom scalars and directives behave correctly

Query layer:
  - Queries return correct shape for all valid inputs
  - Nullable vs non-nullable fields behave as documented
  - Filtering, sorting, pagination produce correct results

Mutation layer:
  - Data is persisted after mutation
  - Response reflects the change
  - Invalid inputs produce structured errors (not 500s)

Authorization layer:
  - Unauthenticated requests see correct errors
  - Role A cannot access role B's data
  - Field-level permissions enforced

Performance:
  - N+1 queries prevented by DataLoader
  - Query depth/complexity limits prevent abuse
```

---

## Python — pytest + gql

```python
# tests/graphql/test_products.py
import pytest
from gql import gql, Client
from gql.transport.httpx import HTTPXTransport

@pytest.fixture(scope="session")
def gql_client(auth_token):
    transport = HTTPXTransport(
        url="http://localhost:8000/graphql",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    return Client(transport=transport, fetch_schema_from_transport=True)

LIST_PRODUCTS = gql("""
    query ListProducts($category: String, $limit: Int) {
        products(category: $category, limit: $limit) {
            id
            name
            price
            category
            inStock
        }
    }
""")

def test_list_products_returns_correct_shape(gql_client):
    result = gql_client.execute(LIST_PRODUCTS, variable_values={"limit": 5})
    products = result["products"]
    assert len(products) <= 5
    for p in products:
        assert "id" in p
        assert "name" in p
        assert isinstance(p["price"], (int, float))

def test_list_products_filter_by_category(gql_client):
    result = gql_client.execute(LIST_PRODUCTS, variable_values={"category": "electronics"})
    for p in result["products"]:
        assert p["category"] == "electronics"

CREATE_PRODUCT = gql("""
    mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
            id
            name
            price
        }
    }
""")

def test_create_product_persists(gql_client, db_session):
    result = gql_client.execute(CREATE_PRODUCT, variable_values={
        "input": {"name": "Widget Pro", "price": 29.99, "category": "gadgets"}
    })
    product = result["createProduct"]
    assert product["id"] is not None
    assert product["name"] == "Widget Pro"

    # Verify persisted
    db_product = db_session.query(Product).get(product["id"])
    assert db_product.name == "Widget Pro"
```

---

## Schema Validation Tests

```python
# tests/graphql/test_schema.py
from graphql import build_schema, validate, parse

def test_schema_is_valid():
    with open("schema.graphql") as f:
        schema_str = f.read()
    schema = build_schema(schema_str)
    assert schema is not None

def test_query_against_schema():
    with open("schema.graphql") as f:
        schema = build_schema(f.read())

    query = parse("""
        query {
            products {
                id
                name
                nonExistentField
            }
        }
    """)
    errors = validate(schema, query)
    assert len(errors) > 0
    assert "nonExistentField" in str(errors[0])

def test_schema_has_no_breaking_changes():
    """Requires schema diffing — run against baseline snapshot."""
    import subprocess
    result = subprocess.run(
        ["graphql-inspector", "diff", "schema-baseline.graphql", "schema.graphql"],
        capture_output=True, text=True
    )
    assert result.returncode == 0, f"Breaking schema changes detected:\n{result.stdout}"
```

---

## Authorization Testing

```python
@pytest.fixture
def admin_client():
    return make_client(role="admin")

@pytest.fixture
def viewer_client():
    return make_client(role="viewer")

DELETE_PRODUCT = gql("""
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id) { success }
    }
""")

def test_viewer_cannot_delete_product(viewer_client, existing_product_id):
    from gql.transport.exceptions import TransportQueryError
    with pytest.raises(TransportQueryError) as exc_info:
        viewer_client.execute(DELETE_PRODUCT, variable_values={"id": existing_product_id})
    assert "not authorised" in str(exc_info.value).lower()

def test_admin_can_delete_product(admin_client, existing_product_id):
    result = admin_client.execute(DELETE_PRODUCT, variable_values={"id": existing_product_id})
    assert result["deleteProduct"]["success"] is True
```

---

## N+1 Detection

```python
# Test that DataLoader prevents N+1 queries
def test_products_with_categories_no_n_plus_one(gql_client, db_query_counter):
    """Fetching 10 products with their categories should not cause 11 DB queries."""
    with db_query_counter() as counter:
        gql_client.execute(gql("""
            query {
                products(limit: 10) { id name category { id name } }
            }
        """))

    # Should be 2 queries: one for products, one batched for categories
    assert counter.count <= 2, f"N+1 detected: {counter.count} queries for 10 products"
```

---

## TypeScript — Apollo Client Testing

```typescript
// tests/graphql/product.test.ts
import { MockedProvider } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import { GET_PRODUCTS } from "../graphql/queries";
import ProductList from "../components/ProductList";

const mocks = [
  {
    request: { query: GET_PRODUCTS, variables: { limit: 10 } },
    result: {
      data: {
        products: [
          { id: "1", name: "Widget Pro", price: 29.99, inStock: true },
        ],
      },
    },
  },
];

test("renders product list from GraphQL", async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ProductList />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(screen.getByText("Widget Pro")).toBeInTheDocument();
    expect(screen.getByText("£29.99")).toBeInTheDocument();
  });
});
```

---

## Subscriptions Testing

```python
import asyncio
from gql.transport.websockets import WebsocketsTransport

async def test_order_status_subscription():
    transport = WebsocketsTransport(url="ws://localhost:8000/graphql")
    async with Client(transport=transport) as client:
        subscription = gql("""
            subscription OnOrderStatusChange($orderId: ID!) {
                orderStatusChanged(orderId: $orderId) {
                    status
                    updatedAt
                }
            }
        """)

        events = []
        async for result in client.subscribe(subscription, variable_values={"orderId": "order-123"}):
            events.append(result)
            if len(events) >= 2:
                break

        assert events[0]["orderStatusChanged"]["status"] == "processing"
        assert events[1]["orderStatusChanged"]["status"] == "shipped"
```

---

## Connections
[[tqa-hub]] · [[technical-qa/wiremock]] · [[technical-qa/testcontainers]] · [[technical-qa/playwright-advanced]] · [[cs-fundamentals/api-design]] · [[test-automation/testing-llm-apps]]
