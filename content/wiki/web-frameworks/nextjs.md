---
type: concept
category: web-frameworks
tags: [nextjs, react, app-router, server-components, streaming, vercel, typescript]
sources: []
updated: 2026-04-29
para: resource
tldr: Next.js App Router is the standard full-stack framework for AI web apps — Server Components keep API secrets server-side, Suspense enables token-by-token streaming UI, and the Vercel AI SDK provides first-class LLM streaming hooks.
---

# Next.js App Router

> **TL;DR** Next.js App Router is the standard full-stack framework for AI web apps — Server Components keep API secrets server-side, Suspense enables token-by-token streaming UI, and the Vercel AI SDK provides first-class LLM streaming hooks.

The standard frontend + API framework for AI web applications. Server Components, streaming UI, and the Vercel AI SDK make it the best full-stack choice for LLM-powered products.

---

## Why Next.js for AI Apps

- **Streaming UI** — `Suspense` + server streaming lets you show LLM output token-by-token
- **Server Components** — call AI APIs server-side without CORS or secret exposure
- **Server Actions** — forms that call AI without a separate API route
- **Vercel deployment** — zero-config deployment with edge functions, KV, Blob storage
- **Vercel AI SDK** — first-class streaming hooks (`useChat`, `useCompletion`)

---

## App Router Fundamentals

```
app/
  layout.tsx         # Root layout (persistent across navigation)
  page.tsx           # Home page (Server Component by default)
  chat/
    page.tsx         # /chat route
    loading.tsx      # Shown during Suspense boundary
  api/
    chat/
      route.ts       # API route (POST /api/chat)
```

**Server Component (default):** Runs on the server, has access to environment variables, can await promises directly.

**Client Component:** Add `"use client"` at top. Can use hooks, event handlers, browser APIs.

Rule: push as much as possible to Server Components. Only use Client Components for interactivity.

---

## Streaming LLM Output with Vercel AI SDK

The cleanest pattern for chat interfaces.

**API route (`app/api/chat/route.ts`):**
```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
    const { messages } = await req.json();
    
    const result = streamText({
        model: anthropic("claude-sonnet-4-6"),
        system: "You are a helpful assistant.",
        messages,
    });
    
    return result.toDataStreamResponse();
}
```

**Frontend (`app/chat/page.tsx`):**
```typescript
"use client";
import { useChat } from "ai/react";

export default function ChatPage() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
    
    return (
        <div>
            {messages.map(m => (
                <div key={m.id}>
                    <b>{m.role}:</b> {m.content}
                </div>
            ))}
            <form onSubmit={handleSubmit}>
                <input value={input} onChange={handleInputChange} disabled={isLoading} />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
}
```

`useChat` handles: SSE stream parsing, message state management, loading state, error handling. See [[web-frameworks/vercel-ai-sdk]].

---

## Server Actions

Forms that call server functions directly. No API route needed for simple mutations.

```typescript
// app/actions.ts
"use server";
import { anthropic } from "@ai-sdk/anthropic";

export async function summariseText(formData: FormData) {
    const text = formData.get("text") as string;
    const response = await anthropic("claude-haiku-4-5-20251001").messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: `Summarise: ${text}` }]
    });
    return response.content[0].text;
}

// app/summarise/page.tsx
import { summariseText } from "@/app/actions";

export default function SummarisePage() {
    return (
        <form action={summariseText}>
            <textarea name="text" />
            <button type="submit">Summarise</button>
        </form>
    );
}
```

---

## Caching and Data Fetching

React 19 introduces `use cache` for fine-grained caching of server functions:

```typescript
// Cache an expensive LLM call for 1 hour
export async function getPageSummary(url: string) {
    "use cache";
    // This result is cached per unique url argument
    const response = await fetchAndSummarise(url);
    return response;
}
```

For dynamic AI responses, you usually want NO caching. For static summaries, embeddings, or lookup tables. Caching makes sense.

---

## Environment Variables

```bash
# .env.local (never commit)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...

# .env (commit; non-secrets only)
NEXT_PUBLIC_APP_NAME="My AI App"  # NEXT_PUBLIC_ = exposed to browser
```

Access server-side: `process.env.ANTHROPIC_API_KEY`  
Access client-side: `process.env.NEXT_PUBLIC_APP_NAME` only

---

## Deployment on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Production deploy
vercel --prod
```

Vercel auto-detects Next.js. Serverless functions for API routes, Edge Runtime available for low-latency routes.

**Environment variables on Vercel:**
```bash
vercel env add ANTHROPIC_API_KEY production
```

---

## Middleware (Edge)

Runs before every request; execute at the CDN edge:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("token");
    if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
```

---

## Key Facts

- Server Components run on the server by default; add `"use client"` only for hooks, event handlers, or browser APIs
- `NEXT_PUBLIC_` prefix is required for environment variables accessible in the browser
- `use cache` (React 19) enables fine-grained per-function caching — avoid for dynamic LLM responses
- Middleware runs at the CDN edge before every request — use for auth guards and redirects, not heavy logic
- Vercel auto-detects Next.js; API routes deploy as serverless functions; edge runtime available for low-latency routes
- Server Actions (`"use server"`) allow forms to invoke server functions directly without a separate API route

## Common Failure Cases

**`ANTHROPIC_API_KEY` exposed to the browser because it was prefixed with `NEXT_PUBLIC_`**  
Why: `NEXT_PUBLIC_` variables are embedded in the client-side bundle; any variable with this prefix is visible to anyone who inspects the page source or network requests.  
Detect: `process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY` is accessible in browser DevTools console; the API key appears in the compiled JavaScript bundle.  
Fix: remove the `NEXT_PUBLIC_` prefix; access the key only in Server Components, API routes, or Server Actions where it stays on the server.

**Server Component accidentally triggers a client-side waterfall by importing a Client Component that fetches data**  
Why: a Server Component wrapping a Client Component that uses `useEffect` to fetch data creates a server-render → client-hydration → client-fetch waterfall; the data is not available until the third round trip.  
Detect: DevTools Network tab shows a fetch request fired from the client shortly after initial load; removing the client-side fetch and moving it to the Server Component eliminates the delay.  
Fix: fetch data in the Server Component and pass it as props to the Client Component; reserve client-side fetching for user-triggered interactions.

**Streaming response from `streamText` stops early because Vercel's serverless function timeout is exceeded**  
Why: Vercel serverless functions have a maximum execution timeout (10s on Hobby, 60s on Pro); a long LLM response that takes more than the timeout to generate is cut off mid-stream without an error.  
Detect: streaming responses for long generations end abruptly; the last token is mid-sentence; increasing `maxTokens` makes the problem worse.  
Fix: switch the API route to use Edge Runtime (`export const runtime = 'edge'`) which has no execution timeout; or reduce `max_tokens` to ensure the response completes within the serverless timeout.

**`use cache` caches an LLM response that should be dynamic, returning stale content to all users**  
Why: adding `"use cache"` to a Server Component or function caches the return value per argument combination; if a function that calls an LLM is inadvertently wrapped in `"use cache"`, all users get the first user's response.  
Detect: different users see identical LLM responses for different inputs; the cache key is the same for inputs that should produce different outputs.  
Fix: never apply `"use cache"` to functions that call LLMs for dynamic content; only cache truly static or slowly-changing data (product descriptions, static summaries).

## Connections

- [[web-frameworks/vercel-ai-sdk]] — the streaming SDK for AI UIs; `useChat` and `streamText` are the core Next.js AI primitives
- [[web-frameworks/fastapi]] — Python backend alternative when you need a dedicated AI microservice
- [[web-frameworks/django]] — Django when you need ORM, admin, or management commands alongside the frontend
- [[ai-tools/claude-code]] — building and iterating on Next.js apps with Claude Code as the agent
- [[apis/anthropic-api]] — called from App Router API routes and Server Actions for LLM responses
- [[infra/deployment]] — Vercel deployment specifics, edge functions, and environment variable management

## Open Questions

- How does Next.js 16 `use cache` interact with LLM streaming — can you cache partial streams or only completed responses?
- What are the cold-start latency characteristics of Next.js serverless API routes vs edge runtime for LLM proxy endpoints?
- When does co-locating the LLM API route in Next.js become a bottleneck versus a dedicated FastAPI microservice?
