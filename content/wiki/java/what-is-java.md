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

Java is a compiled, statically typed programming language that runs on the Java Virtual Machine (JVM). You write `.java` files, compile them to `.class` bytecode, and the JVM executes that bytecode on any OS. One build, any machine — that's the "write once, run anywhere" promise.

Java is everywhere in enterprise — banking, insurance, telecoms, logistics, government. When you're integrating AI into an existing system, that system is often Java. That's why it's in this wiki.

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

Java 21 (LTS, released 2023) introduced **virtual threads** — lightweight threads managed by the JVM, not the OS. This is significant for LLM work:

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

Each LLM call blocks while waiting for the network response. With OS threads, 100 blocked threads means 100 OS threads pinned. With virtual threads, those 100 blocks are nearly free — the JVM schedules work around them.

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

## Connections

- [[java/langchain4j]] — primary Java LLM framework: AI Services, tool calling, RAG pipeline
- [[java/spring-ai]] — Spring Boot integration for LLMs: auto-configured ChatClient, Advisors
- [[java/anthropic-java-sdk]] — official Anthropic SDK for Java
- [[java/grpc]] — gRPC: high-performance Java↔Python service communication
- [[java/build-tools]] — Maven and Gradle project setup for AI projects
