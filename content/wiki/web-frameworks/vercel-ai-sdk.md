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

The standard library for building LLM-powered web applications. Works with any provider (Anthropic, OpenAI, Google, Mistral) through a unified interface. The main value is streaming UX — responses appear token-by-token without you writing SSE infrastructure.

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

The `streamText` interface is identical regardless of provider — swap models without changing application code.

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
