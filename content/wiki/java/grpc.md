---
type: concept
category: java
tags: [grpc, protobuf, java, streaming, inter-service, rpc, ai-infrastructure]
sources: []
updated: 2026-05-01
para: resource
tldr: gRPC with Protobuf is the standard for high-performance AI service communication — bidirectional streaming makes it the right choice for LLM output streaming between Java services.
---

# gRPC and Protobuf for Java AI Services

> **TL;DR** gRPC with Protobuf is the standard for high-performance AI service communication — bidirectional streaming makes it the right choice for LLM output streaming between Java services.

gRPC is the standard protocol for Java-to-Python AI service boundaries. Java orchestrator calling a Python inference service. Protobuf gives you typed contracts; gRPC streaming maps directly to LLM token-by-token output.

---

## Why gRPC for AI Workloads

Most production AI systems mix Java and Python. The Java layer handles auth, routing, business logic; the Python layer runs model inference (vLLM, HuggingFace, custom models). gRPC is the idiomatic bridge:

- **Bidirectional streaming**: tokens stream from the inference server to the Java client as they're generated, not buffered
- **Typed schema**: Protobuf definitions act as a contract between services — no JSON schema drift
- **Performance**: binary encoding, HTTP/2 multiplexing, lower latency than REST for high-frequency calls
- **Code generation**: stubs generated from `.proto` files for both Java and Python

---

## Protobuf Schema for LLM Service

```protobuf
// llm_service.proto
syntax = "proto3";

package ai.services;

option java_package = "com.example.ai.grpc";
option java_outer_classname = "LLMServiceProto";

service LLMService {
  // Unary: single request, single response
  rpc Generate(GenerateRequest) returns (GenerateResponse);

  // Server-streaming: one request, stream of tokens
  rpc GenerateStream(GenerateRequest) returns (stream GenerateChunk);
}

message GenerateRequest {
  string model = 1;
  string prompt = 2;
  int32 max_tokens = 3;
  float temperature = 4;
  map<string, string> metadata = 5;  // user_id, session_id, etc.
}

message GenerateResponse {
  string text = 1;
  int32 input_tokens = 2;
  int32 output_tokens = 3;
  string stop_reason = 4;
}

message GenerateChunk {
  string delta = 1;  // incremental token
  bool is_final = 2;
  int32 output_tokens = 3;  // only set when is_final=true
}
```

---

## Gradle Build Setup

```kotlin
// build.gradle.kts
plugins {
    id("com.google.protobuf") version "0.9.4"
    id("java")
}

dependencies {
    implementation("io.grpc:grpc-protobuf:1.63.0")
    implementation("io.grpc:grpc-stub:1.63.0")
    implementation("io.grpc:grpc-netty-shaded:1.63.0")  // transport
    compileOnly("org.apache.tomcat:annotations-api:6.0.53")  // @Generated
}

protobuf {
    protoc {
        artifact = "com.google.protobuf:protoc:3.25.3"
    }
    plugins {
        create("grpc") {
            artifact = "io.grpc:protoc-gen-grpc-java:1.63.0"
        }
    }
    generateProtoTasks {
        all().forEach {
            it.plugins {
                create("grpc")
            }
        }
    }
}
```

Place `.proto` files in `src/main/proto/`. Gradle generates stubs to `build/generated/source/proto/`.

---

## Java Client: Streaming LLM Responses

```java
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import com.example.ai.grpc.*;

public class LLMServiceClient {

    private final LLMServiceGrpc.LLMServiceStub asyncStub;

    public LLMServiceClient(String host, int port) {
        ManagedChannel channel = ManagedChannelBuilder
            .forAddress(host, port)
            .usePlaintext()  // for local dev; use TLS in production
            .build();

        this.asyncStub = LLMServiceGrpc.newStub(channel);
    }

    // Stream tokens as they arrive from the Python inference service
    public void generateStream(String prompt, TokenHandler handler) {
        GenerateRequest request = GenerateRequest.newBuilder()
            .setModel("claude-haiku-4-5-20251001")
            .setPrompt(prompt)
            .setMaxTokens(1024)
            .setTemperature(0.7f)
            .build();

        asyncStub.generateStream(request, new StreamObserver<GenerateChunk>() {
            @Override
            public void onNext(GenerateChunk chunk) {
                handler.onToken(chunk.getDelta());
                if (chunk.getIsFinal()) {
                    handler.onComplete(chunk.getOutputTokens());
                }
            }

            @Override
            public void onError(Throwable t) {
                handler.onError(t);
            }

            @Override
            public void onCompleted() {
                // stream ended normally
            }
        });
    }

    @FunctionalInterface
    interface TokenHandler {
        void onToken(String delta);
        default void onComplete(int totalTokens) {}
        default void onError(Throwable t) { t.printStackTrace(); }
    }
}
```

---

## Python gRPC Server (Inference Side)

```python
import grpc
from concurrent import futures
import anthropic
import llm_service_pb2
import llm_service_pb2_grpc

class LLMServiceServicer(llm_service_pb2_grpc.LLMServiceServicer):

    def __init__(self):
        self.client = anthropic.Anthropic()

    def GenerateStream(self, request, context):
        """Stream tokens from Claude back to the Java client."""
        with self.client.messages.stream(
            model=request.model,
            max_tokens=request.max_tokens,
            messages=[{"role": "user", "content": request.prompt}],
        ) as stream:
            token_count = 0
            for text in stream.text_stream:
                token_count += 1
                yield llm_service_pb2.GenerateChunk(
                    delta=text,
                    is_final=False,
                )

            # Final chunk with token count
            usage = stream.get_final_message().usage
            yield llm_service_pb2.GenerateChunk(
                delta="",
                is_final=True,
                output_tokens=usage.output_tokens,
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    llm_service_pb2_grpc.add_LLMServiceServicer_to_server(LLMServiceServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
```

---

## Handling gRPC in Spring Boot

```java
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
public class InferenceService {

    // Spring gRPC starter auto-configures the channel
    @GrpcClient("llm-service")
    private LLMServiceGrpc.LLMServiceStub stub;

    public Flux<String> streamResponse(String prompt) {
        return Flux.create(sink -> {
            GenerateRequest request = GenerateRequest.newBuilder()
                .setPrompt(prompt)
                .setMaxTokens(512)
                .build();

            stub.generateStream(request, new StreamObserver<GenerateChunk>() {
                @Override
                public void onNext(GenerateChunk chunk) {
                    if (!chunk.getDelta().isEmpty()) {
                        sink.next(chunk.getDelta());
                    }
                }

                @Override
                public void onError(Throwable t) { sink.error(t); }

                @Override
                public void onCompleted() { sink.complete(); }
            });
        });
    }
}
```

```yaml
# application.yml — Spring gRPC starter config
grpc:
  client:
    llm-service:
      address: static://localhost:50051
      negotiation-type: plaintext
```

Maven dep: `net.devh:grpc-client-spring-boot-starter:3.1.0.RELEASE`

---

## Production Concerns

**TLS between services:**
```java
ManagedChannel channel = NettyChannelBuilder
    .forAddress(host, port)
    .sslContext(GrpcSslContexts.forClient().build())
    .build();
```

**Deadlines (don't omit these):**
```java
asyncStub.withDeadlineAfter(30, TimeUnit.SECONDS)
    .generateStream(request, observer);
```

**Health checking:**
```protobuf
// Standard gRPC health protocol — Kubernetes liveness probes use this
import "grpc/health/v1/health.proto";
```

**Load balancing:** gRPC client-side load balancing via `ManagedChannelBuilder.defaultLoadBalancingPolicy("round_robin")`. Or use a service mesh (Envoy, Istio) for transparent routing.

---

## Key Facts

- Protobuf binary encoding is 3–10x smaller than JSON for repeated structured data
- gRPC bidirectional streaming maps cleanly to LLM token-by-token output — don't buffer server-side
- Java stub types: `Stub` (async+callbacks), `BlockingStub` (blocking), `FutureStub` (CompletableFuture-like)
- Always set deadlines — gRPC calls don't time out by default; LLM calls can hang indefinitely
- Spring Boot gRPC starter (`net.devh:grpc-*`) auto-configures channels from `application.yml`
- `.proto` files define the API contract: version both services together or use backward-compatible field additions only

## Common Failure Cases

**gRPC call hangs indefinitely because no deadline is set and the Python inference server is overloaded**  
Why: gRPC calls do not time out by default; if the Python server is slow to respond (model loading, high queue depth), the Java `StreamObserver.onNext` is never called and the calling thread waits forever, eventually exhausting the thread pool.  
Detect: all threads are blocked on `grpc.io` internal park; the service stops responding to other requests; removing the gRPC call restores normal operation.  
Fix: always attach a deadline before the stub call: `asyncStub.withDeadlineAfter(30, TimeUnit.SECONDS).generateStream(request, observer)`; handle `StatusRuntimeException` with status `DEADLINE_EXCEEDED` to implement retry or fallback logic.

**Protobuf-generated stubs on the Java client and Python server are out of sync, causing silent field drops**  
Why: if the Java module compiles its stubs from an older version of the `.proto` file than the Python server uses, new fields added in the server's proto are unknown to the Java client; proto3 silently ignores unknown fields on deserialization rather than raising an error.  
Detect: the Java client receives responses where new fields (added to `GenerateChunk` in a recent proto change) are always zero/empty; enabling `UNKNOWN_FIELDS` logging on the channel reveals dropped bytes.  
Fix: keep `.proto` files in a shared repository (`api/` module); both Java and Python services must rebuild stubs from the same version; use semantic versioning on the proto file and enforce it in CI.

**`StreamObserver.onError` is called but the exception is swallowed because `handler.onError` only calls `printStackTrace`**  
Why: `onError` in the default `TokenHandler` implementation just prints the stack trace and returns; the calling code assumes the stream completed successfully and proceeds to use a null or partial result.  
Detect: the Java application produces empty or incomplete output after an inference error; the stack trace appears in logs but no error is propagated to the caller; the Python server logs show a `grpc.StatusCode.INTERNAL` error.  
Fix: `onError` must signal failure to the caller — throw a runtime exception, complete a `CompletableFuture` exceptionally, or emit an error on a reactive `Sink`; never swallow gRPC stream errors silently.

**Spring Boot gRPC starter fails to connect because the `address` in `application.yml` uses `static://` prefix but the host is behind a Kubernetes service that requires DNS-based resolution**  
Why: `static://` configures a fixed list of addresses; in Kubernetes, the pod IP changes on restart; DNS-based load balancing requires the `dns:///service-name:50051` URI scheme, which uses the gRPC DNS resolver.  
Detect: the Java service fails to connect after a pod restart of the Python inference service; the gRPC channel status shows `TRANSIENT_FAILURE`; `nslookup llm-service` resolves to the correct pod IP but the channel still uses the stale static address.  
Fix: change the address to `dns:///llm-service:50051` and set `defaultLoadBalancingPolicy("round_robin")` on the channel; or use a service mesh (Istio, Linkerd) to handle transparent routing without SDK-level changes.

## Connections

- [[java/spring-ai]] — Spring Boot LLM integration; gRPC is for Java↔Python service boundaries
- [[java/langchain4j]] — LangChain4j is the Java LLM framework; gRPC handles the transport layer
- [[infra/inference-serving]] — vLLM and Triton both expose gRPC endpoints natively
- [[protocols/mcp]] — MCP uses HTTP/stdio; gRPC is for direct service-to-service inference calls
- [[web-frameworks/fastapi]] — FastAPI often serves the Python side; use gRPC when streaming performance matters
- [[cs-fundamentals/grpc]] — language-agnostic reference: protocol comparison table, proto syntax, 4 streaming modes
