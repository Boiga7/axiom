---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: Ranked knowledge gaps relative to active projects. Top critical gap is JavaScript/TypeScript — entire section missing despite being the dominant AI engineering frontend/backend language alongside Python.
updated: 2026-05-02
---

# Knowledge Gap Report — 2026-05-02

> **TL;DR** Ranked knowledge gaps relative to active projects. Top critical gap is JavaScript/TypeScript — entire section missing despite being the dominant AI engineering frontend/backend language alongside Python.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for eval regression comments. Phase: Distribution. Wiki coverage: comprehensive.
- **mcpindex**: CLI + public scorecard directory for MCP server security scanning. Phase: Weekend 2. Wiki coverage: excellent.

## Critical Gaps (blocks active project)

### 1. JavaScript / TypeScript ecosystem
The vault covers Python in depth but has zero dedicated coverage of JavaScript/TypeScript — the second most-used language in AI engineering (Node.js backends, Next.js frontends, TypeScript SDK clients, npm/pnpm tooling). The Vercel AI SDK, @anthropic-ai/sdk, and all Next.js AI patterns live in the JS/TS ecosystem. The axiom website itself is TypeScript. This is a structural gap.

### 2. OpenAI Agents SDK
Released early 2025, the OpenAI Agents SDK competes directly with LangGraph on production multi-agent workloads. The vault has strong LangGraph coverage but no standalone page for the OpenAI Agents SDK. Both evalcheck and mcpindex use agent patterns — a comparison page would directly serve active projects.

## Concept Gaps (mentioned, no page)

### 1. TypeScript type system deep dive
Type narrowing, conditional types, mapped types, `satisfies` operator, `as const` patterns — the TypeScript-specific patterns that make AI SDK client code safe. Mentioned throughout web-frameworks/nextjs but no dedicated page.

### 2. Node.js runtime and event loop
Node.js event loop, libuv, async I/O model, streams — the runtime underpinning Next.js and all JS AI backends. Mentioned implicitly in web-frameworks pages but never explained.

### 3. npm / pnpm package ecosystem
Package management in the JS/TS world (pnpm workspaces, package.json scripts, lockfiles, semantic versioning, npm publishing). The Python equivalent (uv, pyproject.toml) is covered but the JS side is not.

## Suggested Ingest Queue (ranked)

1. JavaScript/TypeScript ecosystem hub (critical — structural gap)
2. Node.js runtime and async patterns (critical — JS backend foundation)
3. TypeScript type system (concept gap — AI SDK safety)
4. OpenAI Agents SDK vs LangGraph comparison (critical — agent architecture)
5. npm/pnpm ecosystem (concept gap — JS tooling)

## Resolved Gaps (this sprint — 2026-05-02)

| Gap | Page Written |
|---|---|
| LiteLLM | [[infra/litellm]] |
| Strands Agents SDK | [[agents/strands-agents-sdk]] |
| nosql-databases | [[cs-fundamentals/nosql-databases]] |
| cicd-pipelines | [[cs-fundamentals/cicd-pipelines]] |
| annotation-tooling | [[data/annotation-tooling]] |
| aws-bedrock | [[apis/aws-bedrock]] |
| mcp-server-development | [[agents/mcp-server-development]] |

## Connections

- [[para/projects]] — source of active project context
- [[index]] — coverage map source

## Open Questions

- Should JavaScript/TypeScript get its own `javascript/` directory or live under `web-frameworks/`?
- Is the OpenAI Agents SDK gap urgent enough to pause JavaScript research?
