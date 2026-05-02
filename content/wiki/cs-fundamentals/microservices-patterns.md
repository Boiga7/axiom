---
type: concept
category: cs-fundamentals
para: resource
tags: [microservices, saga, cqrs, outbox, service-mesh, decomposition]
sources: []
updated: 2026-05-01
tldr: Architectural patterns for systems composed of independently deployable services.
---

# Microservices Patterns

Architectural patterns for systems composed of independently deployable services. Microservices solve deployment coupling but introduce distributed systems complexity — use them when the deployment independence benefit outweighs the cost.

---

## Decomposition Strategies

**By domain (DDD bounded context):** Each service owns a domain — Orders, Inventory, Users, Payments. Services align with business capabilities.

**By subdomain:** Decompose large domains further — User Auth, User Profile, User Preferences can be separate if they scale or deploy independently.

**Strangler Fig:** Gradually migrate a monolith by routing traffic through a facade. New services replace monolith modules one at a time. The monolith shrinks until it can be retired.

```
Traffic → Facade/API Gateway → [ New Service (orders) ]
                               → [ New Service (payments) ]
                               → [ Legacy Monolith (everything else) ]
```

---

## Saga Pattern

Coordinates distributed transactions across services without two-phase commit. Each step publishes events; compensating transactions undo completed steps on failure.

**Choreography (event-driven):**
```
OrderService: publishes OrderCreated
  → InventoryService: reserves stock → publishes StockReserved
    → PaymentService: charges card → publishes PaymentSucceeded
      → ShippingService: creates label → publishes ShipmentCreated

On failure:
PaymentService: publishes PaymentFailed
  → InventoryService: receives PaymentFailed, releases stock
  → OrderService: receives PaymentFailed, marks order rejected
```

**Orchestration (central coordinator):**
```python
# Order saga orchestrator using Step Functions or a saga library
class OrderSaga:
    def execute(self, order: Order) -> SagaResult:
        try:
            reservation = self.inventory.reserve(order.items)
            try:
                charge = self.payment.charge(order.total, order.payment_method)
                self.shipping.create_label(order, charge)
                return SagaResult.success()
            except PaymentFailed as e:
                self.inventory.release(reservation)
                return SagaResult.failure(reason=str(e))
        except InventoryUnavailable as e:
            return SagaResult.failure(reason=str(e))
```

---

## Outbox Pattern

Guarantees events are published even if the service crashes after the DB write but before publishing to the message broker. Solves the dual-write problem.

```python
# Write order AND the event to the same DB transaction
with db.begin():
    order = Order(user_id=user_id, items=items, status="pending")
    db.add(order)

    outbox_event = OutboxEvent(
        event_type="order.created",
        payload=json.dumps({"order_id": str(order.id), "items": items}),
        published=False,
    )
    db.add(outbox_event)
    # Both committed atomically — event never lost

# Separate outbox publisher polls for unpublished events
def publish_outbox_events():
    unpublished = db.query(OutboxEvent).filter_by(published=False).limit(100)
    for event in unpublished:
        message_bus.publish(event.event_type, event.payload)
        event.published = True
    db.commit()
```

---

## CQRS (Command Query Responsibility Segregation)

Separate the write model (commands) from the read model (queries). Enables independent scaling and optimisation.

```python
# Write side: normalised, transactional
class OrderCommandHandler:
    def handle_place_order(self, cmd: PlaceOrderCommand) -> str:
        order = Order.create(cmd.user_id, cmd.items)
        self.repo.save(order)
        self.event_bus.publish("order.placed", {"id": str(order.id)})
        return str(order.id)

# Read side: denormalised, optimised for queries
# Separate read model updated by event handlers
class OrderReadModelUpdater:
    def handle_order_placed(self, event: dict) -> None:
        self.read_db.execute("""
            INSERT INTO order_summaries (id, user_email, total, status, placed_at)
            VALUES (%(id)s, %(user_email)s, %(total)s, 'pending', %(placed_at)s)
        """, event)

# Query: hit the read model (can be a different DB, Elasticsearch, Redis)
class OrderQueryService:
    def get_user_orders(self, user_id: str) -> list[OrderSummary]:
        return self.read_db.query("SELECT * FROM order_summaries WHERE user_id = %s", user_id)
```

---

## Anti-Corruption Layer

Protects a service from the domain model of an external service or legacy system.

```python
# Legacy inventory system has a bizarre data model
class LegacyInventoryClient:
    def check_qty(self, sku: str) -> dict:
        return {"ITEMNUMBER": sku, "QTY_ON_HAND": 42, "REORDER_PT": 10}

# ACL translates to your domain model
class InventoryAntiCorruptionLayer:
    def __init__(self, client: LegacyInventoryClient) -> None:
        self._client = client

    def get_stock_level(self, product_id: str) -> StockLevel:
        raw = self._client.check_qty(product_id)
        return StockLevel(
            product_id=product_id,
            quantity=raw["QTY_ON_HAND"],
            reorder_point=raw["REORDER_PT"],
        )
```

---

## API Gateway Pattern

Single entry point for all client requests. Routes to appropriate service, handles auth, rate limiting, and response aggregation.

```yaml
# Kong / AWS API Gateway routing
routes:
  - path: /api/orders
    service: order-service
    strip_path: true
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100

  - path: /api/products
    service: product-service
    strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 500
```

---

## Sidecar Pattern

Deploy a helper container alongside the main application container in the same pod. Handles cross-cutting concerns (logging, metrics, mTLS) without modifying app code.

```yaml
# Kubernetes pod with Envoy sidecar (injected by Istio)
spec:
  containers:
  - name: myapp
    image: myapp:v1.0
    ports:
    - containerPort: 8080
  # Istio automatically injects this:
  - name: istio-proxy
    image: istio/proxyv2
    # Handles: mTLS, circuit breaking, retries, metrics collection
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/design-patterns]] · [[cloud/kubernetes]] · [[cloud/service-mesh]] · [[cloud/aws-sqs-sns]] · [[cloud/aws-step-functions]]
