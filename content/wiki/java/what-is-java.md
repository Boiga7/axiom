---
type: concept
category: java
tags: [java, jvm, fundamentals, oop, compiled, enterprise, kotlin]
sources: []
updated: 2026-05-01
para: resource
tldr: Java is a compiled, statically typed language that runs on the JVM — write once, run anywhere. It dominates enterprise backends, which is why most AI teams hit Java eventually when integrating with existing systems.
---

# What is Java?

Java is a compiled, statically typed programming language that runs on the Java Virtual Machine (JVM). You write `.java` files, compile them to `.class` bytecode, and the JVM executes that bytecode on any OS. One build, any machine. That's the "write once, run anywhere" promise.

Java is everywhere in enterprise. Banking, insurance, telecoms, logistics, government. When you're integrating AI into an existing system, that system is often Java. That's why it's in this wiki.

---

## Why Java in AI Engineering?

Most AI frameworks are Python-first. But enterprise AI integration is different:

- **The existing system is Java.** You're adding LLM features to a Spring Boot monolith, not starting fresh.
- **Performance matters at scale.** Java handles high-throughput workloads well — JVM JIT compilation, multithreading, mature garbage collectors.
- **Strong typing catches errors earlier.** LLM tool schemas, API response types, structured outputs — Java's type system makes these contracts explicit.
- **Java 21 virtual threads** make concurrent LLM API calls simple without async/callback complexity.

---

## Key Concepts

**Static typing** — every variable has a declared type at compile time:
```java
String prompt = "What is RAG?";
int maxTokens = 1024;
// This would fail at compile time, not runtime:
// int x = "hello";  // error: incompatible types
```

**Classes and objects** — Java is object-oriented:
```java
public class LLMService {
    private final String apiKey;

    public LLMService(String apiKey) {
        this.apiKey = apiKey;
    }

    public String generate(String prompt) {
        // call the API
        return response;
    }
}

// Use it:
LLMService service = new LLMService(System.getenv("ANTHROPIC_API_KEY"));
String result = service.generate("Explain embeddings");
```

**Interfaces** — define contracts that classes must fulfil:
```java
public interface EmbeddingModel {
    float[] embed(String text);
    int getDimensions();
}

// Any class implementing EmbeddingModel must provide these methods
public class OpenAIEmbeddings implements EmbeddingModel {
    public float[] embed(String text) { ... }
    public int getDimensions() { return 1536; }
}
```

**Generics** — type-safe collections and methods:
```java
List<String> prompts = new ArrayList<>();
prompts.add("Question 1");
// List<String> guarantees you only get Strings back

Map<String, Integer> tokenCounts = new HashMap<>();
tokenCounts.put("input", 150);
tokenCounts.put("output", 300);
```

---

## Java vs Python for AI

| | Java | Python |
|---|---|---|
| AI frameworks | LangChain4j, Spring AI | LangChain, LlamaIndex, DSPy |
| LLM SDKs | Anthropic Java SDK, OpenAI Java | anthropic, openai |
| Type safety | Compile-time | Runtime (optional with mypy) |
| Concurrency | Virtual threads (Java 21) | asyncio, threading |
| Performance | High (JVM JIT) | Moderate |
| Startup time | Slow (JVM warmup) | Fast |
| Best for | Enterprise integration | Prototyping, ML research |

**Rule of thumb:** prototype in Python, deploy to Java if the existing stack demands it.

---

## Java 21 Matters for AI

Java 21 (LTS, released 2023) introduced **virtual threads**. Lightweight threads managed by the JVM, not the OS. This is significant for LLM work:

```java
// Before Java 21: 100 LLM API calls = 100 OS threads (expensive)
// After Java 21: 100 LLM API calls = 100 virtual threads (cheap)

try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = prompts.stream()
        .map(prompt -> executor.submit(() -> llmService.generate(prompt)))
        .toList();

    // All calls in parallel, no OS thread bloat
    List<String> results = futures.stream()
        .map(f -> { try { return f.get(); } catch (Exception e) { return ""; } })
        .toList();
}
```

Each LLM call blocks while waiting for the network response. With OS threads, 100 blocked threads means 100 OS threads pinned. With virtual threads, those 100 blocks are nearly free. The JVM schedules work around them.

---

## The Build Tools

Java projects use either **Maven** or **Gradle** (not pip/npm):

**Maven** — XML config, declarative, dominant in enterprise:
```xml
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-anthropic</artifactId>
    <version>0.36.0</version>
</dependency>
```

**Gradle** — Kotlin DSL, more flexible, faster builds:
```kotlin
implementation("dev.langchain4j:langchain4j-anthropic:0.36.0")
```

See [[java/build-tools]] for full setup with AI frameworks.

---

## Key Facts

- JVM: Java bytecode runs on any OS — no recompile needed per platform
- Java 21 LTS (2023): virtual threads (`Executors.newVirtualThreadPerTaskExecutor()`) make concurrent LLM calls practical
- Spring Boot: the dominant Java web framework; most enterprise APIs are Spring Boot services
- Maven central: Java's package registry (equivalent to PyPI); all AI SDKs publish there
- Java compiles to `.class` files; JVM JIT compiles hot code paths to native at runtime
- `record` type (Java 16+): immutable data class in one line — useful for structured LLM outputs

## Common Failure Cases

**Virtual thread pool is created inside a hot code path and never closed, leaking thread pool resources on each invocation**  
Why: `Executors.newVirtualThreadPerTaskExecutor()` creates a new executor on each call; if the executor is not closed (via `try-with-resources`), submitted virtual threads remain alive until GC, and repeated invocations accumulate many open executors each holding references to pending tasks.  
Detect: heap usage grows with each batch of LLM calls; `jstack` shows many virtual threads in a parked state with no active work; restarting the application clears the leak.  
Fix: always wrap the executor in `try (var executor = Executors.newVirtualThreadPerTaskExecutor())` so `close()` is called on exit; if the executor needs to be shared, create it once at application startup and shut it down on application stop.

**`record` type fields are not accessible from LangChain4j or Spring AI reflection-based extractors because they lack traditional getter methods**  
Why: Java `record` components expose accessors named after the field (e.g., `sentiment()` not `getSentiment()`); some AI framework parsers use JavaBeans reflection conventions (`get*`) and fail to find the accessors, returning null for all fields.  
Detect: structured output extraction returns an object where all fields are null despite correct JSON from the model; switching to a regular POJO class with `getSentiment()` methods fixes it.  
Fix: check the framework's documentation for record support; for LangChain4j, records are supported from v0.32+; for Spring AI, add `@JsonProperty` annotations to record components to ensure Jackson can deserialise them.

**`NullPointerException` occurs when accessing `System.getenv("ANTHROPIC_API_KEY")` because the variable is not set and Java returns null rather than an empty string**  
Why: unlike Python's `os.environ.get("KEY", "")`, `System.getenv()` returns `null` for absent variables; passing null to the SDK's `.apiKey(null)` call either throws immediately or causes a null dereference later in the HTTP client.  
Detect: the exception stacktrace points into the SDK's HTTP client setup, not the application code; the variable name is spelled correctly but was not exported in the shell session or CI environment.  
Fix: use a null check: `Objects.requireNonNullElseThrow(System.getenv("ANTHROPIC_API_KEY"), () -> new IllegalStateException("ANTHROPIC_API_KEY not set"))`; set environment variables explicitly in CI workflow files rather than assuming they are inherited.

## Connections

- [[java/langchain4j]] — primary Java LLM framework: AI Services, tool calling, RAG pipeline
- [[java/spring-ai]] — Spring Boot integration for LLMs: auto-configured ChatClient, Advisors
- [[java/anthropic-java-sdk]] — official Anthropic SDK for Java
- [[java/grpc]] — gRPC: high-performance Java↔Python service communication
- [[java/build-tools]] — Maven and Gradle project setup for AI projects
## Open Questions

- How does this integrate with the broader JVM ecosystem in practice?
- What performance characteristics are not obvious from the API surface?
