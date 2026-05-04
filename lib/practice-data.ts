export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type WikiLink = {
  title: string;
  href: string;
};

export type Step = {
  title: string;
  body: string;
  code?: {
    lang: string;
    snippet: string;
  };
};

export type NextStep = {
  label: string;
  href: string;
};

export type Exercise = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tagline: string;
  description: string;
  whyItMatters: string;
  prerequisites: string[];
  steps: Step[];
  axiomPages: WikiLink[];
  whatNext: NextStep[];
};

export type RolePath = {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
};

export const ROLE_PATHS: RolePath[] = [
  {
    id: "ai-engineer",
    title: "AI Engineer",
    description: "Prompt engineering, RAG, agents, evals, and production operations.",
    exercises: [
      {
        slug: "rag-pipeline",
        title: "Build a RAG pipeline from scratch",
        difficulty: "Beginner",
        tagline: "Chunk a PDF, embed it, store it in Chroma, and answer questions against it with Claude.",
        description: "Build a complete retrieval-augmented generation pipeline without a framework. You will chunk a PDF document, embed each chunk with a local model, store the vectors in Chroma, and then answer user questions by retrieving the most relevant chunks and passing them to Claude with the query.",
        whyItMatters: "RAG is how most production AI systems get factual, up-to-date answers without hallucinating. Understanding the pipeline end-to-end; chunk size trade-offs, embedding choice, retrieval strategy; makes you dangerous in any AI engineering role. Frameworks hide this; building it yourself exposes exactly where things go wrong.",
        prerequisites: [
          "Python basics; you should be comfortable writing functions and handling files",
          "Basic understanding of what an LLM is and how prompting works",
          "Anthropic API key or access to a local model via Ollama",
          "pip-installable environment (uv or venv)",
        ],
        steps: [
          {
            title: "Pick a PDF and chunk it",
            body: "Choose any long PDF (a research paper works well). Use PyMuPDF or pdfplumber to extract raw text, then split it into overlapping chunks of ~512 tokens using a recursive character splitter. Print the first three chunks so you can see what the model will actually receive.",
            code: {
              lang: "python",
              snippet: `import fitz  # pip install pymupdf
import re

def load_pdf(path: str) -> str:
    doc = fitz.open(path)
    return "\\n".join(page.get_text() for page in doc)

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
    return chunks

text = load_pdf("paper.pdf")
chunks = chunk_text(text)
print(f"{len(chunks)} chunks created")
for i, c in enumerate(chunks[:3]):
    print(f"--- chunk {i} ---\\n{c[:200]}\\n")`,
            },
          },
          {
            title: "Embed each chunk locally",
            body: "Install sentence-transformers and load the all-MiniLM-L6-v2 model. Run each chunk through the model to produce a 384-dimensional embedding vector. This step happens entirely on your machine; no API call, no cost.",
            code: {
              lang: "python",
              snippet: `from sentence_transformers import SentenceTransformer
# pip install sentence-transformers

model = SentenceTransformer("all-MiniLM-L6-v2")

# Batch embed all chunks (much faster than one-by-one)
embeddings = model.encode(chunks, show_progress_bar=True)

print(f"Embedding shape: {embeddings.shape}")  # (n_chunks, 384)
print(f"First vector sample: {embeddings[0][:5].tolist()}")`,
            },
          },
          {
            title: "Store vectors in Chroma",
            body: "Start a persistent Chroma client, create a collection, and add each chunk along with its embedding and the chunk index as metadata. Verify the collection size matches your chunk count before moving on.",
            code: {
              lang: "python",
              snippet: `import chromadb
# pip install chromadb

client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("rag_demo")

collection.add(
    ids=[str(i) for i in range(len(chunks))],
    embeddings=embeddings.tolist(),
    documents=chunks,
    metadatas=[{"chunk_index": i} for i in range(len(chunks))],
)

print(f"Collection size: {collection.count()}")  # should match len(chunks)`,
            },
          },
          {
            title: "Retrieve on query",
            body: "Embed the user's question with the same model, then query Chroma for the top-3 most similar chunks by cosine distance. Print the retrieved chunks; this is your context window budget before you hand anything to Claude.",
            code: {
              lang: "python",
              snippet: `def retrieve(query: str, top_k: int = 3) -> list[str]:
    query_embedding = model.encode([query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    docs = results["documents"][0]
    for i, (doc, dist) in enumerate(zip(docs, results["distances"][0])):
        print(f"[{i}] distance={dist:.3f}\\n{doc[:200]}\\n")
    return docs

query = "What is the main contribution of this paper?"
context_chunks = retrieve(query)`,
            },
          },
          {
            title: "Answer with Claude",
            body: "Build a system prompt that instructs Claude to answer only from the provided context. Concatenate the retrieved chunks into a user message alongside the question, call the Anthropic Messages API, and print the response. Then ask a question your PDF does not answer and observe what happens.",
            code: {
              lang: "python",
              snippet: `import anthropic
# pip install anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

def answer(query: str, context: list[str]) -> str:
    context_text = "\\n\\n".join(
        f"[Chunk {i}]\\n{c}" for i, c in enumerate(context)
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=(
            "Answer the user's question using ONLY the provided context chunks. "
            "If the answer is not in the context, say so explicitly."
        ),
        messages=[{
            "role": "user",
            "content": f"<context>\\n{context_text}\\n</context>\\n\\nQuestion: {query}",
        }],
    )
    return response.content[0].text

print(answer(query, context_chunks))`,
            },
          },
          {
            title: "Add source citations",
            body: "Update the prompt to ask Claude to cite which chunk index it drew each claim from. Verify the citations match the retrieved content. This is the minimum viable attribution that makes RAG outputs auditable.",
            code: {
              lang: "python",
              snippet: `def answer_with_citations(query: str, context: list[str]) -> str:
    context_text = "\\n\\n".join(
        f"[Chunk {i}]\\n{c}" for i, c in enumerate(context)
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=(
            "Answer using ONLY the provided context chunks. "
            "After each factual claim, add a citation in the format [Chunk N]. "
            "If information is not in the context, write 'Not found in context.'"
        ),
        messages=[{
            "role": "user",
            "content": f"<context>\\n{context_text}\\n</context>\\n\\nQuestion: {query}",
        }],
    )
    return response.content[0].text

print(answer_with_citations(query, context_chunks))`,
            },
          },
        ],
        axiomPages: [
          { title: "RAG pipeline overview", href: "/rag/pipeline" },
          { title: "Chunking strategies", href: "/rag/chunking" },
          { title: "Embeddings", href: "/rag/embeddings" },
          { title: "Anthropic API", href: "/apis/anthropic-api" },
        ],
        whatNext: [
          { label: "Write an LLM-as-judge eval for your pipeline", href: "/practice/ai-engineer/llm-judge-eval" },
          { label: "Add hybrid BM25 + dense retrieval", href: "/rag/hybrid-retrieval" },
          { label: "Add a reranker to improve precision", href: "/rag/reranking" },
        ],
      },
      {
        slug: "llm-judge-eval",
        title: "Write an LLM-as-judge eval",
        difficulty: "Intermediate",
        tagline: "Build a 10-case golden set and score faithfulness using Claude as the judge.",
        description: "Design a repeatable evaluation harness for a RAG or chatbot system. You will curate 10 question-answer pairs as a golden set, write a faithfulness scorer that sends each answer to Claude with the source context and a rubric, and produce a pass/fail result with an aggregate score you can track over time.",
        whyItMatters: "LLM-as-judge is how teams catch regressions without a human in the loop for every change. A 10-case golden set sounds trivial but already catches model swaps, prompt regressions, and chunking bugs that manual inspection misses. The discipline of defining a rubric before looking at outputs is the hardest part and the most valuable skill to build.",
        prerequisites: [
          "Working RAG pipeline or chatbot you can call programmatically",
          "Anthropic API access",
          "Understanding of what faithfulness means in RAG context (answer grounded in retrieved docs)",
          "Python with the anthropic SDK installed",
        ],
        steps: [
          {
            title: "Define your rubric first",
            body: "Write out what a faithful answer means before touching code. A minimal rubric: every factual claim in the answer must be traceable to the provided context; the answer must not introduce facts not present in the context. Write this as plain English; you will paste it into the judge prompt.",
          },
          {
            title: "Curate 10 golden cases",
            body: "Write 10 questions you know the answer to from your source documents. For each, record the expected answer (ground truth) and the context chunk it comes from. Include 2 edge cases: one question the document does not answer, and one where the answer requires combining two chunks.",
          },
          {
            title: "Build the judge prompt",
            body: "Write a system prompt for Claude that presents the question, the retrieved context, and the model's answer, then asks Claude to score faithfulness from 1-5 and explain its reasoning. Use XML tags to separate the sections clearly; Claude follows structured prompts more reliably.",
            code: {
              lang: "python",
              snippet: `JUDGE_SYSTEM = """You are an evaluation judge assessing whether an AI answer is faithful to the provided context.

Score from 1 to 5:
5 = Every factual claim is directly supported by the context.
4 = Nearly all claims are supported; minor extrapolation.
3 = Most claims supported but one unsupported inference.
2 = Several claims not found in the context.
1 = Answer contradicts the context or mostly fabricated.

Respond with exactly this format:
<score>N</score>
<reasoning>one sentence explanation</reasoning>"""

def judge(question: str, context: str, answer: str) -> tuple[int, str]:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        temperature=0,   # deterministic scoring
        system=JUDGE_SYSTEM,
        messages=[{"role": "user", "content": (
            f"<question>{question}</question>\\n"
            f"<context>{context}</context>\\n"
            f"<answer>{answer}</answer>"
        )}],
    )
    text = response.content[0].text
    import re
    score = int(re.search(r"<score>(\\d)</score>", text).group(1))
    reasoning = re.search(r"<reasoning>(.*?)</reasoning>", text, re.S).group(1).strip()
    return score, reasoning`,
            },
          },
          {
            title: "Run each case through the judge",
            body: "For each golden case, call your system to get an answer, then call Claude with the judge prompt. Parse the score from the response. If Claude returns reasoning alongside the score, log it; that reasoning is where the signal is.",
            code: {
              lang: "python",
              snippet: `golden_cases = [
    {
        "question": "What is the capital of France?",
        "context": "France is a country in Western Europe. Its capital city is Paris.",
        "expected": "Paris",
    },
    # ... add 9 more cases
]

results = []
for case in golden_cases:
    answer = your_system(case["question"], case["context"])
    score, reasoning = judge(case["question"], case["context"], answer)
    results.append({
        **case,
        "answer": answer,
        "score": score,
        "reasoning": reasoning,
        "pass": score >= 4,
    })
    print(f"Q: {case['question'][:60]}... | score={score} | {'PASS' if score >= 4 else 'FAIL'}")
    if score < 4:
        print(f"  Reasoning: {reasoning}")`,
            },
          },
          {
            title: "Aggregate and report",
            body: "Calculate pass rate (score >= 4) and mean score across all 10 cases. Print a table: question, expected, actual, score, pass/fail. Run the eval twice and check it is deterministic; if scores vary significantly, add temperature=0 to your judge call.",
            code: {
              lang: "python",
              snippet: `import statistics

pass_rate = sum(1 for r in results if r["pass"]) / len(results)
mean_score = statistics.mean(r["score"] for r in results)

print(f"\\n=== Eval Results ===")
print(f"Pass rate:  {pass_rate:.0%}  ({sum(r['pass'] for r in results)}/{len(results)})")
print(f"Mean score: {mean_score:.2f} / 5.0")

# Print failures for inspection
failures = [r for r in results if not r["pass"]]
if failures:
    print(f"\\nFailures ({len(failures)}):")
    for r in failures:
        print(f"  [{r['score']}] {r['question'][:60]}")
        print(f"       Answer: {r['answer'][:80]}")
        print(f"       Reason: {r['reasoning']}")`,
            },
          },
        ],
        axiomPages: [
          { title: "LLM-as-judge methodology", href: "/evals/llm-as-judge" },
          { title: "Eval methodology overview", href: "/evals/methodology" },
          { title: "RAGAS eval framework", href: "/evals/ragas" },
          { title: "Prompting techniques", href: "/prompting/techniques" },
        ],
        whatNext: [
          { label: "Expand to 50 cases and automate with RAGAS", href: "/evals/ragas" },
          { label: "Build a LangGraph agent with memory", href: "/practice/ai-engineer/langgraph-agent" },
          { label: "Trace your eval runs in Langfuse", href: "/practice/ai-engineer/langfuse-tracing" },
        ],
      },
      {
        slug: "langgraph-agent",
        title: "Build a LangGraph agent with memory",
        difficulty: "Intermediate",
        tagline: "A stateful agent that plans, searches the web, and remembers what it has found.",
        description: "Build a research agent using LangGraph with two tools: web search (via Tavily or DuckDuckGo) and a persistent memory store. The agent should accept a topic, plan sub-questions, search for each, store results in memory, and synthesise a structured summary; all within a typed, resumable graph.",
        whyItMatters: "Single-turn agents break on any task requiring more than one tool call. LangGraph's checkpoint system lets you pause, inspect, and resume mid-run; the critical capability for agents in production where things go wrong mid-task. Understanding how state flows through a graph makes every agentic system you build after this easier to debug.",
        prerequisites: [
          "Comfortable with Python async and type hints",
          "Understanding of what a tool call is in the context of LLMs",
          "LangGraph installed (pip install langgraph langchain-anthropic)",
          "A Tavily API key or access to another search tool",
        ],
        steps: [
          {
            title: "Define your state schema",
            body: "Create a TypedDict for the agent state: messages list, a memory dict keyed by topic, and a plan list. Every node in your graph reads from and writes to this state. Getting the schema right before writing nodes saves significant refactoring later.",
          },
          {
            title: "Build the planner node",
            body: "Write a node that calls Claude with the user's research topic and asks it to decompose it into 3-4 specific sub-questions. Parse the output into the plan list in state. Test this node in isolation by calling it with a mock state before wiring it into the graph.",
          },
          {
            title: "Build the search node",
            body: "Write a node that pops the next sub-question from the plan, runs a web search, and stores the result in the memory dict under the sub-question as key. Add a conditional edge: if the plan is empty, route to the synthesis node; otherwise loop back.",
          },
          {
            title: "Build the synthesis node",
            body: "Write a final node that reads all entries from the memory dict and asks Claude to synthesise them into a structured summary with headings. The summary should cite which sub-question each section came from.",
          },
          {
            title: "Wire the graph and add checkpointing",
            body: "Connect the nodes: START -> planner -> search -> (conditional) -> synthesis -> END. Add a MemorySaver checkpointer and test that you can interrupt after the planner, inspect state, and resume. This is the feature that separates production agents from demos.",
          },
        ],
        axiomPages: [
          { title: "LangGraph", href: "/agents/langgraph" },
          { title: "Multi-agent patterns", href: "/agents/multi-agent-patterns" },
          { title: "ReAct pattern", href: "/agents/react-pattern" },
          { title: "Anthropic API; tool use", href: "/apis/anthropic-api" },
        ],
        whatNext: [
          { label: "Trace the agent end-to-end in Langfuse", href: "/practice/ai-engineer/langfuse-tracing" },
          { label: "Implement and measure prompt caching", href: "/practice/ai-engineer/prompt-caching" },
          { label: "Add MCP tools to your agent", href: "/protocols/mcp" },
        ],
      },
      {
        slug: "prompt-caching",
        title: "Implement and measure prompt caching",
        difficulty: "Intermediate",
        tagline: "Add cache_control blocks to a long system prompt and measure real token savings.",
        description: "Take an existing system with a long system prompt (1000+ tokens) and add Anthropic prompt caching. You will add cache_control breakpoints, make five repeated API calls, read the usage fields to confirm cache hits, and calculate the actual cost and latency reduction compared to uncached calls.",
        whyItMatters: "Prompt caching is one of the few optimisations that reduces both cost and latency simultaneously. On a system where the system prompt is 2000 tokens and you make 1000 calls a day, caching pays for itself immediately. More importantly, the discipline of reading usage fields from every API response is a habit that catches runaway costs before they become a problem.",
        prerequisites: [
          "Anthropic API access with a key that has access to Claude Sonnet or Opus",
          "A system prompt of at least 1024 tokens (required minimum for caching to activate)",
          "Python with the anthropic SDK installed",
          "Basic understanding of the Messages API request/response structure",
        ],
        steps: [
          {
            title: "Baseline: measure uncached cost",
            body: "Make five identical API calls to Claude with your long system prompt. After each call, print the usage object: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens. All five should show zero cache hits. Record the total input tokens across all five calls.",
            code: {
              lang: "python",
              snippet: `import anthropic, time

client = anthropic.Anthropic()

LONG_SYSTEM = "You are a helpful assistant. " + ("Context: " * 600)  # ~1200 tokens

def call_api(use_cache: bool = False) -> dict:
    system_content = [{"type": "text", "text": LONG_SYSTEM}]
    if use_cache:
        system_content[0]["cache_control"] = {"type": "ephemeral"}

    start = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=64,
        system=system_content,
        messages=[{"role": "user", "content": "Say hello briefly."}],
    )
    latency = time.time() - start
    u = response.usage
    return {
        "latency": latency,
        "input_tokens": u.input_tokens,
        "cache_creation": u.cache_creation_input_tokens,
        "cache_read": u.cache_read_input_tokens,
    }

print("=== Baseline (no cache) ===")
for i in range(5):
    r = call_api(use_cache=False)
    print(f"Call {i+1}: {r}")`,
            },
          },
          {
            title: "Add cache_control breakpoints",
            body: "Add a cache_control: {type: 'ephemeral'} marker to the last content block of your system prompt. This tells Anthropic to cache everything up to that point. The cached portion must be at least 1024 tokens; if your prompt is shorter, pad it with relevant context.",
            code: {
              lang: "python",
              snippet: `# cache_control is added to the content block, not the message
system_with_cache = [
    {
        "type": "text",
        "text": LONG_SYSTEM,
        "cache_control": {"type": "ephemeral"},  # cache everything up to here
    }
]

# If your system prompt has multiple sections, put cache_control
# on the LAST section you want cached. Everything before it is cached.
# Minimum 1024 tokens must be in the cached portion.`,
            },
          },
          {
            title: "Make five calls and read usage",
            body: "Repeat the five calls. The first call creates the cache (cache_creation_input_tokens > 0). Calls two through five should show cache_read_input_tokens matching your system prompt token count and cache_creation_input_tokens at zero. Print each usage object; do not assume it is working.",
            code: {
              lang: "python",
              snippet: `print("\\n=== With cache ===")
for i in range(5):
    r = call_api(use_cache=True)
    hit = "MISS (creating)" if r["cache_creation"] > 0 else "HIT"
    print(
        f"Call {i+1}: {hit} | "
        f"latency={r['latency']:.2f}s | "
        f"created={r['cache_creation']} | "
        f"read={r['cache_read']}"
    )

# Expected output:
# Call 1: MISS (creating) | latency=1.8s | created=1240 | read=0
# Call 2: HIT             | latency=1.1s | created=0    | read=1240
# Call 3: HIT             | latency=1.0s | created=0    | read=1240`,
            },
          },
          {
            title: "Calculate actual savings",
            body: "Cache reads cost 10% of the base input token price. Calculate: (uncached_total_tokens - cached_reads) * full_price + cached_reads * 0.1 * full_price. Compare to the uncached baseline. Also measure wall-clock latency for each call; cached calls are typically 20-40% faster on long prompts.",
            code: {
              lang: "python",
              snippet: `# Sonnet 4.6 pricing (per million tokens, as of mid-2025)
INPUT_PRICE_PER_M = 3.00   # $3.00 per 1M input tokens
CACHE_READ_PRICE_PER_M = INPUT_PRICE_PER_M * 0.10  # 10% of base

# Example numbers from 5 calls, 1240 cached tokens each
uncached_total = 1240 * 5  # 6200 input tokens
uncached_cost = (uncached_total / 1_000_000) * INPUT_PRICE_PER_M

# With cache: 1 creation + 4 reads
cached_cost = (
    (1240 / 1_000_000) * INPUT_PRICE_PER_M +         # first call creates cache
    (1240 * 4 / 1_000_000) * CACHE_READ_PRICE_PER_M  # remaining 4 calls read cache
)

print(f"Uncached cost: {uncached_cost:.6f}")
print(f"Cached cost:   {cached_cost:.6f}")
print(f"Savings:       {(1 - cached_cost / uncached_cost):.0%}")`,
            },
          },
          {
            title: "Test cache expiry",
            body: "Wait 6 minutes and repeat a call. The 5-minute TTL for ephemeral caches should have expired; the call should show cache_creation_input_tokens again rather than cache_read_input_tokens. This teaches you when to use ephemeral vs considering longer cache strategies.",
          },
        ],
        axiomPages: [
          { title: "Anthropic API; prompt caching", href: "/apis/anthropic-api" },
          { title: "Prompting techniques", href: "/prompting/techniques" },
          { title: "Observability platforms", href: "/observability/platforms" },
        ],
        whatNext: [
          { label: "Trace API calls end-to-end in Langfuse", href: "/practice/ai-engineer/langfuse-tracing" },
          { label: "Explore the Anthropic Batch API for async workloads", href: "/apis/anthropic-api" },
          { label: "Build a LangGraph agent with memory", href: "/practice/ai-engineer/langgraph-agent" },
        ],
      },
      {
        slug: "langfuse-tracing",
        title: "Trace an LLM call end-to-end in Langfuse",
        difficulty: "Beginner",
        tagline: "Instrument a chatbot with Langfuse spans and identify the highest-cost query.",
        description: "Add Langfuse instrumentation to an existing chatbot or LLM script. You will create traces, nest spans for retrieval and generation steps, capture latency and token cost per call, and use the Langfuse dashboard to identify the most expensive query across a simulated 10-turn session.",
        whyItMatters: "You cannot improve what you cannot measure. Latency and cost in LLM systems are almost never distributed evenly; one query type often accounts for 40% of spend. Langfuse makes this visible in minutes, and the habit of adding traces from day one prevents the situation where a production system is burning money in a way no one can explain.",
        prerequisites: [
          "A working LLM script or chatbot you can modify (even a simple Claude call loop is fine)",
          "Langfuse account (free tier is sufficient) or self-hosted instance",
          "LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables",
          "pip install langfuse anthropic",
        ],
        steps: [
          {
            title: "Initialise the Langfuse client",
            body: "Import Langfuse and create a client using your public and secret keys. Verify the connection by running langfuse.auth_check(); it will throw if the credentials are wrong. Add this to your script's initialisation block.",
          },
          {
            title: "Wrap each user turn in a trace",
            body: "For each user message, call langfuse.trace(name='chat-turn', input=user_message). This creates the top-level entry in Langfuse's UI. Pass a session_id so all 10 turns from your simulated session appear grouped together.",
          },
          {
            title: "Add a generation span for the LLM call",
            body: "Inside the trace, call trace.generation(name='claude', model='claude-sonnet-4-6', input=messages) before your API call. After the call returns, call generation.end(output=response.content, usage=response.usage). This captures the token counts and latency for the LLM step specifically.",
          },
          {
            title: "Simulate 10 turns and check the dashboard",
            body: "Run your chatbot through 10 varied queries. Open the Langfuse dashboard, navigate to your session, and look at the timeline. Identify which turn has the highest total_cost and which has the highest latency. These are usually different turns.",
          },
          {
            title: "Add a retrieval span if using RAG",
            body: "If your chatbot fetches context before calling Claude, wrap the retrieval step in trace.span(name='retrieval'). Record how many chunks were retrieved and what the search query was. Langfuse will show retrieval latency separately from generation latency; often retrieval is the bottleneck, not the model.",
          },
        ],
        axiomPages: [
          { title: "Langfuse", href: "/observability/langfuse" },
          { title: "Tracing", href: "/observability/tracing" },
          { title: "Anthropic API", href: "/apis/anthropic-api" },
        ],
        whatNext: [
          { label: "Write an LLM-as-judge eval using your traced outputs", href: "/practice/ai-engineer/llm-judge-eval" },
          { label: "Implement prompt caching and measure the latency drop in Langfuse", href: "/practice/ai-engineer/prompt-caching" },
          { label: "Build a full RAG pipeline", href: "/practice/ai-engineer/rag-pipeline" },
        ],
      },
      {
        slug: "tool-use",
        title: "Wire up Claude tool use with multiple tools",
        difficulty: "Intermediate",
        tagline: "Define 3 tools in JSON Schema, handle tool_use blocks, and chain a multi-step tool call sequence.",
        description: "Build a Python script that gives Claude three tools (a calculator, a weather lookup stub, and a file reader), handles the tool_use / tool_result turn cycle correctly, and exercises a query that requires at least two tool calls in sequence before Claude can answer.",
        whyItMatters: "Tool use is how LLMs act on the world. Most production agents are not using a framework; they are driving the tool loop directly via the API. Getting the turn cycle (user to assistant to tool_use to tool_result back to assistant) right is the single biggest source of bugs in new AI engineers' first agentic projects.",
        prerequisites: [
          "Python and the anthropic SDK installed (pip install anthropic)",
          "Basic understanding of the Messages API; system, user, and assistant roles",
          "Anthropic API key",
          "Familiarity with Python dictionaries and JSON",
        ],
        steps: [
          {
            title: "Define three tools in JSON Schema",
            body: "Write a Python list with three tool definitions: add_numbers (a, b: integers), get_weather (city: string), read_file (path: string). Each must have a name, description, and input_schema with type: object, properties, and required fields. The description is what Claude reads to decide when to call a tool; write it precisely.",
            code: {
              lang: "python",
              snippet: `tools = [
    {
        "name": "add_numbers",
        "description": "Add two integers and return the sum.",
        "input_schema": {
            "type": "object",
            "properties": {
                "a": {"type": "integer", "description": "First number"},
                "b": {"type": "integer", "description": "Second number"},
            },
            "required": ["a", "b"],
        },
    },
    {
        "name": "get_weather",
        "description": "Get the current weather for a city. Returns temperature in Celsius.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name, e.g. London"},
            },
            "required": ["city"],
        },
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file at a given path.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute file path"},
            },
            "required": ["path"],
        },
    },
]`,
            },
          },
          {
            title: "Wire the first turn",
            body: "Call messages.create with the three tools in the tools parameter. Print the stop_reason. For a query like 'What is 42 plus 58?', stop_reason should be tool_use, not end_turn. If it is end_turn, Claude answered without tools; your descriptions are too ambiguous.",
            code: {
              lang: "python",
              snippet: `import anthropic

client = anthropic.Anthropic()
messages = [{"role": "user", "content": "What is 42 plus 58?"}]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=messages,
)

print(f"stop_reason: {response.stop_reason}")   # should be "tool_use"
print(f"content blocks: {[b.type for b in response.content]}")`,
            },
          },
          {
            title: "Handle the tool_use block",
            body: "Inspect response.content for blocks with type == 'tool_use'. Extract name and input. Implement the actual logic for each tool (add_numbers is real; get_weather and read_file can return stub data). Execute the right function and collect the result.",
            code: {
              lang: "python",
              snippet: `import os

def execute_tool(name: str, input: dict) -> str:
    if name == "add_numbers":
        return str(input["a"] + input["b"])
    elif name == "get_weather":
        return f"15°C and cloudy in {input['city']}"  # stub
    elif name == "read_file":
        try:
            with open(input["path"]) as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"No such file: {input['path']}")

# Extract tool_use blocks from the response
tool_calls = [b for b in response.content if b.type == "tool_use"]
print(f"Tool called: {tool_calls[0].name}, input: {tool_calls[0].input}")`,
            },
          },
          {
            title: "Send the tool_result turn",
            body: "Append the assistant's response to messages, then append a new user message with type: 'tool_result', the tool_use_id from the block, and your result. Call messages.create again. Claude should now produce an end_turn response using the result.",
            code: {
              lang: "python",
              snippet: `# Append the assistant's response to the conversation
messages.append({"role": "assistant", "content": response.content})

# Execute each tool and collect results
tool_results = []
for block in tool_calls:
    result = execute_tool(block.name, block.input)
    tool_results.append({
        "type": "tool_result",
        "tool_use_id": block.id,
        "content": result,
    })

# Send the tool results back to Claude
messages.append({"role": "user", "content": tool_results})

final = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=messages,
)
print(f"stop_reason: {final.stop_reason}")   # should be "end_turn"
print(final.content[0].text)`,
            },
          },
          {
            title: "Chain two tool calls in a loop",
            body: "Write a query that requires two tools in sequence. Handle the loop: keep calling until stop_reason is end_turn. Print the full message history so you can see the complete turn sequence. This multi-step loop is the core pattern behind every production agent.",
            code: {
              lang: "python",
              snippet: `def run_agent(user_query: str) -> str:
    messages = [{"role": "user", "content": user_query}]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            return response.content[0].text

        # Handle all tool_use blocks in this response
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  -> calling {block.name}({block.input})")
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        messages.append({"role": "user", "content": tool_results})

# Requires two tools: add_numbers + get_weather
answer = run_agent("What is 17 plus 25, and what is the weather in Paris?")
print(answer)`,
            },
          },
          {
            title: "Add error handling for tool failures",
            body: "For the file reader, pass a path that does not exist. Return is_error: true in the tool_result. Observe how Claude handles a failed tool gracefully versus silently. A tool that reports errors explicitly produces much better agent behaviour than one that returns empty results.",
            code: {
              lang: "python",
              snippet: `def execute_tool_safe(name: str, input: dict) -> dict:
    try:
        result = execute_tool(name, input)
        return {"type": "tool_result", "content": result}
    except Exception as e:
        # is_error=True tells Claude the tool failed; it will adapt its response
        return {
            "type": "tool_result",
            "content": f"Error: {e}",
            "is_error": True,
        }

# Test: file that does not exist
answer = run_agent("Read the file /nonexistent/file.txt and tell me what is in it.")
print(answer)  # Claude should acknowledge the failure, not hallucinate content`,
            },
          },
        ],
        axiomPages: [
          { title: "Anthropic API", href: "/apis/anthropic-api" },
          { title: "Multi-agent systems", href: "/agents/multi-agent-systems" },
          { title: "MCP protocol", href: "/protocols/mcp" },
        ],
        whatNext: [
          { label: "Build a LangGraph agent that wraps these tools in a stateful loop", href: "/practice/ai-engineer/langgraph-agent" },
          { label: "Formalise tool schemas with the MCP protocol", href: "/protocols/mcp" },
          { label: "Add structured output validation to your tool results", href: "/practice/ai-engineer/structured-outputs" },
        ],
      },
      {
        slug: "structured-outputs",
        title: "Extract structured data reliably with Pydantic and Claude",
        difficulty: "Beginner",
        tagline: "Define a Pydantic model, prompt Claude to return matching JSON, and validate 20 real-world inputs.",
        description: "Write a data extraction pipeline that takes unstructured text (job postings, invoice snippets, or product descriptions) and returns validated Pydantic objects every time. You will define the schema, write a system prompt that enforces JSON output, and build a retry loop that re-prompts when validation fails.",
        whyItMatters: "Unstructured-to-structured extraction is one of the highest-ROI use cases for LLMs in production. The failure mode is not Claude refusing; it is Claude returning almost-valid JSON that breaks your downstream system. Pydantic validation plus a retry loop is the pattern that makes this production-safe.",
        prerequisites: [
          "Python with anthropic and pydantic v2 installed",
          "Basic Pydantic knowledge (defining a BaseModel with typed fields)",
          "Anthropic API key",
          "A set of 20 unstructured text samples; job postings or invoices from any public dataset",
        ],
        steps: [
          {
            title: "Define your Pydantic model",
            body: "Choose a domain (job postings work well). Define a model with 5-8 fields including required strings, optional fields, and at least one list field. Run model.model_json_schema() and inspect the output; this is what you will paste into your system prompt to tell Claude exactly what shape to produce.",
            code: {
              lang: "python",
              snippet: `from pydantic import BaseModel
from typing import Optional
import json

class JobPosting(BaseModel):
    title: str
    company: str
    location: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills: list[str]
    seniority: Optional[str] = None  # "junior" | "mid" | "senior"
    remote: bool

# Inspect the schema — this is what you paste into the system prompt
schema = json.dumps(JobPosting.model_json_schema(), indent=2)
print(schema)`,
            },
          },
          {
            title: "Write the extraction system prompt",
            body: "Instruct Claude to return only valid JSON matching the schema. Paste the json_schema() output directly into the prompt. Add one rule: if a field is not present in the text, return null for optional fields and never hallucinate values.",
            code: {
              lang: "python",
              snippet: `import anthropic, json
from pydantic import ValidationError

client = anthropic.Anthropic()

SYSTEM = f"""Extract job posting information and return ONLY valid JSON matching this schema.
If a field is absent from the text, use null for optional fields.
Never invent values.

Schema:
{schema}"""

def extract(text: str) -> JobPosting:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=SYSTEM,
        messages=[
            {"role": "user", "content": text},
            {"role": "assistant", "content": "{"},  # prefill to force JSON output
        ],
    )
    raw = "{" + response.content[0].text
    return JobPosting.model_validate(json.loads(raw))`,
            },
          },
          {
            title: "Extract from the first 5 samples",
            body: "Call Claude for each sample, parse the response text as JSON, and pass it to model.model_validate(). Print each validated object. Expect at least one Pydantic validation error on your first pass; that is normal and the point of the exercise.",
            code: {
              lang: "python",
              snippet: `samples = [
    "Senior Python Engineer at Acme Corp, London. £70-90k. Skills: Python, FastAPI, PostgreSQL. Hybrid.",
    "Junior Frontend Dev, remote. React, TypeScript required. No salary listed.",
    # ... add 3 more
]

for i, text in enumerate(samples):
    try:
        job = extract(text)
        print(f"[{i}] OK: {job.model_dump()}")
    except (ValidationError, json.JSONDecodeError) as e:
        print(f"[{i}] FAIL: {e}")`,
            },
          },
          {
            title: "Build a retry loop",
            body: "Wrap the call in a loop: try to validate; if ValidationError, append the error message to the conversation as a user turn and ask Claude to fix it. Cap retries at 3. Track how many inputs needed a retry and how many failed permanently.",
            code: {
              lang: "python",
              snippet: `def extract_with_retry(text: str, max_retries: int = 3) -> tuple[JobPosting | None, int]:
    messages = [
        {"role": "user", "content": text},
        {"role": "assistant", "content": "{"},
    ]
    for attempt in range(max_retries):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=SYSTEM,
            messages=messages,
        )
        raw = "{" + response.content[0].text
        try:
            return JobPosting.model_validate(json.loads(raw)), attempt
        except (ValidationError, json.JSONDecodeError) as e:
            # Ask Claude to fix the specific error
            messages.append({"role": "assistant", "content": response.content[0].text})
            messages.append({"role": "user", "content": f"Invalid JSON: {e}. Return corrected JSON only."})
            messages.append({"role": "assistant", "content": "{"})
    return None, max_retries`,
            },
          },
          {
            title: "Measure and tune",
            body: "Run against all 20 samples. Record: success rate on first attempt, success rate after retry, permanent failures. If the failure rate exceeds 10%, read the failed samples; the issue is almost always ambiguity in the schema description or missing null handling in the prompt.",
          },
          {
            title: "Add assistant prefill",
            body: "Update the API call to prefill the assistant turn with { to force JSON output. Compare first-attempt success rate before and after. Prefill eliminates most cases where Claude adds a preamble before the JSON and breaks json.loads().",
          },
        ],
        axiomPages: [
          { title: "Anthropic API", href: "/apis/anthropic-api" },
          { title: "Pydantic v2", href: "/python/pydantic-v2" },
          { title: "Prompt engineering", href: "/prompting/prompt-engineering" },
        ],
        whatNext: [
          { label: "Write an eval that scores extraction accuracy against a golden set", href: "/practice/ai-engineer/llm-judge-eval" },
          { label: "Add structured output to your RAG pipeline", href: "/practice/ai-engineer/rag-pipeline" },
          { label: "Learn how DSPy auto-optimises prompts like the one you just hand-wrote", href: "/prompting/dspy" },
        ],
      },
      {
        slug: "vision-pipeline",
        title: "Build a document understanding pipeline with Claude vision",
        difficulty: "Intermediate",
        tagline: "Send PDF pages as images to Claude, extract structured data, and benchmark accuracy against ground truth.",
        description: "Build a pipeline that converts a PDF document to page images, sends each page to Claude as a base64-encoded image, extracts structured information using a Pydantic schema, and evaluates extraction accuracy against a hand-labelled ground truth set of 5-10 pages.",
        whyItMatters: "Claude vision is best-in-class for document understanding; it outperforms dedicated OCR tools on complex layouts, handwriting, and tables. The pattern (PDF to images, images to Claude, output to schema) is reused across invoice processing, medical record extraction, and any workflow where data lives in scanned documents rather than databases.",
        prerequisites: [
          "Python with anthropic, pydantic, and pdf2image or pymupdf installed",
          "Anthropic API key",
          "A PDF document with extractable information; invoices, receipts, or a simple form work well",
          "A ground truth: manually label 5-10 pages with the expected extracted values",
        ],
        steps: [
          {
            title: "Convert PDF pages to images",
            body: "Use pdf2image.convert_from_path or PyMuPDF to render each PDF page as a PNG at 150-200 DPI. Save to a temporary directory. Print the pixel dimensions; Claude works best when images are between 100px and 8000px on the long edge.",
          },
          {
            title: "Encode images as base64",
            body: "Read each PNG, base64-encode it, and construct the image content block: {type: image, source: {type: base64, media_type: image/png, data: <encoded>}}. This is the exact shape the API expects. Verify the structure matches the Anthropic docs before making any API calls.",
          },
          {
            title: "Send a single page and verify",
            body: "Build a message with the image block followed by a text block asking what is on the page. Print the response. Verify Claude can read the document correctly before adding the schema. If the description is wrong, check image resolution and contrast.",
          },
          {
            title: "Add schema extraction",
            body: "Define a Pydantic model for the document type (for a receipt: vendor, date, line_items as a list, total, currency). Update the prompt to return JSON matching the schema. Validate the response. Iterate on the prompt until the first page extracts cleanly.",
          },
          {
            title: "Process all pages and aggregate",
            body: "Loop over all pages, extract, and collect results. For multi-page documents, decide: does each page stand alone, or do you need to merge page results into a single document-level object? Implement the merge if needed.",
          },
          {
            title: "Evaluate accuracy against ground truth",
            body: "For each labelled field in your ground truth, compare the extracted value to the expected value. Report per-field accuracy. Identify which fields Claude gets wrong most often; these are usually amounts with ambiguous formatting or fields where the document layout varies between pages.",
          },
        ],
        axiomPages: [
          { title: "Vision models", href: "/multimodal/vision-models" },
          { title: "Anthropic API", href: "/apis/anthropic-api" },
          { title: "RAG pipeline overview", href: "/rag/pipeline" },
        ],
        whatNext: [
          { label: "Add the extracted structured data to a Chroma vector store", href: "/practice/ai-engineer/rag-pipeline" },
          { label: "Write an LLM-as-judge eval that scores extraction quality", href: "/practice/ai-engineer/llm-judge-eval" },
          { label: "Fine-tune a small model for your specific document type", href: "/practice/ai-engineer/fine-tune-lora" },
        ],
      },
      {
        slug: "fine-tune-lora",
        title: "Fine-tune a small model with QLoRA",
        difficulty: "Advanced",
        tagline: "Prepare a dataset, run a QLoRA fine-tune on a 7B model, and measure task performance before and after.",
        description: "Fine-tune a 7B instruction-tuned model (Llama 3.1 8B or Mistral 7B) for a specific task using QLoRA. You will format a training dataset in chat template format, run supervised fine-tuning with TRL's SFTTrainer, push the LoRA adapter to HuggingFace Hub, and benchmark the fine-tuned model against the base model on a 20-question eval set.",
        whyItMatters: "Fine-tuning is how you move from a model that can do anything to a model that is reliably excellent at one thing. QLoRA makes this trainable on a single consumer GPU by quantising the base model to 4-bit and training only small adapter matrices. The workflow; dataset format, training loop, eval before and after; is the same whether you are tuning for tone, domain knowledge, or a strict output format.",
        prerequisites: [
          "Python with transformers, peft, trl, bitsandbytes, and datasets installed",
          "A GPU with at least 10GB VRAM (RTX 3080/4070 or better), or a Colab A100 instance",
          "HuggingFace account with a write-access token",
          "A narrow task in mind: classification, extraction, or following a specific output format all work well",
        ],
        steps: [
          {
            title: "Pick a task and prepare your dataset",
            body: "Choose a task with clear right/wrong answers; sentiment classification or entity extraction works well for a first fine-tune. Collect or generate 200-500 examples. Format each as a chat turn: system message defining the task, user message with the input, assistant message with the correct output. Save as a Hugging Face Dataset.",
          },
          {
            title: "Load the base model in 4-bit",
            body: "Use BitsAndBytesConfig with load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16, and bnb_4bit_quant_type='nf4'. Load the model with from_pretrained and the quantization config. Print the memory footprint before and after; you should see roughly a 4x reduction.",
          },
          {
            title: "Configure LoRA with PEFT",
            body: "Create a LoraConfig with r=16, lora_alpha=32, target_modules pointing to the query and value projection layers (q_proj, v_proj for Llama), lora_dropout=0.05, task_type=CAUSAL_LM. Apply with get_peft_model. Print trainable parameters; they should be under 1% of total parameters.",
          },
          {
            title: "Run the fine-tune",
            body: "Configure SFTTrainer with your dataset, model, tokenizer, and training args: 3 epochs, per_device_train_batch_size=4, gradient_accumulation_steps=4, learning_rate=2e-4, bf16=True. Run trainer.train(). Monitor loss; it should decrease over the first epoch. A flat or increasing loss usually means the data format is wrong.",
          },
          {
            title: "Evaluate before and after",
            body: "Before training, run your 20-question eval against the base model and record scores. After training, load the merged model (base + LoRA adapter) and run the same eval. Calculate the delta. A 20-40% improvement on a narrow task is typical. Under 10% usually means your dataset is too small or too noisy.",
          },
          {
            title: "Push and document",
            body: "Push the LoRA adapter to HuggingFace Hub with model.push_to_hub. Write a model card noting: base model, task, dataset size, training config, and eval score. The card is what future-you needs when you come back to this adapter in 3 months and cannot remember what it does.",
          },
        ],
        axiomPages: [
          { title: "LoRA and QLoRA", href: "/fine-tuning/lora-qlora" },
          { title: "Fine-tuning overview", href: "/llms/fine-tuning-overview" },
          { title: "DPO and preference tuning", href: "/fine-tuning/dpo" },
        ],
        whatNext: [
          { label: "Improve alignment with DPO using preference data", href: "/fine-tuning/dpo" },
          { label: "Write an eval to benchmark the fine-tuned model systematically", href: "/practice/ai-engineer/llm-judge-eval" },
          { label: "Use the fine-tuned model as the backbone for a RAG pipeline", href: "/practice/ai-engineer/rag-pipeline" },
        ],
      },
    ],
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description: "Clean code, design patterns, system design, and production-grade implementation.",
    exercises: [
      {
        slug: "refactor-god-class",
        title: "Refactor a God class using SOLID",
        difficulty: "Beginner",
        tagline: "Split a 50-line class doing HTTP, database, and email into three single-responsibility classes.",
        description: "Take a realistic God class that handles HTTP request parsing, database writes, and email sending all in one place. Refactor it into three focused classes connected by dependency injection, applying the Single Responsibility and Dependency Inversion principles explicitly. The interface should not change from the caller's perspective.",
        whyItMatters: "God classes are the most common form of technical debt in production codebases. They are hard to test, hard to change, and impossible to reuse. Learning to decompose them using SOLID is not academic; it is the core skill that separates engineers who can work in any codebase from those who can only work in their own.",
        prerequisites: [
          "Comfortable reading and writing Python or TypeScript classes",
          "Basic understanding of what a class constructor and instance method are",
          "Some exposure to the idea that functions should do one thing",
          "No prior knowledge of SOLID required; you will learn it by doing",
        ],
        steps: [
          {
            title: "Read the God class and list its responsibilities",
            body: "Write down every distinct thing the class does. Do not look for patterns yet; just list actions. A well-decomposed God class will have 3-5 clearly separable responsibilities. If you find more than 6, it may need two rounds of refactoring.",
          },
          {
            title: "Define interfaces for each responsibility",
            body: "Before writing any classes, write Python Protocols or TypeScript interfaces for each responsibility. An interface for a database writer might have a single method: save(record) -> None. Writing interfaces first forces you to think about contracts before implementation.",
          },
          {
            title: "Extract each class",
            body: "Create one class per responsibility, each implementing its interface. Move the relevant methods from the God class verbatim first; do not improve them yet. Verify each class can be instantiated and called in isolation before connecting them.",
          },
          {
            title: "Connect via dependency injection",
            body: "Rewrite the original class to accept the three new classes in its constructor rather than creating them internally. The caller now controls which implementations are injected. This is what makes the system testable; you can inject a mock database writer without changing the class.",
          },
          {
            title: "Write three unit tests",
            body: "Write one test per extracted class, injecting mocks for any dependencies. If a test requires more than 5 lines of setup, your decomposition may not be clean enough. The tests should be fast, isolated, and read like specifications.",
          },
        ],
        axiomPages: [
          { title: "Software design principles (SOLID)", href: "/cs-fundamentals/software-design-principles" },
          { title: "Dependency injection", href: "/cs-fundamentals/dependency-injection" },
          { title: "Clean code", href: "/cs-fundamentals/clean-code" },
          { title: "OOP patterns", href: "/cs-fundamentals/oop-patterns" },
        ],
        whatNext: [
          { label: "Write tests for your new classes using TDD", href: "/practice/software-engineer/tdd-log-parser" },
          { label: "Implement a circuit breaker on your HTTP layer", href: "/practice/software-engineer/circuit-breaker" },
          { label: "Design a multi-tenant schema for the data layer", href: "/practice/software-engineer/multi-tenant-schema" },
        ],
      },
      {
        slug: "circuit-breaker",
        title: "Implement a circuit breaker decorator",
        difficulty: "Intermediate",
        tagline: "A Python decorator that opens after 3 failures, half-opens after 30 seconds, closes on success.",
        description: "Build a production-grade circuit breaker as a Python decorator. It should track consecutive failures, open the circuit (raising an error immediately without calling the wrapped function) after 3 failures, transition to half-open after 30 seconds, and close again when the next call succeeds.",
        whyItMatters: "Circuit breakers prevent a slow or failing downstream service from cascading into a full system outage. Without them, threads pile up waiting for a timeout, memory exhausts, and a single dependency brings down an entire API. Every experienced backend engineer has been paged for exactly this at least once.",
        prerequisites: [
          "Comfortable writing Python decorators (the @functools.wraps pattern)",
          "Understanding of what an exception is and how to catch and re-raise",
          "Familiarity with time.time() or datetime for measuring elapsed time",
          "Basic understanding of why microservices need failure isolation",
        ],
        steps: [
          {
            title: "Define the state machine",
            body: "The circuit breaker has three states: CLOSED (normal operation), OPEN (failing fast), and HALF_OPEN (testing recovery). Draw the state transitions on paper before writing code: failure threshold in CLOSED -> OPEN; timeout elapsed in OPEN -> HALF_OPEN; success in HALF_OPEN -> CLOSED; failure in HALF_OPEN -> OPEN.",
          },
          {
            title: "Write the CircuitBreaker class",
            body: "Create a class that holds state, failure count, and the time the circuit opened. Implement a call() method that checks state and either executes the function or raises CircuitOpenError immediately. Keep the class separate from the decorator; this makes it testable and reusable.",
          },
          {
            title: "Wrap it as a decorator",
            body: "Write the @circuit_breaker decorator that creates a CircuitBreaker instance (or accepts one as an argument) and wraps the target function. Use functools.wraps to preserve the wrapped function's name and docstring. Test that the decorator can be applied to both sync and async functions.",
          },
          {
            title: "Test all three state transitions",
            body: "Write four tests: one for normal operation, one that triggers the open state after 3 failures, one that verifies calls fail fast while open, and one that verifies recovery via the half-open state. Mock time.time() to test the 30-second timeout without actually waiting.",
          },
          {
            title: "Add a fallback parameter",
            body: "Allow the decorator to accept an optional fallback function that is called when the circuit is open instead of raising an error. This is how production circuit breakers work; they return stale cache or a degraded response rather than a hard error.",
          },
        ],
        axiomPages: [
          { title: "Microservices patterns", href: "/cs-fundamentals/microservices-patterns" },
          { title: "Error handling patterns", href: "/cs-fundamentals/error-handling-patterns" },
          { title: "Distributed systems", href: "/cs-fundamentals/distributed-systems" },
        ],
        whatNext: [
          { label: "Add observability; emit metrics when the circuit trips", href: "/cs-fundamentals/observability-se" },
          { label: "Combine with a retry decorator using exponential backoff", href: "/cs-fundamentals/error-handling-patterns" },
          { label: "Design a multi-tenant schema for your backend", href: "/practice/software-engineer/multi-tenant-schema" },
        ],
      },
      {
        slug: "tdd-log-parser",
        title: "TDD a log line parser",
        difficulty: "Beginner",
        tagline: "Build a structured log parser using strict red-green-refactor; all tests written first.",
        description: "Parse structured log lines of the format [TIMESTAMP] LEVEL: message into a typed object using test-driven development. You must write all five tests before writing a single line of implementation. The exercise is about the discipline of the process, not the complexity of the problem.",
        whyItMatters: "TDD feels slower until the moment you need to change something. Writing tests first forces you to think about the interface before the implementation; and interfaces that are easy to test are almost always easier to use. The log parser is deliberately simple so the entire mental budget goes on learning the red-green-refactor rhythm.",
        prerequisites: [
          "Python with pytest installed, or TypeScript with Vitest",
          "Understanding of what a test assertion is",
          "No prior TDD experience required; this is a first-principles exercise",
          "A text editor with good test runner integration (VS Code with pytest extension works well)",
        ],
        steps: [
          {
            title: "Define the interface (no implementation yet)",
            body: "Write the function signature only: parse_log(line: str) -> LogEntry where LogEntry is a dataclass or TypedDict with timestamp: datetime, level: str, and message: str. Do not write any logic; just the signature and the type. This is the contract your tests will verify.",
          },
          {
            title: "Write all five tests (red)",
            body: "Write: test_parses_info_level, test_parses_error_level, test_extracts_timestamp, test_extracts_message_with_spaces, and test_raises_on_malformed_input. Run them; all should fail (red). If any pass without implementation, your test is wrong.",
          },
          {
            title: "Write the minimum implementation (green)",
            body: "Write the simplest code that makes all five tests pass. Do not handle edge cases that are not tested. Do not add logging, error codes, or configuration. The implementation should be shorter than the tests; that is a good sign.",
          },
          {
            title: "Refactor (still green)",
            body: "Now improve the implementation without changing the tests. Extract the regex pattern as a constant. Give the error message a clear description of what was malformed. Run the tests after every change; if a test fails, undo and try again.",
          },
          {
            title: "Add two edge case tests and make them pass",
            body: "Add tests for: a log line with a colon in the message (common failure point), and a timestamp in a slightly different format. Watch them fail, fix the implementation, watch them pass. This is the full TDD loop; you have now done it seven times.",
          },
        ],
        axiomPages: [
          { title: "TDD for software engineers", href: "/cs-fundamentals/tdd-se" },
          { title: "pytest patterns", href: "/test-automation/pytest-patterns" },
          { title: "Clean code", href: "/cs-fundamentals/clean-code" },
        ],
        whatNext: [
          { label: "Apply TDD to the circuit breaker exercise", href: "/practice/software-engineer/circuit-breaker" },
          { label: "Explore property-based testing with Hypothesis", href: "/cs-fundamentals/tdd-se" },
          { label: "Refactor a God class to practise decomposition", href: "/practice/software-engineer/refactor-god-class" },
        ],
      },
      {
        slug: "multi-tenant-schema",
        title: "Design a multi-tenant Postgres schema",
        difficulty: "Intermediate",
        tagline: "Row-level security policies that isolate tenant data; verified with two test tenants.",
        description: "Design a Postgres schema for a multi-tenant SaaS product where each tenant's data is completely isolated. You will implement row-level security (RLS) policies, create two test tenants with overlapping data shapes, and verify that queries from one tenant cannot return rows belonging to the other; even with direct SQL access.",
        whyItMatters: "Multi-tenancy done wrong is a security incident waiting to happen. Row-level security pushes isolation into the database engine rather than relying on application code to get it right every time. Understanding RLS also makes you dangerous in any SaaS backend context; it is one of the most underused features in Postgres.",
        prerequisites: [
          "Postgres running locally (Docker is fine: docker run -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres)",
          "psql or a GUI client like DBeaver",
          "Understanding of what a foreign key and JOIN are",
          "Basic familiarity with SQL CREATE TABLE and INSERT",
        ],
        steps: [
          {
            title: "Design the schema",
            body: "Create three tables: tenants (id, name, created_at), users (id, tenant_id FK, email), and resources (id, tenant_id FK, name, data). Every tenant-scoped table has a tenant_id column. This is the shared-schema, row-level isolation model; one schema, many tenants, policies enforce the wall.",
          },
          {
            title: "Enable RLS and write the policy",
            body: "Run ALTER TABLE resources ENABLE ROW LEVEL SECURITY. Then create a policy: CREATE POLICY tenant_isolation ON resources USING (tenant_id = current_setting('app.current_tenant_id')::uuid). This policy fires on every SELECT, INSERT, UPDATE, and DELETE; the tenant_id must match the session variable.",
          },
          {
            title: "Create two tenants and seed data",
            body: "Insert two tenant rows and create 5 resources for each tenant. Make sure some resource names overlap between tenants (e.g. both have a resource called 'dashboard'); this is the test that catches permissive policies.",
          },
          {
            title: "Verify isolation",
            body: "Set app.current_tenant_id to tenant A's ID and SELECT * FROM resources. You should see exactly 5 rows. Then set it to tenant B and repeat. Then try without setting the variable at all; the query should return zero rows (or error, depending on your default deny policy).",
          },
          {
            title: "Test with a bypassing role",
            body: "Create a Postgres role with BYPASSRLS privilege. Run the same queries with this role and verify you see all rows across both tenants. This confirms RLS is working for normal roles and shows how to implement admin-level access for your own support tooling.",
          },
        ],
        axiomPages: [
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "Database transactions", href: "/cs-fundamentals/database-transactions" },
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
        ],
        whatNext: [
          { label: "Fix an N+1 query in SQLAlchemy against this schema", href: "/practice/software-engineer/fix-n-plus-one" },
          { label: "Add audit logging with Postgres triggers", href: "/cs-fundamentals/database-design" },
          { label: "Explore CQRS for high-read SaaS architectures", href: "/cs-fundamentals/cqrs-event-sourcing" },
        ],
      },
      {
        slug: "fix-n-plus-one",
        title: "Find and fix an N+1 query",
        difficulty: "Intermediate",
        tagline: "Trigger 100 extra queries with lazy loading, then fix it with selectinload.",
        description: "Set up SQLAlchemy models with a lazy-loaded relationship between Orders and Customers. Load 100 order records and access each order's customer name in a loop, deliberately triggering the N+1 pattern. Measure the query count using SQLAlchemy's event system, fix it with selectinload, and confirm the count drops from 101 to 1.",
        whyItMatters: "N+1 queries are responsible for a disproportionate share of production database load. They are invisible in development (where N is small), catastrophic in production (where N is 10,000), and trivially fixable once you know what to look for. The ability to spot one in a stack trace or a slow query log is one of the most commercially valuable debugging skills a backend engineer has.",
        prerequisites: [
          "Python with sqlalchemy and a database (SQLite is fine for this exercise)",
          "Basic understanding of what an ORM is and what a relationship() means",
          "Understanding of what a SQL JOIN is",
          "pip install sqlalchemy",
        ],
        steps: [
          {
            title: "Define models with a lazy relationship",
            body: "Create Customer (id, name) and Order (id, customer_id FK, amount) SQLAlchemy models. Define the relationship on Order as: customer = relationship('Customer', lazy='select'). This is the default and the source of the N+1.",
          },
          {
            title: "Seed 100 orders across 10 customers",
            body: "Insert 10 customers and 100 orders distributed across them. Use a session.bulk_insert_mappings for speed. Verify the data is there with a simple SELECT before moving to the measurement step.",
          },
          {
            title: "Trigger and count the N+1",
            body: "Add a SQLAlchemy event listener on engine 'before_cursor_execute' that increments a counter. Load all orders with session.query(Order).all() and then loop over them accessing order.customer.name. Print the query count; it should be 101: 1 for orders, 100 for customer lookups.",
          },
          {
            title: "Fix with selectinload",
            body: "Change the query to: session.query(Order).options(selectinload(Order.customer)).all(). Reset the counter and run the same loop. The count should be 2: 1 for orders, 1 for all customers via an IN clause. Print both queries to confirm this is what happened.",
          },
          {
            title: "Understand when to use joinedload vs selectinload",
            body: "Replace selectinload with joinedload and print the generated SQL. You will see a JOIN instead of a second SELECT. Run both versions on 100 and then 10,000 rows and note which is faster. selectinload wins when the related table is large; joinedload wins for simple one-to-one cases.",
          },
        ],
        axiomPages: [
          { title: "SQLAlchemy", href: "/python/sqlalchemy" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "Performance optimisation", href: "/cs-fundamentals/performance-optimisation-se" },
        ],
        whatNext: [
          { label: "Design a multi-tenant schema that this query would run against", href: "/practice/software-engineer/multi-tenant-schema" },
          { label: "Fix the same N+1 in the Analytics Engineer path", href: "/practice/analytics-engineer/fix-n-plus-one-sqlalchemy" },
          { label: "Apply query analysis to a real slow query log", href: "/cs-fundamentals/database-transactions" },
        ],
      },
      {
        slug: "async-python-patterns",
        title: "Build a concurrent API client with asyncio and httpx",
        difficulty: "Intermediate",
        tagline: "Fetch 50 URLs concurrently, cap with a semaphore, and measure the speedup vs sequential.",
        description: "Write an async Python script that fetches data from 50 endpoints concurrently using httpx and asyncio, applies a semaphore to cap concurrency at 10, handles retries with exponential backoff for 429 and 5xx responses, and measures total elapsed time against a sequential baseline.",
        whyItMatters: "Most I/O-bound Python code in production either blocks the event loop accidentally or spawns too many concurrent requests and gets rate-limited. Understanding asyncio; coroutines, tasks, semaphores, and gather; is what separates Python engineers who can actually use the async ecosystem from those who copy-paste it and wonder why it is slow.",
        prerequisites: [
          "Python 3.10+ with httpx installed (pip install httpx)",
          "Basic Python (functions, loops, exception handling)",
          "No prior async experience required; you will build from first principles",
        ],
        steps: [
          {
            title: "Write a synchronous baseline",
            body: "Use httpx.Client (the sync version) to fetch each URL in a for loop. Wrap in time.perf_counter() calls. Record total elapsed time for 10 URLs. This is your benchmark to beat.",
          },
          {
            title: "Write the first async version",
            body: "Replace with httpx.AsyncClient and async for. Wrap in asyncio.run(). Measure again. You will likely see similar performance; sequential async is not faster, it just does not block the thread. Understanding this distinction is the point.",
          },
          {
            title: "Use asyncio.gather for true concurrency",
            body: "Wrap each fetch in an async task, collect them in a list, and pass the list to asyncio.gather(). Measure again. You should see near-linear speedup up to the limit of your network. Print per-URL elapsed time to verify they overlap.",
          },
          {
            title: "Add a semaphore to cap concurrency",
            body: "Create asyncio.Semaphore(10). Wrap each fetch in async with sem:. Without a semaphore, 50 concurrent requests can trigger rate limits or overwhelm slow servers. Measure throughput at sem=5, 10, 20, 50 and find the sweet spot.",
          },
          {
            title: "Add retry with exponential backoff",
            body: "Wrap the fetch in a loop: catch httpx.HTTPStatusError for 429 and 5xx, await asyncio.sleep(2 ** attempt + random.random()), and retry up to 3 times. Verify the retry fires by temporarily pointing at a URL that returns 500.",
          },
          {
            title: "Compare all three versions",
            body: "Print a summary table: sequential, sequential async, concurrent with semaphore. For 50 requests hitting a remote API, the concurrent version is typically 5-20x faster. Identify the bottleneck; it is almost always the semaphore size or server-side rate limits, not Python overhead.",
          },
        ],
        axiomPages: [
          { title: "Async Python", href: "/python/async-python" },
          { title: "FastAPI", href: "/web-frameworks/fastapi" },
        ],
        whatNext: [
          { label: "Apply this pattern to a FastAPI endpoint that fans out to multiple APIs", href: "/web-frameworks/fastapi" },
          { label: "Add a circuit breaker to stop cascading failures from slow upstreams", href: "/practice/software-engineer/circuit-breaker" },
          { label: "Use the concurrency pattern to parallelise LLM API calls", href: "/practice/ai-engineer/llm-judge-eval" },
        ],
      },
      {
        slug: "redis-caching",
        title: "Implement cache-aside with Redis",
        difficulty: "Beginner",
        tagline: "Add a Redis cache to a slow function, measure hit rate and latency, and handle cache invalidation.",
        description: "Add a cache-aside layer to an existing Python function that calls a slow external API or database. You will implement get-on-hit, fetch-and-store-on-miss, TTL-based expiry, and explicit invalidation, then measure cache hit rate and latency across 100 calls with realistic key distribution.",
        whyItMatters: "Caching is the most impactful single optimisation for read-heavy systems. Cache-aside gives you full control: your application reads from the cache, fetches on miss, and invalidates when data changes. Getting the TTL wrong in either direction (too short, too long) is the most common caching bug in production; and you will reproduce both failure modes in this exercise.",
        prerequisites: [
          "Python with redis-py installed (pip install redis)",
          "Redis running locally (docker run -d -p 6379:6379 redis:alpine is the fastest way)",
          "A slow function to cache; a time.sleep(0.1) stub works fine, or use a real database query",
        ],
        steps: [
          {
            title: "Set up the Redis connection",
            body: "Create a redis.Redis client pointing at localhost:6379. Run client.ping(); it should return True. Write a helper that serialises Python objects to JSON for storage and deserialises on read.",
          },
          {
            title: "Implement cache-aside read",
            body: "Write a get_cached(key, fetch_fn, ttl=60) function: try client.get(key); if a hit, deserialise and return; if a miss, call fetch_fn(), store the result with client.setex(key, ttl, serialised), and return the result. This is the complete cache-aside pattern in under 10 lines.",
          },
          {
            title: "Wrap a slow function",
            body: "Apply get_cached to a function that simulates a 100ms call. Call it 10 times with the same key. Measure total elapsed time; the first call should be slow, calls 2-10 should be near-instant. Print hit/miss per call.",
          },
          {
            title: "Test TTL expiry",
            body: "Set TTL to 2 seconds. Call the function, wait 3 seconds, call again. The second call should be a miss even though you just fetched. This is the most common caching surprise: stale data after TTL expiry. Document the invariant for your team.",
          },
          {
            title: "Implement explicit invalidation",
            body: "Write an invalidate(key) function that runs client.delete(key). Call it after a simulated write operation. Verify the next read is a miss. The cache and the database are inconsistent between writes and the next TTL expiry unless you invalidate explicitly.",
          },
          {
            title: "Measure cache hit rate",
            body: "Run 100 calls with a Zipf key distribution: a few keys very frequently, many keys rarely. Print hit rate, average latency per hit, average latency per miss, and overall p95 latency. A well-tuned cache should hit 80%+ on typical read workloads.",
          },
        ],
        axiomPages: [
          { title: "Design patterns", href: "/cs-fundamentals/design-patterns" },
          { title: "System design", href: "/cs-fundamentals/system-design" },
        ],
        whatNext: [
          { label: "Add a circuit breaker to protect against Redis downtime", href: "/practice/software-engineer/circuit-breaker" },
          { label: "Apply cache-aside to a RAG pipeline to avoid re-embedding identical queries", href: "/practice/ai-engineer/rag-pipeline" },
          { label: "Extend to a write-through cache for a database-backed API", href: "/cs-fundamentals/system-design" },
        ],
      },
      {
        slug: "event-sourcing",
        title: "Build an append-only event store with projection and replay",
        difficulty: "Advanced",
        tagline: "Implement event sourcing for a bank account domain, replay history from scratch, and query point-in-time state.",
        description: "Implement a minimal event sourcing system for a bank account domain: define domain events (AccountOpened, MoneyDeposited, MoneyWithdrawn), build an append-only event store backed by a PostgreSQL table, write a projection that replays events to derive current account state, and verify that replaying the full history produces identical results to the current state.",
        whyItMatters: "Event sourcing makes auditing, debugging, and temporal queries trivial; because you never mutate state, you can reconstruct what any entity looked like at any point in time. Building it from scratch forces you to confront the real constraints: event ordering, schema versioning, and the projection performance trade-off that frameworks hide from you.",
        prerequisites: [
          "Python with sqlalchemy 2.0 and psycopg2 installed",
          "A running PostgreSQL instance (Docker works: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres)",
          "Comfort with Python dataclasses or Pydantic models",
          "Basic SQL (CREATE TABLE, INSERT, SELECT ORDER BY)",
        ],
        steps: [
          {
            title: "Define your domain events",
            body: "Create a Python dataclass or Pydantic model for each event: AccountOpened(account_id, owner_name, timestamp), MoneyDeposited(account_id, amount, timestamp), MoneyWithdrawn(account_id, amount, timestamp). Each event is immutable; no methods, no mutation, just data.",
          },
          {
            title: "Create the event store table",
            body: "Write CREATE TABLE with: id SERIAL PRIMARY KEY, aggregate_id UUID, event_type VARCHAR, payload JSONB, sequence_number BIGINT, occurred_at TIMESTAMPTZ. The sequence_number is per-aggregate; it is what you use to detect concurrency conflicts. Run the migration.",
          },
          {
            title: "Implement append",
            body: "Write an append(event) function that serialises the event to JSON, increments the sequence number for the aggregate, and INSERTs a row. Raise a concurrency error if the expected sequence number does not match. Test it: open an account, deposit, withdraw, and verify 3 rows appear.",
          },
          {
            title: "Implement replay",
            body: "Write a replay(aggregate_id) function that SELECTs all events ORDER BY sequence_number and applies each to an initial state dict using a match/case or dispatch table. The final state is the account balance. Verify it matches what you expect from the 3 events you stored.",
          },
          {
            title: "Build a snapshot for performance",
            body: "For accounts with 1000+ events, replay is slow. Add a snapshot table that stores the projected state at a given sequence number. Update replay to: load the latest snapshot, then apply only events after that sequence number. Measure replay time before and after for 10,000 events.",
          },
          {
            title: "Test temporal queries",
            body: "Query events for a specific account up to a given timestamp. Replay up to that point. Verify you can reconstruct the account state at any point in its history. This is the feature that makes event sourcing worth the complexity; in a CRUD system, this would require a full audit log redesign.",
          },
        ],
        axiomPages: [
          { title: "Design patterns", href: "/cs-fundamentals/design-patterns" },
          { title: "System design", href: "/cs-fundamentals/system-design" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
        ],
        whatNext: [
          { label: "Design the multi-tenant schema that would store events per tenant", href: "/practice/software-engineer/multi-tenant-schema" },
          { label: "Profile the event store queries with the N+1 exercise techniques", href: "/practice/software-engineer/fix-n-plus-one" },
          { label: "Explore how dbt snapshots apply the same pattern to analytics data", href: "/practice/analytics-engineer/scd-type2" },
        ],
      },
    ],
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    description: "AWS, containers, Kubernetes, infrastructure as code, and cost engineering.",
    exercises: [
      {
        slug: "containerise-fastapi",
        title: "Containerise and deploy a FastAPI app",
        difficulty: "Beginner",
        tagline: "Multi-stage Dockerfile, health check endpoint, non-root user; deployed to ECS Fargate.",
        description: "Take a simple FastAPI application and write a production-quality Dockerfile: multi-stage build to minimise image size, a /health endpoint that returns 200, and a non-root user for the container process. Deploy the image to AWS ECS Fargate via ECR and confirm the health check passes in the AWS console.",
        whyItMatters: "Containerisation is now a baseline skill for any cloud role, and the gap between a working Dockerfile and a production-ready one is large. Multi-stage builds, non-root users, and health checks are not optional in a real environment; they are the difference between an image your security team accepts and one they reject at the gate.",
        prerequisites: [
          "Docker installed and running locally (docker build and docker run work)",
          "AWS account with ECS, ECR, and IAM access",
          "AWS CLI configured with credentials (aws configure)",
          "A simple FastAPI app; even a single route returning JSON is sufficient",
        ],
        steps: [
          {
            title: "Add a /health endpoint",
            body: "Add a GET /health route to your FastAPI app that returns {status: ok} with a 200 status code. This is the endpoint ECS will poll to know whether your container is healthy. Keep it dependency-free; it should return 200 even if your database is unavailable.",
          },
          {
            title: "Write the multi-stage Dockerfile",
            body: "Stage 1 (builder): use python:3.12-slim, install dependencies into a virtual environment. Stage 2 (runtime): copy only the venv from the builder, not the build toolchain. This typically halves the final image size. Add EXPOSE 8000 and a CMD that starts uvicorn.",
          },
          {
            title: "Add a non-root user",
            body: "In the runtime stage, add: RUN adduser --disabled-password appuser and USER appuser before the CMD. Build and run the container locally. Exec into it with docker exec -it <id> sh and verify whoami returns appuser, not root.",
          },
          {
            title: "Push to ECR",
            body: "Create an ECR repository, authenticate Docker to ECR with aws ecr get-login-password, tag your image, and push it. Verify the image appears in the ECR console before touching ECS; it is a common mistake to push to the wrong registry URI.",
          },
          {
            title: "Deploy to ECS Fargate and verify the health check",
            body: "Create an ECS task definition pointing to your ECR image. Configure the health check as: command ['CMD-SHELL', 'curl -f http://localhost:8000/health || exit 1'], interval 30s, timeout 5s. Deploy the task and watch the health check status in the ECS console; it should transition from UNKNOWN to HEALTHY within 90 seconds.",
          },
        ],
        axiomPages: [
          { title: "AWS ECS", href: "/cloud/aws-ecs" },
          { title: "CI/CD pipelines", href: "/cs-fundamentals/cicd-pipelines" },
          { title: "AWS core concepts", href: "/cloud/aws-core" },
        ],
        whatNext: [
          { label: "Build a CI/CD pipeline to deploy this automatically", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Provision the ECS infrastructure with Terraform", href: "/practice/cloud-engineer/terraform-infra" },
          { label: "Add Kubernetes autoscaling for production load", href: "/practice/cloud-engineer/kubernetes-autoscaling" },
        ],
      },
      {
        slug: "terraform-infra",
        title: "Provision infrastructure with Terraform",
        difficulty: "Intermediate",
        tagline: "S3 bucket with versioning, CloudFront distribution, and OAI; destroyed and recreated cleanly.",
        description: "Use Terraform to provision an S3 bucket with versioning enabled, a CloudFront distribution fronting it, and an Origin Access Identity so the bucket is only accessible via CloudFront. Write the configuration, run terraform plan and apply, then destroy and recreate it cleanly to confirm there is no state drift.",
        whyItMatters: "Manually provisioned infrastructure is infrastructure that cannot be reproduced, audited, or handed off. Terraform turns infrastructure into reviewable code and makes disaster recovery a matter of running one command. The destroy-and-recreate discipline catches the difference between what your code says and what AWS actually created.",
        prerequisites: [
          "Terraform installed (terraform --version works)",
          "AWS account with S3 and CloudFront permissions",
          "AWS CLI configured",
          "Basic understanding of what S3 and CloudFront are at a conceptual level",
        ],
        steps: [
          {
            title: "Write the S3 bucket resource",
            body: "Define an aws_s3_bucket resource with a unique name. Add aws_s3_bucket_versioning to enable versioning, and aws_s3_bucket_public_access_block to block all public access. Run terraform plan; verify the plan shows 3 resources to create before applying.",
          },
          {
            title: "Create the Origin Access Identity",
            body: "Define an aws_cloudfront_origin_access_identity resource. Then write an aws_s3_bucket_policy that allows only the OAI's principal to GetObject from the bucket. This is the pattern that keeps your bucket private while allowing CloudFront to serve from it.",
          },
          {
            title: "Write the CloudFront distribution",
            body: "Define an aws_cloudfront_distribution with the S3 bucket as origin, the OAI attached, HTTPS redirect enforced, and a price_class of PriceClass_100 (cheapest, US/EU only). Output the distribution domain name so you can test it.",
          },
          {
            title: "Apply and verify",
            body: "Run terraform apply. Upload a test file to the S3 bucket and fetch it via the CloudFront domain. Confirm direct S3 access returns a 403. Confirm CloudFront access returns a 200. Check the Terraform state file to understand what state drift would look like.",
          },
          {
            title: "Destroy and recreate",
            body: "Run terraform destroy --auto-approve. Verify everything is gone in the AWS console. Run terraform apply again. Compare the output of both applies; they should be identical. If there are differences, your configuration is not fully declarative.",
          },
        ],
        axiomPages: [
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "CI/CD pipelines", href: "/cs-fundamentals/cicd-pipelines" },
          { title: "FinOps and cost management", href: "/cloud/finops-cost-management" },
        ],
        whatNext: [
          { label: "Automate the terraform apply in a GitHub Actions pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Set up cost alerts for the infrastructure you created", href: "/practice/cloud-engineer/billing-alerts" },
          { label: "Provision ECS Fargate using the same pattern", href: "/practice/cloud-engineer/containerise-fastapi" },
        ],
      },
      {
        slug: "github-actions-cicd",
        title: "Build a CI/CD pipeline with GitHub Actions",
        difficulty: "Beginner",
        tagline: "Lint, test, build Docker image, push to ECR, deploy to ECS; failing fast on test failure.",
        description: "Write a GitHub Actions workflow that runs lint, runs tests, builds a Docker image, pushes it to Amazon ECR, and triggers an ECS service update on every push to main. The pipeline must fail fast; if tests fail, the Docker build should never run.",
        whyItMatters: "A CI/CD pipeline is the enforcement mechanism for every quality standard you care about. Without it, lint and tests are optional suggestions. With it, a broken build is immediately visible to the whole team. Building one from scratch teaches you exactly what each step does; which matters when it breaks at 2am.",
        prerequisites: [
          "GitHub repository with a Dockerised application (the previous exercise works perfectly)",
          "AWS account with ECR and ECS access",
          "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY stored as GitHub repository secrets",
          "ECS cluster and service already created (manually or via Terraform)",
        ],
        steps: [
          {
            title: "Write the workflow trigger and environment",
            body: "Create .github/workflows/deploy.yml. Set the trigger to push on the main branch. Define environment variables for your ECR registry, repository name, and ECS service name at the top of the file; this makes the workflow reusable without editing step commands.",
          },
          {
            title: "Add lint and test jobs",
            body: "Create a job called test. Steps: checkout code, set up Python/Node, install dependencies, run linter, run tests. Set continue-on-error: false (the default). This job must complete successfully before anything else runs.",
          },
          {
            title: "Add the build and push job",
            body: "Create a build job with needs: test. Steps: configure AWS credentials using the aws-actions/configure-aws-credentials action, log in to ECR, build the Docker image tagged with the Git SHA, and push. Using the Git SHA as the tag makes every deployment auditable.",
          },
          {
            title: "Add the deploy job",
            body: "Create a deploy job with needs: build. Use the aws-actions/amazon-ecs-deploy-task-definition action. Update the task definition to use the new image URI, register the new task definition, and update the ECS service. Wait for the service to stabilise before the job completes.",
          },
          {
            title: "Verify fail-fast behaviour",
            body: "Deliberately break a test and push to main. Confirm the build and deploy jobs never run. Then fix the test and push again; confirm the full pipeline succeeds and the new image is running in ECS. Check the ECS service events to see the deployment record.",
          },
        ],
        axiomPages: [
          { title: "CI/CD pipelines", href: "/cs-fundamentals/cicd-pipelines" },
          { title: "AWS ECS", href: "/cloud/aws-ecs" },
          { title: "AWS core concepts", href: "/cloud/aws-core" },
        ],
        whatNext: [
          { label: "Add Terraform plan and apply to the pipeline", href: "/practice/cloud-engineer/terraform-infra" },
          { label: "Add security scanning to the Docker build step", href: "/cs-fundamentals/security-fundamentals-se" },
          { label: "Configure Kubernetes autoscaling for the deployed service", href: "/practice/cloud-engineer/kubernetes-autoscaling" },
        ],
      },
      {
        slug: "billing-alerts",
        title: "Set up billing alerts and cost reporting",
        difficulty: "Beginner",
        tagline: "CloudWatch billing alarm at $100/month plus a boto3 script showing spend by service.",
        description: "Configure a CloudWatch billing alarm that sends an SNS notification when estimated charges exceed $100. Then write a boto3 script that queries AWS Cost Explorer for the last 30 days, and outputs spend broken down by service as a sorted table; most expensive service first.",
        whyItMatters: "Cloud costs are famously easy to run away with. A $100 alarm takes 10 minutes to set up and has saved engineers from five-figure surprise bills more than once. The Cost Explorer script gives you the visibility to understand where money is going before you get the alarm; the ideal order of operations.",
        prerequisites: [
          "AWS account with billing access (the root account or a user with billing permissions)",
          "AWS CLI configured",
          "boto3 installed (pip install boto3)",
          "Billing alerts enabled in the AWS Billing console (Preferences > Billing Alerts)",
        ],
        steps: [
          {
            title: "Enable billing alerts",
            body: "In the AWS Billing console, navigate to Billing Preferences and enable the Receive Billing Alerts checkbox. This must be done before CloudWatch can receive billing metrics. It can take up to 24 hours for billing data to appear; set this up first.",
          },
          {
            title: "Create an SNS topic for notifications",
            body: "Create an SNS topic called billing-alerts. Subscribe your email address to it and confirm the subscription from your inbox. CloudWatch will publish to this topic when the alarm fires; without the confirmation, no notifications will arrive.",
          },
          {
            title: "Create the CloudWatch billing alarm",
            body: "In CloudWatch, create an alarm on the EstimatedCharges metric in the AWS/Billing namespace, dimension Currency=USD. Set the threshold to 100, evaluation period to 1 day, and the action to notify the SNS topic you created. Set the alarm description; future-you will thank present-you.",
          },
          {
            title: "Write the Cost Explorer boto3 script",
            body: "Use client.get_cost_and_usage() with granularity='MONTHLY', a date range of the last 30 days, metrics=['UnblendedCost'], and group_by=[{Type: 'DIMENSION', Key: 'SERVICE'}]. Parse the response into a list of (service, cost) tuples, sort descending by cost, and print as a table.",
          },
          {
            title: "Run the script and identify your top spender",
            body: "Run the script and read the output. The top entry is almost always EC2 or S3. Add a second pass that filters to services costing more than $1 and calculates each as a percentage of total spend. This is the format a cost review meeting expects.",
          },
        ],
        axiomPages: [
          { title: "FinOps and cost management", href: "/cloud/finops-cost-management" },
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "AWS CloudWatch / monitoring", href: "/cloud/cloud-hub" },
        ],
        whatNext: [
          { label: "Provision the alarm and SNS topic with Terraform", href: "/practice/cloud-engineer/terraform-infra" },
          { label: "Add cost tagging to the ECS Fargate deployment", href: "/practice/cloud-engineer/containerise-fastapi" },
          { label: "Build a CI/CD pipeline that includes cost estimation", href: "/practice/cloud-engineer/github-actions-cicd" },
        ],
      },
      {
        slug: "kubernetes-autoscaling",
        title: "Configure Kubernetes autoscaling under load",
        difficulty: "Advanced",
        tagline: "HPA targeting 60% CPU, 200 VU load test with k6; verify pods scale up and back down.",
        description: "Deploy a stateless API to a Kubernetes cluster with a HorizontalPodAutoscaler targeting 60% CPU utilisation. Run a k6 load test ramping to 200 virtual users and watch pods scale up in real time. Then remove the load and verify the cluster scales back down to the minimum replica count.",
        whyItMatters: "Autoscaling is the mechanism that converts cloud infrastructure from fixed cost to variable cost. Misconfiguring it is how teams end up with either runaway pod counts (expensive) or throttled APIs under load (catastrophic). Understanding the relationship between HPA metrics, resource requests, and pod scheduling is core cloud engineering knowledge.",
        prerequisites: [
          "A running Kubernetes cluster (minikube, kind, or a managed cluster like EKS)",
          "kubectl configured and pointing at the cluster",
          "metrics-server installed in the cluster (required for CPU-based HPA)",
          "k6 installed locally for load testing",
        ],
        steps: [
          {
            title: "Deploy the API with resource requests",
            body: "Write a Deployment manifest for a simple HTTP API with replicas: 2, resources.requests.cpu: 100m, and resources.limits.cpu: 200m. Resource requests are mandatory for HPA to function; without them, the metrics server has no denominator for the utilisation percentage.",
          },
          {
            title: "Configure the HorizontalPodAutoscaler",
            body: "Write an HPA manifest targeting the Deployment with minReplicas: 2, maxReplicas: 10, and a CPU utilisation target of 60%. Apply it and verify it is active with kubectl get hpa; the CURRENT column will show <unknown> until the metrics server has data.",
          },
          {
            title: "Write the k6 load test",
            body: "Write a k6 script that ramps from 0 to 200 virtual users over 2 minutes, holds for 3 minutes, then ramps down. Each VU makes a GET request to your API. Set thresholds: p95 latency under 500ms and error rate under 1%. These will tell you whether the autoscaling kept up.",
          },
          {
            title: "Run the load test and watch scaling",
            body: "In one terminal, run kubectl get pods -w to watch pod count in real time. In another, run the k6 test. You should see pods scale up within 30-90 seconds of the load increasing (HPA has a default 15s sync period). Watch the HPA target percentage: kubectl get hpa -w.",
          },
          {
            title: "Verify scale-down",
            body: "After the load test ends, watch the pod count. Kubernetes waits 5 minutes by default before scaling down (the stabilisation window prevents flapping). Verify pods eventually return to the minimum replica count. Then check k6's summary; confirm p95 latency and error rate stayed within thresholds during scaling.",
          },
        ],
        axiomPages: [
          { title: "AWS EKS", href: "/cloud/aws-eks" },
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "Performance testing", href: "/qa/performance-testing-qa" },
        ],
        whatNext: [
          { label: "Add cluster autoscaling so nodes scale too, not just pods", href: "/cloud/aws-eks" },
          { label: "Add VPA (Vertical Pod Autoscaler) alongside HPA", href: "/cloud/aws-eks" },
          { label: "Run the same load test from the SDET path", href: "/practice/sdet/k6-load-test" },
        ],
      },
      {
        slug: "iam-least-privilege",
        title: "Write and test least-privilege IAM policies",
        difficulty: "Intermediate",
        tagline: "Scope an IAM role to exactly the permissions a Lambda needs, then verify deny rules with the IAM simulator.",
        description: "Design an IAM policy for a Lambda function that reads from S3 and writes to DynamoDB. You will start with broad permissions, enumerate the exact API calls the function makes via CloudTrail, write a least-privilege policy with explicit denies, and verify the deny rules hold using the AWS IAM Policy Simulator.",
        whyItMatters: "Overly broad IAM policies are the most common cloud security vulnerability in real AWS accounts; and the hardest to notice because everything still works. Writing a least-privilege policy from scratch teaches you the IAM policy language, the difference between identity-based and resource-based policies, and how to use the simulator to verify your reasoning before an incident does it for you.",
        prerequisites: [
          "AWS account with IAM and Lambda access",
          "AWS CLI configured with admin credentials for the setup steps",
          "A simple Lambda function that reads one S3 bucket and writes to one DynamoDB table",
          "Basic understanding of what IAM roles and policies are conceptually",
        ],
        steps: [
          {
            title: "Enumerate actual API calls via CloudTrail",
            body: "Temporarily attach AdministratorAccess to your Lambda role. Enable CloudTrail in the same region. Invoke the Lambda 5-10 times. Query CloudTrail for the IAM calls made by your function's role ARN. This gives you the ground truth: the exact API calls your function actually makes.",
          },
          {
            title: "Write the minimal policy",
            body: "Based on the CloudTrail output, write an IAM policy with only the specific actions (e.g., s3:GetObject, dynamodb:PutItem) on the specific resource ARNs. Add explicit Deny statements for destructive actions like s3:DeleteObject and dynamodb:DeleteTable.",
          },
          {
            title: "Attach and test with the CLI",
            body: "Swap AdministratorAccess for your custom policy. Invoke the Lambda and verify it still works. Then use aws iam simulate-principal-policy to test each action: your allows should show Match and your explicit denies should show ExplicitDeny.",
          },
          {
            title: "Add a resource condition",
            body: "Update the S3 policy to only allow access when the object key starts with a specific prefix using the s3:prefix condition key. Test that a request to a key outside the prefix is denied. Conditions are where IAM gets powerful; they scope by time, IP, tag, and dozens of other attributes.",
          },
          {
            title: "Block privilege escalation",
            body: "Add an explicit Deny for iam:AttachRolePolicy and iam:CreateUser to prevent the Lambda role from granting itself more permissions. This is the self-escalation prevention pattern; a compromised Lambda should not be able to create new IAM credentials.",
          },
          {
            title: "Document each statement",
            body: "Write a short comment above each statement in the policy JSON explaining what it does and why. Good IAM policies are self-documenting because permissions that look unnecessary get removed by the next engineer unless there is a comment explaining why they exist.",
          },
        ],
        axiomPages: [
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "System design", href: "/cs-fundamentals/system-design" },
        ],
        whatNext: [
          { label: "Apply least-privilege IAM to the ECS task role from the containerise exercise", href: "/practice/cloud-engineer/containerise-fastapi" },
          { label: "Add a CloudWatch alarm to alert when the Lambda role is used unexpectedly", href: "/practice/cloud-engineer/cloudwatch-dashboard" },
          { label: "Deploy the Lambda itself with Terraform and minimal permissions", href: "/practice/cloud-engineer/lambda-serverless" },
        ],
      },
      {
        slug: "lambda-serverless",
        title: "Deploy a serverless API with Lambda and API Gateway",
        difficulty: "Beginner",
        tagline: "Write a Lambda handler, expose it via API Gateway HTTP API, and deploy the whole stack with Terraform.",
        description: "Write a Python Lambda function that accepts a JSON POST body, validates it, performs a computation or external API call, and returns a structured response. Expose the function via API Gateway HTTP API, deploy the full stack with Terraform, and verify end-to-end with a curl request.",
        whyItMatters: "Serverless is the default architecture for low-to-medium traffic APIs in AWS. Lambda removes the operational burden of servers, scales to zero when idle, and costs nothing when unused. The Terraform-managed approach you build here is how production serverless stacks are managed; nothing clicked in the console, everything reproducible from code.",
        prerequisites: [
          "AWS account with Lambda and API Gateway permissions",
          "Terraform installed and AWS CLI configured",
          "Python 3.12 (the current Lambda runtime)",
          "Basic curl or Postman knowledge for testing",
        ],
        steps: [
          {
            title: "Write the Lambda handler",
            body: "Create handler.py with a lambda_handler(event, context) function. Parse event['body'] as JSON, validate the required fields, perform the logic, and return {statusCode: 200, body: json.dumps(result)}. Test locally by calling lambda_handler({body: '{...}'}, None); if it works locally, it will work in Lambda.",
          },
          {
            title: "Package the deployment zip",
            body: "Create a deployment package: zip handler.zip handler.py. If you have dependencies, pip install them into a local directory and include that directory in the zip. The zip structure matters; the handler file must be at the root, not in a subdirectory.",
          },
          {
            title: "Write the Terraform",
            body: "Define aws_iam_role for the Lambda execution role with AWSLambdaBasicExecutionRole. Define aws_lambda_function pointing at your zip. Define aws_apigatewayv2_api (HTTP API), aws_apigatewayv2_integration, and aws_apigatewayv2_route. Output the API endpoint URL.",
          },
          {
            title: "Deploy and test",
            body: "Run terraform apply. Copy the output URL. Run curl -X POST with your JSON body. If you get a 502, check the Lambda CloudWatch logs; the most common cause is a JSON serialisation error in the response body. The response body must be a string, not a dict.",
          },
          {
            title: "Add environment variables",
            body: "Update the Terraform to pass environment variables to the Lambda. Read them in the handler with os.environ. Verify they are present at runtime. Never hardcode secrets in the zip; use environment variables referencing AWS Secrets Manager or Parameter Store.",
          },
          {
            title: "Measure cold start",
            body: "Invoke the Lambda immediately after deployment (cold start), then again within 60 seconds (warm start). Measure the difference. For Python 3.12 with no dependencies, a cold start should be under 300ms. Over 1 second usually means too many imports at the top of the handler file.",
          },
        ],
        axiomPages: [
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "CI/CD pipelines", href: "/cs-fundamentals/cicd-pipelines" },
        ],
        whatNext: [
          { label: "Add a CI/CD pipeline that packages and deploys the Lambda on every push", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Apply least-privilege IAM to the Lambda execution role", href: "/practice/cloud-engineer/iam-least-privilege" },
          { label: "Add CloudWatch monitoring to the Lambda you just deployed", href: "/practice/cloud-engineer/cloudwatch-dashboard" },
        ],
      },
      {
        slug: "cloudwatch-dashboard",
        title: "Build a production CloudWatch dashboard for a running service",
        difficulty: "Intermediate",
        tagline: "Emit custom metrics, set alarms with anomaly detection, and build a Terraform-managed dashboard.",
        description: "Instrument a running Lambda or ECS service with custom CloudWatch metrics, define alarms for error rate and p99 latency, add anomaly detection to catch gradual degradation, and build a CloudWatch dashboard that shows the full service picture in one view; all managed in Terraform.",
        whyItMatters: "CloudWatch is the monitoring system you already have in every AWS account. Most engineers only use the basic metrics emitted automatically. Building a custom dashboard forces you to decide what failure looks like before it happens; which is the core discipline of SRE applied to a single service. An alarm without a dashboard is a page with no context.",
        prerequisites: [
          "A running AWS Lambda or ECS service (the Lambda from the previous exercise works perfectly)",
          "Terraform for infrastructure management",
          "AWS CLI for manual testing",
          "Basic understanding of what p50/p95/p99 latency means",
        ],
        steps: [
          {
            title: "Emit custom metrics from your service",
            body: "In the Lambda handler, use boto3 to call put_metric_data with a custom namespace (e.g., MyApp/Lambda). Emit: request_count (Count), error_count (Count), response_time_ms (Milliseconds). Invoke the function 20 times with varied inputs. Verify the metrics appear in CloudWatch Metrics within 2 minutes.",
          },
          {
            title: "Create CloudWatch alarms in Terraform",
            body: "Write aws_cloudwatch_metric_alarm resources for: error rate above 5% (use a math expression: error_count / request_count), and p99 latency above 500ms. Set alarm_actions to an SNS topic. Test by triggering the alarm manually with aws cloudwatch set-alarm-state.",
          },
          {
            title: "Add anomaly detection",
            body: "For the latency alarm, change the comparison to use ANOMALY_DETECTION_BAND. CloudWatch will model the normal latency pattern and alert when it deviates significantly. This catches gradual performance degradation that a static threshold misses. The band becomes accurate after 24 hours of data.",
          },
          {
            title: "Build the dashboard in Terraform",
            body: "Write an aws_cloudwatch_dashboard resource with a JSON dashboard body. Add widgets: a number widget for current error rate, a line graph for p99 latency over 1 hour, a log insights widget showing the last 10 error log lines. Use Terraform's jsonencode() to avoid manual JSON escaping.",
          },
          {
            title: "Add a composite alarm",
            body: "Create an aws_cloudwatch_composite_alarm that fires when both the error rate alarm AND the latency alarm are in ALARM state simultaneously. This reduces alert fatigue: a single noisy metric is informational, but two correlated bad metrics means something is genuinely wrong.",
          },
          {
            title: "Test the full alert path",
            body: "Deliberately break the function (raise an exception for all requests). Verify: metrics spike, alarms transition to ALARM, SNS sends a notification, composite alarm fires. Fix the function and verify alarms recover. The test is complete when you can describe the full path from bad request to recovery.",
          },
        ],
        axiomPages: [
          { title: "AWS core concepts", href: "/cloud/aws-core" },
          { title: "FinOps and cost management", href: "/cloud/finops-cost-management" },
        ],
        whatNext: [
          { label: "Add cost anomaly detection alongside the performance alerts", href: "/practice/cloud-engineer/billing-alerts" },
          { label: "Verify the Kubernetes HPA responds to the latency signal", href: "/practice/cloud-engineer/kubernetes-autoscaling" },
          { label: "Explore Langfuse for equivalent observability on LLM calls", href: "/observability/langfuse" },
        ],
      },
    ],
  },
  {
    id: "qa-engineer",
    title: "QA Engineer",
    description: "Test strategy, exploratory testing, risk-based thinking, and quality in modern delivery.",
    exercises: [
      {
        slug: "test-charters",
        title: "Write and execute test charters",
        difficulty: "Beginner",
        tagline: "Three exploratory charters for a login page, one executed for 45 minutes, bugs filed.",
        description: "Write three exploratory testing charters for a login page using the format: Explore [target] with [resources] to discover [information]. Execute one of the charters for a focused 45-minute session, keeping a written record of what you tried, what you found, and any bugs or questions that emerged.",
        whyItMatters: "Scripted test cases tell you whether the system does what you specified. Exploratory testing tells you whether the system does what users need. The charter format is a discipline that keeps sessions focused without over-specifying what to do; good explorers follow threads, bad ones wander. Writing the bugs you find is the output that creates accountability.",
        prerequisites: [
          "Access to any web application with a login page (open-source apps like GitLab or Gitea work well)",
          "A text editor for notes; structured notes are the output of the session, not the login",
          "60 minutes of uninterrupted time",
          "No prior testing experience required; this exercise teaches the fundamentals",
        ],
        steps: [
          {
            title: "Write three charters",
            body: "Apply the format: Explore [target area] with [specific resource or technique] to discover [what information you are seeking]. Example: Explore the login form with invalid credential combinations to discover whether error messages reveal account existence. Write three distinct charters targeting different risk areas of the same login page.",
          },
          {
            title: "Choose one charter and prepare",
            body: "Pick the charter you think will find the most interesting bugs. Before you start the timer, note your starting hypothesis: what do you expect to find? Write down three things that would surprise you. This primes your observation skills for the session.",
          },
          {
            title: "Execute for 45 minutes (strict timer)",
            body: "Start a timer and begin the session. Take notes continuously; what you tried, what happened, questions you want to investigate later. Do not follow threads that are outside your charter. When something surprising happens, note it immediately. When the timer ends, stop; even if you are mid-thought.",
          },
          {
            title: "File bugs with full detail",
            body: "For each issue found: write the title as an observation (Login page reveals whether an account exists via error message wording), steps to reproduce, expected behaviour, actual behaviour, and environment. A bug report is only useful if someone else can reproduce it without asking you questions.",
          },
          {
            title: "Write a session debrief",
            body: "Write a half-page debrief: what you covered, what you found, what you did not cover, and what you would investigate next. This debrief is how exploratory testing becomes visible to the team; without it, 45 minutes of work disappears into a black box.",
          },
        ],
        axiomPages: [
          { title: "Exploratory testing", href: "/qa/exploratory-testing" },
          { title: "Risk-based testing", href: "/qa/risk-based-testing" },
          { title: "Test documentation", href: "/qa/test-documentation" },
        ],
        whatNext: [
          { label: "Build a risk matrix for a more complex flow", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Formalise your findings in a test report", href: "/qa/test-reporting" },
          { label: "Audit coverage gaps in a feature", href: "/practice/qa-engineer/coverage-audit" },
        ],
      },
      {
        slug: "risk-matrix",
        title: "Build a risk matrix for a checkout flow",
        difficulty: "Intermediate",
        tagline: "Top 5 risks scored by likelihood × impact, 3 test cases per risk, severity justified.",
        description: "Identify the top five risks in a payment checkout flow, score each risk by likelihood and impact on a 1-5 scale, and write three prioritised test cases per risk. For each test case, specify whether you would automate it and justify your severity scores against business impact rather than just technical severity.",
        whyItMatters: "Risk-based thinking is what separates senior QA engineers from those who test everything equally. Every product ships with untested functionality; the question is whether you are choosing consciously which risks to accept, or discovering them as production incidents. A risk matrix makes quality trade-offs visible and defensible to non-engineers.",
        prerequisites: [
          "Access to a checkout flow (any e-commerce site or a test environment)",
          "Understanding of what a test case is at a basic level",
          "No specific tooling required; a spreadsheet or text file is sufficient",
          "Willingness to think from a business impact perspective, not just a technical one",
        ],
        steps: [
          {
            title: "Identify 10 candidate risks",
            body: "List 10 things that could go wrong in the checkout flow. Think across categories: payment processing, inventory accuracy, user data, discount code abuse, session management, third-party API failures, accessibility, error recovery. Do not score them yet; you need a wide set before you filter.",
          },
          {
            title: "Score and select the top 5",
            body: "For each risk, score likelihood (1=very unlikely, 5=very likely) and impact (1=minor inconvenience, 5=revenue loss or legal exposure). Multiply for a risk score. Select the top 5 by score. Where two risks score equally, prefer the one with higher impact; severity matters more than frequency in a payment context.",
          },
          {
            title: "Write 3 test cases per risk",
            body: "For each of the 5 risks, write 3 test cases using: preconditions, action, expected result. Order them by priority within the risk: the most important test case first. Each test case should be independently executable; no shared state between them.",
          },
          {
            title: "Label each with automate / manual / exploratory",
            body: "For each test case, decide: should this be automated in the regression suite, executed manually at each release, or covered via exploratory testing? Automation is best for high-frequency, stable, data-driven cases. Exploratory is best for risks that require human judgment or change frequently.",
          },
          {
            title: "Present the matrix to a stakeholder",
            body: "Ask a colleague to play the role of a product manager and walk them through the matrix. Explain why the top risk scored highest and why you are accepting the lower-scored risks without test cases. If they challenge a severity score, update it; the matrix should reflect shared understanding, not just your view.",
          },
        ],
        axiomPages: [
          { title: "Risk-based testing", href: "/qa/risk-based-testing" },
          { title: "Risk-based test selection", href: "/qa/risk-based-test-selection" },
          { title: "Test planning", href: "/qa/test-planning" },
          { title: "Test case design", href: "/qa/test-case-design" },
        ],
        whatNext: [
          { label: "Write the test cases as BDD scenarios with Gherkin", href: "/qa/bdd-gherkin" },
          { label: "Automate the highest-priority test case with Playwright", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Audit coverage against full user flows", href: "/practice/qa-engineer/coverage-audit" },
        ],
      },
      {
        slug: "boundary-value-testing",
        title: "Design boundary value test cases",
        difficulty: "Beginner",
        tagline: "Complete boundary and equivalence class cases for a text field and a number field.",
        description: "For a text field accepting 1-255 characters and a number field accepting 0-999, write the complete set of boundary value analysis and equivalence class partitioning test cases. Identify which cases you would automate, which you would test manually, and which represent the highest risk.",
        whyItMatters: "Boundary value analysis and equivalence partitioning are the two techniques that give you the most defect coverage for the fewest test cases. They are the foundation of systematic test case design; not exhaustive testing, but structured coverage. Engineers who apply these techniques find bugs that exploratory testing and scripted happy-path testing both miss.",
        prerequisites: [
          "No tooling required; this is a design exercise using pen and paper or a spreadsheet",
          "Basic understanding of what a test case is",
          "No prior experience with formal test design techniques required",
          "Access to the application to verify your cases (optional but useful)",
        ],
        steps: [
          {
            title: "Define the equivalence classes for the text field",
            body: "A text field accepting 1-255 characters has three equivalence classes: below minimum (0 chars, invalid), within range (1-255 chars, valid), and above maximum (256+ chars, invalid). Any value within a class should behave identically; if 1 character is valid, 100 characters should also be valid.",
          },
          {
            title: "Apply boundary value analysis to the text field",
            body: "For each boundary, test: just below (0), at boundary (1), just above (2) for the lower boundary; and just below (254), at boundary (255), just above (256) for the upper boundary. That is 6 boundary test cases. Add one from the middle of the valid range (128 chars) as a representative case.",
          },
          {
            title: "Repeat for the number field",
            body: "The number field (0-999) has the same structure. Boundaries: -1, 0, 1 at the lower end; 998, 999, 1000 at the upper end. Add a mid-range test (500). Decide: what should the field do with a decimal input (0.5)? A float string (\"9.5\")? A non-numeric string? These are additional equivalence classes you must define.",
          },
          {
            title: "Label each case: automate vs manual",
            body: "Mark each case with a decision. Boundary values are ideal automation candidates; they are stable, precise, and run in seconds. The non-numeric string cases are better as exploratory or manual cases because the expected behaviour may be ambiguous and worth observing rather than asserting.",
          },
          {
            title: "Run the cases and record actual behaviour",
            body: "Execute each case against the real application. For every case where actual behaviour differs from expected, file a brief observation: input, expected, actual. Even if something is not a bug (the UI truncates at 255 rather than rejecting), the behaviour difference is worth documenting for the team.",
          },
        ],
        axiomPages: [
          { title: "Test case design", href: "/qa/test-case-design" },
          { title: "Negative testing", href: "/qa/negative-testing" },
          { title: "Test automation strategy", href: "/qa/test-automation-strategy" },
        ],
        whatNext: [
          { label: "Build a risk matrix to prioritise which fields to test first", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Automate the boundary tests using Playwright", href: "/test-automation/playwright" },
          { label: "Explore what happens at the boundaries with an exploratory charter", href: "/practice/qa-engineer/test-charters" },
        ],
      },
      {
        slug: "bug-report",
        title: "File a reproducible bug report",
        difficulty: "Beginner",
        tagline: "Find a real bug through exploratory testing and write a complete, reproducible report.",
        description: "Find a bug in any open-source web application through exploratory testing. Write a complete bug report with: a clear title stating the observation, numbered steps to reproduce, expected versus actual behaviour, environment details, severity justification, and any evidence (screenshots, console errors, network traces).",
        whyItMatters: "A bug that cannot be reproduced is a bug that will not be fixed. The discipline of writing reproducible bug reports is one of the most high-leverage skills in quality engineering; it directly determines how quickly developers can act on your findings. A great bug report is a gift; a vague one is a time tax on the whole team.",
        prerequisites: [
          "Access to an open-source web application with a running test or demo environment",
          "Browser developer tools (Chrome or Firefox DevTools)",
          "A bug tracking system or just a text document to write the report",
          "30-60 minutes for an exploratory session",
        ],
        steps: [
          {
            title: "Run an exploratory session to find a bug",
            body: "Pick an open-source web application and explore an area that looks complex: a form with many validation rules, a table with sorting and filtering, a multi-step wizard. Use the charter format from the test charters exercise. Look specifically for edge cases around data input, navigation, and concurrent actions.",
          },
          {
            title: "Verify reproducibility before writing",
            body: "Once you find something interesting, reproduce it three times before writing a word. If it only happens once, note the conditions carefully and try to make it happen again. An intermittent bug report that says 'sometimes fails' is almost unusable; 'fails on every third click when X and Y are true' is actionable.",
          },
          {
            title: "Write the title as an observation",
            body: "The title should state what happens, not what you expected: Checkout total updates before delivery cost is removed; not 'Checkout is broken'. A developer reading the title should know which code area to look at without reading the full report.",
          },
          {
            title: "Write numbered reproduction steps",
            body: "Start from an absolute baseline: open a private browser window, navigate to the exact URL, log in with these credentials. Every step should be a distinct action. Test your steps by following them yourself in a fresh browser session. If they do not reproduce the bug, revise them.",
          },
          {
            title: "Add environment, severity, and evidence",
            body: "Record: browser and version, OS, application version or commit hash, whether the bug reproduced in other browsers. Justify the severity: does this block a user from completing their goal? Does it affect data integrity? Attach a screenshot or screen recording; a 30-second recording is worth 10 paragraphs of description.",
          },
        ],
        axiomPages: [
          { title: "Bug lifecycle", href: "/qa/bug-lifecycle" },
          { title: "Exploratory testing", href: "/qa/exploratory-testing" },
          { title: "Test documentation", href: "/qa/test-documentation" },
        ],
        whatNext: [
          { label: "Automate a reproduction script for the bug you found", href: "/test-automation/playwright" },
          { label: "Build a risk matrix to prioritise similar bug areas", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Learn about root cause analysis for deeper investigations", href: "/qa/root-cause-analysis" },
        ],
      },
      {
        slug: "coverage-audit",
        title: "Audit test coverage against user flows",
        difficulty: "Intermediate",
        tagline: "Map a feature's test suite against user flows, find 3 gaps, estimate business risk.",
        description: "Choose a feature with an existing test suite. Map every test against the feature's user flows using a mind map or table. Identify three coverage gaps; scenarios that users can exercise but no test covers. Write a charter for each gap and estimate the business risk of leaving each one untested.",
        whyItMatters: "Code coverage metrics lie. A test suite with 90% line coverage can miss the three most important user journeys entirely. Coverage auditing against user flows rather than lines of code is how senior QA engineers demonstrate strategic value; it connects testing decisions to business risk in language that product managers and engineers both understand.",
        prerequisites: [
          "A feature with a real test suite (a GitHub repository with tests you can read)",
          "Documentation or understanding of the feature's user flows",
          "A mind-mapping tool or a simple table (Miro, draw.io, or even pen and paper)",
          "Understanding of what a user flow is and how it differs from a test case",
        ],
        steps: [
          {
            title: "Map the user flows",
            body: "Write down every path a user can take through the feature: the happy path, the error paths, the edge cases (what if they navigate back mid-wizard?), and the permission-based variations (what can admin do that a regular user cannot?). This list is your coverage target.",
          },
          {
            title: "Map each existing test to a flow",
            body: "For each test in the suite, identify which user flow it covers (or partially covers). Mark the flow as covered once any test exercises it end-to-end. Be strict; a unit test for a validation function does not count as coverage for the user flow that triggers that validation.",
          },
          {
            title: "Identify the gaps",
            body: "Flows that appear in your map but have no test mapped to them are gaps. Highlight three gaps with the highest potential business impact. Common gaps: error recovery flows (user gets an error, retries), concurrent user scenarios, and feature interactions (using feature A immediately after feature B).",
          },
          {
            title: "Write a charter for each gap",
            body: "For each gap, write an exploratory charter: Explore [the uncovered flow] with [the relevant part of the application] to discover [whether the system handles it correctly]. Execute at least one of the three charters immediately; coverage gaps are most valuable when they find bugs, not just when they are documented.",
          },
          {
            title: "Estimate and communicate risk",
            body: "For each gap, write one sentence quantifying the business risk: 'If this flow fails in production, users cannot complete checkout; this is a direct revenue impact'. Present the three gaps to a product manager or engineer and get agreement on which to prioritise for automation.",
          },
        ],
        axiomPages: [
          { title: "Test strategy", href: "/qa/test-strategy" },
          { title: "Test planning", href: "/qa/test-planning" },
          { title: "Risk-based test selection", href: "/qa/risk-based-test-selection" },
          { title: "Exploratory testing", href: "/qa/exploratory-testing" },
        ],
        whatNext: [
          { label: "Automate the highest-risk gap with Playwright", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Build a formal risk matrix for the gaps you found", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Propose a test strategy for the whole feature", href: "/qa/test-strategy" },
        ],
      },
      {
        slug: "accessibility-testing",
        title: "Audit a web page for accessibility issues",
        difficulty: "Beginner",
        tagline: "Run a WCAG 2.1 audit using axe, keyboard nav, and a screen reader; then write remediation notes.",
        description: "Conduct a structured accessibility audit of a publicly available web application. Using a combination of automated scanning (axe DevTools browser extension), keyboard navigation testing, and screen reader spot-checking, identify and classify all accessibility issues against WCAG 2.1 AA criteria, then write prioritised remediation notes for the development team.",
        whyItMatters: "Accessibility failures are both a legal risk and a quality failure; a page that cannot be navigated by keyboard is broken for power users and assistive technology users alike. A QA engineer who can audit for accessibility and write actionable remediation notes is rare and genuinely high-value, because most accessibility issues are introduced by developers who have never run a screen reader through their own UI.",
        prerequisites: [
          "Chrome or Firefox with the axe DevTools extension installed (free tier is sufficient)",
          "NVDA (Windows, free) or VoiceOver (Mac, built-in) for screen reader testing",
          "Access to a publicly available web application with interactive elements (forms, navigation, modals)",
          "Basic knowledge of WCAG 2.1; understand the four principles: Perceivable, Operable, Understandable, Robust",
        ],
        steps: [
          {
            title: "Run the automated axe scan",
            body: "Navigate to the target page, open axe DevTools, and run a full page scan. Export the results. Note: automated tools catch roughly 30-40% of accessibility issues. Every issue axe finds is real; the absence of findings does not mean accessible.",
          },
          {
            title: "Test keyboard navigation",
            body: "Close your mouse and navigate the entire page using only Tab, Shift+Tab, Enter, Escape, and arrow keys. Check: can you reach every interactive element? Is the focus indicator always visible? Does focus order match visual reading order? Does every modal trap focus correctly? Record every failure.",
          },
          {
            title: "Check colour contrast",
            body: "Use the axe colour contrast checker or the WebAIM Contrast Checker on 5 text/background combinations. WCAG AA requires 4.5:1 for normal text and 3:1 for large text. Record any failures with the exact hex colours and measured ratio.",
          },
          {
            title: "Test with a screen reader",
            body: "Enable NVDA or VoiceOver and navigate to the page. Listen: are images announced with useful alt text? Are form fields announced with their labels? Are error messages announced when they appear? Do buttons announce their purpose? Record anything that sounds confusing or empty.",
          },
          {
            title: "Classify all findings",
            body: "Group every finding into three categories: Critical (blocks task completion for an assistive technology user), Serious (causes significant difficulty), and Moderate (causes minor confusion). Apply WCAG criteria codes (e.g., 1.4.3 Contrast Minimum) to each finding.",
          },
          {
            title: "Write remediation notes",
            body: "For each critical and serious finding, write a one-paragraph remediation note: what the issue is, the affected element (CSS selector or XPath), the WCAG criterion, the specific fix required, and the expected outcome after the fix. Good remediation notes turn an audit report into developer action.",
          },
        ],
        axiomPages: [
          { title: "Test case design", href: "/qa/test-case-design" },
          { title: "Exploratory testing", href: "/qa/exploratory-testing" },
        ],
        whatNext: [
          { label: "Automate the axe scan as a Playwright test and add it to CI", href: "/practice/sdet/accessibility-audit" },
          { label: "Incorporate accessibility risk into your test risk matrix", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Run a focused exploratory session on keyboard navigation only", href: "/practice/qa-engineer/test-charters" },
        ],
      },
      {
        slug: "api-exploratory-testing",
        title: "Exploratory test a REST API with boundary thinking",
        difficulty: "Intermediate",
        tagline: "Map an API surface, write a session charter, and find at least 3 bugs using structured exploration.",
        description: "Run a structured exploratory testing session against a real REST API (JSONPlaceholder, Reqres, or the GitHub API). You will map the API surface, write a session charter, explore boundary conditions and error handling with Postman or curl, and file at least three bug reports or observations with exact reproduction steps.",
        whyItMatters: "Most API bugs are not found by the developer's happy path test suite. They live at the boundaries: what happens when you send 10,000 characters in a name field? What happens when you send an integer where a string is expected? An exploratory tester who can think like an adversary and document findings rigorously adds more coverage than ten automated scripts for the happy path.",
        prerequisites: [
          "Postman (free) or curl installed",
          "Access to a REST API with documentation; JSONPlaceholder, Reqres.in, or the GitHub API all work",
          "Basic understanding of HTTP methods (GET, POST, PUT, DELETE) and status codes",
          "Familiarity with JSON",
        ],
        steps: [
          {
            title: "Map the API surface",
            body: "Read the API documentation and list every endpoint, HTTP method, path parameter, query parameter, and request body field. Note which fields are required vs optional, and their documented types and constraints. This map is your testing surface; every item on it is a test vector.",
          },
          {
            title: "Write a session charter",
            body: "Use the format: 'Explore [endpoint group] with [Postman] to discover [error handling and boundary behaviour].' Time-box to 45 minutes. Identify 3 specific questions you want to answer by the end of the session.",
          },
          {
            title: "Test the happy path first",
            body: "Send valid requests to each endpoint and verify responses match documentation. Confirm status codes, response body shape, and header values. Any happy path failure is a critical bug; document it before exploring further.",
          },
          {
            title: "Probe boundaries and error handling",
            body: "Systematically explore: empty strings for required fields, null values, negative numbers, very long strings (10,000 characters), unexpected types (send an array where a string is expected), special characters (SQL injection patterns, Unicode, emoji). Record every request and the exact response.",
          },
          {
            title: "Check error response consistency",
            body: "Find 5 different ways to trigger a 4xx error. Compare the error response bodies; are they in the same format? Do they include error codes and human-readable messages? Inconsistent error responses are a usability bug and an integration risk for API consumers.",
          },
          {
            title: "File your findings",
            body: "Write at least 3 bug reports or observations from the session. Each should include: the exact HTTP request (method, URL, headers, body), the actual response, what you expected, why the actual response is a problem, and a severity classification.",
          },
        ],
        axiomPages: [
          { title: "Exploratory testing", href: "/qa/exploratory-testing" },
          { title: "Test documentation", href: "/qa/test-documentation" },
          { title: "Risk-based testing", href: "/qa/risk-based-testing" },
        ],
        whatNext: [
          { label: "Add contract testing to prevent the API regressions you found", href: "/practice/sdet/contract-testing" },
          { label: "Build a risk matrix for the API surface you mapped", href: "/practice/qa-engineer/risk-matrix" },
          { label: "Automate a regression test for the highest-severity bug you found", href: "/practice/sdet/streaming-endpoint-test" },
        ],
      },
      {
        slug: "regression-strategy",
        title: "Design a regression testing strategy for a feature",
        difficulty: "Intermediate",
        tagline: "Map user flows, prioritise by risk, define automation boundaries, and estimate CI cost.",
        description: "Choose any feature in an application you can access. Map all its user flows, classify each by business risk and change frequency, define which flows belong in smoke, full regression, and exploratory testing, and specify exactly which tests should be automated, which manual, and how each layer fits into the CI/CD pipeline.",
        whyItMatters: "Regression testing without a strategy becomes an ever-growing suite that slows CI and still misses important bugs. A regression strategy is the quality contract between QA and the team; it defines what gets tested before every release, what gets spot-checked, and what is intentionally left to exploratory sessions. Building one forces you to confront the real trade-off between confidence and speed.",
        prerequisites: [
          "Access to an application you can explore (any web app works)",
          "Familiarity with basic test types: smoke, regression, exploratory",
          "No tooling required; this is a design exercise",
        ],
        steps: [
          {
            title: "List all user flows for the feature",
            body: "Write out every end-to-end user flow. A flow starts at an entry point and ends at a measurable outcome (data saved, payment processed, notification sent). Aim for 10-20 flows; if you have fewer, you are missing edge cases.",
          },
          {
            title: "Score each flow by risk",
            body: "For each flow, score two dimensions: business impact if it breaks (1-5) and change frequency (how often this code area is touched, 1-5). Multiply them for a risk score. Sort descending. The top 20% are your regression must-haves.",
          },
          {
            title: "Define your three test layers",
            body: "Layer 1; Smoke suite: the 5-10 flows that must work for the app to be usable. Run on every commit. Layer 2; Full regression: all flows above your risk threshold. Run before every release. Layer 3; Exploratory: low-risk flows and unusual combinations. Run quarterly or after large refactors.",
          },
          {
            title: "Assign each flow to a test type",
            body: "For each flow in Layers 1 and 2, decide: automated end-to-end (Playwright), automated API test, manual scripted, or exploratory. Automate flows that are stable, high-risk, and deterministic. Keep manual flows that require visual judgement or have rapidly changing UI.",
          },
          {
            title: "Estimate the suite cost",
            body: "For your Layer 1 and 2 automation, estimate: number of tests, average test duration, total CI time. If Layer 2 takes more than 15 minutes, it will be skipped. Adjust by parallelising, reducing scope, or moving borderline tests to Layer 3.",
          },
          {
            title: "Write the strategy document",
            body: "Produce a one-page document: feature scope, risk scoring rationale, three layers with test counts and run frequency, automation boundary decisions, and known gaps intentionally left in Layer 3. This document is what the team refers to when someone asks why a bug was not caught in regression.",
          },
        ],
        axiomPages: [
          { title: "Test automation strategy", href: "/qa/test-automation-strategy" },
          { title: "Risk-based testing", href: "/qa/risk-based-testing" },
          { title: "Test case design", href: "/qa/test-case-design" },
        ],
        whatNext: [
          { label: "Apply this strategy to the coverage audit exercise", href: "/practice/qa-engineer/coverage-audit" },
          { label: "Automate the smoke suite with Playwright", href: "/test-automation/playwright" },
          { label: "Add risk scoring to your test charter process", href: "/practice/qa-engineer/test-charters" },
        ],
      },
    ],
  },
  {
    id: "sdet",
    title: "SDET",
    description: "API testing, performance, test architecture, and distributed systems debugging.",
    exercises: [
      {
        slug: "streaming-endpoint-test",
        title: "Test a streaming LLM endpoint with Playwright",
        difficulty: "Intermediate",
        tagline: "Capture SSE chunks as they arrive, reconstruct the response, assert content and format.",
        description: "Write a Playwright test that calls a Server-Sent Events streaming endpoint, captures each chunk as it arrives rather than waiting for the full response, reconstructs the complete content, and asserts that it contains expected content and follows the correct SSE format throughout the stream.",
        whyItMatters: "Streaming endpoints are increasingly common in AI applications and fail in ways that regular API tests miss entirely: partial chunks, malformed event data, broken SSE formatting mid-stream, or content that is correct token by token but wrong as a whole. Testing streaming behaviour requires a different approach to standard request-response testing.",
        prerequisites: [
          "Playwright installed with TypeScript",
          "A streaming endpoint to test (an LLM chat API or a simple SSE server you write yourself)",
          "Understanding of what Server-Sent Events are and the data: / event: / id: format",
          "Basic Playwright knowledge: page.route, page.evaluate",
        ],
        steps: [
          {
            title: "Intercept the streaming response",
            body: "Use page.route() to intercept requests to your streaming endpoint. In the route handler, call route.fetch() to get the actual response. The response body will be a ReadableStream; you need to read it chunk by chunk rather than awaiting the full body.",
            code: {
              lang: "typescript",
              snippet: `import { test, expect } from "@playwright/test";

test("streaming endpoint returns SSE chunks", async ({ page }) => {
  const chunks: string[] = [];

  await page.route("**/api/chat/stream", async (route) => {
    const response = await route.fetch();
    const body = response.body();

    // body() returns a Buffer — convert to string and split on newlines
    const text = body.toString("utf-8");
    chunks.push(...text.split("\\n").filter(Boolean));

    // Forward the response unchanged so the page still renders
    await route.fulfill({ response });
  });

  await page.goto("/chat");
});`,
            },
          },
          {
            title: "Parse the SSE format",
            body: "Each chunk is a Uint8Array. Decode it with TextDecoder and split on newline. Lines starting with 'data: ' contain the payload. Lines that are just a newline signal the end of an event. Parse each event into a structured object and collect them in an array.",
            code: {
              lang: "typescript",
              snippet: `interface SSEEvent {
  data: string;
  event?: string;
  id?: string;
}

function parseSSEChunks(raw: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  let current: Partial<SSEEvent> = {};

  for (const line of raw.split("\\n")) {
    if (line.startsWith("data: ")) {
      current.data = line.slice(6).trim();
    } else if (line.startsWith("event: ")) {
      current.event = line.slice(7).trim();
    } else if (line.startsWith("id: ")) {
      current.id = line.slice(4).trim();
    } else if (line === "") {
      // blank line = end of event
      if (current.data !== undefined) events.push(current as SSEEvent);
      current = {};
    }
  }
  return events;
}`,
            },
          },
          {
            title: "Reconstruct the full response",
            body: "Concatenate the data fields from each event to reconstruct the full response text. For LLM streaming responses, each event typically contains a token or a JSON object with a delta field. Write a helper that handles both formats so your test is not brittle to minor API changes.",
            code: {
              lang: "typescript",
              snippet: `function reconstructResponse(events: SSEEvent[]): string {
  return events
    .filter((e) => e.data !== "[DONE]")
    .map((e) => {
      // Handle plain-text token format
      if (!e.data.startsWith("{")) return e.data;
      // Handle JSON delta format: {"delta": {"text": "..."}}
      try {
        const parsed = JSON.parse(e.data);
        return parsed?.delta?.text ?? parsed?.text ?? "";
      } catch {
        return e.data;
      }
    })
    .join("");
}`,
            },
          },
          {
            title: "Assert chunk-level and full-response behaviour",
            body: "Assert: the first chunk arrives within 2 seconds (time-to-first-token), each chunk's data field is valid JSON or plain text (not malformed), the reconstructed response contains expected content, and the stream terminates with the correct done signal (data: [DONE] or similar).",
            code: {
              lang: "typescript",
              snippet: `test("SSE stream assertions", async ({ page, request }) => {
  const startTime = Date.now();
  const chunks: string[] = [];

  // Use APIRequestContext to stream the response directly
  const response = await request.post("/api/chat/stream", {
    data: { message: "Say hello in one word." },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/event-stream");

  const body = await response.text();
  const events = parseSSEChunks(body);

  // First chunk should arrive quickly (time-to-first-token)
  expect(Date.now() - startTime).toBeLessThan(2000);

  // Every event should have a data field
  expect(events.every((e) => e.data !== undefined)).toBe(true);

  // Last event should be [DONE]
  expect(events[events.length - 1].data).toBe("[DONE]");

  const full = reconstructResponse(events);
  expect(full.toLowerCase()).toContain("hello");
});`,
            },
          },
          {
            title: "Assert the UI reflects the stream",
            body: "Navigate to a page that renders the streaming response. Assert that text appears progressively; check that the UI is not blank for the first 3 seconds by polling for visible text. This tests the front-end streaming rendering, not just the API.",
            code: {
              lang: "typescript",
              snippet: `test("UI renders streaming tokens progressively", async ({ page }) => {
  await page.goto("/chat");

  // Type a message and submit
  await page.getByRole("textbox", { name: /message/i }).fill("Say hello.");
  await page.getByRole("button", { name: /send/i }).click();

  // Assert text starts appearing within 3 seconds (not blank)
  const messageLocator = page.locator('[data-testid="assistant-message"]');
  await expect(messageLocator).not.toBeEmpty({ timeout: 3000 });

  // Wait for streaming to finish (done indicator disappears)
  await expect(page.locator('[data-testid="streaming-indicator"]')).toBeHidden({
    timeout: 15000,
  });

  // Assert the final message contains expected content
  const finalText = await messageLocator.textContent();
  expect(finalText?.toLowerCase()).toContain("hello");
});`,
            },
          },
        ],
        axiomPages: [
          { title: "Playwright", href: "/test-automation/playwright" },
          { title: "Testing LLM applications", href: "/test-automation/testing-llm-apps" },
          { title: "Anthropic API; streaming", href: "/apis/anthropic-api" },
        ],
        whatNext: [
          { label: "Add load testing to the streaming endpoint with k6", href: "/practice/sdet/k6-load-test" },
          { label: "Build a database fixture chain for integration tests", href: "/practice/sdet/database-fixture-chain" },
          { label: "Write an LLM-as-judge eval for the streamed content", href: "/practice/ai-engineer/llm-judge-eval" },
        ],
      },
      {
        slug: "database-fixture-chain",
        title: "Build an isolated database fixture chain",
        difficulty: "Beginner",
        tagline: "pytest fixtures that spin up Postgres, run migrations, seed 5 rows, and roll back after each test.",
        description: "Create a pytest fixture chain that spins up a Postgres test database, runs Alembic migrations to bring the schema up to date, seeds 5 rows of test data, yields the session to each test, and rolls back all changes after every test; leaving the database in a clean state for the next one.",
        whyItMatters: "Test isolation is the property that makes a test suite trustworthy. When tests share database state, failure in test A causes failure in test B; and the debugging session that follows is miserable. A well-designed fixture chain makes isolation automatic and eliminates an entire class of flaky test failures.",
        prerequisites: [
          "Python with pytest, SQLAlchemy, Alembic, and psycopg2 installed",
          "Docker available to run a Postgres container (or a local Postgres instance)",
          "An existing SQLAlchemy model and Alembic migration history",
          "Basic understanding of pytest fixtures and the yield pattern",
        ],
        steps: [
          {
            title: "Write the engine fixture",
            body: "Create a session-scoped fixture that starts a Postgres container (or connects to a test database), creates the engine, and yields it. Use scope='session' so the database starts once per test run, not once per test. Tear it down after all tests complete.",
            code: {
              lang: "python",
              snippet: `# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = "postgresql://postgres:password@localhost:5432/test_db"

@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL)
    yield eng
    eng.dispose()

@pytest.fixture(scope="session")
def tables(engine):
    # Import your Base and create all tables once per session
    from myapp.models import Base
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)`,
            },
          },
          {
            title: "Run Alembic migrations in the fixture",
            body: "After creating the engine, call alembic.command.upgrade(alembic_cfg, 'head') to run all migrations. This ensures your test database schema always matches your application schema. If migrations fail in the fixture, all tests fail immediately; this is the correct behaviour.",
            code: {
              lang: "python",
              snippet: `from alembic.config import Config
from alembic import command

@pytest.fixture(scope="session")
def apply_migrations(engine):
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(alembic_cfg, "head")
    yield
    command.downgrade(alembic_cfg, "base")  # clean up after all tests`,
            },
          },
          {
            title: "Write the transaction fixture",
            body: "Create a function-scoped fixture that begins a transaction using connection.begin_nested() (a savepoint). Yield the session to the test. After the test returns, call transaction.rollback() to undo every INSERT, UPDATE, and DELETE the test made. The savepoint is the key; it rolls back without dropping the schema.",
            code: {
              lang: "python",
              snippet: `from sqlalchemy.orm import Session

@pytest.fixture(scope="function")
def db_session(engine, apply_migrations):
    connection = engine.connect()
    transaction = connection.begin()

    Session = sessionmaker(bind=connection)
    session = Session()

    # Nested transaction (savepoint) — rolls back without touching the schema
    nested = connection.begin_nested()

    yield session

    session.close()
    nested.rollback()   # undo all test writes
    transaction.rollback()
    connection.close()`,
            },
          },
          {
            title: "Write the seed fixture",
            body: "Create a fixture that depends on the transaction fixture and inserts 5 rows of realistic test data. Use realistic values, not 'test1', 'test2'; realistic data surfaces bugs that toy data misses. Yield the list of seeded objects so tests can reference them.",
            code: {
              lang: "python",
              snippet: `from myapp.models import User

@pytest.fixture(scope="function")
def seeded_users(db_session):
    users = [
        User(name="Alice Chen", email="alice@example.com", active=True),
        User(name="Bob Smith", email="bob@example.com", active=True),
        User(name="Carol Jones", email="carol@example.com", active=False),
        User(name="Dave Kim", email="dave@example.com", active=True),
        User(name="Eve Patel", email="eve@example.com", active=True),
    ]
    db_session.add_all(users)
    db_session.flush()  # assign IDs without committing
    yield users`,
            },
          },
          {
            title: "Write two tests and verify isolation",
            body: "Write test_count_is_five (assert session.query(Model).count() == 5) and test_can_add_one (insert a row, assert count is 6). Run both. Then run them in reverse order. The count should be 5 at the start of each test regardless of order; if it is not, your rollback is not working.",
            code: {
              lang: "python",
              snippet: `def test_count_is_five(db_session, seeded_users):
    count = db_session.query(User).count()
    assert count == 5

def test_can_add_one(db_session, seeded_users):
    new_user = User(name="Frank Liu", email="frank@example.com", active=True)
    db_session.add(new_user)
    db_session.flush()
    assert db_session.query(User).count() == 6

# Run: pytest -v test_isolation.py
# Run again in reverse order: pytest -v test_isolation.py --reversed
# Both runs should show test_count_is_five passing with count == 5`,
            },
          },
        ],
        axiomPages: [
          { title: "pytest patterns", href: "/test-automation/pytest-patterns" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "Database transactions", href: "/cs-fundamentals/database-transactions" },
        ],
        whatNext: [
          { label: "Use the fixture chain in a Playwright end-to-end test", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Add test data factories to remove hardcoded seed data", href: "/test-automation/pytest-patterns" },
          { label: "Fix an N+1 query in the queries your fixtures run", href: "/practice/software-engineer/fix-n-plus-one" },
        ],
      },
      {
        slug: "k6-load-test",
        title: "Write and run a k6 load test",
        difficulty: "Intermediate",
        tagline: "Ramp 50 to 200 VUs over 2 minutes, assert p95 < 300ms and error rate < 0.1%.",
        description: "Write a k6 load test that ramps from 50 to 200 virtual users over 2 minutes, holds at 200 VUs for 3 minutes, then ramps down. Assert that p95 response latency stays below 300ms and error rate stays below 0.1%. Generate a summary report and identify the specific request type causing the bottleneck.",
        whyItMatters: "Load testing is the only way to discover performance problems before your users do. p95 latency is the metric that matters for user experience; it tells you what 1 in 20 users experiences, which in production means thousands of people. k6 is lightweight enough to run in CI and powerful enough to simulate realistic production load.",
        prerequisites: [
          "k6 installed (brew install k6 or the Windows/Linux equivalent)",
          "An HTTP API you can load test (your own or a public test API)",
          "Basic JavaScript familiarity; k6 scripts are JS",
          "Understanding of what virtual users and requests per second mean",
        ],
        steps: [
          {
            title: "Write the load test script",
            body: "Create a k6 script with a default function that makes an HTTP GET request to your endpoint. Add a check that the response status is 200. Add a sleep(1) between requests to simulate realistic user think time. Without the sleep, each VU will hammer the server as fast as possible; not what real users do.",
            code: {
              lang: "javascript",
              snippet: `import http from "k6/http";
import { check, sleep } from "k6";

export default function () {
  const res = http.get("https://your-api.example.com/users");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1); // simulate 1-second think time between requests
}`,
            },
          },
          {
            title: "Define the load profile",
            body: "Use the stages option to define the ramp: 0 to 50 VUs over 30 seconds, 50 to 200 VUs over 90 seconds, hold at 200 for 3 minutes, ramp down to 0 over 30 seconds. This shape gives the system time to warm up before hitting peak load.",
            code: {
              lang: "javascript",
              snippet: `export const options = {
  stages: [
    { duration: "30s", target: 50 },   // warm up
    { duration: "90s", target: 200 },  // ramp to peak
    { duration: "3m",  target: 200 },  // hold at peak
    { duration: "30s", target: 0 },    // ramp down
  ],
};`,
            },
          },
          {
            title: "Add thresholds",
            body: "Add thresholds to the options: http_req_duration with p(95) < 300, and http_req_failed with rate < 0.001. k6 will exit with a non-zero code if either threshold is breached; this makes the load test a passable CI gate rather than just a report generator.",
            code: {
              lang: "javascript",
              snippet: `export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "90s", target: 200 },
    { duration: "3m",  target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    // p95 latency must stay below 300ms
    http_req_duration: ["p(95)<300"],
    // error rate must stay below 0.1%
    http_req_failed: ["rate<0.001"],
  },
};

// Run: k6 run load-test.js
// Non-zero exit code if any threshold is breached`,
            },
          },
          {
            title: "Run and read the summary",
            body: "Run the test and read the end-of-test summary carefully. Look at: http_req_duration (p50, p95, p99), http_req_failed (rate), vus_max (did you hit your target VU count?), and iterations (total requests made). If p95 fails, identify when it breached by looking at the time series, not just the aggregate.",
            code: {
              lang: "javascript",
              snippet: `// Output a JSON summary for CI parsing
// k6 run --out json=results.json load-test.js

// The end-of-test summary in stdout looks like:
//   http_req_duration......: avg=142ms  min=41ms   med=128ms  max=3.1s  p(90)=243ms  p(95)=289ms
//   http_req_failed........: 0.05% ✓ 2 ✗ 3992
//   vus_max................: 200
//   iterations.............: 12048  33.46/s
//
// Check p(95) against your 300ms threshold.
// Check http_req_failed rate against 0.001.`,
            },
          },
          {
            title: "Identify the bottleneck",
            body: "Add groups to your script to separate different request types (GET /users vs POST /orders). Run again and compare p95 per group. The group with the highest p95 is your bottleneck. Check whether it is consistent across the run or spikes only at peak load; these have different root causes.",
            code: {
              lang: "javascript",
              snippet: `import http from "k6/http";
import { check, group, sleep } from "k6";

export default function () {
  group("GET /users", () => {
    const res = http.get("https://your-api.example.com/users");
    check(res, { "users 200": (r) => r.status === 200 });
  });

  sleep(0.5);

  group("POST /orders", () => {
    const res = http.post(
      "https://your-api.example.com/orders",
      JSON.stringify({ product_id: 1, qty: 2 }),
      { headers: { "Content-Type": "application/json" } }
    );
    check(res, { "orders 201": (r) => r.status === 201 });
  });

  sleep(0.5);
}
// k6 reports p95 per group in the summary; compare them to find the slow one`,
            },
          },
        ],
        axiomPages: [
          { title: "Performance testing", href: "/qa/performance-testing-qa" },
          { title: "Non-functional testing", href: "/qa/non-functional-testing" },
          { title: "Observability tracing", href: "/observability/tracing" },
        ],
        whatNext: [
          { label: "Use k6 to verify Kubernetes autoscaling", href: "/practice/cloud-engineer/kubernetes-autoscaling" },
          { label: "Add performance assertions to the CI/CD pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Debug a flaky test that might be load-related", href: "/practice/sdet/debug-flaky-test" },
        ],
      },
      {
        slug: "contract-testing",
        title: "Implement consumer-driven contract testing",
        difficulty: "Advanced",
        tagline: "Pact contract between a Python consumer and FastAPI provider; CI breaks when provider violates contract.",
        description: "Define a Pact contract between a Python consumer and a FastAPI provider for a user lookup endpoint. The consumer publishes the contract (its expectations of the API), the provider verifies against it. Run provider verification in CI and configure the build to fail when the provider makes a breaking change.",
        whyItMatters: "Integration tests catch breaking API changes; but only if you run them against a real provider. Contract testing inverts this: the consumer defines what it needs, and the provider verifies it can meet those needs. This eliminates the most common microservices failure mode: a provider team changes their API without knowing a consumer depends on the old format.",
        prerequisites: [
          "Python with pact-python installed",
          "A FastAPI application exposing a user lookup endpoint (GET /users/{id})",
          "Understanding of what a consumer and provider are in a microservices context",
          "pytest for running the consumer tests",
        ],
        steps: [
          {
            title: "Write the consumer contract test",
            body: "Use pact-python to define what the consumer expects: the consumer will call GET /users/123 and expects a 200 response with a JSON body containing id (integer), name (string), and email (string). Run the consumer test; it starts a mock provider and verifies your consumer code works against it, generating a pact file.",
          },
          {
            title: "Publish the pact to a broker",
            body: "Set up a Pact Broker (Pactflow has a free tier) and publish the generated pact file using the Pact CLI. The broker is the handshake point; the provider will pull contracts from here rather than needing access to the consumer's code.",
          },
          {
            title: "Write the provider verification test",
            body: "In the FastAPI provider repository, write a pytest test that starts the FastAPI app and runs pact.verify() against it, pointing at the broker URL. The verification test replays each consumer interaction against the real provider and asserts the response matches the contract.",
          },
          {
            title: "Break the contract and verify the build fails",
            body: "Change the FastAPI endpoint to return username instead of name in the response. Run the provider verification. It should fail with a clear message about the field name mismatch. This is the outcome you are building toward; catching breaking changes before deployment.",
          },
          {
            title: "Add verification to CI",
            body: "Add the provider verification test to your CI pipeline. Configure it to run on every PR that touches the API layer. The pipeline should block merge when verification fails. This is the enforcement mechanism; without it, contract tests are advisory rather than mandatory.",
          },
        ],
        axiomPages: [
          { title: "Test automation strategy", href: "/qa/test-automation-strategy" },
          { title: "Microservices patterns", href: "/cs-fundamentals/microservices-patterns" },
          { title: "API design", href: "/cs-fundamentals/api-design" },
          { title: "CI/CD pipelines", href: "/cs-fundamentals/cicd-pipelines" },
        ],
        whatNext: [
          { label: "Add the provider verification to your CI/CD pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Write integration tests for the same endpoint with Playwright", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Define contracts for a streaming LLM endpoint", href: "/practice/sdet/streaming-endpoint-test" },
        ],
      },
      {
        slug: "debug-flaky-test",
        title: "Debug a flaky Playwright test",
        difficulty: "Intermediate",
        tagline: "Identify an exact race condition using the Playwright trace viewer and fix it without any sleep.",
        description: "Take a Playwright test that fails roughly 20% of the time due to a timing issue. Use the Playwright trace viewer to identify the exact race condition by examining the action timeline, network waterfall, and DOM snapshots. Fix the flakiness using proper waitFor conditions rather than arbitrary sleep() calls.",
        whyItMatters: "Flaky tests are the most corrosive thing in a test suite. They erode trust until the team starts ignoring failures entirely; at which point the suite provides no safety net. Debugging flakiness with the trace viewer rather than adding sleeps is the discipline that keeps a test suite trustworthy at scale.",
        prerequisites: [
          "Playwright installed with TypeScript",
          "A flaky test (write one deliberately: click a button before an API response has loaded)",
          "trace: 'on-first-retry' set in playwright.config.ts",
          "Understanding of what a race condition is",
        ],
        steps: [
          {
            title: "Reproduce the flakiness reliably",
            body: "Run the test 20 times using: for i in {1..20}; do npx playwright test your-test.spec.ts; done. Record how many times it fails. If it fails less than 3 times in 20 runs, reduce the sleep between setup and action or remove it entirely; you need the failure to be reproducible enough to debug.",
          },
          {
            title: "Open the trace viewer",
            body: "After a failure, run: npx playwright show-trace test-results/.../trace.zip. The trace viewer shows every action, a screenshot at each step, the network waterfall, and the console. Identify which action in the timeline was the last successful one before the failure.",
          },
          {
            title: "Identify the race condition",
            body: "Look at the network waterfall alongside the action timeline. If the test clicked a button before an API call returned, you will see the action happening before the network request completes. If a DOM element was not yet in the expected state, the screenshots will show you what it looked like when the assertion ran.",
          },
          {
            title: "Fix with a proper waitFor",
            body: "Replace the implicit timing assumption with an explicit wait: await expect(page.getByRole('button', {name: 'Submit'})).toBeEnabled() before clicking, or await page.waitForResponse('**/api/data') before asserting on its contents. The waitFor should express a semantic condition, not a time duration.",
          },
          {
            title: "Verify the fix holds",
            body: "Run the test 50 times. If any failures remain, the root cause is deeper than your fix addresses; return to the trace viewer with the new failure. A properly fixed flaky test should have a 0% failure rate, not a reduced failure rate.",
          },
        ],
        axiomPages: [
          { title: "Playwright", href: "/test-automation/playwright" },
          { title: "Debugging systems", href: "/cs-fundamentals/debugging-systems" },
          { title: "Test automation strategy", href: "/qa/test-automation-strategy" },
        ],
        whatNext: [
          { label: "Apply the same discipline to a streaming endpoint test", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Add Playwright traces to your CI/CD pipeline as artifacts", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Write a load test to check the endpoint under stress", href: "/practice/sdet/k6-load-test" },
        ],
      },
      {
        slug: "visual-regression",
        title: "Set up visual regression testing with Playwright screenshots",
        difficulty: "Intermediate",
        tagline: "Capture baseline screenshots, detect pixel diffs on UI changes, and wire the suite into CI.",
        description: "Build a visual regression test suite using Playwright's built-in screenshot comparison. Capture baseline screenshots for a web application's key views, introduce a deliberate visual change, verify the test detects it, and configure the suite to run in CI with a tolerance threshold and a diff image artifact on failure.",
        whyItMatters: "Functional tests verify that a button works; visual regression tests verify that it still looks right. CSS changes, dependency upgrades, and font loading issues cause visual regressions that no functional test catches. A screenshot-based regression suite is the closest thing to automated visual QA; it does not replace human review, but it catches the regressions nobody would notice until a user complained.",
        prerequisites: [
          "Node.js with @playwright/test installed",
          "A web application to test; any locally runnable app works",
          "Git, for committing baseline screenshots",
          "Basic Playwright test writing experience",
        ],
        steps: [
          {
            title: "Write the first screenshot test",
            body: "Use toHaveScreenshot() in a Playwright test. Run it once; Playwright creates the baseline PNG in __screenshots__. Commit it to the repository. Run again; the test should pass. This is the full flow: generate baseline, commit, assert on subsequent runs.",
          },
          {
            title: "Capture baselines for 5 key views",
            body: "Write screenshot tests for: homepage, a listing page, a detail page, a form in empty state, and a form showing a validation error. Run all 5 once to generate baselines. Name them clearly; the file name is what you read in the CI failure log.",
          },
          {
            title: "Set a pixel diff threshold",
            body: "Add { maxDiffPixels: 100 } to toHaveScreenshot() for views with dynamic content (timestamps, animated elements). For static views, use maxDiffPixelRatio: 0 to catch any change. Tight thresholds generate false positives; loose thresholds miss real regressions; calibrate per view.",
          },
          {
            title: "Introduce a deliberate regression",
            body: "Change a CSS value (background colour, font size, spacing) in the app. Run the screenshot tests. At least one should fail with a diff image. Open the diff image; the changed pixels are highlighted in red. Verify you can see the change clearly. Revert and verify all tests pass again.",
          },
          {
            title: "Handle dynamic content",
            body: "Some views contain content that changes on every load (timestamps, random data). Use page.evaluate to freeze time before screenshotting, or mask the dynamic region with toHaveScreenshot({ mask: [page.locator('.timestamp')] }). Run the test 3 times and verify it is stable.",
          },
          {
            title: "Add to CI",
            body: "Configure the Playwright test to run in GitHub Actions. Store the baseline screenshots in the repository. On failure, use the actions/upload-artifact step to capture diff images as build artifacts. The workflow is: PR opens, CI runs, screenshot fails, diff image is attached, reviewer decides if the change is intentional.",
          },
        ],
        axiomPages: [
          { title: "Playwright and test automation", href: "/test-automation/playwright" },
        ],
        whatNext: [
          { label: "Add accessibility scanning to the same test run", href: "/practice/sdet/accessibility-audit" },
          { label: "Debug a screenshot test that is flaky due to animation timing", href: "/practice/sdet/debug-flaky-test" },
          { label: "Wire the suite into a full CI/CD pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
        ],
      },
      {
        slug: "accessibility-audit",
        title: "Automate accessibility audits with axe-core and Playwright",
        difficulty: "Beginner",
        tagline: "Inject axe into running pages, assert zero critical violations, and add the check to your test suite.",
        description: "Write Playwright tests that inject axe-core into each page, run a full accessibility analysis, assert there are no critical or serious violations, and output a readable violation report on failure. Integrate the check as a first-class test alongside your existing functional tests.",
        whyItMatters: "Manual accessibility audits are slow and inconsistent. axe-core running in Playwright catches 30-40% of WCAG issues automatically, runs in milliseconds, and produces machine-readable results that can block a PR. Adding accessibility checks to CI is the single highest-leverage accessibility practice a team can adopt; it prevents new violations from merging from the day it is set up.",
        prerequisites: [
          "Node.js with @playwright/test and @axe-core/playwright installed",
          "A web application to test",
          "Basic Playwright test writing experience",
        ],
        steps: [
          {
            title: "Install and run a basic analysis",
            body: "Run npm install @axe-core/playwright. Import AxeBuilder from @axe-core/playwright in your test file. Run const results = await new AxeBuilder({ page }).analyze(). Print results.violations.length. On a typical production site, expect 5-20 violations.",
          },
          {
            title: "Write the assertion",
            body: "Add expect(results.violations).toHaveLength(0). Run the test. It will probably fail; that is expected. The goal is to understand what you are asserting before deciding how to handle existing violations.",
          },
          {
            title: "Read the violation output",
            body: "For each violation, axe reports: id (the rule), impact (critical/serious/moderate/minor), help (plain-English description), and nodes (the failing elements). Print the violations array as JSON and read the first 3 carefully. Map each to a WCAG criterion.",
          },
          {
            title: "Scope the assertion to critical and serious",
            body: "Update the assertion to filter: const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious'). Assert that critical has length 0. This is the pragmatic starting point; fix blocking issues first, track moderate issues separately.",
          },
          {
            title: "Add a custom reporter",
            body: "On test failure, format violations as a readable table: violation id, impact, affected element count, help URL. Write it to a file and attach it as a Playwright test attachment with testInfo.attach(). The readable report is what the developer gets when CI fails; make it actionable.",
          },
          {
            title: "Run across all pages",
            body: "Add the axe check to the beforeEach of your existing test suite, or write a dedicated accessibility spec that visits all key pages. Track the violation count per page over time. The goal is not zero violations on day one; the goal is no new violations per PR.",
          },
        ],
        axiomPages: [
          { title: "Playwright and test automation", href: "/test-automation/playwright" },
          { title: "Test case design", href: "/qa/test-case-design" },
        ],
        whatNext: [
          { label: "Combine accessibility and visual regression in a pre-release check", href: "/practice/sdet/visual-regression" },
          { label: "Run a manual accessibility audit to complement the automated scan", href: "/practice/qa-engineer/accessibility-testing" },
          { label: "Add the axe check to the CI pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
        ],
      },
      {
        slug: "api-mocking",
        title: "Mock external APIs in tests with respx and Playwright route()",
        difficulty: "Intermediate",
        tagline: "Isolate Python tests with respx and browser tests with page.route(); cover error and timeout cases.",
        description: "Build a test suite for a service that calls two external APIs. Using respx (for Python/httpx tests) and Playwright's page.route() (for browser tests), mock both APIs so tests run without network access, cover error and timeout scenarios impossible to trigger against real APIs, and measure the speed improvement.",
        whyItMatters: "Tests that call real external APIs are slow, flaky, and coupled to rate limits you do not control. Mocking at the HTTP boundary; not at the function boundary; gives you isolation without losing realism: your code actually makes the HTTP call, the mock just intercepts it. This distinction matters because most real integration bugs are in the request construction or response parsing, not the business logic.",
        prerequisites: [
          "Python with httpx and respx installed (pip install httpx respx pytest)",
          "Node.js with @playwright/test for the browser tests",
          "A Python service or script that makes HTTP calls with httpx",
          "Basic pytest experience",
        ],
        steps: [
          {
            title: "Write a test that calls a real API and measure it",
            body: "Write a pytest test that calls a real external API. Record the time taken. Run it 10 times and note the variance. This is your baseline: slow, variable, and broken when the API is down.",
          },
          {
            title: "Mock with respx",
            body: "Use the @respx.mock decorator (or respx.mock context manager). Define the mock route: respx.get('https://api.example.com/endpoint').mock(return_value=httpx.Response(200, json={...})). Run the test; it should pass without any network call and complete in under 10ms.",
          },
          {
            title: "Test error scenarios",
            body: "Define mocks that return 429 (rate limit), 500 (server error), and a network timeout (side_effect=httpx.ConnectTimeout). Write tests that verify your code handles each gracefully. These scenarios are impossible to trigger reliably against a real API.",
          },
          {
            title: "Mock in Playwright with page.route()",
            body: "In a Playwright test, use await page.route('**/api/external/**', route => route.fulfill({ status: 200, body: JSON.stringify({...}) })). Load the page and verify the UI renders correctly. Then mock a 500 and verify the error state renders correctly.",
          },
          {
            title: "Test the timeout state in the browser",
            body: "Use route => route.fulfill({ delay: 5000, status: 200 }) to simulate a slow API. Verify the UI shows a loading state and eventually a timeout error. This test is only possible with network interception; you cannot reliably slow down a real API.",
          },
          {
            title: "Compare test execution time",
            body: "Run your full suite with real network calls enabled. Then run with mocking. For a suite of 20 tests hitting 2 external APIs, the difference is typically 30-120 seconds vs under 5 seconds. That is the CI cost of untested external dependencies.",
          },
        ],
        axiomPages: [
          { title: "pytest patterns", href: "/python/pytest-patterns" },
          { title: "pytest deep dive", href: "/test-automation/pytest-deep-dive" },
          { title: "Playwright and test automation", href: "/test-automation/playwright" },
        ],
        whatNext: [
          { label: "Add contract testing to verify your mocks stay in sync with the real API", href: "/practice/sdet/contract-testing" },
          { label: "Use the same mocking pattern to test streaming LLM endpoints", href: "/practice/sdet/streaming-endpoint-test" },
          { label: "Add the mocked suite to a CI pipeline", href: "/practice/cloud-engineer/github-actions-cicd" },
        ],
      },
    ],
  },
  {
    id: "analytics-engineer",
    title: "Analytics Engineer",
    description: "SQL, schema design, data tools, and the query performance skills production demands.",
    exercises: [
      {
        slug: "window-function-query",
        title: "Write a window function ranking query",
        difficulty: "Beginner",
        tagline: "Rank customers by spend per category with RANK() OVER, then find who dropped out of the top 10.",
        description: "Write a SQL query that ranks customers by total spend in each product category using RANK() OVER (PARTITION BY category ORDER BY total_spend DESC). Then extend it to find customers who ranked in the top 10 in the prior month but dropped out this month; a cohort analysis pattern used in every real analytics stack.",
        whyItMatters: "Window functions are the dividing line between SQL users and SQL engineers. They eliminate the self-joins and correlated subqueries that make queries unreadable and slow, and they unlock analytical patterns that are simply impossible without them. Ranking, running totals, lead/lag comparisons; these are the queries that turn raw data into business insight.",
        prerequisites: [
          "A SQL database with sample data (DuckDB with a CSV works; see the DuckDB exercise)",
          "Understanding of GROUP BY and aggregate functions (SUM, COUNT)",
          "Basic understanding of what a subquery is",
          "No prior window function experience required",
        ],
        steps: [
          {
            title: "Set up the sample data",
            body: "Create two months of order data: customer_id, product_category, order_amount, order_month. You need at least 20 customers and 3 categories to make the ranking meaningful. Seed data where a handful of customers change their spending significantly between months; these are the interesting cases.",
          },
          {
            title: "Write the monthly spend aggregation",
            body: "Aggregate to: customer_id, product_category, order_month, total_spend using GROUP BY. This is the input to your window function. Verify the aggregation is correct before adding the window; debugging window function errors on top of aggregation errors is painful.",
          },
          {
            title: "Add the RANK() window function",
            body: "Add RANK() OVER (PARTITION BY product_category, order_month ORDER BY total_spend DESC) AS category_rank. The PARTITION BY resets the rank for each combination of category and month. Verify that the top spender in each category in each month has rank 1.",
          },
          {
            title: "Find top-10 customers per category per month",
            body: "Wrap the previous query in a CTE or subquery and filter WHERE category_rank <= 10. You now have the top 10 customers per category for each month in your dataset. Print this result and verify it makes sense before building the comparison.",
          },
          {
            title: "Identify customers who dropped out",
            body: "Self-join the top-10 result on customer_id and product_category, matching the prior month to the current month. Customers where the prior month row exists but the current month row is NULL are the dropouts. Use LAG() as an alternative approach; compare both and understand when each is cleaner.",
          },
        ],
        axiomPages: [
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
        ],
        whatNext: [
          { label: "Analyse a full CSV dataset with DuckDB", href: "/practice/analytics-engineer/duckdb-analysis" },
          { label: "Build a dbt model that uses window functions", href: "/practice/analytics-engineer/dbt-revenue-model" },
          { label: "Design a star schema to hold this data properly", href: "/practice/analytics-engineer/star-schema" },
        ],
      },
      {
        slug: "star-schema",
        title: "Design a star schema",
        difficulty: "Intermediate",
        tagline: "fact_orders, dim_customer, dim_product, dim_date; with indexes and a clear grain decision.",
        description: "Design a star schema for e-commerce analytics: a fact_orders table at the order-line grain, with dim_customer, dim_product, and dim_date dimension tables. Write the CREATE TABLE statements with appropriate indexes, define the grain explicitly, and explain your choice of surrogate keys versus natural keys.",
        whyItMatters: "The star schema is the most widely deployed data warehousing pattern for a reason: it makes analytical queries fast and readable. Understanding grain, surrogate keys, and slowly changing dimensions is the foundation that makes everything in an analytics stack work correctly; dbt models, BI tool queries, and executive dashboards all depend on getting this right.",
        prerequisites: [
          "Understanding of what a primary key and foreign key are",
          "A SQL database (Postgres or DuckDB both work for this exercise)",
          "Basic understanding of what an analytical query looks like (GROUP BY, aggregate functions)",
          "No prior data warehousing experience required",
        ],
        steps: [
          {
            title: "Define the grain",
            body: "Write one sentence defining the grain of the fact table: 'Each row in fact_orders represents one line item from one order placed by one customer for one product on one date'. The grain determines which columns belong in the fact table and which belong in dimensions. Write this sentence before touching SQL.",
          },
          {
            title: "Design the dimension tables",
            body: "Write CREATE TABLE statements for dim_customer (customer_sk surrogate key, customer_id natural key, name, email, country, valid_from, valid_to for SCD2), dim_product (product_sk, product_id, name, category, unit_price), and dim_date (date_sk integer YYYYMMDD, date, year, quarter, month, day_of_week, is_weekend).",
          },
          {
            title: "Design the fact table",
            body: "Write CREATE TABLE for fact_orders (order_line_sk surrogate key, order_id, customer_sk FK, product_sk FK, date_sk FK, quantity, unit_price, discount_amount, net_revenue). Net_revenue is a derived metric worth pre-computing; explain why you chose to store it rather than calculating it at query time.",
          },
          {
            title: "Add indexes",
            body: "Add indexes on every foreign key column in fact_orders (customer_sk, product_sk, date_sk). Add a composite index on (date_sk, customer_sk) for the most common query pattern: 'revenue by customer for a date range'. Explain why you would not add more indexes on a fact table that receives millions of inserts per day.",
          },
          {
            title: "Write three analytical queries",
            body: "Write: monthly revenue by product category, top 10 customers by revenue in the last 90 days, and revenue for new customers (first purchase in the last 30 days) vs returning customers. All three should run without subqueries; if they require subqueries, your schema has a structural issue.",
          },
        ],
        axiomPages: [
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
        ],
        whatNext: [
          { label: "Build a dbt model on top of this schema", href: "/practice/analytics-engineer/dbt-revenue-model" },
          { label: "Analyse raw order data with DuckDB before loading it", href: "/practice/analytics-engineer/duckdb-analysis" },
          { label: "Write window function queries against the fact table", href: "/practice/analytics-engineer/window-function-query" },
        ],
      },
      {
        slug: "duckdb-analysis",
        title: "Analyse a large CSV with DuckDB",
        difficulty: "Beginner",
        tagline: "Query a 500MB CSV without loading it into memory; top categories, peak month, busiest hour.",
        description: "Use DuckDB to query a 500MB CSV of transaction data without loading it into memory. Answer three specific questions: the top 10 categories by revenue, the month with the highest average order value, and the busiest hour of day by transaction count. Export the results to a smaller CSV for further analysis.",
        whyItMatters: "DuckDB changes what is possible with local data analysis. A 500MB CSV that would take 10 seconds to load into pandas queries in under a second with DuckDB, with no memory pressure and full SQL support. Understanding when to use DuckDB versus a full data warehouse versus pandas is a practical skill that makes you dramatically faster at exploratory data analysis.",
        prerequisites: [
          "DuckDB installed (pip install duckdb or the CLI)",
          "A large CSV file (the NYC Taxi dataset or any public e-commerce dataset works well; at least 1M rows)",
          "Basic SQL knowledge (SELECT, GROUP BY, ORDER BY)",
          "Python or the DuckDB CLI",
        ],
        steps: [
          {
            title: "Query the CSV directly without loading it",
            body: "Run: SELECT COUNT(*) FROM read_csv_auto('your_file.csv'). DuckDB reads the file in streaming fashion; you do not need to import it first. Check the row count and print the first 5 rows to understand the schema. Note how long this takes compared to loading the same file in pandas.",
          },
          {
            title: "Find the top 10 categories by revenue",
            body: "Write a query grouping by the category column, summing the revenue or amount column, ordering descending, and limiting to 10. If the category column has NULL values, decide whether to include them; NULLIF and COALESCE are your tools. Print the result and verify the math on the top entry manually.",
          },
          {
            title: "Find the month with highest average order value",
            body: "Extract the month from the timestamp column using strftime('%Y-%m', timestamp_col). Group by month, compute AVG(order_value), order descending, limit 1. Compare December to other months; seasonality almost always shows up in this query on real e-commerce data.",
          },
          {
            title: "Find the busiest hour of day",
            body: "Extract the hour using EXTRACT(hour FROM timestamp_col). Group by hour, count transactions, order by count descending. Plot the results in your head (or in a quick matplotlib chart); the distribution is rarely uniform and the shape tells you something about the business.",
          },
          {
            title: "Export results and compare DuckDB to pandas",
            body: "Use COPY (your_query) TO 'results.csv' WITH (FORMAT CSV, HEADER) to export results. Then load the same CSV in pandas and run equivalent operations. Measure the time difference. Note which operations DuckDB is faster at and which pandas handles more conveniently.",
          },
        ],
        axiomPages: [
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
        ],
        whatNext: [
          { label: "Load the summarised data into a star schema", href: "/practice/analytics-engineer/star-schema" },
          { label: "Build a dbt model on the cleaned data", href: "/practice/analytics-engineer/dbt-revenue-model" },
          { label: "Write window function queries on the full dataset", href: "/practice/analytics-engineer/window-function-query" },
        ],
      },
      {
        slug: "fix-n-plus-one-sqlalchemy",
        title: "Fix an N+1 query in SQLAlchemy",
        difficulty: "Intermediate",
        tagline: "Trigger 100 customer queries from lazy loading, fix with joinedload, verify the count drops to 1.",
        description: "Load 100 Order records and access each order's customer name in a loop, triggering the N+1 pattern. Measure the exact query count using SQLAlchemy event listeners. Fix it using a joined load, confirm the query count drops from 101 to 1, and understand when to use joinedload versus selectinload.",
        whyItMatters: "N+1 queries are responsible for a significant share of production database load and are invisible until they are not. An ORM hides the SQL, which makes this pattern easy to write and hard to spot in code review. Understanding how to detect and fix it using the ORM's eager loading options is a baseline skill for any backend engineer working with a relational database.",
        prerequisites: [
          "Python with SQLAlchemy 2.0 installed",
          "A database (SQLite works fine for this exercise)",
          "Basic understanding of what a foreign key relationship is",
          "pip install sqlalchemy",
        ],
        steps: [
          {
            title: "Create the models",
            body: "Define Customer (id, name) and Order (id, customer_id FK, total) models. Add the relationship on Order: customer = relationship('Customer', lazy='select'). This lazy='select' is the default and the source of the N+1. Create the tables and seed 10 customers with 100 orders spread across them.",
          },
          {
            title: "Instrument the session to count queries",
            body: "Add an event listener: from sqlalchemy import event; event.listen(engine, 'before_cursor_execute', lambda *args: counter.increment()). A simple class with an integer attribute is sufficient for the counter. Reset the counter before each measurement.",
          },
          {
            title: "Trigger and count the N+1",
            body: "Load all orders: orders = session.query(Order).all(). Then loop: for o in orders: print(o.customer.name). Reset and increment the counter inside the event listener. After the loop, print the count; it should be 101: 1 query for orders, 1 query per order for the customer.",
          },
          {
            title: "Fix with joinedload",
            body: "Change the query: session.query(Order).options(joinedload(Order.customer)).all(). Reset the counter and run the same loop. The count should be 1: a single query using a JOIN. Print the SQL using echo=True on the engine to confirm the JOIN is present.",
          },
          {
            title: "Compare joinedload vs selectinload",
            body: "Repeat the measurement with selectinload instead of joinedload. The count will be 2 (separate SELECT with IN clause) rather than 1. Run both against 100 rows and against 10,000 rows and measure elapsed time. selectinload typically wins at scale when the related table is large; joinedload wins for small datasets.",
          },
        ],
        axiomPages: [
          { title: "SQLAlchemy", href: "/python/sqlalchemy" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "Performance optimisation", href: "/cs-fundamentals/performance-optimisation-se" },
        ],
        whatNext: [
          { label: "Apply the same analysis to the Software Engineer N+1 exercise", href: "/practice/software-engineer/fix-n-plus-one" },
          { label: "Build a star schema that avoids N+1 at the query layer", href: "/practice/analytics-engineer/star-schema" },
          { label: "Trace query performance with an observability tool", href: "/observability/tracing" },
        ],
      },
      {
        slug: "dbt-revenue-model",
        title: "Build a dbt revenue model with tests",
        difficulty: "Intermediate",
        tagline: "Transform raw orders into daily_revenue with a 7-day rolling average and schema tests.",
        description: "Write a dbt model that transforms a raw orders table into a daily_revenue table with columns: date, revenue, order_count, and a 7-day rolling average of revenue. Add a schema.yml file with not_null and unique tests on the date column, and confirm the tests pass before considering the model complete.",
        whyItMatters: "dbt is the tool that turned SQL into software engineering. Version-controlled models, automated tests, and a dependency graph that documents your entire data transformation pipeline; these capabilities make data teams as rigorous as software teams. The daily_revenue model is simple enough to focus entirely on the dbt workflow rather than the SQL complexity.",
        prerequisites: [
          "dbt Core installed with a Postgres or DuckDB adapter (dbt-postgres or dbt-duckdb)",
          "A dbt project initialised (dbt init your_project)",
          "A raw orders table with at minimum: order_id, order_date, revenue columns",
          "Basic SQL including window functions (covered in the window function exercise)",
        ],
        steps: [
          {
            title: "Write the staging model",
            body: "Create models/staging/stg_orders.sql that selects from the raw orders table, casts columns to the correct types, and renames them to your conventions. Staging models do not aggregate; they just clean. Run dbt run --select stg_orders and verify the output table looks correct.",
          },
          {
            title: "Write the daily_revenue model",
            body: "Create models/marts/daily_revenue.sql. SELECT order_date, SUM(revenue) as revenue, COUNT(*) as order_count FROM {{ ref('stg_orders') }} GROUP BY order_date. Using ref() rather than a raw table name is how dbt builds the dependency graph; never bypass it.",
          },
          {
            title: "Add the 7-day rolling average",
            body: "Wrap the aggregation in a CTE and add: AVG(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as revenue_7d_avg. This window function computes the trailing 7-day average. Verify the first 6 rows have averages equal to the revenue column divided by the number of available days, not full 7-day windows.",
          },
          {
            title: "Write schema.yml tests",
            body: "Create models/marts/schema.yml. Add not_null and unique tests on the date column. Add an accepted_values test if your data has a status column. Run dbt test --select daily_revenue. A failed test is a schema contract violation; treat it as a build failure.",
          },
          {
            title: "Add a data freshness source",
            body: "Define the raw orders table as a dbt source in models/staging/sources.yml with loaded_at_field and freshness thresholds. Run dbt source freshness. If the source has not been updated recently, this warns before you run stale models. Data freshness awareness is a production-grade habit worth building from the start.",
          },
        ],
        axiomPages: [
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
        ],
        whatNext: [
          { label: "Build the star schema that feeds this dbt model", href: "/practice/analytics-engineer/star-schema" },
          { label: "Add window function complexity to the model", href: "/practice/analytics-engineer/window-function-query" },
          { label: "Run this model in a CI/CD pipeline with dbt Cloud or GitHub Actions", href: "/practice/cloud-engineer/github-actions-cicd" },
        ],
      },
      {
        slug: "data-quality-profiling",
        title: "Profile a dataset for quality issues with DuckDB",
        difficulty: "Beginner",
        tagline: "Measure nulls, duplicates, outliers, and cardinality across a 50k-row CSV in under 50 lines of SQL.",
        description: "Take a raw CSV dataset (at least 50,000 rows) and produce a complete data quality profile: null rates per column, duplicate row counts, outlier detection using IQR for numeric columns, cardinality for categorical columns, and a summary report that flags any column needing remediation.",
        whyItMatters: "Data quality problems are silent; a model trained on 20% null values in a key feature produces subtly wrong results that do not show up as errors. Profiling a dataset before using it is the data engineering equivalent of reading the code before running it. The output is also a prerequisite for any SLA-based data contract: you cannot promise data is complete if you have never measured it.",
        prerequisites: [
          "Python with duckdb installed (pip install duckdb)",
          "A CSV dataset with at least 50,000 rows and a mix of numeric and categorical columns (Kaggle Titanic or NYC Taxi datasets work well)",
          "Basic SQL knowledge",
        ],
        steps: [
          {
            title: "Load and inspect with DuckDB",
            body: "Use duckdb.sql(\"SELECT * FROM read_csv_auto('data.csv') LIMIT 5\").df() to preview. Run SELECT COUNT(*) to verify row count. Run DESCRIBE on the table to see inferred column types. A numeric column inferred as VARCHAR is a common sign of data quality issues.",
          },
          {
            title: "Measure null rates",
            body: "Write a DuckDB query that computes (COUNT(*) - COUNT(col)) / COUNT(*) for every column. Sort descending. Any column above 5% null is flagged; either the data is genuinely missing or the ETL process has a gap.",
          },
          {
            title: "Find duplicate rows",
            body: "Run SELECT COUNT(*) FROM (SELECT DISTINCT * FROM data) and compare to the total. Then identify the natural key (e.g., user_id + timestamp) and check for duplicates on that subset. Duplicate rows in event data are usually a pipeline bug, not noise.",
          },
          {
            title: "Detect numeric outliers",
            body: "For each numeric column, compute Q1, Q3, and IQR using PERCENTILE_CONT. Flag rows where value < Q1 - 1.5*IQR or value > Q3 + 1.5*IQR. Print the outlier count and percentage per column. Decide: are these data errors (negative age) or genuine extreme values (very large purchase)?",
          },
          {
            title: "Profile categorical cardinality",
            body: "For each categorical column, compute COUNT(DISTINCT value) and the top 10 most frequent values with frequencies. Low-cardinality columns (under 20 unique values) are good candidates for enums. High-cardinality columns where 95% of values appear only once are a sign of free-text fields being misused as structured data.",
          },
          {
            title: "Write the quality report",
            body: "Produce a data quality report: a table with column, type, null_rate, duplicate_flag, outlier_count, cardinality, and a summary section with overall data quality score. Save as CSV or markdown; this is what you attach to a pull request when the data lands in the warehouse.",
          },
        ],
        axiomPages: [
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
          { title: "Database design", href: "/cs-fundamentals/database-design" },
        ],
        whatNext: [
          { label: "Build a dbt model that codifies these quality rules as schema tests", href: "/practice/analytics-engineer/dbt-testing" },
          { label: "Design a star schema that handles the nulls you found correctly", href: "/practice/analytics-engineer/star-schema" },
          { label: "Analyse a large CSV dataset with more complex DuckDB queries", href: "/practice/analytics-engineer/duckdb-analysis" },
        ],
      },
      {
        slug: "scd-type2",
        title: "Implement Type 2 slowly changing dimensions in SQL",
        difficulty: "Intermediate",
        tagline: "Track customer attribute history with effective dates, expire old rows, and query point-in-time state.",
        description: "Implement a Type 2 SCD for a customer dimension where email address and subscription plan change over time. You will write the initial load, the incremental merge that expires changed rows and inserts new ones, and the point-in-time query that returns what a customer's record looked like on any given historical date.",
        whyItMatters: "Every analytics system eventually needs to answer 'what did the customer's plan look like when they made this purchase?' If you built a simple dimension with current values, that question is unanswerable for historical data. SCD Type 2 preserves history by versioning rows with effective dates rather than overwriting; and understanding it is the difference between a data model that supports historical analysis and one that only works for reports about today.",
        prerequisites: [
          "PostgreSQL or DuckDB running locally",
          "Basic SQL (INSERT, UPDATE, SELECT with JOINs)",
          "Understanding of what a dimension table is from the star schema exercise",
        ],
        steps: [
          {
            title: "Create the dimension table",
            body: "Write CREATE TABLE dim_customer with: surrogate_key SERIAL, customer_id INT (natural key), email VARCHAR, subscription_plan VARCHAR, effective_from DATE, effective_to DATE (NULL for the current row), is_current BOOLEAN. The surrogate key plus effective dates is the SCD Type 2 pattern.",
          },
          {
            title: "Load the initial data",
            body: "INSERT 10 customer rows with effective_from = today and effective_to = NULL, is_current = TRUE. Write a query that returns only current rows (WHERE is_current = TRUE); this is the view most reports will use.",
          },
          {
            title: "Write the incremental merge",
            body: "Write the SQL that handles a changed row: UPDATE the existing row to set effective_to = today minus 1 day, is_current = FALSE, then INSERT a new row for the same customer_id with the new attributes and effective_from = today. Wrap both in a transaction. Verify 2 rows per changed customer.",
          },
          {
            title: "Handle new and unchanged customers",
            body: "Extend the merge: for new customer_ids, INSERT with is_current = TRUE; for changed customers, expire and insert; for unchanged customers, do nothing. Write a staging query that classifies each incoming row as new, changed, or unchanged using a LEFT JOIN.",
          },
          {
            title: "Query point-in-time state",
            body: "Write a query with a date parameter that returns the dimension as it existed on that date: WHERE effective_from <= target_date AND (effective_to IS NULL OR effective_to > target_date). Test with 3 historical dates and verify the correct row is returned for customers who changed during those periods.",
          },
          {
            title: "Join the SCD dimension to fact data",
            body: "Create a fact_orders table with customer_id, order_date, amount. Join to dim_customer using the point-in-time pattern: match on customer_id where order_date falls within the effective window. Verify an order placed before a plan change shows the old plan, not the current one.",
          },
        ],
        axiomPages: [
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
        ],
        whatNext: [
          { label: "Automate the SCD Type 2 merge logic with a dbt snapshot", href: "/practice/analytics-engineer/dbt-testing" },
          { label: "Design the full star schema this dimension fits into", href: "/practice/analytics-engineer/star-schema" },
          { label: "Profile the dimension for data quality before running history queries", href: "/practice/analytics-engineer/data-quality-profiling" },
        ],
      },
      {
        slug: "dbt-testing",
        title: "Write comprehensive dbt tests including custom macros",
        difficulty: "Advanced",
        tagline: "Cover your dbt models with singular tests, a custom generic macro, source freshness, and CI.",
        description: "Take an existing dbt project and build a testing layer that goes beyond not_null and unique. You will write singular tests for complex business rules, create a custom generic test as a Jinja macro, add source freshness checks, and run the full test suite in a CI workflow.",
        whyItMatters: "Most dbt projects have schema.yml tests that check not_null and unique, and nothing else. Those tests catch structural problems; they do not catch business rule violations. A customer cannot have negative lifetime value. Orders cannot complete before they are created. Revenue cannot go backwards. These rules live in your head until you write dbt tests for them.",
        prerequisites: [
          "dbt Core installed with a DuckDB or PostgreSQL adapter (pip install dbt-core dbt-duckdb)",
          "A dbt project with at least 2 models (the revenue model from the previous exercise is perfect)",
          "Basic dbt knowledge: you can run dbt run and dbt test",
          "Basic Jinja templating knowledge (learnable during the exercise)",
        ],
        steps: [
          {
            title: "Audit your current tests",
            body: "Run dbt test and note what passes. Then read every model and list 3-5 business rules that are not tested: 'revenue cannot be negative', 'order_count cannot be zero if revenue is non-zero', 'date must be in the past'. These are your test targets.",
          },
          {
            title: "Write singular tests",
            body: "Create tests/assert_revenue_is_positive.sql. Write a SELECT that returns rows violating the rule: SELECT * FROM {{ ref('daily_revenue') }} WHERE revenue < 0. If any rows are returned, dbt treats it as a test failure. Run dbt test --select assert_revenue_is_positive. Then insert a bad row manually and verify the test catches it.",
          },
          {
            title: "Write a custom generic test macro",
            body: "Create macros/test_not_negative.sql. Use the dbt macro pattern: {% macro test_not_negative(model, column_name) %} SELECT * FROM {{ model }} WHERE {{ column_name }} < 0 {% endmacro %}. Add it to schema.yml as a column test: - not_negative. This macro is now reusable across every model.",
          },
          {
            title: "Add referential integrity tests",
            body: "Write a singular test that checks every customer_id in your fact table exists in your dimension table. Referential integrity failures are the most common data warehouse quality issue; they mean your joins silently drop rows without any error.",
          },
          {
            title: "Configure source freshness",
            body: "In sources.yml, add loaded_at_field and freshness thresholds for each source table. Run dbt source freshness. Set warn_after to 24 hours and error_after to 48 hours. Source freshness runs independently of dbt test and should be scheduled separately.",
          },
          {
            title: "Run the full suite in CI",
            body: "Configure a GitHub Actions workflow that runs dbt build --target ci: compile, run models against a test schema, run all tests, produce JUnit XML as an artifact. A suite that passes locally but fails in CI means the CI environment is wrong; fix the environment, not the tests.",
          },
        ],
        axiomPages: [
          { title: "Database design", href: "/cs-fundamentals/database-design" },
          { title: "SQL fundamentals", href: "/cs-fundamentals/sql" },
          { title: "DuckDB and Polars", href: "/python/polars-duckdb" },
        ],
        whatNext: [
          { label: "Profile the source data that feeds your dbt models", href: "/practice/analytics-engineer/data-quality-profiling" },
          { label: "Apply CI/CD discipline to dbt with GitHub Actions", href: "/practice/cloud-engineer/github-actions-cicd" },
          { label: "Implement SCD Type 2 history in a dbt snapshot", href: "/practice/analytics-engineer/scd-type2" },
        ],
      },
    ],
  },
];

export function getRolePath(id: string): RolePath | undefined {
  return ROLE_PATHS.find((p) => p.id === id);
}

export function getExercise(roleId: string, slug: string): Exercise | undefined {
  return getRolePath(roleId)?.exercises.find((e) => e.slug === slug);
}
