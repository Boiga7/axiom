---
type: concept
category: cs-fundamentals
para: resource
tags: [api-design, rest, openapi, versioning, http, hateoas]
sources: []
updated: 2026-05-01
tldr: Designing HTTP APIs that are intuitive, consistent, and maintainable. Good API design is about the consumer's experience — the API is a product, not just an implementation detail.
---

# API Design

Designing HTTP APIs that are intuitive, consistent, and maintainable. Good API design is about the consumer's experience. The API is a product, not just an implementation detail.

---

## REST Principles

REST (Representational State Transfer) is an architectural style, not a protocol. Key constraints:

1. **Uniform interface** — standard HTTP methods, resource-based URLs
2. **Stateless** — each request contains all information needed; server holds no session state
3. **Client-server** — separation of concerns
4. **Cacheable** — responses declare their cacheability
5. **Layered** — client doesn't know if it's talking to a server or a proxy

---

## URL Design

```
Resource-based, not action-based:

GOOD:
  GET    /products          → list products
  POST   /products          → create a product
  GET    /products/123      → get product 123
  PUT    /products/123      → replace product 123
  PATCH  /products/123      → partially update product 123
  DELETE /products/123      → delete product 123

BAD (verb-based, RPC style):
  GET    /getProducts
  POST   /createProduct
  GET    /getProductById?id=123
  POST   /updateProduct
  POST   /deleteProduct

Nested resources — use sparingly (max 2 levels):
  GET    /orders/456/items          → items in order 456
  POST   /orders/456/items          → add item to order 456
  GET    /orders/456/items/789      → specific item

Not:
  GET    /orders/456/items/789/variants/red/sizes/L  (too deep)
```

---

## HTTP Methods

| Method | Idempotent | Safe | Use for |
|---|---|---|---|
| GET | Yes | Yes | Read resources |
| POST | No | No | Create, trigger actions |
| PUT | Yes | No | Replace entire resource |
| PATCH | No | No | Partial update |
| DELETE | Yes | No | Delete resource |
| HEAD | Yes | Yes | Check existence, get headers |

**Idempotent** — calling multiple times has same effect as calling once. Safe means it doesn't modify state.

---

## HTTP Status Codes

```
2xx Success:
  200 OK               — successful GET, PUT, PATCH, DELETE
  201 Created          — successful POST that created a resource
  202 Accepted         — async operation started; check status later
  204 No Content       — successful DELETE or PUT with no response body

4xx Client Error:
  400 Bad Request      — invalid request (validation failure, bad JSON)
  401 Unauthorized     — authentication required or failed
  403 Forbidden        — authenticated but not allowed
  404 Not Found        — resource doesn't exist
  409 Conflict         — state conflict (duplicate, version mismatch)
  422 Unprocessable Entity — valid JSON but fails business rules
  429 Too Many Requests  — rate limited

5xx Server Error:
  500 Internal Server Error — unexpected server error
  502 Bad Gateway       — upstream service failure
  503 Service Unavailable  — overloaded or maintenance

> **→** [Request Flow Anatomy](/synthesis/request-flow-anatomy) — see how status codes map to failure points at each layer, from load balancer 502s to database-induced 503s.
```

---

## Response Format

Consistent response shapes reduce cognitive load for API consumers.

**Success:**
```json
{
  "data": {
    "id": "prod_123",
    "name": "Wireless Headphones",
    "price": 79.99,
    "currency": "GBP",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {"field": "price", "issue": "must be a positive number"},
      {"field": "name", "issue": "required"}
    ],
    "requestId": "req_abc123"
  }
}
```

**Pagination:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "totalItems": 143,
    "totalPages": 8,
    "nextCursor": "eyJpZCI6MTAwfQ"   // cursor-based preferred for large datasets
  }
}
```

---

## Versioning

APIs change. Version to avoid breaking existing consumers.

**URL versioning** (most common, explicit):
```
/v1/products
/v2/products
```

**Header versioning** (cleaner URLs, less discoverable):
```
Accept: application/vnd.myapi.v2+json
API-Version: 2024-01-01
```

**Never** remove fields or change field types in a version — add fields, never delete. Deprecate with a `Sunset` header before removing an old version.

---

## OpenAPI Specification

Document your API in OpenAPI 3.1. Generates SDKs, documentation, and validation.

```yaml
openapi: "3.1.0"
info:
  title: Product API
  version: "1.0.0"

paths:
  /products/{id}:
    get:
      summary: Get a product by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Product found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Product"
        "404":
          $ref: "#/components/responses/NotFound"

components:
  schemas:
    Product:
      type: object
      required: [id, name, price]
      properties:
        id:
          type: string
          example: "prod_123"
        name:
          type: string
          minLength: 1
        price:
          type: number
          minimum: 0
```

Tools: Swagger UI (rendered docs), Stoplight (design-first), Prism (mock server from spec), `openapi-generator` (client SDKs).

---

## Rate Limiting

Headers consumers should expose:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 450
X-RateLimit-Reset: 1714556400
Retry-After: 60   (when 429 is returned)
```

---

## Common Failure Cases

**Breaking change shipped without version bump**  
Why: a field was renamed or a 200 response changed shape; existing consumers silently break.  
Detect: consumer error rate spikes after a deploy; contract tests (if present) fail; check git diff for changed response shapes.  
Fix: treat any field removal, rename, or type change as a breaking change; bump the API version and run both versions in parallel during the deprecation window.

**404 vs 400 confusion causes client retry storms**  
Why: client receives 404 for a malformed request (should be 400) and retries indefinitely thinking the resource will appear.  
Detect: high rate of retries for a single endpoint; the 404s all carry the same malformed request shape.  
Fix: return 400 with a descriptive `details` array for validation failures; 404 only when the resource legitimately does not exist.

**Pagination cursor expires mid-iteration**  
Why: cursor-based pagination encodes a timestamp or row offset that becomes invalid after a database vacuum or data mutation.  
Detect: client reports missing or duplicate records mid-page; `nextCursor` decoding fails with a 400 or 404.  
Fix: encode cursors as opaque base64 tokens; validate on decode and return a 422 with `CURSOR_EXPIRED` code when the cursor is stale.

**Rate limit headers absent, client has no backoff signal**  
Why: rate limiting was added at the infra layer (API Gateway) without forwarding `X-RateLimit-*` headers to the response.  
Detect: clients receive 429 with no `Retry-After` header; they retry immediately, worsening the rate limit situation.  
Fix: ensure the API Gateway propagates `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` on every 429.

**Nested resource URL depth causes routing conflicts**  
Why: URLs deeper than 2 levels (`/a/:id/b/:id/c/:id`) have parameter name collisions and routing ambiguity across different frameworks.  
Detect: requests to a deep route return the wrong resource; trace framework routing table for shadowed paths.  
Fix: flatten the hierarchy; expose deep relationships via query params (`/items?orderId=456`) or a dedicated relationship endpoint.

## Connections
[[se-hub]] · [[cs-fundamentals/networking]] · [[technical-qa/api-testing]] · [[technical-qa/contract-testing]] · [[web-frameworks/fastapi]] · [[web-frameworks/django]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
