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

The most ergonomic API — define an interface and LangChain4j generates the implementation:

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

## Connections

- [[apis/anthropic-api]] — the underlying API LangChain4j calls for Claude models
- [[protocols/mcp]] — MCP Java SDK integrates MCP servers as LangChain4j tools
- [[infra/vector-stores]] — InMemoryEmbeddingStore for dev; Qdrant/pgvector for production
- [[rag/pipeline]] — Java-agnostic RAG concepts implemented by LangChain4j pipeline
- [[java/spring-ai]] — Spring Boot alternative; comparison on Spring integration and agent maturity

## Open Questions

- When will LangChain4j reach feature parity with Python LangChain on agentic patterns?
- How does LangChain4j's MCP Java SDK compare in capability to the TypeScript SDK?
- What is the performance overhead of LangChain4j's AI Services interface proxy vs direct model calls?
