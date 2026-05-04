---
type: entity
category: ai-tools
para: resource
tags: [tavily, search-api, agents, rag, web-search]
sources: []
updated: 2026-05-01
tldr: Real-time web search API purpose-built for LLM agents and RAG pipelines. The de facto standard search tool in agent tutorials and production systems. Acquired by Nebius in February 2026.
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

## Common Failure Cases

**`search_depth="advanced"` returns results that still contain promotional or low-quality content because the query is too generic**  
Why: `advanced` depth performs deeper crawling and de-duplication but does not filter for content quality; broad queries (e.g., "LangGraph") return marketing pages, overview articles, and SEO-optimised content alongside substantive technical results.  
Detect: the agent cites Tavily results that contain only high-level summaries or promotional copy; the model's answer is superficial despite having search results available.  
Fix: make queries specific and technical (`"LangGraph conditional edges API 2025"` rather than `"LangGraph"`); use `include_domains=["docs.langchain.com", "github.com"]` to restrict results to trusted sources.

**Tavily Extract API returns empty content for a URL that is clearly accessible in a browser, because the page renders via JavaScript**  
Why: Tavily's Extract API fetches and parses static HTML; single-page applications and JavaScript-rendered pages serve an empty shell to the scraper, returning minimal or no content.  
Detect: `client.extract(urls=[url])["results"][0]["raw_content"]` is empty or contains only navigation elements; opening the URL in a browser shows rich content.  
Fix: for JS-rendered pages, use Playwright-based scraping instead of Tavily Extract; or search for a cached version, a documentation page, or a GitHub README that contains the same content in static HTML.

**Agent hits Tavily rate limits in a multi-step ReAct loop, causing `TavilyError: rate limit exceeded` mid-task**  
Why: a ReAct agent that searches on every thought step can issue 10-20 Tavily requests per complex task; the free tier allows 1,000 requests per month (~33 per day), which is exhausted quickly in development or testing loops.  
Detect: the error appears after several successful search steps; the error rate increases with task complexity; checking the Tavily dashboard shows API credit near zero.  
Fix: implement result caching at the tool level (cache by query string for 1 hour); add a search step budget (`max_searches = 5`) to the agent loop; upgrade to a paid tier for production use.

## Connections

- [[agents/react-pattern]] — Tavily is the canonical external tool in ReAct agent examples
- [[agents/langchain]] — TavilySearchResults is a first-class LangChain tool
- [[agents/langgraph]] — Tavily nodes are the standard web search integration in LangGraph graphs
- [[rag/pipeline]] — use Tavily's Extract API to pull fresh content into a RAG pipeline at query time
- [[agents/practical-agent-design]] — search tools are Type 2 (read-only external data)
## Open Questions

- What workflows does this tool handle poorly that its documentation does not mention?
- When does this tool choice become a constraint rather than an enabler?
