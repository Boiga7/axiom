---
type: concept
category: cs-fundamentals
para: resource
tags: [grpc, protobuf, rpc, streaming, microservices, performance]
sources: []
updated: 2026-05-01
---

# gRPC

A high-performance RPC framework using Protocol Buffers for serialisation. Strongly typed, auto-generated clients, 4 streaming modes. Preferred for internal service-to-service communication at scale.

---

## gRPC vs REST vs GraphQL

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Protocol | HTTP/1.1 | HTTP/1.1 | HTTP/2 |
| Serialisation | JSON | JSON | Protobuf (binary) |
| Schema | OpenAPI (optional) | SDL (required) | Proto (required) |
| Type safety | Weak | Strong | Strong |
| Streaming | No | Subscriptions | 4 modes |
| Browser support | Native | Native | Via grpc-web |
| Best for | Public APIs | BFF/complex clients | Internal microservices |

---

## Proto Definition

```protobuf
// proto/product.proto
syntax = "proto3";

package product.v1;

option go_package = "github.com/myorg/myapp/gen/product/v1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

service ProductService {
  // Unary RPC
  rpc GetProduct (GetProductRequest) returns (Product);
  rpc CreateProduct (CreateProductRequest) returns (Product);
  rpc DeleteProduct (DeleteProductRequest) returns (google.protobuf.Empty);

  // Server streaming — send product list incrementally
  rpc ListProducts (ListProductsRequest) returns (stream Product);

  // Client streaming — batch create
  rpc BatchCreateProducts (stream CreateProductRequest) returns (BatchCreateResponse);

  // Bidirectional streaming — real-time price updates
  rpc WatchPrices (stream WatchRequest) returns (stream PriceUpdate);
}

message Product {
  string id = 1;
  string name = 2;
  double price = 3;
  string category = 4;
  bool in_stock = 5;
  google.protobuf.Timestamp created_at = 6;
  repeated string tags = 7;
}

message GetProductRequest {
  string id = 1;
}

message CreateProductRequest {
  string name = 1;
  double price = 2;
  string category_id = 3;
  repeated string tags = 4;
}

message ListProductsRequest {
  optional string category = 1;
  int32 page_size = 2;
  string page_token = 3;
}

message WatchRequest {
  repeated string product_ids = 1;
}

message PriceUpdate {
  string product_id = 1;
  double new_price = 2;
  google.protobuf.Timestamp updated_at = 3;
}

message BatchCreateResponse {
  repeated Product products = 1;
  int32 created_count = 2;
}

message DeleteProductRequest {
  string id = 1;
}
```

---

## Python Server

```python
# app/grpc/product_service.py
import grpc
from concurrent import futures
from generated import product_pb2, product_pb2_grpc
from app.db import get_db
from app.models import Product

class ProductServiceServicer(product_pb2_grpc.ProductServiceServicer):

    def GetProduct(self, request, context):
        db = get_db()
        product = db.query(Product).get(request.id)
        if not product:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"Product {request.id} not found")
            return product_pb2.Product()
        return product_pb2.Product(
            id=str(product.id),
            name=product.name,
            price=float(product.price),
            category=product.category,
            in_stock=product.in_stock,
        )

    def ListProducts(self, request, context):
        """Server streaming — yield products one at a time."""
        db = get_db()
        query = db.query(Product)
        if request.category:
            query = query.filter(Product.category == request.category)
        for product in query.yield_per(100):  # stream in batches
            yield product_pb2.Product(
                id=str(product.id),
                name=product.name,
                price=float(product.price),
            )

    def WatchPrices(self, request_iterator, context):
        """Bidirectional streaming — receive watch requests, send price updates."""
        watched_ids = set()
        for req in request_iterator:
            watched_ids.update(req.product_ids)
            # Fetch and yield current prices
            for product_id in req.product_ids:
                price = get_current_price(product_id)
                yield product_pb2.PriceUpdate(product_id=product_id, new_price=price)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    product_pb2_grpc.add_ProductServiceServicer_to_server(
        ProductServiceServicer(), server
    )
    server.add_insecure_port("[::]:50051")
    server.start()
    server.wait_for_termination()
```

---

## Python Client

```python
# app/clients/product_client.py
import grpc
from generated import product_pb2, product_pb2_grpc
from grpc import ssl_channel_credentials

def get_channel():
    creds = ssl_channel_credentials()
    return grpc.secure_channel("products.internal:443", creds)

class ProductClient:
    def __init__(self):
        self.stub = product_pb2_grpc.ProductServiceStub(get_channel())

    def get_product(self, product_id: str) -> product_pb2.Product:
        try:
            return self.stub.GetProduct(
                product_pb2.GetProductRequest(id=product_id),
                timeout=5.0,
                metadata=[("x-request-id", generate_request_id())],
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.NOT_FOUND:
                return None
            raise

    def list_products_streaming(self, category: str = None):
        """Server streaming — iterate over yielded products."""
        request = product_pb2.ListProductsRequest(category=category or "")
        for product in self.stub.ListProducts(request):
            yield product
```

---

## Interceptors (Middleware)

```python
# app/grpc/interceptors.py
import time
import grpc

class LoggingInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        start = time.time()
        response = continuation(handler_call_details)
        duration_ms = (time.time() - start) * 1000
        print(f"gRPC {handler_call_details.method} {duration_ms:.1f}ms")
        return response

class AuthInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata)
        token = metadata.get("authorization", "").replace("Bearer ", "")
        if not verify_jwt(token):
            def abort(request, context):
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Invalid token")
            return grpc.unary_unary_rpc_method_handler(abort)
        return continuation(handler_call_details)
```

---

## Health Checking and Reflection

```python
from grpc_health.v1 import health, health_pb2_grpc
from grpc_reflection.v1alpha import reflection, reflection_pb2

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Service
    product_pb2_grpc.add_ProductServiceServicer_to_server(ProductServiceServicer(), server)

    # Health check (standard protocol — Kubernetes probes)
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)

    # Reflection (allows grpcurl to discover services)
    SERVICE_NAMES = (
        product_pb2.DESCRIPTOR.services_by_name["ProductService"].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)

    server.add_insecure_port("[::]:50051")
    server.start()
```

```bash
# grpcurl — CLI for gRPC (like curl for REST)
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"id": "abc123"}' localhost:50051 product.v1.ProductService/GetProduct
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/graphql-se]] · [[cs-fundamentals/microservices-patterns]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/api-design]] · [[cloud/service-mesh]]
