---
type: concept
category: java
tags: [java, langchain4j, spring-ai, llm, mcp, rag, java-21]
sources: []
updated: 2026-04-29
para: resource
tldr: LangChain4j is the primary Java LLM framework — annotation-driven AI Services, tool calling, RAG pipeline, and MCP integration; Java 21 virtual threads make parallel LLM calls practical without async complexity.
---

# LangChain4j and Java AI Integration

> **TL;DR** LangChain4j is the primary Java LLM framework — annotation-driven AI Services, tool calling, RAG pipeline, and MCP integration; Java 21 virtual threads make parallel LLM calls practical without async complexity.

The Java ecosystem for building LLM-powered applications. LangChain4j is the primary framework; Spring AI provides Spring-native integration.

---

## LangChain4j

The most complete LLM framework for Java. Mirrors LangChain Python's abstractions but Java-idiomatic: interfaces, annotations, builders.

### Core Concepts

**ChatLanguageModel** — the LLM interface:
```java
ChatLanguageModel model = AnthropicChatModel.builder()
    .apiKey(System.getenv("ANTHROPIC_API_KEY"))
    .modelName("claude-sonnet-4-6")
    .maxTokens(1024)
    .build();

String response = model.generate("What is the capital of France?");
```

**StreamingChatLanguageModel** — streaming:
```java
StreamingChatLanguageModel streamingModel = AnthropicStreamingChatModel.builder()
    .apiKey(System.getenv("ANTHROPIC_API_KEY"))
    .modelName("claude-sonnet-4-6")
    .build();

streamingModel.generate("Tell me a story", new StreamingResponseHandler<AiMessage>() {
    @Override
    public void onNext(String token) { System.out.print(token); }
    @Override
    public void onComplete(Response<AiMessage> response) { System.out.println("\nDone"); }
    @Override
    public void onError(Throwable error) { error.printStackTrace(); }
});
```

### AI Services

The most ergonomic API. Define an interface and LangChain4j generates the implementation:

```java
interface AssistantService {
    @SystemMessage("You are a helpful customer support assistant.")
    String chat(@MemoryId String userId, @UserMessage String userMessage);
    
    @UserMessage("Summarise the following text in {{language}}: {{text}}")
    String summarise(String text, String language);
}

AssistantService assistant = AiServices.builder(AssistantService.class)
    .chatLanguageModel(model)
    .chatMemoryProvider(userId -> MessageWindowChatMemory.withMaxMessages(10))
    .build();

String response = assistant.chat("user123", "Hello, I have a billing question.");
```

### Tool Use (Function Calling)

```java
@Tool("Get the current weather for a location")
public String getCurrentWeather(@P("City name") String city) {
    return weatherService.getWeather(city);
}

// Register tools with the AI service
AssistantService assistant = AiServices.builder(AssistantService.class)
    .chatLanguageModel(model)
    .tools(new WeatherTools())
    .build();
```

### RAG Pipeline

```java
EmbeddingModel embeddingModel = new AllMiniLmL6V2EmbeddingModel();  // local
EmbeddingStore<TextSegment> store = new InMemoryEmbeddingStore<>();

// Ingest
EmbeddingStoreIngestor.ingest(
    Document.from("LangChain4j is a Java LLM framework..."),
    store
);

// Retrieve
EmbeddingStoreContentRetriever retriever = EmbeddingStoreContentRetriever.builder()
    .embeddingStore(store)
    .embeddingModel(embeddingModel)
    .maxResults(3)
    .build();

// Augment AI service with retrieval
AssistantService rag = AiServices.builder(AssistantService.class)
    .chatLanguageModel(model)
    .contentRetriever(retriever)
    .build();
```

### MCP Integration

LangChain4j has a Java MCP SDK:

```java
McpClient client = new McpClient.Builder()
    .transport(new StdioMcpTransport("python", "-m", "my_mcp_server"))
    .build();
client.initialize();

// Use MCP tools as LangChain4j tools
List<ToolSpecification> mcpTools = client.listTools();
```

---

## Spring AI

Spring Boot integration for LLM applications. Follows Spring conventions: auto-configuration, `@Autowired`, application.properties configuration.

```java
@SpringBootApplication
public class AiApplication {
    @Autowired
    private ChatClient chatClient;  // Auto-configured from properties

    public String chat(String message) {
        return chatClient.prompt()
            .user(message)
            .call()
            .content();
    }
}
```

```properties
# application.properties
spring.ai.anthropic.api-key=${ANTHROPIC_API_KEY}
spring.ai.anthropic.chat.options.model=claude-sonnet-4-6
spring.ai.anthropic.chat.options.max-tokens=1024
```

**VectorStore** — Spring AI abstraction over vector stores (pgvector, Weaviate, Pinecone, etc.):
```java
@Autowired
VectorStore vectorStore;

vectorStore.add(List.of(new Document("content here", Map.of("source", "docs.pdf"))));
List<Document> results = vectorStore.similaritySearch("query text");
```

**When to use Spring AI vs LangChain4j:**
- Existing Spring Boot project: Spring AI (natural fit)
- New Java project, need full LLM framework: LangChain4j
- Need MCP, advanced agent patterns, RAG pipeline: LangChain4j

---

## Java 21 Features for AI Workloads

**Virtual Threads (Project Loom):**
```java
// Run multiple LLM calls without blocking OS threads
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var futures = List.of("question 1", "question 2", "question 3").stream()
        .map(q -> executor.submit(() -> model.generate(q)))
        .toList();
    // All 3 calls run in parallel on virtual threads
}
```

Virtual threads make synchronous LLM calls non-blocking without async/CompletableFuture complexity. Excellent for parallelising multiple LLM calls.

**Pattern Matching:**
```java
sealed interface LLMResult permits SuccessResult, ErrorResult {}
record SuccessResult(String text, int tokens) implements LLMResult {}
record ErrorResult(String message, int statusCode) implements LLMResult {}

String display = switch (result) {
    case SuccessResult(String text, int tokens) -> "OK: " + text;
    case ErrorResult(String message, int code) -> "Error " + code + ": " + message;
};
```

---

## Build: Gradle with Kotlin DSL

```kotlin
// build.gradle.kts
dependencies {
    implementation("dev.langchain4j:langchain4j-anthropic:0.36.0")
    implementation("dev.langchain4j:langchain4j-embeddings-all-minilm-l6-v2-q:0.36.0")
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
}
```

---

## Key Facts

- LangChain4j v0.36.0 (latest as of 2026-04-29)
- AI Services: define an interface, LangChain4j generates the implementation automatically
- `@MemoryId` annotation on method param enables per-user conversation memory
- `MessageWindowChatMemory.withMaxMessages(10)` keeps last N messages per user
- MCP Java SDK: `StdioMcpTransport` for subprocess MCP servers
- Java 21 virtual threads: `Executors.newVirtualThreadPerTaskExecutor()` parallelises LLM calls without blocking OS threads
- Spring AI: use for existing Spring Boot projects; LangChain4j for standalone or richer agent capabilities

## Common Failure Cases

**`AiServices.builder(AssistantService.class)` throws at runtime because the interface method return type is not supported by LangChain4j's proxy**  
Why: LangChain4j's AI Services proxy supports a limited set of return types (`String`, `AiMessage`, extracted POJO via `@ExtractWith`); returning a custom class without a registered extractor causes an `UnsupportedReturnTypeException` that only appears at invocation time, not at build time.  
Detect: the `AiServices.builder(...).build()` call succeeds but the first method invocation throws `UnsupportedReturnTypeException`; adding print statements confirms the proxy was created successfully.  
Fix: either return `String` and parse the JSON manually, or annotate the method with `@ExtractWith(MyClass.class)` and ensure `MyClass` has a no-args constructor and public fields that match the model's JSON output.

**Chat memory leaks across users because `@MemoryId` is on the wrong parameter or the `chatMemoryProvider` is not configured**  
Why: if `chatMemoryProvider` is omitted from `AiServices.builder()`, LangChain4j uses a single shared in-memory store for all calls; every user's conversation history is merged into one shared context window, causing cross-user data leakage.  
Detect: conversation history from user A appears in user B's responses; removing the `@MemoryId` annotation and using a constant ID reproduces the single-shared-memory behaviour.  
Fix: always configure `chatMemoryProvider(userId -> MessageWindowChatMemory.withMaxMessages(20))` when using `@MemoryId`; verify isolation by calling the service with two different user IDs in a test and confirming separate history.

**MCP `StdioMcpTransport` subprocess fails silently when the Python MCP server prints to stderr before the JSON handshake**  
Why: the stdio transport reads JSON-RPC messages from the subprocess's stdout; any non-JSON output on stdout (debug prints, import warnings) before the handshake breaks the protocol parser; stderr output is discarded silently.  
Detect: `client.initialize()` hangs or throws a JSON parse exception; adding `python -W ignore` or checking the server's startup sequence reveals non-JSON output on stdout.  
Fix: ensure the MCP server writes only valid JSON-RPC to stdout; redirect all debug/log output to stderr or a log file; run the server manually and pipe its output through `jq .` to verify the first bytes are valid JSON.

**`EmbeddingStoreIngestor.ingest()` creates duplicate embeddings on repeated ingestion because the store has no deduplication**  
Why: `InMemoryEmbeddingStore` and most vector store implementations do not deduplicate on insert; calling `ingest()` twice with the same documents doubles the stored vectors, causing search results to return duplicate chunks with inflated similarity scores.  
Detect: search results show identical content chunks appearing multiple times; the embedding store size doubles with each ingest run; cosine similarity scores are correct but the same text appears twice.  
Fix: either clear the store before re-ingestion, or track ingested document IDs and skip already-present documents; for production stores, use a content-hash as the vector ID to enforce deduplication at the store level.

## Connections

- [[apis/anthropic-api]] — the underlying API LangChain4j calls for Claude models
- [[protocols/mcp]] — MCP Java SDK integrates MCP servers as LangChain4j tools
- [[infra/vector-stores]] — InMemoryEmbeddingStore for dev; Qdrant/pgvector for production
- [[rag/pipeline]] — Java-agnostic RAG concepts implemented by LangChain4j pipeline
- [[java/spring-ai]] — Spring Boot alternative; comparison on Spring integration and agent maturity
- [[java/build-tools]] — Maven and Gradle setup for LangChain4j projects, including the `langchain4j-bom` BOM
- [[java/what-is-java]] — JVM fundamentals, virtual threads, static typing — context for why Java in AI

## Open Questions

- When will LangChain4j reach feature parity with Python LangChain on agentic patterns?
- How does LangChain4j's MCP Java SDK compare in capability to the TypeScript SDK?
- What is the performance overhead of LangChain4j's AI Services interface proxy vs direct model calls?
