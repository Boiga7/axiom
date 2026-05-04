---
type: entity
category: agents
para: resource
tags: [langchain, lcel, llm-framework, chains, document-loaders]
sources: []
updated: 2026-05-01
tldr: The base LLM application framework. Provides document loaders, text splitters, prompt templates, chains, and the LangChain Expression Language (LCEL) pipe operator for composing LLM pipelines.
---

# LangChain

The base LLM application framework. Provides document loaders, text splitters, prompt templates, chains, and the LangChain Expression Language (LCEL) pipe operator for composing LLM pipelines.

**Relationship to the rest of the ecosystem:**
- **LangChain** — simple chains and pipelines (this page)
- **LangGraph** — stateful, graph-based agent workflows (see [[agents/langgraph]])
- **LangSmith** — tracing and eval platform (see [[observability/platforms]])
- **LangMem** — long-term memory across sessions (see [[agents/langmem]])

LangChain is the entry point. LangGraph is what you reach for once your pipeline needs state, branching, or loops.

---

## Core Concepts

### LCEL — LangChain Expression Language

The pipe operator (`|`) chains components. Every component implements `Runnable` with `.invoke()`, `.stream()`, and `.batch()`.

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = ChatAnthropic(model="claude-sonnet-4-6")
prompt = ChatPromptTemplate.from_template("Summarise this in one sentence: {text}")
parser = StrOutputParser()

chain = prompt | model | parser

result = chain.invoke({"text": "LangChain is a framework for building LLM apps..."})
# "LangChain is a framework that simplifies building applications with LLMs."
```

Every `|` step's output becomes the next step's input. Types must be compatible.

### Streaming

```python
for chunk in chain.stream({"text": "Long document here..."}):
    print(chunk, end="", flush=True)
```

### Batch

```python
results = chain.batch([
    {"text": "Doc 1..."},
    {"text": "Doc 2..."},
], config={"max_concurrency": 5})
```

---

## Prompt Templates

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage

# Simple
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that answers in {language}."),
    ("human", "{question}"),
])

# With chat history (for multi-turn)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])
```

---

## Document Loaders

Load content from various sources into `Document` objects (`page_content` + `metadata`).

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    WebBaseLoader,
    TextLoader,
    CSVLoader,
    UnstructuredMarkdownLoader,
)

# PDF
loader = PyPDFLoader("report.pdf")
docs = loader.load()   # list of Document, one per page

# Web page
loader = WebBaseLoader("https://example.com/article")
docs = loader.load()

# Text file
loader = TextLoader("notes.txt")
docs = loader.load()
```

Each `Document` has:
```python
doc.page_content   # str — the text
doc.metadata       # dict — source, page number, etc.
```

---

## Text Splitters

Split long documents into chunks for embedding and retrieval. See [[rag/chunking]] for strategy guidance.

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", " ", ""],  # tries these in order
)

chunks = splitter.split_documents(docs)
# Each chunk is still a Document with inherited metadata
```

Semantic splitter (splits on meaning, not character count):

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(OpenAIEmbeddings())
chunks = splitter.split_documents(docs)
```

---

## RAG Pipeline with LCEL

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Build vector store
vectorstore = Chroma.from_documents(chunks, OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_template("""
Answer based on this context:
{context}

Question: {question}
""")

model = ChatAnthropic(model="claude-sonnet-4-6")

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

answer = chain.invoke("What does the document say about X?")
```

---

## Memory (Conversation History)

```python
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

store = {}

def get_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

chain_with_history = RunnableWithMessageHistory(
    chain,
    get_history,
    input_messages_key="question",
    history_messages_key="history",
)

chain_with_history.invoke(
    {"question": "What is RAG?"},
    config={"configurable": {"session_id": "user-123"}},
)
```

---

## Output Parsers

```python
from langchain_core.output_parsers import (
    StrOutputParser,      # plain string
    JsonOutputParser,     # parse JSON from model output
    PydanticOutputParser, # validate against Pydantic model
)
from pydantic import BaseModel

class Summary(BaseModel):
    title: str
    key_points: list[str]

parser = PydanticOutputParser(pydantic_object=Summary)
chain = prompt | model | parser
```

For more robust structured output, prefer [[python/instructor]] over PydanticOutputParser. Instructor has retry logic and works directly against the API.

---

## When to Use LangChain vs LangGraph

| Use LangChain | Use LangGraph |
|---------------|---------------|
| Simple linear pipelines (load → split → embed → retrieve → generate) | Stateful workflows with branching |
| One-shot chains with no loops | Agent loops (think → act → observe → repeat) |
| Prototyping — fast to write | Production agents needing checkpointing |
| RAG without dynamic re-querying | Agentic RAG with iterative retrieval |

---

## Installation

```bash
pip install langchain langchain-anthropic langchain-community langchain-text-splitters
```

Different providers are split into separate packages:
- `langchain-anthropic` — Claude models
- `langchain-openai` — OpenAI + Azure
- `langchain-google-genai` — Gemini

---

## Common Failure Cases

**LCEL pipe chain raises `TypeError` on incompatible output/input types between steps**  
Why: each Runnable in `|` must accept the output type of the prior step; passing a `str` to a step expecting `dict` raises a type error at runtime, not at construction time.  
Detect: `TypeError` or `ValidationError` is thrown when calling `.invoke()`; the chain appears valid until execution.  
Fix: add `RunnablePassthrough` or a lambda to reshape data between steps; test each step individually with `.invoke()` before chaining.

**WebBaseLoader silently fetches empty content from JavaScript-rendered pages**  
Why: `WebBaseLoader` uses `requests`, which doesn't execute JavaScript; single-page apps return empty HTML.  
Detect: `doc.page_content` is empty or contains only HTML boilerplate with no body text.  
Fix: use Playwright-based loaders or fetch a pre-rendered URL; `AsyncChromiumLoader` from `langchain_community` for JS-rendered pages.

**PydanticOutputParser fails when the model adds markdown formatting around JSON**  
Why: the model wraps JSON output in `\`\`\`json ... \`\`\``; the parser receives a non-JSON string and raises a `OutputParserException`.  
Detect: `OutputParserException: Got invalid JSON` in logs; the raw response shows markdown code fences.  
Fix: use `JsonOutputParser` with `RunnableLambda` to strip fences first; or switch to [[python/instructor]] which uses constrained decoding.

**`RunnableWithMessageHistory` grows the in-memory store unboundedly in long-running servers**  
Why: `InMemoryChatMessageHistory` stores all sessions in a dict that is never evicted; a long-running server accumulates all conversations.  
Detect: memory usage grows monotonically with request count; the server eventually OOMs.  
Fix: use an external store (Redis, PostgreSQL) with TTL; or implement LRU eviction in the custom `get_history` function.

**Batch `.batch()` calls ignore errors silently when `max_concurrency` > 1**  
Why: by default, exceptions in concurrent batch calls are captured and returned as error objects, not raised; the caller receives a mix of results and errors.  
Detect: some batch results are `LangChainException` objects instead of strings; no exception is raised at the call site.  
Fix: check result types after `.batch()`; pass `config={"raise_on_error": True}` to surface errors immediately.

## Connections

- [[agents/langgraph]] — stateful agent framework built on LangChain primitives
- [[rag/pipeline]] — full RAG pipeline; LangChain is the most common implementation framework
- [[rag/chunking]] — text splitting strategies
- [[observability/platforms]] — LangSmith for tracing LangChain calls
- [[python/instructor]] — alternative for structured output (more robust than LangChain's PydanticOutputParser)
## Open Questions

- What failure modes emerge in this agent pattern that do not appear in toy examples?
- At what complexity threshold does a simpler architecture outperform this approach?
