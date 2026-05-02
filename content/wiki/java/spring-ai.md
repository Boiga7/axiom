---
type: entity
category: java
tags: [spring-ai, java, spring-boot, llm, rag, function-calling, embeddings]
sources: []
updated: 2026-04-29
para: resource
tldr: Spring AI is the official Spring Boot LLM integration — auto-configured ChatClient, Advisors for RAG and memory, pgvector store, and function calling via Spring beans; the natural choice for teams already on Spring Boot.
---

# Spring AI

> **TL;DR** Spring AI is the official Spring Boot LLM integration — auto-configured ChatClient, Advisors for RAG and memory, pgvector store, and function calling via Spring beans; the natural choice for teams already on Spring Boot.

Spring Boot's official AI integration framework. If your team is already on Spring Boot, Spring AI is the natural choice. It follows Spring conventions (auto-configuration, dependency injection, application.properties) and integrates with the broader Spring ecosystem (Spring Data, Spring Security, Spring Web).

Spring AI vs LangChain4j: Spring AI is better for teams already on Spring Boot; LangChain4j is better for teams that want richer agent capabilities or a standalone library. See [[java/langchain4j]] for comparison.

---

## Dependencies

```xml
<!-- pom.xml — Spring Boot 3.3+ required -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>1.0.0</version>  <!-- check for latest -->
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <!-- Anthropic -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-anthropic-spring-boot-starter</artifactId>
  </dependency>

  <!-- OpenAI -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
  </dependency>

  <!-- Vector store (pgvector) -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
  </dependency>
</dependencies>
```

---

## Configuration

```yaml
# application.yml
spring:
  ai:
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
      chat:
        options:
          model: claude-sonnet-4-6
          max-tokens: 1024
    openai:
      api-key: ${OPENAI_API_KEY}
      embedding:
        options:
          model: text-embedding-3-large
```

Spring AI reads these at startup and auto-configures `ChatClient` and `EmbeddingModel` beans.

---

## ChatClient: Basic Conversation

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {

    private final ChatClient chatClient;

    // Spring injects ChatClient automatically
    public AssistantService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultSystem("You are a helpful assistant for a Java developer.")
            .build();
    }

    public String ask(String question) {
        return chatClient.prompt()
            .user(question)
            .call()
            .content();
    }

    // Streaming response
    public Flux<String> stream(String question) {
        return chatClient.prompt()
            .user(question)
            .stream()
            .content();
    }
}
```

---

## Structured Output

Map model responses to Java records/classes:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;

public record SentimentAnalysis(
    String sentiment,      // "positive", "negative", "neutral"
    double confidence,
    String reasoning
) {}

@Service
public class SentimentService {

    private final ChatClient chatClient;

    public SentimentAnalysis analyse(String text) {
        return chatClient.prompt()
            .user(u -> u.text("Analyse the sentiment of: {text}")
                        .param("text", text))
            .call()
            .entity(SentimentAnalysis.class);
    }
}
```

Spring AI uses the class structure to generate the JSON schema and parses the response.

---

## Function Calling

```java
import org.springframework.ai.model.function.FunctionCallback;
import org.springframework.context.annotation.Bean;

// Define the function as a Spring bean
@Bean
public FunctionCallback weatherFunction() {
    return FunctionCallback.builder()
        .function("getCurrentWeather", (WeatherRequest req) -> {
            // Execute the actual weather lookup
            return weatherService.getWeather(req.location(), req.unit());
        })
        .description("Get the current weather for a given location. " +
                      "Use Celsius for European locations, Fahrenheit for US.")
        .inputType(WeatherRequest.class)
        .build();
}

public record WeatherRequest(String location, String unit) {}

// Use in chat
public String chatWithWeather(String message) {
    return chatClient.prompt()
        .user(message)
        .functions("getCurrentWeather")  // enable the function
        .call()
        .content();
}
```

Spring AI handles the full tool-call cycle: sends definition, receives call, executes bean, returns result.

---

## RAG Pipeline

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.SearchRequest;

@Service
public class DocumentService {

    private final VectorStore vectorStore;
    private final EmbeddingModel embeddingModel;

    // Ingest documents
    public void ingest(Resource pdfResource) {
        var reader = new PagePdfDocumentReader(pdfResource);
        var splitter = new TokenTextSplitter(512, 50, 5, 10_000, true);
        
        List<Document> docs = splitter.apply(reader.get());
        vectorStore.add(docs);  // auto-embeds and stores
    }

    // Search
    public List<Document> search(String query, int topK) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query).withTopK(topK)
        );
    }
}

// Full RAG chat
@Service  
public class RagService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;

    public String answer(String question) {
        List<Document> context = vectorStore.similaritySearch(
            SearchRequest.query(question).withTopK(5)
        );

        String contextText = context.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\n\n"));

        return chatClient.prompt()
            .system("""
                Answer using only the provided context.
                If the answer isn't in the context, say so.
                Context: {context}
                """)
            .user(question)
            .param("context", contextText)
            .call()
            .content();
    }
}
```

---

## pgvector Configuration

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: password
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 1536     # match your embedding model output
```

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Spring AI creates the table automatically on startup
```

---

## Advisors: Middleware for ChatClient

Advisors intercept the request/response pipeline. The `QuestionAnswerAdvisor` does RAG automatically:

```java
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemory;

ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(
        new MessageChatMemoryAdvisor(new InMemoryChatMemory()),  // conversation memory
        new QuestionAnswerAdvisor(vectorStore, SearchRequest.defaults()),  // auto-RAG
    )
    .build();

// Now every call automatically retrieves context and maintains history
String response = chatClient.prompt()
    .user("What does our SLA say about uptime?")
    .call()
    .content();
```

---

## Spring AI vs LangChain4j

| Feature | Spring AI | LangChain4j |
|---|---|---|
| Spring Boot integration | Native | Manual config |
| Auto-configuration | Yes | No |
| Agent / ReAct loop | Basic | Mature |
| Tool calling | Yes (Bean-based) | Yes (@Tool annotation) |
| RAG | Yes (Advisor) | Yes (pipeline) |
| Memory | InMemory only (v1.0) | Multiple backends |
| Streaming | Reactor Flux | Completable/Flux |
| Best for | Spring Boot teams | Standalone Java AI apps |

---

## Key Facts

- Spring Boot 3.3+ required for Spring AI 1.0.0
- Auto-configures `ChatClient` and `EmbeddingModel` beans from `application.yml`
- `QuestionAnswerAdvisor` handles full RAG retrieval automatically per request
- `MessageChatMemoryAdvisor` maintains conversation history (InMemory only in v1.0)
- pgvector config: set `dimensions` to match your embedding model output (1536 for text-embedding-3-large)
- Function calling: define as a Spring `@Bean`, enable by function name in `.functions("name")`
- Spring AI streams via Reactor `Flux<String>` — integrates with Spring WebFlux naturally

## Common Failure Cases

**`ChatClient.Builder` is autowired but the bean is absent because the `spring-ai-anthropic-spring-boot-starter` is missing from the classpath**  
Why: Spring AI auto-configuration only activates when the provider-specific starter is on the classpath; importing only `spring-ai-core` without a provider starter creates no `ChatModel` bean, causing `NoSuchBeanDefinitionException` for `ChatClient.Builder` at startup.  
Detect: the application fails at startup with `No qualifying bean of type 'org.springframework.ai.chat.client.ChatClient$Builder' available`; `spring.ai.anthropic.api-key` is set correctly but ignored.  
Fix: add `spring-ai-anthropic-spring-boot-starter` to dependencies (not just `spring-ai-core`); verify with `mvn dependency:tree` that the starter artifact is present.

**`vectorStore.add(docs)` silently succeeds but no vectors are stored because the pgvector extension is not installed on the database**  
Why: Spring AI's pgvector store auto-creates the `vector_store` table on startup but does not verify that the `vector` PostgreSQL extension is installed; if it is absent, `CREATE TABLE ... USING vector` fails silently in some configurations, or the table is created without the vector column.  
Detect: `vectorStore.similaritySearch("query")` returns an empty list even after ingestion; inspecting the database shows the `vector_store` table exists but the `embedding` column is missing or has `text` type instead of `vector`.  
Fix: run `CREATE EXTENSION IF NOT EXISTS vector;` on the database before starting the application; add this to your migration scripts or database setup documentation.

**`QuestionAnswerAdvisor` injects retrieved context that exceeds the model's context window, causing a 400 error on long conversations**  
Why: the advisor retrieves `topK` documents per request and prepends them to the system message; combined with `MessageChatMemoryAdvisor` maintaining a growing conversation history, the total tokens can exceed the model's input limit on longer sessions.  
Detect: requests fail with a 400 response from the Anthropic API indicating `prompt is too long`; the failure starts appearing after several conversation turns; the same prompt works on a fresh conversation.  
Fix: set a lower `topK` value (3 instead of 5); reduce `MessageWindowChatMemory.withMaxMessages()` to limit history size; or implement a summarisation step that compresses old history when the window fills.

**Function calling fails with `IllegalArgumentException` because the `@Bean` name and the `.functions("name")` reference do not match**  
Why: Spring AI registers function callbacks by the bean name; if the bean name is inferred from the method name (camelCase) but `.functions()` is called with a different string (e.g., `"get_current_weather"` vs `"getCurrentWeather"`), the function is not found and the model either ignores it or the SDK throws.  
Detect: the model does not call the function even on prompts that clearly require it; enabling Spring AI debug logging shows the function is not registered under the expected name.  
Fix: explicitly name the bean with `@Bean("getCurrentWeather")` and ensure the `.functions("getCurrentWeather")` call uses the exact same string; or use the `FunctionCallback.builder().name("exact-name")` to set the name explicitly.

## Connections

- [[java/langchain4j]] — alternative with richer agent patterns and MCP support; comparison in this file
- [[infra/vector-stores]] — pgvector, Weaviate, Pinecone all have Spring AI starters
- [[rag/pipeline]] — RAG concepts Spring AI implements via Advisors
- [[apis/anthropic-api]] — Anthropic API underlying the Spring AI Anthropic client

## Open Questions

- When will Spring AI add persistent chat memory backends (Redis, PostgreSQL) beyond InMemoryChatMemory?
- How does Spring AI's Advisor model compare to LangChain4j's pipeline for complex multi-step RAG?
- What is the migration path from Spring AI 0.x to 1.0 for existing production applications?
