---
type: concept
category: web-frameworks
tags: [vercel, ai-sdk, streaming, useChat, streamText, tool-calling, next-js]
sources: []
updated: 2026-04-29
para: resource
tldr: Vercel AI SDK is the standard library for LLM-powered web apps — unified provider interface (Anthropic, OpenAI, Google), streaming primitives (streamText, useChat), and automatic tool-call cycles without SSE boilerplate.
---

# Vercel AI SDK

> **TL;DR** Vercel AI SDK is the standard library for LLM-powered web apps — unified provider interface (Anthropic, OpenAI, Google), streaming primitives (streamText, useChat), and automatic tool-call cycles without SSE boilerplate.

The standard library for building LLM-powered web applications. Works with any provider (Anthropic, OpenAI, Google, Mistral) through a unified interface. The main value is streaming UX. Responses appear token-by-token without you writing SSE infrastructure.

---

## Install

```bash
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai
```

---

## Core Primitives

### `streamText` — Server-Side Streaming

```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: 'You are a helpful assistant.',
    messages,
  })

  return result.toDataStreamResponse()
}
```

`toDataStreamResponse()` returns a streaming `Response` with the AI SDK's data stream protocol. The client-side hooks understand this format.

### `generateText` — Non-Streaming

```typescript
import { generateText } from 'ai'

const { text, usage } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  prompt: 'Summarise this document in 3 bullet points.',
})
console.log(`Tokens used: ${usage.totalTokens}`)
```

### `generateObject` — Structured Output

```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const { object } = await generateObject({
  model: anthropic('claude-sonnet-4-6'),
  schema: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
  }),
  prompt: `Analyse the sentiment of: "${userReview}"`,
})
// object is fully typed and validated
```

---

## Client-Side: `useChat`

```typescript
'use client'
import { useChat } from 'ai/react'

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => console.error(error),
  })

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  )
}
```

`useChat` manages message history, sends to your API route, and streams the response into `messages` as tokens arrive.

### `useCompletion` — Single-Turn Completion

```typescript
'use client'
import { useCompletion } from 'ai/react'

export function SummaryButton({ text }: { text: string }) {
  const { complete, completion, isLoading } = useCompletion({ api: '/api/summarise' })

  return (
    <>
      <button onClick={() => complete(text)} disabled={isLoading}>
        Summarise
      </button>
      {completion && <p>{completion}</p>}
    </>
  )
}
```

---

## Tool Calling

Tools are defined with Zod schemas; the SDK handles the tool-call → execute → result cycle automatically.

```typescript
import { streamText, tool } from 'ai'
import { z } from 'zod'

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  tools: {
    getWeather: tool({
      description: 'Get current weather for a location',
      parameters: z.object({
        location: z.string().describe('City name or coordinates'),
        unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
      }),
      execute: async ({ location, unit }) => {
        const weather = await fetchWeatherAPI(location, unit)
        return { temperature: weather.temp, condition: weather.condition }
      },
    }),
  },
  messages,
})
```

Set `maxSteps` to allow multi-step tool use (model calls tool → sees result → calls another tool):

```typescript
const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  tools: { getWeather, searchWeb, calculateRoute },
  maxSteps: 5,
  messages,
})
```

---

## Multi-Provider Setup

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

// Route by capability or cost
const model = useCase === 'reasoning'
  ? anthropic('claude-opus-4-7')
  : useCase === 'fast'
  ? anthropic('claude-haiku-4-5-20251001')
  : openai('gpt-4o')
```

The `streamText` interface is identical regardless of provider. Swap models without changing application code.

---

## Streaming with Custom Data

Send structured data alongside the text stream:

```typescript
import { streamText, createDataStreamResponse } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Send metadata immediately
      dataStream.writeData({ type: 'sources', sources: retrievedDocs })

      const result = streamText({
        model: anthropic('claude-sonnet-4-6'),
        messages,
      })
      result.mergeIntoDataStream(dataStream)
    },
  })
}
```

On the client, `useChat` exposes `data` alongside `messages`:

```typescript
const { messages, data } = useChat({ api: '/api/chat' })
const sources = data?.filter(d => d.type === 'sources').at(-1)?.sources
```

---

## Error Handling

```typescript
import { streamText } from 'ai'
import { APICallError } from 'ai'

try {
  const result = await streamText({ model, messages })
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk)
  }
} catch (error) {
  if (APICallError.isInstance(error)) {
    console.error(`API error ${error.statusCode}: ${error.message}`)
    // Retry logic, fallback model, etc.
  }
}
```

---

## Middleware

Add cross-cutting concerns (logging, caching, rate limiting) without changing route handlers:

```typescript
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai'

const modelWithReasoning = wrapLanguageModel({
  model: anthropic('claude-opus-4-7'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
})
```

---

## Key Facts

- Install: `pnpm add ai @ai-sdk/anthropic @ai-sdk/openai`
- Three server primitives: `streamText` (streaming), `generateText` (non-streaming), `generateObject` (structured/Zod)
- `toDataStreamResponse()` returns the streaming response; `useChat` on the client understands this protocol
- `maxSteps` in `streamText` enables multi-step tool-call cycles — model calls tool, sees result, calls next
- `createDataStreamResponse` + `dataStream.writeData()` sends structured metadata alongside the token stream
- `wrapLanguageModel` adds middleware (logging, caching, reasoning extraction) without changing route handlers
- `APICallError.isInstance(error)` is the typed check for provider errors in catch blocks

## Common Failure Cases

**`useChat` messages show `undefined` for tool call results because the tool response is not returned to `toDataStreamResponse`**  
Why: when a tool is defined in `streamText`, the tool's `execute` function must return a serialisable value; if it returns `undefined` or throws an unhandled error, the data stream protocol cannot include the tool result and `useChat` receives an incomplete message.  
Detect: messages in the `useChat` state show the tool call but no tool result; the UI stops updating mid-stream; adding `console.log` in `execute` shows the function threw an error.  
Fix: wrap `execute` in try/catch and return a structured error object on failure; never return `undefined` — return `{ error: "..." }` instead.

**`generateObject` fails with `NoObjectGeneratedError` because the Zod schema is too complex for the model to satisfy**  
Why: deeply nested Zod schemas with many optional fields and complex validation constraints require the model to produce very specific JSON; the model occasionally fails to satisfy all constraints in one generation, and without retries, `generateObject` throws.  
Detect: `NoObjectGeneratedError` in production logs; the error is intermittent — most requests succeed but 1-5% fail on complex schemas.  
Fix: set `mode: 'json'` on the model call if the provider supports JSON mode; simplify the schema by removing optional fields that are rarely needed; add retry logic with `maxRetries` on the `generateObject` call.

**`maxSteps` exceeded because a tool always returns data that triggers another tool call**  
Why: with `maxSteps: 5`, if each tool result causes the model to call another tool rather than generating a final text response, the cycle exhausts `maxSteps` and the generation ends without a complete response.  
Detect: streaming ends abruptly after exactly `maxSteps` tool calls with no final assistant text; the model's reasoning shows it expected to make another tool call.  
Fix: add a `finalize` tool that the model can call when it is ready to give the final answer; or instruct the model in the system prompt to provide a text summary after tool results rather than continuing to call tools.

**`useChat` sends the full conversation history on every request, causing token costs to grow unboundedly in long conversations**  
Why: `useChat` maintains the full `messages` array and sends all messages on every submit; a 50-turn conversation sends 50 messages worth of tokens on turn 51, causing costs and latency to grow linearly.  
Detect: LLM API costs per session grow with session length; the `messages` array passed to `streamText` on the server grows without bound.  
Fix: implement a message window on the server-side API route: `messages.slice(-20)` to keep only the last 20 messages; or add summarisation to compress older context.

## Connections

- [[web-frameworks/nextjs]] — App Router API routes and `useChat` hook integration
- [[apis/anthropic-api]] — `@ai-sdk/anthropic` wraps the Anthropic Messages API; prompt caching is supported
- [[agents/langgraph]] — when you need stateful agent loops, checkpointing, or HITL beyond what `useChat` provides
- [[protocols/tool-design]] — writing good tool descriptions; the same principles apply to AI SDK `tool()` definitions
- [[observability/platforms]] — logging token usage and latency from `generateText` usage via Langfuse

## Open Questions

- How does the Vercel AI SDK's data stream protocol compare to raw SSE for browser compatibility and debugging?
- At what `maxSteps` count do tool-call cycles in `streamText` become impractical — and what is the failure mode?
- Does `generateObject` with complex nested Zod schemas reliably validate at the same rate across Anthropic vs OpenAI models?
