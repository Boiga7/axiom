export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type WikiLink = {
  title: string;
  href: string;
};

export type Step = {
  title: string;
  body: string;
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
        whyItMatters: "RAG is how most production AI systems get factual, up-to-date answers without hallucinating. Understanding the pipeline end-to-end — chunk size trade-offs, embedding choice, retrieval strategy — makes you dangerous in any AI engineering role. Frameworks hide this; building it yourself exposes exactly where things go wrong.",
        prerequisites: [
          "Python basics — you should be comfortable writing functions and handling files",
          "Basic understanding of what an LLM is and how prompting works",
          "Anthropic API key or access to a local model via Ollama",
          "pip-installable environment (uv or venv)",
        ],
        steps: [
          {
            title: "Pick a PDF and chunk it",
            body: "Choose any long PDF (a research paper works well). Use PyMuPDF or pdfplumber to extract raw text, then split it into overlapping chunks of ~512 tokens using a recursive character splitter. Print the first three chunks so you can see what the model will actually receive.",
          },
          {
            title: "Embed each chunk locally",
            body: "Install sentence-transformers and load the all-MiniLM-L6-v2 model. Run each chunk through the model to produce a 384-dimensional embedding vector. This step happens entirely on your machine — no API call, no cost.",
          },
          {
            title: "Store vectors in Chroma",
            body: "Start a persistent Chroma client, create a collection, and add each chunk along with its embedding and the chunk index as metadata. Verify the collection size matches your chunk count before moving on.",
          },
          {
            title: "Retrieve on query",
            body: "Embed the user's question with the same model, then query Chroma for the top-3 most similar chunks by cosine distance. Print the retrieved chunks — this is your context window budget before you hand anything to Claude.",
          },
          {
            title: "Answer with Claude",
            body: "Build a system prompt that instructs Claude to answer only from the provided context. Concatenate the retrieved chunks into a user message alongside the question, call the Anthropic Messages API, and print the response. Then ask a question your PDF does not answer and observe what happens.",
          },
          {
            title: "Add source citations",
            body: "Update the prompt to ask Claude to cite which chunk index it drew each claim from. Verify the citations match the retrieved content. This is the minimum viable attribution that makes RAG outputs auditable.",
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
            body: "Write out what a faithful answer means before touching code. A minimal rubric: every factual claim in the answer must be traceable to the provided context; the answer must not introduce facts not present in the context. Write this as plain English — you will paste it into the judge prompt.",
          },
          {
            title: "Curate 10 golden cases",
            body: "Write 10 questions you know the answer to from your source documents. For each, record the expected answer (ground truth) and the context chunk it comes from. Include 2 edge cases: one question the document does not answer, and one where the answer requires combining two chunks.",
          },
          {
            title: "Build the judge prompt",
            body: "Write a system prompt for Claude that presents the question, the retrieved context, and the model's answer, then asks Claude to score faithfulness from 1-5 and explain its reasoning. Use XML tags to separate the sections clearly — Claude follows structured prompts more reliably.",
          },
          {
            title: "Run each case through the judge",
            body: "For each golden case, call your system to get an answer, then call Claude with the judge prompt. Parse the score from the response. If Claude returns reasoning alongside the score, log it — that reasoning is where the signal is.",
          },
          {
            title: "Aggregate and report",
            body: "Calculate pass rate (score >= 4) and mean score across all 10 cases. Print a table: question, expected, actual, score, pass/fail. Run the eval twice and check it is deterministic — if scores vary significantly, add temperature=0 to your judge call.",
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
        description: "Build a research agent using LangGraph with two tools: web search (via Tavily or DuckDuckGo) and a persistent memory store. The agent should accept a topic, plan sub-questions, search for each, store results in memory, and synthesise a structured summary — all within a typed, resumable graph.",
        whyItMatters: "Single-turn agents break on any task requiring more than one tool call. LangGraph's checkpoint system lets you pause, inspect, and resume mid-run — the critical capability for agents in production where things go wrong mid-task. Understanding how state flows through a graph makes every agentic system you build after this easier to debug.",
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
          { title: "Anthropic API — tool use", href: "/apis/anthropic-api" },
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
          },
          {
            title: "Add cache_control breakpoints",
            body: "Add a cache_control: {type: 'ephemeral'} marker to the last content block of your system prompt. This tells Anthropic to cache everything up to that point. The cached portion must be at least 1024 tokens — if your prompt is shorter, pad it with relevant context.",
          },
          {
            title: "Make five calls and read usage",
            body: "Repeat the five calls. The first call creates the cache (cache_creation_input_tokens > 0). Calls two through five should show cache_read_input_tokens matching your system prompt token count and cache_creation_input_tokens at zero. Print each usage object — do not assume it is working.",
          },
          {
            title: "Calculate actual savings",
            body: "Cache reads cost 10% of the base input token price. Calculate: (uncached_total_tokens - cached_reads) * full_price + cached_reads * 0.1 * full_price. Compare to the uncached baseline. Also measure wall-clock latency for each call — cached calls are typically 20-40% faster on long prompts.",
          },
          {
            title: "Test cache expiry",
            body: "Wait 6 minutes and repeat a call. The 5-minute TTL for ephemeral caches should have expired — the call should show cache_creation_input_tokens again rather than cache_read_input_tokens. This teaches you when to use ephemeral vs considering longer cache strategies.",
          },
        ],
        axiomPages: [
          { title: "Anthropic API — prompt caching", href: "/apis/anthropic-api" },
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
        whyItMatters: "You cannot improve what you cannot measure. Latency and cost in LLM systems are almost never distributed evenly — one query type often accounts for 40% of spend. Langfuse makes this visible in minutes, and the habit of adding traces from day one prevents the situation where a production system is burning money in a way no one can explain.",
        prerequisites: [
          "A working LLM script or chatbot you can modify (even a simple Claude call loop is fine)",
          "Langfuse account (free tier is sufficient) or self-hosted instance",
          "LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables",
          "pip install langfuse anthropic",
        ],
        steps: [
          {
            title: "Initialise the Langfuse client",
            body: "Import Langfuse and create a client using your public and secret keys. Verify the connection by running langfuse.auth_check() — it will throw if the credentials are wrong. Add this to your script's initialisation block.",
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
            body: "If your chatbot fetches context before calling Claude, wrap the retrieval step in trace.span(name='retrieval'). Record how many chunks were retrieved and what the search query was. Langfuse will show retrieval latency separately from generation latency — often retrieval is the bottleneck, not the model.",
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
        whyItMatters: "God classes are the most common form of technical debt in production codebases. They are hard to test, hard to change, and impossible to reuse. Learning to decompose them using SOLID is not academic — it is the core skill that separates engineers who can work in any codebase from those who can only work in their own.",
        prerequisites: [
          "Comfortable reading and writing Python or TypeScript classes",
          "Basic understanding of what a class constructor and instance method are",
          "Some exposure to the idea that functions should do one thing",
          "No prior knowledge of SOLID required — you will learn it by doing",
        ],
        steps: [
          {
            title: "Read the God class and list its responsibilities",
            body: "Write down every distinct thing the class does. Do not look for patterns yet — just list actions. A well-decomposed God class will have 3-5 clearly separable responsibilities. If you find more than 6, it may need two rounds of refactoring.",
          },
          {
            title: "Define interfaces for each responsibility",
            body: "Before writing any classes, write Python Protocols or TypeScript interfaces for each responsibility. An interface for a database writer might have a single method: save(record) -> None. Writing interfaces first forces you to think about contracts before implementation.",
          },
          {
            title: "Extract each class",
            body: "Create one class per responsibility, each implementing its interface. Move the relevant methods from the God class verbatim first — do not improve them yet. Verify each class can be instantiated and called in isolation before connecting them.",
          },
          {
            title: "Connect via dependency injection",
            body: "Rewrite the original class to accept the three new classes in its constructor rather than creating them internally. The caller now controls which implementations are injected. This is what makes the system testable — you can inject a mock database writer without changing the class.",
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
            body: "Create a class that holds state, failure count, and the time the circuit opened. Implement a call() method that checks state and either executes the function or raises CircuitOpenError immediately. Keep the class separate from the decorator — this makes it testable and reusable.",
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
            body: "Allow the decorator to accept an optional fallback function that is called when the circuit is open instead of raising an error. This is how production circuit breakers work — they return stale cache or a degraded response rather than a hard error.",
          },
        ],
        axiomPages: [
          { title: "Microservices patterns", href: "/cs-fundamentals/microservices-patterns" },
          { title: "Error handling patterns", href: "/cs-fundamentals/error-handling-patterns" },
          { title: "Distributed systems", href: "/cs-fundamentals/distributed-systems" },
        ],
        whatNext: [
          { label: "Add observability — emit metrics when the circuit trips", href: "/cs-fundamentals/observability-se" },
          { label: "Combine with a retry decorator using exponential backoff", href: "/cs-fundamentals/error-handling-patterns" },
          { label: "Design a multi-tenant schema for your backend", href: "/practice/software-engineer/multi-tenant-schema" },
        ],
      },
      {
        slug: "tdd-log-parser",
        title: "TDD a log line parser",
        difficulty: "Beginner",
        tagline: "Build a structured log parser using strict red-green-refactor — all tests written first.",
        description: "Parse structured log lines of the format [TIMESTAMP] LEVEL: message into a typed object using test-driven development. You must write all five tests before writing a single line of implementation. The exercise is about the discipline of the process, not the complexity of the problem.",
        whyItMatters: "TDD feels slower until the moment you need to change something. Writing tests first forces you to think about the interface before the implementation — and interfaces that are easy to test are almost always easier to use. The log parser is deliberately simple so the entire mental budget goes on learning the red-green-refactor rhythm.",
        prerequisites: [
          "Python with pytest installed, or TypeScript with Vitest",
          "Understanding of what a test assertion is",
          "No prior TDD experience required — this is a first-principles exercise",
          "A text editor with good test runner integration (VS Code with pytest extension works well)",
        ],
        steps: [
          {
            title: "Define the interface (no implementation yet)",
            body: "Write the function signature only: parse_log(line: str) -> LogEntry where LogEntry is a dataclass or TypedDict with timestamp: datetime, level: str, and message: str. Do not write any logic — just the signature and the type. This is the contract your tests will verify.",
          },
          {
            title: "Write all five tests (red)",
            body: "Write: test_parses_info_level, test_parses_error_level, test_extracts_timestamp, test_extracts_message_with_spaces, and test_raises_on_malformed_input. Run them — all should fail (red). If any pass without implementation, your test is wrong.",
          },
          {
            title: "Write the minimum implementation (green)",
            body: "Write the simplest code that makes all five tests pass. Do not handle edge cases that are not tested. Do not add logging, error codes, or configuration. The implementation should be shorter than the tests — that is a good sign.",
          },
          {
            title: "Refactor (still green)",
            body: "Now improve the implementation without changing the tests. Extract the regex pattern as a constant. Give the error message a clear description of what was malformed. Run the tests after every change — if a test fails, undo and try again.",
          },
          {
            title: "Add two edge case tests and make them pass",
            body: "Add tests for: a log line with a colon in the message (common failure point), and a timestamp in a slightly different format. Watch them fail, fix the implementation, watch them pass. This is the full TDD loop — you have now done it seven times.",
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
        tagline: "Row-level security policies that isolate tenant data — verified with two test tenants.",
        description: "Design a Postgres schema for a multi-tenant SaaS product where each tenant's data is completely isolated. You will implement row-level security (RLS) policies, create two test tenants with overlapping data shapes, and verify that queries from one tenant cannot return rows belonging to the other — even with direct SQL access.",
        whyItMatters: "Multi-tenancy done wrong is a security incident waiting to happen. Row-level security pushes isolation into the database engine rather than relying on application code to get it right every time. Understanding RLS also makes you dangerous in any SaaS backend context — it is one of the most underused features in Postgres.",
        prerequisites: [
          "Postgres running locally (Docker is fine: docker run -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres)",
          "psql or a GUI client like DBeaver",
          "Understanding of what a foreign key and JOIN are",
          "Basic familiarity with SQL CREATE TABLE and INSERT",
        ],
        steps: [
          {
            title: "Design the schema",
            body: "Create three tables: tenants (id, name, created_at), users (id, tenant_id FK, email), and resources (id, tenant_id FK, name, data). Every tenant-scoped table has a tenant_id column. This is the shared-schema, row-level isolation model — one schema, many tenants, policies enforce the wall.",
          },
          {
            title: "Enable RLS and write the policy",
            body: "Run ALTER TABLE resources ENABLE ROW LEVEL SECURITY. Then create a policy: CREATE POLICY tenant_isolation ON resources USING (tenant_id = current_setting('app.current_tenant_id')::uuid). This policy fires on every SELECT, INSERT, UPDATE, and DELETE — the tenant_id must match the session variable.",
          },
          {
            title: "Create two tenants and seed data",
            body: "Insert two tenant rows and create 5 resources for each tenant. Make sure some resource names overlap between tenants (e.g. both have a resource called 'dashboard') — this is the test that catches permissive policies.",
          },
          {
            title: "Verify isolation",
            body: "Set app.current_tenant_id to tenant A's ID and SELECT * FROM resources. You should see exactly 5 rows. Then set it to tenant B and repeat. Then try without setting the variable at all — the query should return zero rows (or error, depending on your default deny policy).",
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
            body: "Add a SQLAlchemy event listener on engine 'before_cursor_execute' that increments a counter. Load all orders with session.query(Order).all() and then loop over them accessing order.customer.name. Print the query count — it should be 101: 1 for orders, 100 for customer lookups.",
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
        tagline: "Multi-stage Dockerfile, health check endpoint, non-root user — deployed to ECS Fargate.",
        description: "Take a simple FastAPI application and write a production-quality Dockerfile: multi-stage build to minimise image size, a /health endpoint that returns 200, and a non-root user for the container process. Deploy the image to AWS ECS Fargate via ECR and confirm the health check passes in the AWS console.",
        whyItMatters: "Containerisation is now a baseline skill for any cloud role, and the gap between a working Dockerfile and a production-ready one is large. Multi-stage builds, non-root users, and health checks are not optional in a real environment — they are the difference between an image your security team accepts and one they reject at the gate.",
        prerequisites: [
          "Docker installed and running locally (docker build and docker run work)",
          "AWS account with ECS, ECR, and IAM access",
          "AWS CLI configured with credentials (aws configure)",
          "A simple FastAPI app — even a single route returning JSON is sufficient",
        ],
        steps: [
          {
            title: "Add a /health endpoint",
            body: "Add a GET /health route to your FastAPI app that returns {status: ok} with a 200 status code. This is the endpoint ECS will poll to know whether your container is healthy. Keep it dependency-free — it should return 200 even if your database is unavailable.",
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
            body: "Create an ECR repository, authenticate Docker to ECR with aws ecr get-login-password, tag your image, and push it. Verify the image appears in the ECR console before touching ECS — it is a common mistake to push to the wrong registry URI.",
          },
          {
            title: "Deploy to ECS Fargate and verify the health check",
            body: "Create an ECS task definition pointing to your ECR image. Configure the health check as: command ['CMD-SHELL', 'curl -f http://localhost:8000/health || exit 1'], interval 30s, timeout 5s. Deploy the task and watch the health check status in the ECS console — it should transition from UNKNOWN to HEALTHY within 90 seconds.",
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
        tagline: "S3 bucket with versioning, CloudFront distribution, and OAI — destroyed and recreated cleanly.",
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
            body: "Define an aws_s3_bucket resource with a unique name. Add aws_s3_bucket_versioning to enable versioning, and aws_s3_bucket_public_access_block to block all public access. Run terraform plan — verify the plan shows 3 resources to create before applying.",
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
            body: "Run terraform destroy --auto-approve. Verify everything is gone in the AWS console. Run terraform apply again. Compare the output of both applies — they should be identical. If there are differences, your configuration is not fully declarative.",
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
        tagline: "Lint, test, build Docker image, push to ECR, deploy to ECS — failing fast on test failure.",
        description: "Write a GitHub Actions workflow that runs lint, runs tests, builds a Docker image, pushes it to Amazon ECR, and triggers an ECS service update on every push to main. The pipeline must fail fast — if tests fail, the Docker build should never run.",
        whyItMatters: "A CI/CD pipeline is the enforcement mechanism for every quality standard you care about. Without it, lint and tests are optional suggestions. With it, a broken build is immediately visible to the whole team. Building one from scratch teaches you exactly what each step does — which matters when it breaks at 2am.",
        prerequisites: [
          "GitHub repository with a Dockerised application (the previous exercise works perfectly)",
          "AWS account with ECR and ECS access",
          "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY stored as GitHub repository secrets",
          "ECS cluster and service already created (manually or via Terraform)",
        ],
        steps: [
          {
            title: "Write the workflow trigger and environment",
            body: "Create .github/workflows/deploy.yml. Set the trigger to push on the main branch. Define environment variables for your ECR registry, repository name, and ECS service name at the top of the file — this makes the workflow reusable without editing step commands.",
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
            body: "Deliberately break a test and push to main. Confirm the build and deploy jobs never run. Then fix the test and push again — confirm the full pipeline succeeds and the new image is running in ECS. Check the ECS service events to see the deployment record.",
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
        description: "Configure a CloudWatch billing alarm that sends an SNS notification when estimated charges exceed $100. Then write a boto3 script that queries AWS Cost Explorer for the last 30 days, and outputs spend broken down by service as a sorted table — most expensive service first.",
        whyItMatters: "Cloud costs are famously easy to run away with. A $100 alarm takes 10 minutes to set up and has saved engineers from five-figure surprise bills more than once. The Cost Explorer script gives you the visibility to understand where money is going before you get the alarm — the ideal order of operations.",
        prerequisites: [
          "AWS account with billing access (the root account or a user with billing permissions)",
          "AWS CLI configured",
          "boto3 installed (pip install boto3)",
          "Billing alerts enabled in the AWS Billing console (Preferences > Billing Alerts)",
        ],
        steps: [
          {
            title: "Enable billing alerts",
            body: "In the AWS Billing console, navigate to Billing Preferences and enable the Receive Billing Alerts checkbox. This must be done before CloudWatch can receive billing metrics. It can take up to 24 hours for billing data to appear — set this up first.",
          },
          {
            title: "Create an SNS topic for notifications",
            body: "Create an SNS topic called billing-alerts. Subscribe your email address to it and confirm the subscription from your inbox. CloudWatch will publish to this topic when the alarm fires — without the confirmation, no notifications will arrive.",
          },
          {
            title: "Create the CloudWatch billing alarm",
            body: "In CloudWatch, create an alarm on the EstimatedCharges metric in the AWS/Billing namespace, dimension Currency=USD. Set the threshold to 100, evaluation period to 1 day, and the action to notify the SNS topic you created. Set the alarm description — future-you will thank present-you.",
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
        tagline: "HPA targeting 60% CPU, 200 VU load test with k6 — verify pods scale up and back down.",
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
            body: "Write a Deployment manifest for a simple HTTP API with replicas: 2, resources.requests.cpu: 100m, and resources.limits.cpu: 200m. Resource requests are mandatory for HPA to function — without them, the metrics server has no denominator for the utilisation percentage.",
          },
          {
            title: "Configure the HorizontalPodAutoscaler",
            body: "Write an HPA manifest targeting the Deployment with minReplicas: 2, maxReplicas: 10, and a CPU utilisation target of 60%. Apply it and verify it is active with kubectl get hpa — the CURRENT column will show <unknown> until the metrics server has data.",
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
            body: "After the load test ends, watch the pod count. Kubernetes waits 5 minutes by default before scaling down (the stabilisation window prevents flapping). Verify pods eventually return to the minimum replica count. Then check k6's summary — confirm p95 latency and error rate stayed within thresholds during scaling.",
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
        whyItMatters: "Scripted test cases tell you whether the system does what you specified. Exploratory testing tells you whether the system does what users need. The charter format is a discipline that keeps sessions focused without over-specifying what to do — good explorers follow threads, bad ones wander. Writing the bugs you find is the output that creates accountability.",
        prerequisites: [
          "Access to any web application with a login page (open-source apps like GitLab or Gitea work well)",
          "A text editor for notes — structured notes are the output of the session, not the login",
          "60 minutes of uninterrupted time",
          "No prior testing experience required — this exercise teaches the fundamentals",
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
            body: "Start a timer and begin the session. Take notes continuously — what you tried, what happened, questions you want to investigate later. Do not follow threads that are outside your charter. When something surprising happens, note it immediately. When the timer ends, stop — even if you are mid-thought.",
          },
          {
            title: "File bugs with full detail",
            body: "For each issue found: write the title as an observation (Login page reveals whether an account exists via error message wording), steps to reproduce, expected behaviour, actual behaviour, and environment. A bug report is only useful if someone else can reproduce it without asking you questions.",
          },
          {
            title: "Write a session debrief",
            body: "Write a half-page debrief: what you covered, what you found, what you did not cover, and what you would investigate next. This debrief is how exploratory testing becomes visible to the team — without it, 45 minutes of work disappears into a black box.",
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
        whyItMatters: "Risk-based thinking is what separates senior QA engineers from those who test everything equally. Every product ships with untested functionality — the question is whether you are choosing consciously which risks to accept, or discovering them as production incidents. A risk matrix makes quality trade-offs visible and defensible to non-engineers.",
        prerequisites: [
          "Access to a checkout flow (any e-commerce site or a test environment)",
          "Understanding of what a test case is at a basic level",
          "No specific tooling required — a spreadsheet or text file is sufficient",
          "Willingness to think from a business impact perspective, not just a technical one",
        ],
        steps: [
          {
            title: "Identify 10 candidate risks",
            body: "List 10 things that could go wrong in the checkout flow. Think across categories: payment processing, inventory accuracy, user data, discount code abuse, session management, third-party API failures, accessibility, error recovery. Do not score them yet — you need a wide set before you filter.",
          },
          {
            title: "Score and select the top 5",
            body: "For each risk, score likelihood (1=very unlikely, 5=very likely) and impact (1=minor inconvenience, 5=revenue loss or legal exposure). Multiply for a risk score. Select the top 5 by score. Where two risks score equally, prefer the one with higher impact — severity matters more than frequency in a payment context.",
          },
          {
            title: "Write 3 test cases per risk",
            body: "For each of the 5 risks, write 3 test cases using: preconditions, action, expected result. Order them by priority within the risk: the most important test case first. Each test case should be independently executable — no shared state between them.",
          },
          {
            title: "Label each with automate / manual / exploratory",
            body: "For each test case, decide: should this be automated in the regression suite, executed manually at each release, or covered via exploratory testing? Automation is best for high-frequency, stable, data-driven cases. Exploratory is best for risks that require human judgment or change frequently.",
          },
          {
            title: "Present the matrix to a stakeholder",
            body: "Ask a colleague to play the role of a product manager and walk them through the matrix. Explain why the top risk scored highest and why you are accepting the lower-scored risks without test cases. If they challenge a severity score, update it — the matrix should reflect shared understanding, not just your view.",
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
        whyItMatters: "Boundary value analysis and equivalence partitioning are the two techniques that give you the most defect coverage for the fewest test cases. They are the foundation of systematic test case design — not exhaustive testing, but structured coverage. Engineers who apply these techniques find bugs that exploratory testing and scripted happy-path testing both miss.",
        prerequisites: [
          "No tooling required — this is a design exercise using pen and paper or a spreadsheet",
          "Basic understanding of what a test case is",
          "No prior experience with formal test design techniques required",
          "Access to the application to verify your cases (optional but useful)",
        ],
        steps: [
          {
            title: "Define the equivalence classes for the text field",
            body: "A text field accepting 1-255 characters has three equivalence classes: below minimum (0 chars, invalid), within range (1-255 chars, valid), and above maximum (256+ chars, invalid). Any value within a class should behave identically — if 1 character is valid, 100 characters should also be valid.",
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
            body: "Mark each case with a decision. Boundary values are ideal automation candidates — they are stable, precise, and run in seconds. The non-numeric string cases are better as exploratory or manual cases because the expected behaviour may be ambiguous and worth observing rather than asserting.",
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
        whyItMatters: "A bug that cannot be reproduced is a bug that will not be fixed. The discipline of writing reproducible bug reports is one of the most high-leverage skills in quality engineering — it directly determines how quickly developers can act on your findings. A great bug report is a gift; a vague one is a time tax on the whole team.",
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
            body: "Once you find something interesting, reproduce it three times before writing a word. If it only happens once, note the conditions carefully and try to make it happen again. An intermittent bug report that says 'sometimes fails' is almost unusable — 'fails on every third click when X and Y are true' is actionable.",
          },
          {
            title: "Write the title as an observation",
            body: "The title should state what happens, not what you expected: Checkout total updates before delivery cost is removed — not 'Checkout is broken'. A developer reading the title should know which code area to look at without reading the full report.",
          },
          {
            title: "Write numbered reproduction steps",
            body: "Start from an absolute baseline: open a private browser window, navigate to the exact URL, log in with these credentials. Every step should be a distinct action. Test your steps by following them yourself in a fresh browser session. If they do not reproduce the bug, revise them.",
          },
          {
            title: "Add environment, severity, and evidence",
            body: "Record: browser and version, OS, application version or commit hash, whether the bug reproduced in other browsers. Justify the severity: does this block a user from completing their goal? Does it affect data integrity? Attach a screenshot or screen recording — a 30-second recording is worth 10 paragraphs of description.",
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
        description: "Choose a feature with an existing test suite. Map every test against the feature's user flows using a mind map or table. Identify three coverage gaps — scenarios that users can exercise but no test covers. Write a charter for each gap and estimate the business risk of leaving each one untested.",
        whyItMatters: "Code coverage metrics lie. A test suite with 90% line coverage can miss the three most important user journeys entirely. Coverage auditing against user flows rather than lines of code is how senior QA engineers demonstrate strategic value — it connects testing decisions to business risk in language that product managers and engineers both understand.",
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
            body: "For each test in the suite, identify which user flow it covers (or partially covers). Mark the flow as covered once any test exercises it end-to-end. Be strict — a unit test for a validation function does not count as coverage for the user flow that triggers that validation.",
          },
          {
            title: "Identify the gaps",
            body: "Flows that appear in your map but have no test mapped to them are gaps. Highlight three gaps with the highest potential business impact. Common gaps: error recovery flows (user gets an error, retries), concurrent user scenarios, and feature interactions (using feature A immediately after feature B).",
          },
          {
            title: "Write a charter for each gap",
            body: "For each gap, write an exploratory charter: Explore [the uncovered flow] with [the relevant part of the application] to discover [whether the system handles it correctly]. Execute at least one of the three charters immediately — coverage gaps are most valuable when they find bugs, not just when they are documented.",
          },
          {
            title: "Estimate and communicate risk",
            body: "For each gap, write one sentence quantifying the business risk: 'If this flow fails in production, users cannot complete checkout — this is a direct revenue impact'. Present the three gaps to a product manager or engineer and get agreement on which to prioritise for automation.",
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
            body: "Use page.route() to intercept requests to your streaming endpoint. In the route handler, call route.fetch() to get the actual response. The response body will be a ReadableStream — you need to read it chunk by chunk rather than awaiting the full body.",
          },
          {
            title: "Parse the SSE format",
            body: "Each chunk is a Uint8Array. Decode it with TextDecoder and split on newline. Lines starting with 'data: ' contain the payload. Lines that are just a newline signal the end of an event. Parse each event into a structured object and collect them in an array.",
          },
          {
            title: "Reconstruct the full response",
            body: "Concatenate the data fields from each event to reconstruct the full response text. For LLM streaming responses, each event typically contains a token or a JSON object with a delta field. Write a helper that handles both formats so your test is not brittle to minor API changes.",
          },
          {
            title: "Assert chunk-level and full-response behaviour",
            body: "Assert: the first chunk arrives within 2 seconds (time-to-first-token), each chunk's data field is valid JSON or plain text (not malformed), the reconstructed response contains expected content, and the stream terminates with the correct done signal (data: [DONE] or similar).",
          },
          {
            title: "Assert the UI reflects the stream",
            body: "Navigate to a page that renders the streaming response. Assert that text appears progressively — check that the UI is not blank for the first 3 seconds by polling for visible text. This tests the front-end streaming rendering, not just the API.",
          },
        ],
        axiomPages: [
          { title: "Playwright", href: "/test-automation/playwright" },
          { title: "Testing LLM applications", href: "/test-automation/testing-llm-apps" },
          { title: "Anthropic API — streaming", href: "/apis/anthropic-api" },
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
        description: "Create a pytest fixture chain that spins up a Postgres test database, runs Alembic migrations to bring the schema up to date, seeds 5 rows of test data, yields the session to each test, and rolls back all changes after every test — leaving the database in a clean state for the next one.",
        whyItMatters: "Test isolation is the property that makes a test suite trustworthy. When tests share database state, failure in test A causes failure in test B — and the debugging session that follows is miserable. A well-designed fixture chain makes isolation automatic and eliminates an entire class of flaky test failures.",
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
          },
          {
            title: "Run Alembic migrations in the fixture",
            body: "After creating the engine, call alembic.command.upgrade(alembic_cfg, 'head') to run all migrations. This ensures your test database schema always matches your application schema. If migrations fail in the fixture, all tests fail immediately — this is the correct behaviour.",
          },
          {
            title: "Write the transaction fixture",
            body: "Create a function-scoped fixture that begins a transaction using connection.begin_nested() (a savepoint). Yield the session to the test. After the test returns, call transaction.rollback() to undo every INSERT, UPDATE, and DELETE the test made. The savepoint is the key — it rolls back without dropping the schema.",
          },
          {
            title: "Write the seed fixture",
            body: "Create a fixture that depends on the transaction fixture and inserts 5 rows of realistic test data. Use realistic values, not 'test1', 'test2' — realistic data surfaces bugs that toy data misses. Yield the list of seeded objects so tests can reference them.",
          },
          {
            title: "Write two tests and verify isolation",
            body: "Write test_count_is_five (assert session.query(Model).count() == 5) and test_can_add_one (insert a row, assert count is 6). Run both. Then run them in reverse order. The count should be 5 at the start of each test regardless of order — if it is not, your rollback is not working.",
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
        whyItMatters: "Load testing is the only way to discover performance problems before your users do. p95 latency is the metric that matters for user experience — it tells you what 1 in 20 users experiences, which in production means thousands of people. k6 is lightweight enough to run in CI and powerful enough to simulate realistic production load.",
        prerequisites: [
          "k6 installed (brew install k6 or the Windows/Linux equivalent)",
          "An HTTP API you can load test (your own or a public test API)",
          "Basic JavaScript familiarity — k6 scripts are JS",
          "Understanding of what virtual users and requests per second mean",
        ],
        steps: [
          {
            title: "Write the load test script",
            body: "Create a k6 script with a default function that makes an HTTP GET request to your endpoint. Add a check that the response status is 200. Add a sleep(1) between requests to simulate realistic user think time. Without the sleep, each VU will hammer the server as fast as possible — not what real users do.",
          },
          {
            title: "Define the load profile",
            body: "Use the stages option to define the ramp: 0 to 50 VUs over 30 seconds, 50 to 200 VUs over 90 seconds, hold at 200 for 3 minutes, ramp down to 0 over 30 seconds. This shape gives the system time to warm up before hitting peak load.",
          },
          {
            title: "Add thresholds",
            body: "Add thresholds to the options: http_req_duration with p(95) < 300, and http_req_failed with rate < 0.001. k6 will exit with a non-zero code if either threshold is breached — this makes the load test a passable CI gate rather than just a report generator.",
          },
          {
            title: "Run and read the summary",
            body: "Run the test and read the end-of-test summary carefully. Look at: http_req_duration (p50, p95, p99), http_req_failed (rate), vus_max (did you hit your target VU count?), and iterations (total requests made). If p95 fails, identify when it breached by looking at the time series, not just the aggregate.",
          },
          {
            title: "Identify the bottleneck",
            body: "Add groups to your script to separate different request types (GET /users vs POST /orders). Run again and compare p95 per group. The group with the highest p95 is your bottleneck. Check whether it is consistent across the run or spikes only at peak load — these have different root causes.",
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
        tagline: "Pact contract between a Python consumer and FastAPI provider — CI breaks when provider violates contract.",
        description: "Define a Pact contract between a Python consumer and a FastAPI provider for a user lookup endpoint. The consumer publishes the contract (its expectations of the API), the provider verifies against it. Run provider verification in CI and configure the build to fail when the provider makes a breaking change.",
        whyItMatters: "Integration tests catch breaking API changes — but only if you run them against a real provider. Contract testing inverts this: the consumer defines what it needs, and the provider verifies it can meet those needs. This eliminates the most common microservices failure mode: a provider team changes their API without knowing a consumer depends on the old format.",
        prerequisites: [
          "Python with pact-python installed",
          "A FastAPI application exposing a user lookup endpoint (GET /users/{id})",
          "Understanding of what a consumer and provider are in a microservices context",
          "pytest for running the consumer tests",
        ],
        steps: [
          {
            title: "Write the consumer contract test",
            body: "Use pact-python to define what the consumer expects: the consumer will call GET /users/123 and expects a 200 response with a JSON body containing id (integer), name (string), and email (string). Run the consumer test — it starts a mock provider and verifies your consumer code works against it, generating a pact file.",
          },
          {
            title: "Publish the pact to a broker",
            body: "Set up a Pact Broker (Pactflow has a free tier) and publish the generated pact file using the Pact CLI. The broker is the handshake point — the provider will pull contracts from here rather than needing access to the consumer's code.",
          },
          {
            title: "Write the provider verification test",
            body: "In the FastAPI provider repository, write a pytest test that starts the FastAPI app and runs pact.verify() against it, pointing at the broker URL. The verification test replays each consumer interaction against the real provider and asserts the response matches the contract.",
          },
          {
            title: "Break the contract and verify the build fails",
            body: "Change the FastAPI endpoint to return username instead of name in the response. Run the provider verification. It should fail with a clear message about the field name mismatch. This is the outcome you are building toward — catching breaking changes before deployment.",
          },
          {
            title: "Add verification to CI",
            body: "Add the provider verification test to your CI pipeline. Configure it to run on every PR that touches the API layer. The pipeline should block merge when verification fails. This is the enforcement mechanism — without it, contract tests are advisory rather than mandatory.",
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
        whyItMatters: "Flaky tests are the most corrosive thing in a test suite. They erode trust until the team starts ignoring failures entirely — at which point the suite provides no safety net. Debugging flakiness with the trace viewer rather than adding sleeps is the discipline that keeps a test suite trustworthy at scale.",
        prerequisites: [
          "Playwright installed with TypeScript",
          "A flaky test (write one deliberately: click a button before an API response has loaded)",
          "trace: 'on-first-retry' set in playwright.config.ts",
          "Understanding of what a race condition is",
        ],
        steps: [
          {
            title: "Reproduce the flakiness reliably",
            body: "Run the test 20 times using: for i in {1..20}; do npx playwright test your-test.spec.ts; done. Record how many times it fails. If it fails less than 3 times in 20 runs, reduce the sleep between setup and action or remove it entirely — you need the failure to be reproducible enough to debug.",
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
            body: "Run the test 50 times. If any failures remain, the root cause is deeper than your fix addresses — return to the trace viewer with the new failure. A properly fixed flaky test should have a 0% failure rate, not a reduced failure rate.",
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
        description: "Write a SQL query that ranks customers by total spend in each product category using RANK() OVER (PARTITION BY category ORDER BY total_spend DESC). Then extend it to find customers who ranked in the top 10 in the prior month but dropped out this month — a cohort analysis pattern used in every real analytics stack.",
        whyItMatters: "Window functions are the dividing line between SQL users and SQL engineers. They eliminate the self-joins and correlated subqueries that make queries unreadable and slow, and they unlock analytical patterns that are simply impossible without them. Ranking, running totals, lead/lag comparisons — these are the queries that turn raw data into business insight.",
        prerequisites: [
          "A SQL database with sample data (DuckDB with a CSV works — see the DuckDB exercise)",
          "Understanding of GROUP BY and aggregate functions (SUM, COUNT)",
          "Basic understanding of what a subquery is",
          "No prior window function experience required",
        ],
        steps: [
          {
            title: "Set up the sample data",
            body: "Create two months of order data: customer_id, product_category, order_amount, order_month. You need at least 20 customers and 3 categories to make the ranking meaningful. Seed data where a handful of customers change their spending significantly between months — these are the interesting cases.",
          },
          {
            title: "Write the monthly spend aggregation",
            body: "Aggregate to: customer_id, product_category, order_month, total_spend using GROUP BY. This is the input to your window function. Verify the aggregation is correct before adding the window — debugging window function errors on top of aggregation errors is painful.",
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
            body: "Self-join the top-10 result on customer_id and product_category, matching the prior month to the current month. Customers where the prior month row exists but the current month row is NULL are the dropouts. Use LAG() as an alternative approach — compare both and understand when each is cleaner.",
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
        tagline: "fact_orders, dim_customer, dim_product, dim_date — with indexes and a clear grain decision.",
        description: "Design a star schema for e-commerce analytics: a fact_orders table at the order-line grain, with dim_customer, dim_product, and dim_date dimension tables. Write the CREATE TABLE statements with appropriate indexes, define the grain explicitly, and explain your choice of surrogate keys versus natural keys.",
        whyItMatters: "The star schema is the most widely deployed data warehousing pattern for a reason: it makes analytical queries fast and readable. Understanding grain, surrogate keys, and slowly changing dimensions is the foundation that makes everything in an analytics stack work correctly — dbt models, BI tool queries, and executive dashboards all depend on getting this right.",
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
            body: "Write CREATE TABLE for fact_orders (order_line_sk surrogate key, order_id, customer_sk FK, product_sk FK, date_sk FK, quantity, unit_price, discount_amount, net_revenue). Net_revenue is a derived metric worth pre-computing — explain why you chose to store it rather than calculating it at query time.",
          },
          {
            title: "Add indexes",
            body: "Add indexes on every foreign key column in fact_orders (customer_sk, product_sk, date_sk). Add a composite index on (date_sk, customer_sk) for the most common query pattern: 'revenue by customer for a date range'. Explain why you would not add more indexes on a fact table that receives millions of inserts per day.",
          },
          {
            title: "Write three analytical queries",
            body: "Write: monthly revenue by product category, top 10 customers by revenue in the last 90 days, and revenue for new customers (first purchase in the last 30 days) vs returning customers. All three should run without subqueries — if they require subqueries, your schema has a structural issue.",
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
        tagline: "Query a 500MB CSV without loading it into memory — top categories, peak month, busiest hour.",
        description: "Use DuckDB to query a 500MB CSV of transaction data without loading it into memory. Answer three specific questions: the top 10 categories by revenue, the month with the highest average order value, and the busiest hour of day by transaction count. Export the results to a smaller CSV for further analysis.",
        whyItMatters: "DuckDB changes what is possible with local data analysis. A 500MB CSV that would take 10 seconds to load into pandas queries in under a second with DuckDB, with no memory pressure and full SQL support. Understanding when to use DuckDB versus a full data warehouse versus pandas is a practical skill that makes you dramatically faster at exploratory data analysis.",
        prerequisites: [
          "DuckDB installed (pip install duckdb or the CLI)",
          "A large CSV file (the NYC Taxi dataset or any public e-commerce dataset works well — at least 1M rows)",
          "Basic SQL knowledge (SELECT, GROUP BY, ORDER BY)",
          "Python or the DuckDB CLI",
        ],
        steps: [
          {
            title: "Query the CSV directly without loading it",
            body: "Run: SELECT COUNT(*) FROM read_csv_auto('your_file.csv'). DuckDB reads the file in streaming fashion — you do not need to import it first. Check the row count and print the first 5 rows to understand the schema. Note how long this takes compared to loading the same file in pandas.",
          },
          {
            title: "Find the top 10 categories by revenue",
            body: "Write a query grouping by the category column, summing the revenue or amount column, ordering descending, and limiting to 10. If the category column has NULL values, decide whether to include them — NULLIF and COALESCE are your tools. Print the result and verify the math on the top entry manually.",
          },
          {
            title: "Find the month with highest average order value",
            body: "Extract the month from the timestamp column using strftime('%Y-%m', timestamp_col). Group by month, compute AVG(order_value), order descending, limit 1. Compare December to other months — seasonality almost always shows up in this query on real e-commerce data.",
          },
          {
            title: "Find the busiest hour of day",
            body: "Extract the hour using EXTRACT(hour FROM timestamp_col). Group by hour, count transactions, order by count descending. Plot the results in your head (or in a quick matplotlib chart) — the distribution is rarely uniform and the shape tells you something about the business.",
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
            body: "Load all orders: orders = session.query(Order).all(). Then loop: for o in orders: print(o.customer.name). Reset and increment the counter inside the event listener. After the loop, print the count — it should be 101: 1 query for orders, 1 query per order for the customer.",
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
        whyItMatters: "dbt is the tool that turned SQL into software engineering. Version-controlled models, automated tests, and a dependency graph that documents your entire data transformation pipeline — these capabilities make data teams as rigorous as software teams. The daily_revenue model is simple enough to focus entirely on the dbt workflow rather than the SQL complexity.",
        prerequisites: [
          "dbt Core installed with a Postgres or DuckDB adapter (dbt-postgres or dbt-duckdb)",
          "A dbt project initialised (dbt init your_project)",
          "A raw orders table with at minimum: order_id, order_date, revenue columns",
          "Basic SQL including window functions (covered in the window function exercise)",
        ],
        steps: [
          {
            title: "Write the staging model",
            body: "Create models/staging/stg_orders.sql that selects from the raw orders table, casts columns to the correct types, and renames them to your conventions. Staging models do not aggregate — they just clean. Run dbt run --select stg_orders and verify the output table looks correct.",
          },
          {
            title: "Write the daily_revenue model",
            body: "Create models/marts/daily_revenue.sql. SELECT order_date, SUM(revenue) as revenue, COUNT(*) as order_count FROM {{ ref('stg_orders') }} GROUP BY order_date. Using ref() rather than a raw table name is how dbt builds the dependency graph — never bypass it.",
          },
          {
            title: "Add the 7-day rolling average",
            body: "Wrap the aggregation in a CTE and add: AVG(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as revenue_7d_avg. This window function computes the trailing 7-day average. Verify the first 6 rows have averages equal to the revenue column divided by the number of available days, not full 7-day windows.",
          },
          {
            title: "Write schema.yml tests",
            body: "Create models/marts/schema.yml. Add not_null and unique tests on the date column. Add an accepted_values test if your data has a status column. Run dbt test --select daily_revenue. A failed test is a schema contract violation — treat it as a build failure.",
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
    ],
  },
];

export function getRolePath(id: string): RolePath | undefined {
  return ROLE_PATHS.find((p) => p.id === id);
}

export function getExercise(roleId: string, slug: string): Exercise | undefined {
  return getRolePath(roleId)?.exercises.find((e) => e.slug === slug);
}
