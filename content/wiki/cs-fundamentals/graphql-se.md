---
type: concept
category: cs-fundamentals
para: resource
tags: [graphql, schema, resolvers, dataloader, federation, subscriptions]
sources: []
updated: 2026-05-01
tldr: A query language for APIs and a runtime for executing those queries. Clients request exactly the data they need; the schema is the contract.
---

# GraphQL

A query language for APIs and a runtime for executing those queries. Clients request exactly the data they need; the schema is the contract.

---

## Core Concepts

```
Schema-first:
  - Type definitions are the source of truth
  - Strongly typed: every field has a declared return type
  - Introspectable: clients can query the schema itself

Query types:
  - Query   — read-only data fetching
  - Mutation — write operations
  - Subscription — real-time event streams

Resolvers:
  - A function that populates a single field
  - Resolver chain: Query.products → Product.category → Category.name
  - Each level resolved independently — enables N+1 if not careful
```

---

## Schema Definition Language

```graphql
# schema.graphql
scalar DateTime
scalar JSON

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type Product {
  id: ID!
  name: String!
  price: Float!
  category: Category!
  inStock: Boolean!
  createdAt: DateTime!
  tags: [String!]!
}

type Category {
  id: ID!
  name: String!
  products(limit: Int = 20, offset: Int = 0): [Product!]!
}

type Order {
  id: ID!
  status: OrderStatus!
  items: [OrderItem!]!
  total: Float!
  createdAt: DateTime!
}

type OrderItem {
  product: Product!
  quantity: Int!
  unitPrice: Float!
}

type Query {
  product(id: ID!): Product
  products(category: String, inStock: Boolean, limit: Int): [Product!]!
  order(id: ID!): Order
  myOrders: [Order!]!
}

type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  deleteProduct(id: ID!): Boolean!
  placeOrder(input: PlaceOrderInput!): Order!
}

type Subscription {
  orderStatusChanged(orderId: ID!): Order!
}

input CreateProductInput {
  name: String!
  price: Float!
  categoryId: ID!
  tags: [String!]
}

input UpdateProductInput {
  name: String
  price: Float
  inStock: Boolean
}

input PlaceOrderInput {
  items: [OrderItemInput!]!
  paymentMethodId: ID!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}
```

---

## Python — Strawberry GraphQL

```python
# app/graphql/schema.py
import strawberry
from strawberry.types import Info
from typing import List, Optional
from app.db import get_db
from app.models import Product as DBProduct

@strawberry.type
class Product:
    id: strawberry.ID
    name: str
    price: float
    in_stock: bool

@strawberry.type
class Query:
    @strawberry.field
    async def products(
        self,
        info: Info,
        category: Optional[str] = None,
        limit: int = 20,
    ) -> List[Product]:
        db = info.context["db"]
        query = db.query(DBProduct)
        if category:
            query = query.filter(DBProduct.category == category)
        results = query.limit(limit).all()
        return [Product(id=p.id, name=p.name, price=p.price, in_stock=p.in_stock)
                for p in results]

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_product(
        self, info: Info, name: str, price: float, category_id: strawberry.ID
    ) -> Product:
        db = info.context["db"]
        db_product = DBProduct(name=name, price=price, category_id=category_id)
        db.add(db_product)
        db.commit()
        return Product(id=db_product.id, name=name, price=price, in_stock=True)

schema = strawberry.Schema(query=Query, mutation=Mutation)

# FastAPI integration
from strawberry.fastapi import GraphQLRouter

graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")
```

---

## DataLoader — Solving N+1

```python
# Without DataLoader: 1 query per product's category = N+1
# With DataLoader: 1 batched query for all categories

from strawberry.dataloader import DataLoader
from collections import defaultdict

async def load_categories(keys: list[str]) -> list[Category]:
    """Called once with ALL category IDs needed in a single request."""
    db = get_db()
    categories = db.query(DBCategory).filter(DBCategory.id.in_(keys)).all()
    category_map = {str(c.id): c for c in categories}
    return [category_map.get(key) for key in keys]

# In context factory
def get_context() -> dict:
    return {
        "db": get_db(),
        "category_loader": DataLoader(load_fn=load_categories),
    }

# In Product resolver
@strawberry.type
class Product:
    id: strawberry.ID

    @strawberry.field
    async def category(self, info: Info) -> Category:
        return await info.context["category_loader"].load(self.category_id)
```

---

## Subscriptions — WebSocket

```python
import strawberry
from strawberry.subscriptions import GRAPHQL_WS_PROTOCOL
import asyncio

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def order_status_changed(self, order_id: strawberry.ID) -> AsyncGenerator[Order, None]:
        # Poll DB or subscribe to Redis pub/sub
        async for event in redis_subscribe(f"order:{order_id}:status"):
            order = await get_order(order_id)
            yield order

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
)

# FastAPI with WebSocket support
graphql_app = GraphQLRouter(
    schema,
    subscription_protocols=[GRAPHQL_WS_PROTOCOL],
)
```

---

## Federation — Multi-Service Graph

```graphql
# products-service schema
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

# orders-service schema — extends Product from products-service
extend type Product @key(fields: "id") {
  id: ID! @external
  orderHistory: [Order!]!
}
```

---

## Query Depth and Complexity Limiting

```python
from strawberry.extensions import QueryDepthLimiter
from graphql import GraphQLError

schema = strawberry.Schema(
    query=Query,
    extensions=[
        QueryDepthLimiter(max_depth=10),   # prevent deeply nested queries
    ]
)
```

---

## Common Failure Cases

**N+1 query problem causing database overload**
Why: resolving a list of N items triggers a separate DB query for each item's related field (e.g., each `Product` fetches its `Category` individually).
Detect: `EXPLAIN ANALYZE` or query logs show hundreds of near-identical single-row queries per request; response latency scales linearly with list size.
Fix: wrap every resolver that loads a related entity in a DataLoader so all keys in a request batch into one query.

**Deeply nested query causes exponential database load**
Why: GraphQL lets clients request arbitrarily nested data (e.g., users → orders → products → category → products → ...); a malicious or naive query can trigger exponential resolver calls.
Detect: a single query brings down the DB; `EXPLAIN` shows query count or join depth explodes.
Fix: add `QueryDepthLimiter` (max 6–10 levels) and a complexity budget; reject queries that exceed the threshold before any resolver runs.

**Mutation returning stale data due to missing re-fetch**
Why: a mutation updates a record and returns the pre-update object from the resolver; the client caches the stale response and displays wrong data.
Detect: the UI shows the old value immediately after a successful mutation; a hard refresh shows the correct value.
Fix: in the mutation resolver, re-fetch the record from the DB after the write and return the fresh version, not the input data.

**Over-fetching via schema introspection in production**
Why: introspection is enabled by default; attackers use it to enumerate every type, field, and resolver in the schema, enabling targeted injection or business logic attacks.
Detect: access logs show `__schema` queries from unexpected clients.
Fix: disable introspection in production (`schema = strawberry.Schema(..., introspection=False)`) and expose it only in staging/dev environments.

## Connections
[[se-hub]] · [[cs-fundamentals/grpc]] · [[cs-fundamentals/api-design]] · [[cs-fundamentals/microservices-patterns]] · [[technical-qa/graphql-testing]] · [[web-frameworks/fastapi]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
