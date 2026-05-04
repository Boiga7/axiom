---
type: concept
category: javascript
para: resource
tags: [anthropic-sdk, vercel-ai-sdk, streaming, tool-use, typescript, llm-client, async-generators]
sources: []
updated: 2026-05-02
tldr: Two TypeScript SDK layers for LLM work — @anthropic-ai/sdk for direct Anthropic API access (streaming, tool use, prompt caching) and the Vercel AI SDK for unified multi-provider UI-connected streaming (streamText, generateObject, useChat).
---

# AI SDK Patterns in TypeScript

> **TL;DR** Use `@anthropic-ai/sdk` when you need direct control over the Anthropic API (tool use, prompt caching, fine-grained streaming). Use the Vercel AI SDK (`ai` package) when building Next.js apps that need streaming UI, multi-provider flexibility, or structured output with Zod schemas.

Two SDK layers serve different purposes:

| Layer | SDK | When to use |
|---|---|---|
| Direct API | `@anthropic-ai/sdk` | Full API access, tool use, caching, server-side scripts |
| UI + multi-provider | `ai` (Vercel AI SDK) | Next.js streaming UI, `useChat`, `generateObject`, provider switching |

Both can coexist. A common pattern: use Vercel AI SDK's `streamText` with the Anthropic provider in route handlers, and fall back to `@anthropic-ai/sdk` directly for complex tool use or prompt caching.

---

## @anthropic-ai/sdk

The official TypeScript SDK for the Anthropic API. Install:

```bash
pnpm add @anthropic-ai/sdk
```

### Client Setup

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Uses ANTHROPIC_API_KEY env var by default
const client = new Anthropic();

// Explicit config
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,             // auto-retry on 529/rate limit (default 2)
  timeout: 60_000,           // ms (default 10min — usually too long)
  defaultHeaders: {
    "anthropic-beta": "prompt-caching-2024-07-31",
  },
});
```

### Basic Message

```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: "You are a concise technical assistant.",
  messages: [
    { role: "user", content: "What is the difference between RAG and fine-tuning?" }
  ],
});

// Access the text content
const text = message.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");

console.log(text);
console.log(`Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
```

### Streaming

The SDK provides two streaming APIs:

**High-level: `.stream()` method (recommended)**

```typescript
async function streamResponse(prompt: string): Promise<void> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  // Stream text tokens as they arrive
  for await (const text of stream.textStream) {
    process.stdout.write(text);
  }

  // Get final usage stats after streaming completes
  const finalMessage = await stream.finalMessage();
  console.log(`\nUsage: ${finalMessage.usage.input_tokens + finalMessage.usage.output_tokens} tokens`);
}
```

**Low-level: raw Server-Sent Events**

```typescript
async function streamRaw(prompt: string): Promise<void> {
  const stream = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    stream: true,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    switch (event.type) {
      case "message_start":
        console.log("Started:", event.message.id);
        break;
      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          process.stdout.write(event.delta.text);
        }
        break;
      case "message_delta":
        console.log(`\nStop reason: ${event.delta.stop_reason}`);
        break;
      case "message_stop":
        console.log("Done");
        break;
    }
  }
}
```

### Tool Use (Function Calling)

Tool use is Anthropic's term for function calling. The model decides which tool to call; your code executes it.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

// Tool definitions
const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute file path to read",
        },
        encoding: {
          type: "string",
          enum: ["utf8", "base64"],
          description: "File encoding (default: utf8)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
];

// Tool implementations (typed with Zod)
const ReadFileInputSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

const WriteFileInputSchema = z.object({
  path: z.string(),
  content: z.string(),
});

async function executeTool(
  name: string,
  input: unknown
): Promise<string> {
  switch (name) {
    case "read_file": {
      const { path, encoding } = ReadFileInputSchema.parse(input);
      const { readFile } = await import("fs/promises");
      return readFile(path, encoding);
    }
    case "write_file": {
      const { path, content } = WriteFileInputSchema.parse(input);
      const { writeFile } = await import("fs/promises");
      await writeFile(path, content, "utf8");
      return "Written successfully";
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Agentic loop: run until the model stops calling tools
async function runAgent(
  userPrompt: string,
  maxTurns = 10
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Model is done — extract text from final response
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    }

    if (response.stop_reason === "tool_use") {
      // Execute all tool calls in this response
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((block): block is Anthropic.ToolUseBlock =>
            block.type === "tool_use"
          )
          .map(async (toolUse) => {
            try {
              const result = await executeTool(toolUse.name, toolUse.input);
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: result,
              };
            } catch (error) {
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                is_error: true,
              };
            }
          })
      );

      // Add tool results to history
      messages.push({ role: "user", content: toolResults });
    }
  }

  throw new Error(`Agent exceeded max turns (${maxTurns})`);
}
```

### Prompt Caching

Caching reduces cost and latency for repeated system prompts. The API charges 10% for cache reads vs full price for cache writes. Cache TTL: 5 minutes for ephemeral, 1 hour for durable (beta).

```typescript
const client = new Anthropic({
  defaultHeaders: { "anthropic-beta": "prompt-caching-2024-07-31" },
});

// Large system prompt — cache this
const systemPrompt = await readFile("./large-system-prompt.txt", "utf8");

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" }, // cache for 5 min
    },
  ],
  messages: [{ role: "user", content: "Summarise the key points." }],
});

console.log(
  `Cache: ${response.usage.cache_read_input_tokens ?? 0} read, ` +
  `${response.usage.cache_creation_input_tokens ?? 0} written`
);
```

---

## Vercel AI SDK (`ai` package)

The unified TypeScript SDK for building AI applications. Abstracts over 25+ providers behind a common interface.

```bash
pnpm add ai @ai-sdk/anthropic
```

### `streamText` — Core Primitive

```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Server-side (Node.js script, Next.js route handler)
const result = streamText({
  model: anthropic("claude-sonnet-4-6"),
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Explain transformers in 3 sentences." }],
  maxTokens: 512,
  temperature: 0.7,
});

// Stream to stdout
for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}

// Or get the full text after streaming
const fullText = await result.text;
const usage = await result.usage;
```

### `generateObject` — Structured Output with Zod

Generates JSON that is validated against a Zod schema. The AI SDK handles retries and coercion.

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const ClassificationSchema = z.object({
  intent: z.enum(["question", "command", "feedback", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  topics: z.array(z.string()).max(5),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

async function classifyMessage(message: string) {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"), // cheaper model for classification
    schema: ClassificationSchema,
    prompt: `Classify this user message:\n\n"${message}"`,
  });

  // object is fully typed: z.infer<typeof ClassificationSchema>
  return object;
}

const result = await classifyMessage("Your product is amazing, keep it up!");
console.log(result.intent);    // "feedback"
console.log(result.sentiment); // "positive"
```

**Partial schema streaming** — stream as it generates:

```typescript
import { streamObject } from "ai";

const { partialObjectStream } = streamObject({
  model: anthropic("claude-sonnet-4-6"),
  schema: ClassificationSchema,
  prompt: "Classify: ...",
});

for await (const partial of partialObjectStream) {
  // partial is a Partial<ClassificationSchema> — update UI progressively
  console.log(partial);
}
```

### Next.js Route Handler — Streaming API Endpoint

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: "You are a helpful coding assistant.",
    messages,
    maxTokens: 2048,
  });

  // toDataStreamResponse() formats the stream for the useChat hook
  return result.toDataStreamResponse();
}
```

### `useChat` — React Hook for Chat UIs

```typescript
// app/chat/page.tsx
"use client";

import { useChat } from "ai/react";

export default function ChatPage() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
  } = useChat({
    api: "/api/chat",
    onError: (err) => console.error("Chat error:", err),
  });

  return (
    <div>
      <div>
        {messages.map((m) => (
          <div key={m.id} data-role={m.role}>
            {m.role === "user" ? "You: " : "AI: "}
            {m.content}
          </div>
        ))}
      </div>

      {isLoading && (
        <button onClick={stop}>Stop generation</button>
      )}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>

      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Tool Use with Vercel AI SDK

```typescript
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const result = streamText({
  model: anthropic("claude-sonnet-4-6"),
  messages: [{ role: "user", content: "What is the weather in London?" }],
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location",
      parameters: z.object({
        city: z.string().describe("City name"),
        country: z.string().describe("Two-letter country code"),
      }),
      execute: async ({ city, country }) => {
        // Call your weather API
        return {
          temperature: 15,
          condition: "Partly cloudy",
          humidity: 72,
        };
      },
    }),
  },
  maxSteps: 5, // max tool call rounds before stopping
});

for await (const part of result.fullStream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.textDelta);
  } else if (part.type === "tool-call") {
    console.log(`\nCalling: ${part.toolName}`, part.args);
  } else if (part.type === "tool-result") {
    console.log(`Result:`, part.result);
  }
}
```

### Multi-Provider Switching

```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

type Provider = "anthropic" | "openai" | "google";

function getModel(provider: Provider) {
  switch (provider) {
    case "anthropic":
      return anthropic("claude-sonnet-4-6");
    case "openai":
      return openai("gpt-4o");
    case "google":
      return google("gemini-1.5-pro");
  }
}

async function callWithFallback(
  prompt: string,
  providers: Provider[] = ["anthropic", "openai"]
): Promise<string> {
  for (const provider of providers) {
    try {
      const result = streamText({
        model: getModel(provider),
        prompt,
        maxTokens: 1024,
      });
      return await result.text;
    } catch (error) {
      console.warn(`Provider ${provider} failed:`, error);
      if (provider === providers[providers.length - 1]) throw error;
    }
  }
  throw new Error("All providers failed");
}
```

---

## Error Handling Patterns

### @anthropic-ai/sdk Errors

```typescript
import Anthropic from "@anthropic-ai/sdk";

async function robustAPICall(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const { status, message } = error;

        if (status === 529 || status === 503) {
          // Overloaded — exponential backoff
          const delay = Math.min(1000 * 2 ** attempt + Math.random() * 1000, 30_000);
          console.warn(`Overloaded (${status}), retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (status === 400) {
          throw new Error(`Bad request: ${message}`); // no retry
        }

        if (status === 401) {
          throw new Error("Invalid API key"); // no retry
        }

        if (status === 429) {
          // Rate limited — check Retry-After header
          const retryAfter = (error.headers as Record<string, string>)?.["retry-after"];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5_000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw error; // unknown status — rethrow
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out");
      }

      throw error;
    }
  }
  throw new Error(`Failed after ${retries} attempts`);
}
```

### Streaming Error Recovery

```typescript
async function streamWithRecovery(prompt: string): Promise<string> {
  const chunks: string[] = [];

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const text of stream.textStream) {
      chunks.push(text);
    }

    return chunks.join("");
  } catch (error) {
    // If we have partial content, decide whether to return it or throw
    if (chunks.length > 0) {
      console.warn("Stream interrupted, returning partial content");
      return chunks.join("") + " [INCOMPLETE]";
    }
    throw error;
  }
}
```

---

## Type-Safe LLM Response Handling

The core pattern: never trust LLM output shapes at compile time without runtime validation.

```typescript
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

// Define your expected output shape
const ExtractedEntitySchema = z.object({
  name: z.string(),
  type: z.enum(["person", "organization", "location", "product"]),
  mentions: z.number().int().positive(),
});

const ExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  summary: z.string().max(500),
});

type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

async function extractEntities(text: string): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract named entities from the following text. Respond with JSON only, no explanation.

Text: ${text}

Required format:
{
  "entities": [{"name": "...", "type": "person|organization|location|product", "mentions": N}],
  "summary": "..."
}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in response");
  }

  // Strip markdown code fences if present
  const cleaned = textBlock.text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  // Runtime validation with Zod — throws ZodError with field-level details if wrong
  return ExtractionResultSchema.parse(rawJson);
}
```

---

## Key Facts

- `@anthropic-ai/sdk` v0.39+: `.messages.stream()` returns a high-level streaming object with `.textStream` async iterable and `.finalMessage()` awaitable
- Vercel AI SDK v4: `streamText().toDataStreamResponse()` is the standard way to connect a route handler to `useChat`
- `generateObject` does **not** retry automatically on invalid JSON — schema failures throw `AI_NoObjectGeneratedError` immediately. The built-in retry (2 retries, 3 total attempts) only covers network/HTTP errors. Wrap with a manual retry loop for schema validation failures.
- Tool use with `@anthropic-ai/sdk`: check `stop_reason === "tool_use"` and handle all `tool_use` blocks in the response before continuing
- Prompt caching requires the `anthropic-beta: prompt-caching-2024-07-31` header; cache TTL is 5 minutes for ephemeral
- Error status codes to handle: 400 (bad request, no retry), 401 (auth, no retry), 429 (rate limited, use Retry-After header), 529 (overloaded, exponential backoff)
- `Promise.all()` for parallel tool execution: when a response contains multiple tool calls, execute them concurrently
- The Vercel AI SDK's Anthropic provider wraps `@anthropic-ai/sdk` — you can use both in the same project

## Common Failure Cases

**Not checking `stop_reason` in the tool use loop**
Why: The loop adds tool results but never checks if the model returned `"end_turn"` — it sends extra unnecessary turns or infinite loops.
Detect: Requests continue past the model's final text response; extra API calls after `end_turn`.
Fix: Check `response.stop_reason` at the top of the loop. Break when `stop_reason === "end_turn"` or when no `tool_use` blocks are present.

**LLM returns JSON wrapped in markdown fences**
Why: Even with a JSON-only instruction, models sometimes wrap output in ` ```json ``` ` blocks.
Detect: `JSON.parse()` throws `SyntaxError: Unexpected token` on responses that look correct.
Fix: Strip code fences before parsing: `.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()`. Better: use `generateObject` from Vercel AI SDK which handles this automatically.

**Streaming a route handler without `toDataStreamResponse()`**
Why: Returning raw `ReadableStream` instead of the Vercel AI SDK formatted stream breaks `useChat` parsing.
Detect: The `useChat` hook receives garbled text or fails to parse message updates.
Fix: Use `result.toDataStreamResponse()` from `streamText` in route handlers connected to `useChat`. The data stream format is specific to the Vercel AI SDK protocol.

**Not handling partial content on stream interruption**
Why: Network errors can interrupt a stream midway. If not caught, the user sees nothing instead of what was generated.
Detect: Users report blank responses occasionally; network error logs correlating with empty UI.
Fix: Accumulate chunks, catch stream errors, and return partial content with an `[INCOMPLETE]` marker rather than swallowing the error silently.

**Constructing message history without trimming**
Why: LLM context windows are finite. An infinite chat history eventually hits `max_tokens` or the context limit.
Detect: `400 Bad Request` with message about context length; gradual response degradation as history grows.
Fix: Keep last N messages or use a sliding window. For production, implement context summarisation: summarise older turns into a single system context message.

## Connections

- [[javascript/javascript-hub]] — ecosystem overview
- [[javascript/typescript-fundamentals]] — typing LLM response shapes, Zod integration
- [[javascript/nodejs-async]] — async/await patterns, streaming with async iterables
- [[apis/anthropic-api]] — the HTTP API that @anthropic-ai/sdk wraps; prompt caching, batch API
- [[web-frameworks/vercel-ai-sdk]] — deep dive into Vercel AI SDK: middleware, multi-step, telemetry
- [[web-frameworks/nextjs]] — App Router route handlers, useChat integration
- [[protocols/tool-design]] — best practices for tool schema design

## Open Questions

- Does the Vercel AI SDK's `generateObject` retry mechanism interact correctly with Anthropic's rate limiting, or can retries compound into 429s?
- Is the 5-minute ephemeral cache TTL sufficient for typical production system prompts, or is the 1-hour durable cache (currently beta) necessary?
- When the Vercel AI SDK adds native streaming tool use to `useChat`, will it replace the current multi-step pattern?
