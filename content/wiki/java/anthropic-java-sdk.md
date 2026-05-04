---
type: entity
category: java
tags: [java, anthropic, sdk, messages-api, streaming, tool-use, java-21]
sources: []
updated: 2026-05-01
para: resource
tldr: The official Anthropic Java SDK wraps the Messages API with strongly-typed builders, synchronous and async clients, streaming support, and tool use — idiomatic Java without an LLM framework overhead.
---

# Anthropic Java SDK

> **TL;DR** The official Anthropic Java SDK wraps the Messages API with strongly-typed builders, synchronous and async clients, streaming support, and tool use — idiomatic Java without an LLM framework overhead.

The official Anthropic SDK for Java. Use this when you need direct API access without LangChain4j or Spring AI overhead. Batch jobs, one-off CLI tools, or when you're integrating into a codebase that already has its own abstractions.

---

## Installation

```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.anthropic</groupId>
    <artifactId>anthropic-java</artifactId>
    <version>0.8.0</version>  <!-- check Maven Central for latest -->
</dependency>
```

```kotlin
// build.gradle.kts
implementation("com.anthropic:anthropic-java:0.8.0")
```

Requires Java 11+. Virtual threads (Java 21) improve throughput for concurrent LLM calls without async complexity.

---

## Basic Usage

```java
import com.anthropic.client.Anthropic;
import com.anthropic.models.*;

public class BasicExample {

    public static void main(String[] args) {
        Anthropic client = Anthropic.builder()
            .apiKey(System.getenv("ANTHROPIC_API_KEY"))
            .build();

        Message message = client.messages().create(
            MessageCreateParams.builder()
                .model(Model.CLAUDE_SONNET_4_6)
                .maxTokens(1024)
                .addUserMessage("Explain attention mechanisms in one paragraph.")
                .build()
        );

        System.out.println(message.content().get(0).asText().text());

        // Token usage
        Usage usage = message.usage();
        System.out.printf("Input: %d, Output: %d%n",
            usage.inputTokens(), usage.outputTokens());
    }
}
```

---

## Streaming

```java
import com.anthropic.client.Anthropic;
import com.anthropic.models.*;

public class StreamingExample {

    public static void main(String[] args) {
        Anthropic client = Anthropic.builder()
            .apiKey(System.getenv("ANTHROPIC_API_KEY"))
            .build();

        // Stream tokens to stdout as they arrive
        try (MessageStream stream = client.messages().stream(
            MessageCreateParams.builder()
                .model(Model.CLAUDE_HAIKU_4_5_20251001)
                .maxTokens(512)
                .addUserMessage("Write a haiku about virtual threads.")
                .build()
        )) {
            stream.textStream()
                .forEach(delta -> System.out.print(delta));

            System.out.println();  // newline after stream

            // Final message with usage stats
            Message finalMessage = stream.getFinalMessage();
            System.out.printf("Total tokens: %d%n",
                finalMessage.usage().inputTokens() + finalMessage.usage().outputTokens());
        }
    }
}
```

---

## System Prompts and Multi-Turn

```java
Message response = client.messages().create(
    MessageCreateParams.builder()
        .model(Model.CLAUDE_SONNET_4_6)
        .maxTokens(1024)
        .system("You are a Java expert. Answer concisely with code examples.")
        .addUserMessage("What is the difference between Executor and ExecutorService?")
        .addAssistantMessage("ExecutorService extends Executor with lifecycle management...")
        .addUserMessage("Can you show a concrete example with virtual threads?")
        .build()
);
```

---

## Tool Use (Function Calling)

```java
import com.anthropic.models.*;
import java.util.List;

public class ToolUseExample {

    // Define the tool schema
    static Tool weatherTool = Tool.builder()
        .name("get_weather")
        .description("Get the current weather for a location")
        .inputSchema(Tool.InputSchema.builder()
            .type(Tool.InputSchema.Type.OBJECT)
            .putProperty("location", JsonValue.from(Map.of(
                "type", "string",
                "description", "City name, e.g. London"
            )))
            .addRequired("location")
            .build())
        .build();

    public static void main(String[] args) {
        Anthropic client = Anthropic.builder()
            .apiKey(System.getenv("ANTHROPIC_API_KEY"))
            .build();

        // First turn — model may call the tool
        Message response = client.messages().create(
            MessageCreateParams.builder()
                .model(Model.CLAUDE_SONNET_4_6)
                .maxTokens(1024)
                .addTool(weatherTool)
                .addUserMessage("What's the weather in Tokyo?")
                .build()
        );

        // Handle tool call
        for (ContentBlock block : response.content()) {
            if (block.isToolUse()) {
                ToolUseBlock toolUse = block.asToolUse();
                String location = toolUse.input().get("location").asText();

                // Execute the tool
                String weatherResult = fetchWeather(location);

                // Second turn — send tool result back
                Message finalResponse = client.messages().create(
                    MessageCreateParams.builder()
                        .model(Model.CLAUDE_SONNET_4_6)
                        .maxTokens(1024)
                        .addTool(weatherTool)
                        .addUserMessage("What's the weather in Tokyo?")
                        .addAssistantMessage(response.content())
                        .addToolResult(toolUse.id(), weatherResult)
                        .build()
                );

                System.out.println(finalResponse.content().get(0).asText().text());
            }
        }
    }

    static String fetchWeather(String location) {
        // Real implementation calls a weather API
        return String.format("{\"location\": \"%s\", \"temperature\": 18, \"unit\": \"celsius\"}", location);
    }
}
```

---

## Async Client (CompletableFuture)

```java
import com.anthropic.client.AnthropicAsync;
import java.util.concurrent.CompletableFuture;

AnthropicAsync asyncClient = AnthropicAsync.builder()
    .apiKey(System.getenv("ANTHROPIC_API_KEY"))
    .build();

CompletableFuture<Message> future = asyncClient.messages().create(
    MessageCreateParams.builder()
        .model(Model.CLAUDE_HAIKU_4_5_20251001)
        .maxTokens(256)
        .addUserMessage("Ping")
        .build()
);

// Non-blocking — fires the request and moves on
future.thenAccept(msg -> System.out.println(msg.content().get(0).asText().text()))
      .exceptionally(ex -> { ex.printStackTrace(); return null; });
```

---

## Parallel Calls with Java 21 Virtual Threads

```java
import java.util.concurrent.Executors;
import java.util.List;

List<String> prompts = List.of(
    "Summarise RAG in one sentence.",
    "Summarise fine-tuning in one sentence.",
    "Summarise prompt engineering in one sentence."
);

// Virtual threads: 3 concurrent LLM calls without OS thread blocking
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<CompletableFuture<String>> futures = prompts.stream()
        .map(prompt -> CompletableFuture.supplyAsync(() -> {
            Message msg = client.messages().create(
                MessageCreateParams.builder()
                    .model(Model.CLAUDE_HAIKU_4_5_20251001)
                    .maxTokens(100)
                    .addUserMessage(prompt)
                    .build()
            );
            return msg.content().get(0).asText().text();
        }, executor))
        .toList();

    List<String> results = futures.stream()
        .map(CompletableFuture::join)
        .toList();

    results.forEach(System.out::println);
}
```

Three blocking SDK calls running in parallel on virtual threads. No CompletableFuture chaining, no async handlers, same performance.

---

## Prompt Caching

```java
Message cached = client.messages().create(
    MessageCreateParams.builder()
        .model(Model.CLAUDE_SONNET_4_6)
        .maxTokens(1024)
        .system(List.of(
            TextBlockParam.builder()
                .text(LONG_SYSTEM_PROMPT)  // cache this on first call
                .cacheControl(CacheControlEphemeral.builder().build())
                .build()
        ))
        .addUserMessage("What frameworks does this system support?")
        .build()
);

// On repeat calls with the same system prompt, cache hit saves ~90% of input tokens
CacheCreationInputTokens cache = cached.usage().cacheCreationInputTokens();
CacheReadInputTokens hit = cached.usage().cacheReadInputTokens();
```

Cache writes cost 25% extra; cache reads cost 10% of normal input token price. Break-even at ~2 repeated calls with the same prefix.

---

## Key Facts

- Package: `com.anthropic:anthropic-java` on Maven Central
- Requires Java 11 minimum; Java 21 virtual threads are the recommended concurrency model
- `Anthropic` (sync), `AnthropicAsync` (CompletableFuture), and streaming via `MessageStream`
- Tool use requires two round-trips: first call returns the tool call, second call sends the result
- Prompt caching: add `CacheControlEphemeral` to any `TextBlockParam`; 5-minute TTL
- `Model.CLAUDE_SONNET_4_6`, `Model.CLAUDE_HAIKU_4_5_20251001` — use enum constants, not raw strings

## Common Failure Cases

**`message.content().get(0).asText().text()` throws `ClassCastException` because the first content block is a tool-use block, not a text block**  
Why: when the model decides to call a tool, the first content block has type `tool_use`, not `text`; calling `asText()` on a tool-use block throws at runtime without a useful error message.  
Detect: the exception occurs only on prompts that trigger tool use; adding a `System.out.println(block.type())` before the cast reveals the actual block type.  
Fix: iterate over `response.content()` and check `block.isToolUse()` / `block.isText()` before casting; never assume index 0 is a text block when tools are defined on the request.

**`MessageStream` leaks a thread if `stream.getFinalMessage()` is called after `close()` because the stream was not consumed to completion**  
Why: `MessageStream` implements `AutoCloseable`; if the `try-with-resources` block exits before all stream events are consumed (e.g., an exception breaks out of `stream.textStream().forEach()`), the underlying HTTP connection is not fully drained; on repeated calls this can exhaust the connection pool.  
Detect: connection pool exhaustion under load; `netstat` shows persistent half-open connections to `api.anthropic.com`; the issue worsens with concurrent requests.  
Fix: always consume the stream to completion inside the `try-with-resources` block; wrap the `forEach` in a try/catch so exceptions are handled without exiting the stream prematurely.

**Prompt caching returns `cacheReadInputTokens = 0` on the second call because the cache TTL expired between requests**  
Why: Anthropic's prompt cache has a 5-minute TTL; if the second request arrives more than 5 minutes after the first, the cache entry is evicted and the system prompt is re-tokenised at full cost.  
Detect: `cached.usage().cacheReadInputTokens()` returns 0 on the second call even though the system prompt is identical; the `cacheCreationInputTokens` count is non-zero on both calls.  
Fix: prompt caching is only useful for high-frequency requests with the same system prompt (chat UIs, batch processing); for low-frequency calls the cache rarely hits; add `cacheCreationInputTokens` monitoring to verify hit rates in production.

**Virtual thread executor context is never closed, causing the thread pool to leak on repeated invocations**  
Why: `Executors.newVirtualThreadPerTaskExecutor()` returns an `ExecutorService`; calling it without `try-with-resources` or explicit `shutdown()` leaves virtual threads pending GC indefinitely; in a long-running service each batch call leaks the executor.  
Detect: heap memory grows proportionally to the number of parallel batch calls; `jstack` shows many virtual threads in parked state with no active work.  
Fix: always use the executor inside a `try-with-resources` block (`try (var executor = ...)`), which calls `close()` (= `shutdown()` + `awaitTermination`) automatically when the block exits.

## Connections

- [[java/langchain4j]] — higher-level framework on top of the API; use LangChain4j for full agent patterns
- [[java/spring-ai]] — Spring Boot integration; auto-configures using `application.yml` rather than the SDK directly
- [[apis/anthropic-api]] — the underlying API this SDK wraps; all features (batch, files, extended thinking) available
- [[java/grpc]] — when streaming across services; use gRPC transport between Java and Python inference services
## Open Questions

- How does this integrate with the broader JVM ecosystem in practice?
- What performance characteristics are not obvious from the API surface?
