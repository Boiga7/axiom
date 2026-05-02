---
type: synthesis
category: synthesis
para: resource
tags: [system-design, architecture, decision-making, senior-engineering, tradeoffs]
tldr: The decisions that separate senior engineers — when to cache, when to use RAG vs fine-tuning, when to scale up vs out, when to accept inconsistency.
updated: 2026-05-02
---

# Engineering Tradeoffs

Knowing how each technology works is junior-level. Knowing when to use which technology, and what you are accepting in return, is what makes someone senior. These decisions recur constantly and rarely have single right answers. They have frameworks.

## Cache vs Recompute

**Cache when:**
- Computation is expensive (slow DB query, LLM call, external API)
- The same result is requested more than once
- Staleness is acceptable for your use case
- Cache hit rate will be high enough to justify the complexity

**Do not cache when:**
- Data changes so frequently that cache is always stale
- Cache invalidation is complex enough to introduce bugs
- The query is too varied to have a useful hit rate
- You are hiding a performance problem that should be fixed at the source

**What you are accepting:** Cache adds a consistency hazard. A write that invalidates the cache incorrectly leaves stale data. A cache stampede (many simultaneous misses) can overload the origin. Cache is complexity: you now have two places the data lives.

**Cost of getting it wrong:** Serving stale data silently is hard to detect. Cache stampede takes down the origin. The operational overhead of invalidation logic is routinely underestimated.

## RAG vs Fine-Tuning vs Prompting

Start here: most teams should not fine-tune. Work through this decision in order.

**Prompting first.** If a well-crafted prompt with examples gets you to 80% of the target quality, stop. The operational cost of fine-tuning and serving a custom model rarely pays off for 20% improvement.

**RAG when:**
- The knowledge changes frequently (news, product data, user documents)
- The knowledge is too large to fit in the context window
- You need citations back to source documents
- Domain-specific facts must be exact (not hallucinated)

**Fine-tuning when:**
- You need a specific output format or style that prompting cannot reliably produce
- You have hit a quality ceiling with prompting + RAG
- Latency at inference time must be minimal (no retrieval round trip)
- You have sufficient labelled examples (typically 1,000+)

**What you are accepting with fine-tuning:** Training cost, serving infrastructure, a model that goes stale as the base model improves, and the risk of overfitting to your training distribution. The fine-tuned model does not automatically benefit from Claude 4 → Claude 5 improvements.

## Scale Up vs Scale Out

**Scale up (vertical):** Larger instance, more CPU, more RAM.
- Simple: no application changes needed
- Appropriate for: stateful workloads (DB primary), workloads with shared in-process state, single-threaded bottlenecks where more CPUs help
- Ceiling: you eventually hit the largest available machine
- Cost profile: linear or super-linear at the high end

**Scale out (horizontal):** More instances, same size.
- Requires stateless application design
- Appropriate for: HTTP services, workers, read replicas
- No ceiling: add instances without limit
- Cost profile: linear; enables auto-scaling

**Reality:** Most production systems need both. The DB scales up (write path), the application layer scales out (request handling), and caching reduces load on both.

**The hidden cost of scale out:** Consistency. When you have ten instances, shared in-process state (caches, sessions, rate limit counters) is wrong unless externalised to Redis. Every time you scale out, check: "Is anything in this service that should not be per-instance?"

## Consistency vs Availability

The CAP theorem says a distributed system cannot guarantee both consistency and availability during a partition. Most systems that claim "strong consistency" actually accept brief windows of eventual consistency to maintain availability.

**Choose strong consistency when:**
- Correctness errors are business-critical (financial transactions, inventory deduction, permissions)
- Users will notice and act on stale data immediately
- Compensating for an inconsistency is expensive

**Accept eventual consistency when:**
- Stale data is cosmetic (follower counts, recommendation scores, search indexes)
- The user would not notice a 1–5 second lag
- High availability is more important than exactness

**What "eventual" actually means:** No time bound unless explicitly defined. An event queue with a lagging consumer might be consistent within 100 ms or within 10 minutes depending on consumer health. Design for the worst case, not the median.

## Synchronous vs Asynchronous

**Synchronous:** Caller waits for result. Simple error handling, immediate feedback, tight coupling.

**Asynchronous:** Work is queued; caller gets acknowledgment, not result. Decouples producer from consumer, tolerates backpressure, enables retries, but complicates error handling and observability.

**Use async when:**
- The operation takes longer than a user will wait (email send, report generation, ML inference)
- The downstream service needs rate limiting (don't DoS a third-party API)
- You need to tolerate downstream unavailability without failing the caller
- Work needs to be retried safely without the caller being involved

**Pattern:** Synchronous acknowledgment + asynchronous processing. The API returns `202 Accepted` with a job ID immediately. The client polls or subscribes to a webhook. This gives the caller immediate feedback while decoupling the actual work.

## Build vs Buy vs Managed Service

**Buy / use managed service when:**
- This is not your core differentiator
- The operational cost (on-call, upgrades, disaster recovery) exceeds the build cost
- You need it now, not in three months

**Build when:**
- Deep customisation is required that no off-the-shelf option provides
- Cost at scale makes managed pricing prohibitive
- Vendor lock-in risk is unacceptable for a critical dependency
- You have the expertise to maintain it properly

**The managed service trap:** The first year of a managed service is cheap. Year three, when you are deeply integrated, pricing changes or the service is deprecated. Evaluate switching cost before committing.

## Cost vs Latency (AI-specific)

AI inference is expensive. The cost-latency frontier is a key design decision.

**Model routing:** Use a cheap, fast model (Claude Haiku, GPT-4o-mini) for classification, extraction, and simple generation. Reserve the expensive model for complex reasoning. A two-tier router that scores query complexity can reduce cost by 60–80% with minimal quality loss.

**Prompt caching:** Anthropic's cache_control allows caching the system prompt and repeated context across requests. For a 10,000-token system prompt called 1,000 times per day, caching reduces that cost by ~90%.

**Bad RAG chunking doubles your token cost.** If chunks are too large, irrelevant context fills the window. If they are too small, you need more chunks to answer the question. The optimal chunk size depends on your document structure and query patterns — measure it.

**Streaming reduces perceived latency, not actual latency.** A 10-second response feels faster when tokens arrive after 200 ms. It does not reduce the compute cost or the time-to-completion.

## Connections

- [[synthesis/request-flow-anatomy]] — where each tradeoff manifests in a live request
- [[cs-fundamentals/caching-strategies]] — cache implementation details
- [[rag/pipeline]] — RAG architecture and when it applies
- [[fine-tuning/lora-qlora]] — fine-tuning cost and process
- [[cs-fundamentals/distributed-systems]] — consistency models in practice
- [[cs-fundamentals/error-handling-patterns]] — async error handling patterns
- [[cloud/finops-cost-management]] — infrastructure cost tradeoffs
- [[observability/langfuse]] — measuring AI cost in production
- [[llms/hallucination]] — quality cost of cheaper models

## Open Questions

- How do you measure whether a caching strategy is net-positive given invalidation complexity and staleness risk?
- At what traffic level does horizontal scaling + external state storage become cheaper than vertical scaling?
- Is there a principled way to decide the model routing threshold, or is it always empirical?
