---
type: entity
category: ai-tools
para: resource
tags: [tavily, search-api, agents, rag, web-search]
sources: []
updated: 2026-05-01
---

# Tavily

Real-time web search API purpose-built for LLM agents and RAG pipelines. The de facto standard search tool in agent tutorials and production systems. Acquired by Nebius in February 2026.

---

## What It Does

Tavily provides Search, Extract, Map, and Crawl APIs that return structured, LLM-ready results rather than raw HTML. Results are pre-processed into concise snippets optimised for context window consumption, reducing hallucination from noisy web content.

Requests pass through security, privacy, and content validation layers that block PII leakage, prompt injection attempts, and malicious sources before results reach the LLM.

---

## APIs

| API | Purpose |
|-----|---------|
| **Search** | Real-time web search returning ranked, summarised snippets |
| **Extract** | Clean text extraction from specific URLs |
| **Map** | Sitemap discovery — enumerate all URLs on a domain |
| **Crawl** | Structured crawl of a site with depth control |

---

## Integration

### Direct API

```python
from tavily import TavilyClient

client = TavilyClient(api_key="tvly-...")

results = client.search(
    query="LangGraph v1.0 release notes",
    search_depth="advanced",   # "basic" or "advanced"
    max_results=5,
    include_raw_content=False,  # True for full page text
)

for r in results["results"]:
    print(r["title"], r["url"])
    print(r["content"])   # LLM-ready snippet
```

### As a LangChain / LangGraph tool

```python
from langchain_community.tools.tavily_search import TavilySearchResults

search = TavilySearchResults(
    max_results=3,
    search_depth="advanced",
)

# Use directly
results = search.invoke("latest Flash Attention 2 benchmarks")

# Or bind to an agent
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

agent = create_react_agent(
    ChatAnthropic(model="claude-sonnet-4-6"),
    tools=[search],
)
```

### With OpenAI Agents SDK

```python
from agents import Agent, WebSearchTool
# OpenAI SDK wraps Tavily by default for web search
agent = Agent(tools=[WebSearchTool()])
```

---

## Pricing (as of 2026-05-01)

| Plan | Price | Searches/month |
|------|-------|----------------|
| Free | $0 | 1,000 |
| Researcher | $25/mo (annual) / $30/mo | ~5,000 |
| Startup | $83/mo (annual) / $100/mo | ~15,000 |
| Pay-as-you-go | $0.008/credit | — |

---

## vs Alternatives

| Tool | Strength | Weakness |
|------|----------|---------|
| **Tavily** | LLM-optimised output, agent ecosystem | Cost at scale |
| **Exa** | Semantic search, better for research | Less agent tooling |
| **Serper** | Cheap, Google results | Raw HTML, needs parsing |
| **SerpAPI** | Comprehensive SERP data | Most expensive |
| **Bing Search API** | Microsoft ecosystem | Generic, not LLM-optimised |

Tavily is the default recommendation for prototyping and moderate-scale production. Switch to Serper or a self-hosted option at high volume.

---

## Connections

- [[agents/react-pattern]] — Tavily is the canonical external tool in ReAct agent examples
- [[agents/langchain]] — TavilySearchResults is a first-class LangChain tool
- [[agents/langgraph]] — Tavily nodes are the standard web search integration in LangGraph graphs
- [[rag/pipeline]] — use Tavily's Extract API to pull fresh content into a RAG pipeline at query time
- [[agents/practical-agent-design]] — search tools are Type 2 (read-only external data)
