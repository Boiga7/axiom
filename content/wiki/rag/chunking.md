---
type: concept
category: rag
tags: [chunking, rag, text-splitting, semantic-chunking, late-chunking, embedding]
sources: []
updated: 2026-04-29
para: resource
tldr: 512-token fixed-size chunking with 50-token overlap is the default; semantic chunking improves complex docs at 5-10x ingestion cost; parent-child retrieval separates precision from context richness.
---

# Chunking Strategies

> **TL;DR** 512-token fixed-size chunking with 50-token overlap is the default; semantic chunking improves complex docs at 5-10x ingestion cost; parent-child retrieval separates precision from context richness.

How you split documents before embedding is the single biggest lever on RAG retrieval quality. Most retrieval failures trace back to bad chunking, not bad retrieval.

---

## Why Chunking Matters

Embedding models encode a fixed-length vector for each chunk. Too large: the vector averages across multiple topics and retrieves poorly. Too small: no context for the model to reason from. The goal is chunks that are semantically coherent, small enough to retrieve precisely, and large enough to answer the query.

---

## Fixed-Size Chunking

Split every N tokens with an optional overlap.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)
chunks = splitter.split_text(document)
```

**512 tokens, 50-token overlap** is the most-cited default. The overlap prevents answers from being split across chunk boundaries.

| Chunk size | Retrieval precision | Context richness | Use case |
|---|---|---|---|
| 128 tokens | High | Low | FAQ, short answers |
| 256 tokens | Good | Medium | General purpose |
| 512 tokens | Medium | Good | Default starting point |
| 1024+ tokens | Low | High | Long-form synthesis |

`RecursiveCharacterTextSplitter` tries separators in order (paragraph → newline → sentence → word), preserving natural boundaries where possible.

---

## Semantic Chunking

Split on meaning shifts rather than token count.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(
    OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95  # split on top 5% most different transitions
)
chunks = splitter.split_text(document)
```

**How it works:** embed each sentence, compute cosine similarity between adjacent sentences, split where similarity drops sharply. Produces variable-length chunks that respect topic boundaries.

**Tradeoff:** 5-10x slower than fixed-size (requires embedding during ingestion), but retrieval precision improves on long, topic-varied documents.

---

## Document-Structure Aware Chunking

Respect the document's own structure rather than arbitrary boundaries.

```python
from langchain_text_splitters import MarkdownHeaderTextSplitter

headers = [("#", "h1"), ("##", "h2"), ("###", "h3")]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
chunks = splitter.split_text(markdown_doc)
# Each chunk inherits metadata: {"h1": "Section", "h2": "Subsection"}
```

For PDFs with tables and layouts, use `unstructured` to extract structure before chunking:

```python
from unstructured.partition.pdf import partition_pdf

elements = partition_pdf("doc.pdf", strategy="hi_res")
# Elements are typed: Title, NarrativeText, Table, Image
tables = [e for e in elements if e.category == "Table"]
```

Tables should be chunked as single units. Splitting a table across chunks destroys its meaning.

---

## Late Chunking

Chunk after embedding, not before. Proposed by Jina AI (2024).

**Standard approach:** embed each chunk independently → each chunk loses context from surrounding text.

**Late chunking:** embed the entire document with a long-context model → then pool token embeddings for each chunk window. Each chunk's embedding "knows about" the rest of the document.

```python
# Requires a model with long-context support (e.g. jina-embeddings-v3)
# The model outputs token-level embeddings; you pool by chunk boundaries

model = "jina-embeddings-v3"
# 1. Get full document token embeddings
# 2. Define chunk boundaries by character position
# 3. Mean-pool token embeddings within each boundary
```

**When it helps:** documents with heavy pronoun/reference use ("it", "they", "the above") where isolated chunks lose the referent.

---

## Parent-Child (Small-to-Big) Retrieval

Retrieve small chunks for precision, return large parent chunks for context.

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore

store = InMemoryStore()
retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=RecursiveCharacterTextSplitter(chunk_size=200),
    parent_splitter=RecursiveCharacterTextSplitter(chunk_size=2000),
)
retriever.add_documents(docs)
# Retrieval: matches on 200-token child, returns 2000-token parent to LLM
```

This separates retrieval precision (small chunks score well) from answer quality (large chunk has full context).

---

## Metadata Enrichment

Every chunk should carry metadata that enables filtered retrieval.

```python
chunks_with_metadata = []
for i, chunk in enumerate(raw_chunks):
    chunks_with_metadata.append({
        "text": chunk,
        "metadata": {
            "source": "annual-report-2025.pdf",
            "page": page_number,
            "section": section_heading,
            "chunk_index": i,
            "total_chunks": len(raw_chunks),
            "doc_type": "financial",
            "date": "2025-01-15",
        }
    })
```

Metadata enables pre-filtering before vector search: `where date > "2025-01-01" AND doc_type = "financial"`. Dramatically improves precision for time-sensitive or domain-specific queries.

---

## Choosing a Strategy

| Document type | Recommended approach |
|---|---|
| Uniform prose (articles, reports) | Fixed-size 512t + 50t overlap |
| Technical docs with headers | Markdown/HTML structure-aware |
| PDFs with tables | unstructured extraction → table-as-unit |
| Long docs with heavy cross-references | Late chunking or parent-child |
| Heterogeneous corpus, quality matters | Semantic chunking |

---

## Common Mistakes

- **No overlap on fixed-size chunks.** Answers at boundaries get split; add 10-15% overlap.
- **Chunking tables.** A half-table chunk is meaningless. Extract tables as atomic units.
- **Ignoring metadata.** Chunks without provenance can't be filtered or cited.
- **One-size-fits-all.** Different document types in the same corpus often need different strategies. Use `doc_type` metadata to route to different chunkers.

---

## Key Facts

- Default: 512 tokens, 50-token overlap; RecursiveCharacterTextSplitter tries paragraph→sentence→word
- Semantic chunking: 5-10x slower at ingestion; better precision on long topic-varied documents
- Tables must be extracted as atomic units — splitting a table across chunks destroys its meaning
- Late chunking: embed entire document first, pool token embeddings per chunk; best for cross-reference-heavy docs (Jina AI, 2024)
- Parent-child retrieval: child=200 tokens for matching precision, parent=2000 tokens returned to LLM
- Metadata on every chunk: source, page, section, date — enables pre-filtering before vector search

## Common Failure Cases

**Answers split across chunk boundaries return incomplete responses**  
Why: fixed-size chunking with no overlap cuts mid-sentence; the answer spans two consecutive chunks, neither of which retrieves correctly.  
Detect: retrieval returns chunks that end or begin mid-thought; cosine scores are mediocre even for clearly relevant content.  
Fix: add 50-token overlap (`chunk_overlap=50`); for table-dense content use structure-aware splitting instead.

**Table rows return as incoherent half-tables**  
Why: character-based splitters don't understand table structure and cut across rows.  
Detect: retrieved chunks contain malformed table syntax (orphan `|` characters, partial header rows).  
Fix: extract tables as atomic units using `unstructured`; never apply recursive splitters to tabular content.

**Semantic chunker is 5-10x slower than expected at ingestion**  
Why: semantic chunking embeds every sentence via an API call; large documents trigger hundreds of calls.  
Detect: ingestion pipeline takes >10 minutes per 100-page document; embedding API spend spikes.  
Fix: use async batching for sentence embeddings; consider fixed-size chunking for documents where topic uniformity is high.

**Chunks from different doc types mixed in the same index, collapsing precision**  
Why: a financial report and a user manual land in the same vector space; queries retrieve across doc types indiscriminately.  
Detect: retrieval returns seemingly unrelated documents; RAGAS context precision drops below 0.60.  
Fix: add `doc_type` metadata to every chunk and use pre-filtering in the vector store query.

**Late chunking fails for documents longer than the embedding model's context**  
Why: models like `jina-embeddings-v3` have a max input length; documents beyond it are silently truncated.  
Detect: chunks near the end of long documents have identical embeddings to mid-document chunks (truncation artifact).  
Fix: split very long documents into sections before applying late chunking; apply late chunking within each section.

## Connections

- [[rag/pipeline]] — full RAG pipeline context
- [[rag/embeddings]] — what happens after chunking
- [[rag/hybrid-retrieval]] — retrieval strategies over the chunk index
- [[infra/vector-stores]] — where chunks are stored

## Open Questions

- Is 512 tokens still the right default as embedding model context windows extend to 8K+ tokens?
- How does semantic chunking quality hold up for domain-specific technical documents vs general prose?
- Does late chunking's document-level context benefit scale to very long documents (books, full codebases)?
