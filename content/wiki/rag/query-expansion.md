---
type: concept
category: rag
para: resource
tags: [rag, query-expansion, hyde, multi-query, step-back, retrieval, recall]
tldr: Query expansion fixes retrieval failures by rewriting the query before searching. HyDE generates a hypothetical answer and embeds that; multi-query generates alternative phrasings; step-back prompts for a more general principle. Each fixes a different failure mode.
sources: []
updated: 2026-05-01
---

# Query Expansion

> **TL;DR** Query expansion fixes retrieval failures by rewriting the query before searching. HyDE generates a hypothetical answer and embeds that; multi-query generates alternative phrasings; step-back prompts for a more general principle. Each fixes a different failure mode.

## Key Facts
- Query expansion fixes the semantic gap: user queries and document language often don't match even when the meaning does
- Three main techniques target different failure modes: HyDE (semantic gap), multi-query (intent coverage), step-back (specificity mismatch)
- HyDE: generate a hypothetical answer → embed the answer → retrieve documents similar to the answer, not the question
- Multi-query: generate 3-5 phrasings of the question → retrieve for each → deduplicate and merge results
- Step-back: ask a more general version of the question → retrieve general principles → use as additional context
- Production RAG systems often combine techniques (hybrid policy) rather than picking one
- Query expansion increases recall at the cost of latency and token usage; always rerank the expanded result set

## The Problem: Semantic Gap

Standard RAG retrieves documents similar to the query embedding. This fails when:

1. The query is short/ambiguous: "MCP auth issues" doesn't match documents that say "OAuth 2.0 boundary enforcement in Model Context Protocol servers"
2. The query is too specific: "PKCE code_verifier mismatch" doesn't match a document explaining the full PKCE flow
3. The query uses different vocabulary than the documents: technical vs colloquial phrasing

Query expansion addresses these by transforming the query before retrieval.

## Technique 1: HyDE (Hypothetical Document Embeddings)

**What it fixes:** semantic gap between question-style queries and answer-style documents.

**How it works:** Use an LLM to generate a hypothetical answer to the query. Embed the hypothetical answer. Retrieve documents similar to that embedding.

The key insight: the hypothetical answer uses the same vocabulary and style as real answers. Embedding it creates a vector that lands in the same neighbourhood as real documents.

```python
import anthropic
from typing import Optional

client = anthropic.Anthropic()

def hyde_retrieve(
    query: str,
    vector_store,
    k: int = 5,
    n_hypothetical: int = 3,
) -> list:
    """Generate hypothetical answers, embed them, retrieve by averaged embedding."""

    # Step 1: Generate hypothetical answers
    hypothetical_answers = []
    for _ in range(n_hypothetical):
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"""Write a short passage that directly answers this question.
Write as if it were an excerpt from a technical document.

Question: {query}

Answer:"""
            }],
        )
        hypothetical_answers.append(response.content[0].text)

    # Step 2: Embed each hypothetical answer
    embeddings = [embed(answer) for answer in hypothetical_answers]

    # Step 3: Average the embeddings
    import numpy as np
    averaged_embedding = np.mean(embeddings, axis=0).tolist()

    # Step 4: Retrieve by averaged embedding
    return vector_store.similarity_search_by_vector(averaged_embedding, k=k)
```

**When HyDE helps most:** technical Q&A where documents are dense prose and queries are short questions.

**When HyDE hurts:** factual lookups (the hypothetical answer may hallucinate; always rerank after). Not suitable as a standalone technique for high-precision applications.

**Typical gain:** 10-30% improvement in recall on technical Q&A benchmarks [unverified].

## Technique 2: Multi-Query

**What it fixes:** intent coverage — the user's query has multiple valid interpretations.

**How it works:** Generate 3-5 alternative phrasings of the query. Retrieve for each. Merge and deduplicate results using Reciprocal Rank Fusion (RRF).

```python
def multi_query_retrieve(
    query: str,
    vector_store,
    k: int = 5,
) -> list:
    """Generate multiple query variants, retrieve for each, merge with RRF."""

    # Step 1: Generate alternative phrasings
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"""Generate 4 different ways to ask the following question.
Each phrasing should capture a different aspect or interpretation.
Return one question per line.

Original: {query}"""
        }],
    )
    alternative_queries = response.content[0].text.strip().split("\n")
    all_queries = [query] + alternative_queries

    # Step 2: Retrieve for each query
    all_results = {}
    for q in all_queries:
        results = vector_store.similarity_search(q, k=k)
        for rank, doc in enumerate(results):
            doc_id = doc.metadata.get("id", doc.page_content[:50])
            if doc_id not in all_results:
                all_results[doc_id] = {"doc": doc, "rrf_score": 0}
            all_results[doc_id]["rrf_score"] += 1 / (rank + 60)  # RRF formula

    # Step 3: Sort by RRF score, return top-k
    sorted_docs = sorted(all_results.values(), key=lambda x: x["rrf_score"], reverse=True)
    return [item["doc"] for item in sorted_docs[:k]]
```

**When multi-query helps most:** broad questions with multiple valid facets ("tell me about MCP security"), ambiguous queries, user queries from non-technical users who may phrase things oddly.

**When it doesn't help:** specific lookup queries where there's one correct answer.

**Cost:** 1 + N_variants LLM calls per query (use a cheap model for generation).

## Technique 3: Step-Back Prompting

**What it fixes:** over-specific queries that don't match documents written at a more general level.

**How it works:** Ask the LLM to restate the query as a more general principle. Retrieve for both the specific query and the generalised version. Combine results.

```python
def step_back_retrieve(
    query: str,
    vector_store,
    k: int = 5,
) -> list:
    """Retrieve for both specific query and a more general step-back version."""

    # Step 1: Generate step-back query
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Rewrite this question to ask about the underlying principle or concept.
Make it more general.

Specific question: {query}
General principle:"""
        }],
    )
    step_back_query = response.content[0].text.strip()

    # Step 2: Retrieve for both
    specific_results = vector_store.similarity_search(query, k=k)
    general_results = vector_store.similarity_search(step_back_query, k=k)

    # Step 3: Merge (simple dedup, specific results ranked first)
    seen = set()
    merged = []
    for doc in specific_results + general_results:
        doc_id = doc.metadata.get("id", doc.page_content[:50])
        if doc_id not in seen:
            seen.add(doc_id)
            merged.append(doc)

    return merged[:k]
```

**When step-back helps most:** queries about implementation details ("how do I set code_challenge_method") when the documents explain concepts ("PKCE requires S256").

## Combining Techniques

Production systems rarely use one technique. A hybrid approach:

```python
def adaptive_retrieve(query: str, vector_store, k: int = 5) -> list:
    """Use HyDE for Q&A, multi-query for exploration, direct search for lookups."""

    # Detect query type (simple heuristic)
    is_question = query.strip().endswith("?") or query.lower().startswith(("what", "how", "why", "when", "where"))
    is_broad = len(query.split()) < 5

    if is_question:
        # Q&A: HyDE for semantic alignment
        return hyde_retrieve(query, vector_store, k)
    elif is_broad:
        # Exploration: multi-query for coverage
        return multi_query_retrieve(query, vector_store, k)
    else:
        # Specific lookup: direct retrieval + step-back supplement
        direct = vector_store.similarity_search(query, k=k)
        return direct  # add step_back_retrieve if recall is low
```

Always rerank the expanded result set with a cross-encoder before generating. Query expansion improves recall; reranking improves precision. See [[rag/reranking]].

> [Source: zilliz.com — HyDE for RAG; Medium — Retrieval Is the Bottleneck, 2025]

## Common Failure Cases

**HyDE degrades precision on factual lookups**  
Why: the hypothetical answer hallucinate facts; the hallucinated embedding retrieves plausible-but-wrong documents.  
Detect: faithfulness scores drop sharply on queries with unique proper nouns, dates, or numbers.  
Fix: gate HyDE behind query type detection; skip it for queries that contain entity names, version numbers, or numeric facts.

**Multi-query generates redundant variants, not diverse ones**  
Why: the generator model defaults to minor paraphrases rather than genuinely different interpretations.  
Detect: log the generated queries; if >50% share the same key noun phrases, they are redundant.  
Fix: add explicit diversity instruction: "each phrasing must emphasise a different aspect and avoid repeating the same subject-verb structure."

**Latency budget exceeded by expansion LLM calls**  
Why: each expansion technique adds 1-5 LLM calls before retrieval; at 500ms each, this adds 2-3 seconds to every query.  
Detect: trace end-to-end query latency; expansion calls should show in spans before the retrieval span.  
Fix: use the cheapest/fastest model for expansion (Haiku, GPT-4o-mini); cache expansion results for repeated queries.

**RRF tuning parameter k=60 over-penalises top-1 results**  
Why: with very few documents in the result list, k=60 flattens the score distribution inappropriately.  
Detect: compare final ranked order from RRF against individual retriever rankings; if rank-1 from both retrievers ends up in position 3+, k is too high.  
Fix: lower k to 10-20 when first-pass retrieval returns <20 candidates.

**Step-back produces overly general queries that retrieve off-topic results**  
Why: the model generalises too aggressively, turning a specific implementation question into a philosophical principle.  
Detect: log the step-back query; if it no longer contains any terms from the original query, it over-generalised.  
Fix: add an instruction to retain at least one key term from the original in the step-back form.

## Connections
- [[rag/pipeline]] — query expansion plugs into the retrieval stage
- [[rag/reranking]] — always rerank after expanding; expansion improves recall, reranking restores precision
- [[rag/hybrid-retrieval]] — BM25 + dense hybrid reduces the need for query expansion in some cases
- [[rag/embeddings]] — understanding embedding geometry helps explain why HyDE works
- [[prompting/techniques]] — step-back prompting is also a general prompting technique

## Open Questions
- At what retrieval recall level does query expansion provide diminishing returns vs just using a better reranker?
- Does HyDE degrade on time-sensitive queries where the hypothetical answer might be out of date?
