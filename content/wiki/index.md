---
type: index
updated: 2026-05-03
---

# Nexus — Content Index

354 pages across 28 categories. Updated 2026-05-04.

---

## Layer 0 — Computer Science Fundamentals

### `cs-fundamentals/` — SE Brain
- [[cs-fundamentals/se-hub]] — SE Brain central hub: all CS fundamentals, Python, web frameworks, Java
- [[cs-fundamentals/python-basics]] — Variables, types, control flow, functions, comprehensions, decorators, context managers, error handling — Python 101
- [[cs-fundamentals/data-structures]] — Arrays, hash tables, linked lists, trees, heaps, graphs, Big O notation — the vocabulary of algorithmic complexity
- [[cs-fundamentals/algorithms]] — Sorting (merge/quick), binary search, recursion, dynamic programming, two pointers, backtracking
- [[cs-fundamentals/system-design]] — Load balancing, caching strategies, CAP theorem, databases, microservices vs monolith, back-of-envelope estimation
- [[cs-fundamentals/sql]] — SELECT/JOIN/GROUP BY/HAVING, indexes, ACID, transactions, normalisation, SQLAlchemy ORM patterns, N+1 problem
- [[cs-fundamentals/nosql-databases]] — Document (MongoDB), key-value (DynamoDB, Redis data structures), wide-column (Cassandra), graph (Neo4j) — when each wins over SQL
- [[cs-fundamentals/cicd-pipelines]] — Stage ordering (lint→build→test→scan→staging→prod), Jenkins Declarative Pipeline, Azure DevOps YAML, DORA metrics, trunk-based development
- [[cs-fundamentals/git]] — Staging, committing, branching, merge vs rebase, interactive rebase, PR workflow, conventional commits, .gitignore
- [[cs-fundamentals/networking]] — HTTP/HTTPS/TLS, DNS, TCP vs UDP, status codes, headers, REST, WebSockets, SSE (LLM streaming), CORS
- [[cs-fundamentals/oop-patterns]] — OOP fundamentals, SOLID, and GoF patterns: Factory/Builder/Singleton/Adapter/Decorator/Facade/Observer/Strategy/Command/Repository
- [[cs-fundamentals/api-design]] — REST principles, URL design, HTTP methods, status codes, response format, versioning, OpenAPI 3.1
- [[cs-fundamentals/clean-code]] — Naming, function design, SOLID principles, code smells, comments — writing code for the next engineer
- [[cs-fundamentals/microservices-patterns]] — Saga, CQRS, Outbox, Anti-Corruption Layer, API Gateway, Sidecar — distributed service design
- [[cs-fundamentals/distributed-systems]] — CAP theorem, consistency models, consensus (Raft), failure modes, idempotency, distributed tracing
- [[cs-fundamentals/debugging-systems]] — Debugging as a first-class skill: correlation IDs, log reading, distributed tracing, reproducing production failures, incident workflow
- [[cs-fundamentals/os-internals]] — Processes vs threads, virtual memory (heap/stack/page tables), OOM kills, CPU scheduling, file system inodes, file descriptor limits
- [[cs-fundamentals/auth-patterns]] — OAuth 2.0, PKCE, JWT, OIDC, API keys, RBAC, service-to-service auth (OIDC/IRSA)
- [[cs-fundamentals/database-design]] — Normalisation, UUIDs, indexes (B-tree/GIN/partial), query optimisation, partitioning, Alembic migrations
- [[cs-fundamentals/concurrency]] — asyncio, semaphore, thread safety, race conditions, multiprocessing, Go goroutines
- [[cs-fundamentals/caching-strategies]] — Cache-aside, write-through, TTL, invalidation, Redis patterns, CDN caching, stampede prevention
- [[cs-fundamentals/graphql-se]] — Schema SDL, resolvers, DataLoader (N+1 fix), subscriptions, federation, Strawberry Python
- [[cs-fundamentals/grpc]] — Protobuf IDL, 4 streaming modes, Python server/client, interceptors, health checking, reflection
- [[cs-fundamentals/event-driven-architecture]] — Events vs commands, Kafka producer/consumer, event sourcing, outbox pattern, DLQ, saga choreography
- [[cs-fundamentals/tdd-se]] — Red-green-refactor cycle, AAA pattern, outside-in London school, what makes a good test, anti-patterns
- [[cs-fundamentals/code-review]] — What review is for, reviewer checklist, CARES feedback framework, PR author duties, CODEOWNERS
- [[cs-fundamentals/observability-se]] — Structured logging (structlog), Prometheus metrics, OpenTelemetry tracing, correlation IDs, alerting rules
- [[cs-fundamentals/linux-fundamentals]] — File system, process management, shell scripting, networking (ss/netstat/SSH tunnels), systemd, text processing
- [[cs-fundamentals/security-fundamentals-se]] — OWASP Top 10, SQL injection, XSS, CSRF, secrets management, password hashing, TLS, input validation
- [[cs-fundamentals/performance-optimisation-se]] — Profiling (cProfile/line_profiler), N+1 fixes, async concurrency, response streaming, benchmarking
- [[cs-fundamentals/architecture-patterns-se]] — Layered, hexagonal (ports+adapters), clean architecture, monolith vs services, CQRS, module boundaries
- [[cs-fundamentals/ddd-se]] — Bounded contexts, ubiquitous language, entities, value objects, aggregate roots, repositories, domain events
- [[cs-fundamentals/websockets-se]] — Protocol comparison (WS vs SSE vs polling), FastAPI ConnectionManager (rooms/broadcast), heartbeat ping-pong, TypeScript ReconnectingWebSocket with exponential backoff, Redis pub/sub for horizontal scaling, WS testing with TestClient
- [[cs-fundamentals/api-security]] — OWASP API Security Top 10 (2023), BOLA/IDOR prevention, slowapi rate limiting per endpoint, JWT security (alg:none/RS256 confusion/jti revocation), Pydantic input validation, CORS allowlist, security headers middleware
- [[cs-fundamentals/database-transactions]] — ACID properties, isolation levels table (dirty/phantom/serialisation), SQLAlchemy isolation in Python, pessimistic (FOR UPDATE) vs optimistic (version_id_col) locking, deadlock prevention (consistent lock ordering), savepoints, connection pool tuning
- [[cs-fundamentals/cli-tooling]] — Click vs Typer vs argparse, full Typer app (sub-commands/options/arguments), Click advanced (context/custom ParamType/prompts), Rich (tables/progress/panels/syntax/tree), config file + env precedence, Typer testing with CliRunner
- [[cs-fundamentals/api-versioning]] — URL/header/query/content-negotiation strategies, breaking vs non-breaking changes, FastAPI versioned routers, deprecation headers, backward-compat testing
- [[cs-fundamentals/message-queues]] — Queue vs pub/sub vs streaming comparison, RabbitMQ pika producer/consumer, DLQ patterns (pika + SQS), SQS long polling, Kafka confluent_kafka, tool selection guide
- [[cs-fundamentals/software-design-principles]] — SOLID with violation/fix examples, DRY, YAGNI, KISS, coupling/cohesion, Law of Demeter, composition over inheritance with Protocol
- [[cs-fundamentals/streaming-patterns]] — SSE vs WebSocket vs long polling comparison, FastAPI SSE event_generator, LLM streaming to browser, aiofiles large file streaming, backpressure with asyncio.Queue (maxsize), RateLimitedStream, chunked transfer encoding, httpx AsyncClient streaming test
- [[cs-fundamentals/feature-flags]] — Flag types (release/experiment/ops/permission), env-driven in-process flags, Unleash client + custom strategy, LaunchDarkly variation + multivariate, 3 testing patterns (inject/mock/monkeypatch), consistent-hashing gradual rollout (MD5 % 100), flag lifecycle management
- [[cs-fundamentals/background-jobs]] — FastAPI BackgroundTasks, Celery app config (acks_late/prefetch=1), task with auto-retry + exponential backoff + jitter, arq WorkerSettings + enqueue_job, DLQ pattern for exhausted retries, Flower monitoring, Redis queue length check
- [[cs-fundamentals/data-validation]] — Pydantic v2 ConfigDict (strict/extra=forbid), CreateOrderRequest with UUID/conint/Decimal/pattern, field_validator (password strength/adult age), model_validator (passwords_match), AliasPath nested JSON mapping, AliasChoices, computed_field, pydantic_settings BaseSettings
- [[cs-fundamentals/python-async-patterns]] — asyncio.TaskGroup (Python 3.11+), asyncio.timeout context manager, asyncio.wait_for compat, Semaphore + RateLimiter class, CancelledError handling (always re-raise), asyncio.shield for critical cleanup, async generators, @asynccontextmanager, in-process AsyncEventBus
- [[cs-fundamentals/python-packaging]] — uv commands (init/add/sync/lock/run/uvx), full pyproject.toml config (hatchling/ruff/mypy/pytest/coverage), semantic versioning + conventional commits mapping, Trusted Publishers OIDC workflow (no static secrets), uv workspaces monorepo, src-layout vs flat layout
- [[cs-fundamentals/cqrs-event-sourcing]] — CQRS command/query separation (command handler + query service), event sourcing (event store append/load, optimistic concurrency), OrderAggregate with reconstitute + _apply + pending events, snapshots (threshold-based), projections (denormalised read model builder from events)
- [[cs-fundamentals/dependency-injection]] — DI vs tight coupling, Protocol-based interfaces, composition root pattern, FastAPI Depends (function/scoped/singleton), dependency overrides for tests, lagom DI container, anti-patterns (Service Locator/over-injection/injecting the container)
- [[cs-fundamentals/logging-best-practices]] — Log level usage guide (DEBUG/INFO/WARNING/ERROR/CRITICAL), structlog configuration + processor pipeline + JSON output, correlation ID middleware (X-Correlation-ID + contextvars), PII scrubbing processor (card/email/SSN/token regex), CloudWatch Insights + Loki LogQL query patterns, what not to log
- [[cs-fundamentals/error-handling-patterns]] — Exception hierarchy design (AppError/NotFoundError/ConflictError/ExternalServiceError), FastAPI exception handlers, Result type pattern (Ok/Err generic, match statement), error propagation rules, retry with exponential backoff + jitter, error handling test patterns
- [[cs-fundamentals/type-annotations]] — Core annotations + Optional + Union, collection generics, TypeVar + Generic classes, Protocol structural subtyping + runtime_checkable, TypedDict + NotRequired, Literal + Final + overload, ParamSpec for decorators, mypy strict config

---

## PARA Layer

- [[para/projects]] — Active builds using the Nexus as research context (evalcheck, mcpindex)
- [[para/areas]] — Ongoing responsibilities with no end date (LLM tracking, CVE watch, Nexus health)
- [[para/resources]] — The 23-category AI engineering reference library
- [[para/archives]] — Completed projects and deprecated topics

---

## Layer 1 — Core AI Knowledge

### `llms/` — Foundation Models
- [[llms/ae-hub]] — AI Engineering Brain central hub: every major AE category linked from one place
- [[llms/claude]] — Claude 4.x family: Opus 4.7/4.6, Sonnet 4.6, Haiku 4.5 — benchmarks, pricing, extended thinking, prompt caching
- [[llms/transformer-architecture]] — Attention mechanism, KV cache, RoPE/ALiBi, SwiGLU, MoE, Chinchilla scaling laws
- [[llms/model-families]] — GPT/o-series, Gemini, Llama, Mistral, DeepSeek R1, Qwen, Phi — when to use each
- [[llms/deepseek-r1]] — DeepSeek R1/R2: 671B MoE, GRPO training (no reward model), o1-comparable reasoning, MIT license, 96% cheaper API
- [[llms/tokenisation]] — BPE, tiktoken, token counting, why tokenisation explains model failures
- [[llms/multi-head-latent-attention]] — DeepSeek's low-rank KV cache compression: caches a latent vector instead of full K/V tensors, 93% KV cache reduction, used in V2/V3/R1
- [[llms/small-language-models]] — SLM decision framework: Phi-4 (14B), Llama 3.2 (1B/3B), Gemma 3, Qwen 2.5, Mistral Ministral — edge, mobile, and cost-sensitive inference
- [[llms/inference-time-scaling]] — Best-of-N, PRMs, MCTS, self-consistency, and extended CoT: how allocating more compute at inference time produces quality gains independent of training

### `safety/` — Alignment and Interpretability
- [[safety/alignment]] — RSP (ASL tiers), red teaming, scalable oversight, superalignment, safety vs helpfulness
- [[safety/alignment-overview]] — alignment hub: RLHF, CAI, DPO, scalable oversight, open research problems, lab comparison
- [[safety/constitutional-ai]] — CAI two-phase training (SL-CAF + RLAIF), constitution as principles, vs RLHF
- [[safety/mechanistic-interpretability]] — Superposition, SAEs, circuits, Anthropic's Golden Gate Claude demo
- [[safety/red-teaming-methodology]] — structured adversarial testing, failure mode discovery, automated red teaming in CI
- [[safety/scalable-oversight]] — debate, amplification, recursive reward modeling, prover-verifier games; Anthropic's #2 research priority (2025)
- [[safety/responsible-ai]] — responsible AI principles, fairness, accountability, transparency, harm assessment frameworks

### `agents/` — Agentic Systems
- [[agents/langchain]] — LCEL pipe operator, document loaders, text splitters, prompt templates, RAG chains, conversation memory; relationship to LangGraph
- [[agents/langgraph]] — LangGraph v1.0: graph nodes/edges/state, checkpointing, HITL, streaming, multi-agent patterns
- [[agents/practical-agent-design]] — Single agent first; 3 tool types; layered guardrails; manager vs decentralised multi-agent; production path
- [[agents/crewai]] — Role-based crews; Sequential vs Hierarchical process; Flows (2025); when to use over LangGraph
- [[agents/autogen]] — AG2/AutoGen GroupChat; event-driven async core (v0.4); AutoGen Studio; cross-framework AgentOS
- [[agents/langgraph-cloud]] — LangGraph Platform (LangSmith Deployment); Studio UI; Postgres checkpointing; horizontal scaling
- [[agents/langmem]] — Long-term memory across sessions; episodic/semantic/procedural; storage-agnostic; LangGraph integration
- [[agents/react-pattern]] — Thought/Action/Observation loop, implementation, failure modes
- [[agents/multi-agent-patterns]] — Supervisor, Swarm/handoff, Parallel fan-out; context management, trust, debugging
- [[agents/memory]] — In-context, episodic, semantic, procedural memory; LangGraph checkpointing; multi-tenant isolation
- [[agents/openai-agents-sdk]] — OpenAI Agents SDK (March 2025): handoffs, guardrails, structured output, streaming; vs LangGraph
- [[agents/strands-agents-sdk]] — AWS open-source Python SDK; @tool decorator, Bedrock Converse API, MCP-native, used by Amazon Q Developer; vs LangGraph
- [[agents/google-adk]] — Google's open-source Python SDK; A2A-native, Vertex AI Agent Engine deployment, async interfaces; v1.18.0 (November 2025)
- [[agents/computer-use]] — Screenshot + action agent loop for GUI automation; tool schema, containerisation, resolution tuning, failure modes, and comparison with OpenAI CUA
- [[agents/pydantic-ai]] — Python-first typed agent framework by the Pydantic team: RunContext DI, Pydantic-validated output, automatic retry, TestModel for unit testing, multi-provider
- [[agents/mastra]] — TypeScript-native agent and workflow framework (YC W25, $13M, 22k stars): durable workflows, 4-type built-in memory, evals, OTel observability, 100+ integrations, Mastra Cloud deployment
- [[agents/voice-agents]] — Pipeline (STT+LLM+TTS) vs native multimodal (GPT-4o Realtime/Gemini Live) architectures; LiveKit Agents v1.5, Pipecat, VAPI, Retell; VAD, interruption handling, turn detection, telephony
- [[agents/agent-memory-systems]] — Production memory infrastructure: Mem0 (ecosystem), Zep/Graphiti (temporal facts), Letta (OS-paging model); dual-layer hot/cold architecture

### `rag/` — Retrieval-Augmented Generation
- [[rag/pipeline]] — Full RAG pipeline: chunking → embed → retrieve → rerank → generate; GraphRAG; RAGAS
- [[rag/graphrag]] — GraphRAG entity/relationship extraction, community detection, LazyGraphRAG (0.1% cost), LlamaIndex/LangChain integration
- [[rag/chunking]] — Fixed-size, semantic, structure-aware, late chunking, parent-child retrieval, metadata enrichment
- [[rag/embeddings]] — MTEB leaderboard, Cohere/OpenAI/BGE-M3 comparison, Matryoshka truncation, binary quantisation
- [[rag/hybrid-retrieval]] — BM25 + dense + RRF; Elasticsearch/Qdrant/pgvector implementations; SPLADE
- [[rag/query-expansion]] — HyDE (hypothetical answer embedding); multi-query with RRF; step-back prompting; hybrid policy
- [[rag/reranking]] — Cohere Rerank v3.5, Jina, BGE reranker; 10-25% NDCG gain; LangChain/LlamaIndex integration

### `prompting/` — Prompt Engineering
- [[prompting/techniques]] — XML structuring for Claude, CoT, few-shot, zero-shot vs fine-tuning, context compression
- [[prompting/dspy]] — DSPy signatures, modules (Predict/ChainOfThought/ReAct), BootstrapFewShot, MIPROv2 optimiser
- [[prompting/context-engineering]] — Lost-in-the-middle, history management, LLMLingua compression, prompt caching strategy
- [[prompting/structured-outputs]] — Three-tier reliability framework for schema-conformant LLM output: prompt-based, instructor retry loop, and constrained decoding (XGrammar/Outlines); decision guide by API and deployment

### `evals/` — Evaluation Methodology
- [[evals/methodology]] — Eval types, LLM-as-judge, frameworks (inspect-ai/Braintrust/promptfoo), golden sets, eval in CI
- [[evals/ragas]] — Reference-free RAG evaluation: Faithfulness, Answer Relevancy, Context Precision, Context Recall; LLM-as-judge; CI regression testing
- [[evals/openai-evals]] — OpenAI's open-source eval framework + benchmark registry; works with any Chat Completions endpoint; Dashboard UI for hosted runs
- [[evals/llm-as-judge]] — Rubric design, calibration, bias types, pairwise vs absolute, judge system prompt design
- [[evals/benchmarks]] — SWE-bench Verified (Opus 4.6 80.8%), GPQA (91.3%), MMLU, Chatbot Arena, custom benchmarks
- [[evals/bfcl]] — Berkeley Function Calling Leaderboard v4: the de facto tool-use benchmark; agentic evaluation (web search, memory, format sensitivity), overall score formula, top performers, how to run it, limitations vs ToolBench

### `multimodal/` — Vision and Multimodal AI
- [[multimodal/vision]] — VLM comparison, Claude vision API, document processing, multimodal RAG, image generation
- [[multimodal/audio]] — Whisper/Deepgram ASR, ElevenLabs/OpenAI TTS, voice agents, streaming pipeline, Realtime API
- [[multimodal/document-processing]] — Claude PDF handling, pymupdf/unstructured pipeline; best-in-class for PDFs, tables, charts
- [[multimodal/image-generation]] — Flux.1 vs DALL-E 3 vs Midjourney, open-source image gen APIs, no local GPU needed
- [[multimodal/video]] — Gemini 1.5 Pro/2.0 Flash video understanding (1M context), Sora/Veo generation landscape

### `fine-tuning/` — Model Customisation
- [[fine-tuning/decision-framework]] — Prompting → RAG → SFT → DPO → full FT decision tree; training objectives; hardware guide
- [[fine-tuning/lora-qlora]] — LoRA math (ΔW=BA, 256x savings), QLoRA NF4, BitsAndBytesConfig, merge_and_unload
- [[fine-tuning/dpo-grpo]] — DPO loss, TRL DPOTrainer, GRPO (DeepSeek-R1), ORPO, KTO; choosing objective
- [[fine-tuning/rlhf-dpo]] — RLHF three-stage pipeline (SFT+reward model+PPO), DPO without reward model, newer variants (ORPO/KTO/GRPO), preference data generation
- [[fine-tuning/frameworks]] — Axolotl YAML, TRL trainers, Unsloth 2-4x speedup, multi-GPU DeepSpeed/FSDP

### `math/` — Mathematical Foundations
- [[math/linear-algebra]] — Matrix multiply as attention, SVD (why LoRA works), cosine similarity, norms
- [[math/transformer-math]] — Attention formula, multi-head shapes, cross-entropy loss, perplexity, Adam update rules, KV cache memory
- [[math/optimisation]] — SGD → momentum → Adam → AdamW; Lion; cosine schedule with warmup; gradient clipping; training instability
- [[math/probability]] — Softmax + temperature, entropy, cross-entropy loss, KL divergence (DPO), perplexity, sampling strategies
- [[math/backpropagation]] — Chain rule, vanishing/exploding gradients, residual connections as gradient highway, layer norm, He/Xavier init, AdamW
- [[math/information-theory]] — Entropy, cross-entropy (LLM training loss), KL divergence (RLHF/DPO penalty), perplexity interpretation, mutual information for RAG, temperature
- [[math/numerical-precision]] — fp32/fp16/bf16/fp8/int8/int4 trade-offs; mixed precision AMP; QLoRA NF4; decision guide by scenario

---

## Layer 2 — Security and Operations

### `security/` — AI Security
- [[security/owasp-llm-top10]] — OWASP LLM Top 10 2025 (LLM01-LLM10) + Agentic Top 10 2026 (A1-A10) with mitigations
- [[security/owasp-wstg]] — WSTG v4.2 methodology: 12 test categories, test IDs (WSTG-AUTHN-01 etc.), grey-box scoping, CVSS scoring, deliverable structure, ZAP + Burp integration
- [[security/oauth-boundary-testing]] — PKCE enforcement, scope bypass, audience validation, no-auth bypass; pytest patterns for mcpindex
- [[security/prompt-injection]] — Direct vs indirect injection, RAG poisoning, multi-agent injection, defence layers
- [[security/mcp-cves]] — Systemic STDIO RCE (200k+ instances), CVE table, attack taxonomy, scanning checklist
- [[security/red-teaming]] — Manual + automated red teaming, jailbreak categories, multi-turn manipulation, CI safety check
- [[security/guardrails]] — Output validation libraries: instructor (schema enforcement), Guardrails AI (multi-rule pipelines), NeMo Guardrails (conversation flow control)
- [[security/llm-red-teaming-tools]] — Garak, PyRIT, Promptfoo, NeMo Guardrails, DeepTeam — the runnable tools for adversarially testing LLM apps pre-deployment and at runtime
- [[security/threat-modelling]] — STRIDE (Spoofing/Tampering/Repudiation/InfoDisclosure/DoS/EoP), DREAD scoring, PASTA, workshop facilitation, DFDs, trust boundaries, threat register format, OWASP mapping, tooling

### `observability/` — LLM Monitoring
- [[observability/platforms]] — Langfuse (MIT/ClickHouse acquisition), LangSmith, Arize Phoenix; platform comparison; online evals
- [[observability/langfuse]] — Open-source LLM tracing (MIT, ClickHouse Jan 2026); traces/spans/cost/evals; @observe decorator; prompt management; self-hosted Docker
- [[observability/arize]] — Arize Phoenix (Apache 2.0, $70M Series C); embedding UMAP visualisation; OTel native; LLM+ML unified; Phoenix evals framework
- [[observability/helicone]] — open-source AI gateway + observability; one-line integration; semantic caching (20-30% cost reduction); 100+ provider routing
- [[observability/tracing]] — OTel semantic conventions for LLMs, auto-instrumentation, cost tracking, Langfuse/LangSmith integration
- [[observability/llmops]] — LLMOps as a discipline: prompt versioning, A/B testing at inference, eval gates, cost monitoring, and the LLMOps maturity model
- [[observability/datadog]] — Datadog unified observability: metrics/traces/logs/synthetics/CI Visibility; APM setup, monitors, SLOs, QA use cases, pricing vs Grafana/Prometheus

### `protocols/` — Agent Communication
- [[protocols/mcp]] — MCP spec, transports, tool schema, OAuth 2.0 auth, security surface, ecosystem
- [[protocols/mcp-http-transport]] — Streamable HTTP deep dive; POST/GET/DELETE contract; SSE lifecycle; session management; multiplexing
- [[protocols/mcp-server-development]] — FastMCP decorator API, tool/resource/prompt definitions, stdio vs streamable-HTTP transports, Claude Desktop/Code integration, tool poisoning defence
- [[protocols/a2a]] — Agent Card manifest, Tasks state machine, Part types, A2A vs MCP, LangGraph adapter
- [[protocols/tool-design]] — Tool naming, description writing, parameter design, return value design, testing schemas
- [[protocols/github-apps]] — JWT + installation token auth flow; webhook processing; App vs OAuth App; permissions; secrets management
- [[protocols/oauth-server-metadata]] — RFC 8414 discovery endpoint (/.well-known/oauth-authorization-server): metadata document fields, PKCE capability detection, MCP OAuth integration
- [[protocols/rfc-7591-dynamic-client-registration]] — RFC 7591 dynamic client registration: POST /register, client_id issuance, public vs confidential clients, MCP self-registration, security testing

---

## Layer 3 — Infrastructure and Tooling

### `infra/` — AI Infrastructure
- [[infra/vector-stores]] — pgvector, Chroma, Qdrant, Weaviate, Pinecone, Redis; HNSW index, hybrid search; selection guide
- [[infra/pgvector]] — PostgreSQL vector extension; cosine/L2/inner-product operators, IVFFlat/HNSW indexing, SQLAlchemy integration
- [[infra/aws-bedrock-agentcore]] — AWS managed agent runtime; memory, sandboxed tool execution, CloudWatch observability
- [[infra/weaviate]] — Open-source vector DB; hybrid search (BM25 + dense, alpha=0.75); multi-tenancy; GraphQL API; Weaviate Cloud managed option
- [[infra/inference-serving]] — vLLM paged attention, llama.cpp GGUF, TensorRT-LLM, speculative decoding; managed options
- [[infra/huggingface]] — transformers, datasets, PEFT, Trainer, Inference API, Hub — the open-source LLM ecosystem
- [[infra/gpu-hardware]] — H100/A100/RTX 4090/Apple Silicon VRAM guide; cloud pricing; quantisation to fit; multi-GPU setup
- [[infra/deployment]] — Docker, GitHub Actions CI/CD, Vercel, Fly.io, Modal serverless GPU; env vars; health checks
- [[infra/caching]] — Redis semantic caching, exact caching, Anthropic prompt caching; when to cache vs not; RediSearch vector index
- [[infra/cloud-platforms]] — AWS Bedrock/SageMaker/Lambda, GCP Vertex AI/Cloud Run, Azure OpenAI/ML; IAM patterns; managed vs self-hosted cost comparison
- [[infra/experiment-tracking]] — Weights & Biases and MLflow for logging training runs, comparing hyperparameter experiments, and tracking checkpoints during fine-tuning
- [[infra/flash-attention]] — IO-aware exact attention; O(N) memory vs O(N²); 3-10× faster than standard attention; standard in all modern training stacks
- [[infra/deepspeed-zero]] — Zero Redundancy Optimizer; 3 partitioning stages (optimizer states/gradients/params); enables 200B+ model training; vs PyTorch FSDP
- [[infra/github-marketplace]] — Billing models (free/flat-rate/per-unit); purchase lifecycle webhooks; listing requirements; verified publisher [archived — evalcheck project reference]
- [[infra/litellm]] — OpenAI-compatible interface to 100+ LLM providers; router with retry/fallback/load balancing; self-hosted AI gateway proxy
- [[infra/model-routing]] — dynamically routes LLM requests to cheap vs frontier models by query difficulty; RouteLLM (ICLR 2025), FrugalGPT cascade, Martian/Unify managed providers; 45-98% cost reduction with &lt;5% quality loss
- [[infra/inference-platforms]] — Groq LPU, Together AI, Fireworks AI, Cerebras, Modal, Replicate — managed inference providers and when to use each over self-hosting
- [[infra/ai-gateway]] — AI gateway comparison: LiteLLM, Portkey, Kong, OpenRouter, Helicone; when to add a gateway vs call providers directly
- [[infra/mlops-pipelines]] — ML pipeline orchestration: ZenML (stack abstraction), Metaflow (AWS-native), Kubeflow (Kubernetes), Flyte (lineage), Airflow; Neptune shutdown March 2026

### `apis/` — LLM APIs
- [[apis/what-is-an-api]] — Contract for two pieces of software to communicate; structured request/response without knowing internals
- [[apis/anthropic-api]] — Messages API, prompt caching (5-min/1-hour), Batch API, streaming, tool use, extended thinking
- [[apis/openai-api]] — Chat completions, function calling, structured output, o1/o3 reasoning models, embeddings, Whisper
- [[apis/openai-responses-api]] — Stateful successor to Chat Completions (March 2025); server-side state via previous_response_id; built-in web search/file search/code interpreter/MCP tools; Assistants API deprecated Aug 2025
- [[apis/google-ai]] — Gemini 2.5 Pro/Flash, Google AI Studio vs Vertex AI, vision, function calling, thinking mode
- [[apis/aws-bedrock]] — Converse API (model-agnostic boto3), Knowledge Bases (managed RAG), Guardrails (content safety), Bedrock Agents — AWS-native LLM platform

### `ai-tools/` — Developer Tooling
- [[ai-tools/claude-code]] — CLI capabilities, CLAUDE.md governance, hooks system, skills, settings.json, /ultrareview
- [[ai-tools/cursor-copilot]] — Cursor Composer, .cursorrules, MCP; Copilot Chat/Edits; comparison matrix vs Claude Code/Aider
- [[ai-tools/tavily]] — real-time web search API for LLM agents; Search/Extract/Map/Crawl APIs; LangChain/LangGraph native integration; acquired by Nebius 2026
- [[ai-tools/aider]] — open-source CLI coding assistant; architect mode (2 models), repo map (tree-sitter), atomic commits; most comparable to Claude Code
- [[ai-tools/continue]] — open-source VS Code/JetBrains extension; any model via config.json; context providers (@codebase, @docs, @diff, @web); tab autocomplete with dedicated small model
- [[ai-tools/cline]] — open-source autonomous coding agent, VS Code extension, MCP support
- [[ai-tools/openai-codex]] — OpenAI's Rust CLI coding agent and desktop app; codex-1 model (72.1% SWE-bench); three approval modes; cloud parallel containers; AGENTS.md config standard
- [[ai-tools/ai-test-generation]] — AI-assisted test generation: unit/API/E2E/data use cases, Claude Code + Copilot + Cursor workflows, prompt patterns, quality review checklist, mutation testing, client positioning, risks

---

## Layer 4 — Engineering Stack

### `sql/` — SQL
- [[sql/sql-fundamentals]] — SELECT/JOIN/GROUP BY/HAVING, indexes, ACID, transactions, normalisation, N+1 problem, SQLAlchemy basics
- [[sql/window-functions]] — ROW_NUMBER, RANK, LEAD/LAG, running totals, rolling averages, partition-by patterns
- [[sql/query-optimization]] — EXPLAIN ANALYZE, index types (B-tree/GIN/HNSW), common performance traps, VACUUM, partitioning
- [[sql/sql-for-ai]] — pgvector similarity queries, LLM call logging, feature store pattern, eval results store, JSONB patterns
- [[sql/sqlalchemy-patterns]] — async engine, session management, selectinload, bulk ops, Alembic migrations, common pitfalls
- [[sql/postgresql-features]] — JSONB, full-text search, GIN/BRIN/HNSW index types, LATERAL joins, pg_stat_statements, partitioning

### `python/` — Python Ecosystem
- [[python/python-hub]] — Python Brain central hub: all Python tooling, async, data, testing, packaging
- [[python/ecosystem]] — uv, async httpx, Pydantic v2, Click+Rich, pytest+respx, structlog, polars+duckdb
- [[python/async]] — asyncio, async/await, concurrent LLM calls with gather+Semaphore, async generators for streaming
- [[python/sqlalchemy]] — SQLAlchemy 2.0 async: Mapped types, AsyncSession, selectinload, connection pooling, FastAPI integration
- [[python/polars-duckdb]] — Polars lazy API + expression engine; DuckDB in-process SQL on Parquet/CSV; AI data use cases
- [[python/instructor]] — structured LLM outputs via Pydantic schema enforcement and automatic retry; wraps Anthropic and OpenAI clients
- [[python/pypi-distribution]] — Trusted Publishers (OIDC), pytest entry_points, pyproject.toml classifiers, semantic versioning, release checklist
- [[python/latency-benchmarking]] — p50/p95/p99 methodology; py-spy profiling; async HTTP patterns; STDIO vs HTTP comparison for MCP

### `web-frameworks/` — Backend and Frontend
- [[web-frameworks/fastapi]] — LLM API pattern, SSE streaming, dependency injection, BackgroundTasks for Langfuse logging
- [[web-frameworks/nextjs]] — App Router, Server Components, Vercel AI SDK useChat, streaming route handler, Server Actions
- [[web-frameworks/django]] — ORM patterns, pgvector VectorField, DRF, Channels WebSocket streaming, management commands
- [[web-frameworks/django-drf]] — DRF serialisers, ModelViewSet, DefaultRouter, permissions, JWT auth; custom @action for AI endpoints
- [[web-frameworks/vercel-ai-sdk]] — streamText, generateObject, useChat, useCompletion, tool calling, multi-provider, middleware

### `test-automation/` — Testing
- [[test-automation/playwright]] — Role-based locators, Healer agent v1.56 (75%), network mocking, trace viewer, MCP server
- [[test-automation/selenium]] — W3C WebDriver, explicit waits, page object pattern, Grid, Python + Java
- [[test-automation/pytest-patterns]] — Fixtures, parametrize, respx mocking, markers, conftest, coverage
- [[test-automation/testing-llm-apps]] — Testing LLM pipelines with pytest: mocking Anthropic API (respx), RAG stage isolation, agent loop testing, streaming, structured output, Hypothesis

### `javascript/` — JavaScript / TypeScript Ecosystem
- [[javascript/javascript-hub]] — JS/TS Brain hub: async patterns, type system, Node.js runtime, npm/pnpm, AI SDK patterns
- [[javascript/typescript-fundamentals]] — Type narrowing, interfaces, generics, utility types, satisfies operator, strict tsconfig
- [[javascript/nodejs-async]] — Event loop, libuv, async/await vs Python asyncio, streams, Promise patterns
- [[javascript/npm-pnpm-ecosystem]] — pnpm (3-5x faster via hard links), workspaces, lockfiles, semantic versioning, npm publishing
- [[javascript/ai-sdk-patterns]] — @anthropic-ai/sdk streaming + tool use, Vercel AI SDK streamText/generateObject, type-safe LLM clients

### `java/` — JVM Ecosystem
- [[java/what-is-java]] — Compiled, statically typed, JVM-based; write-once run-anywhere; dominates enterprise backends that AI teams integrate with
- [[java/build-tools]] — Maven (safe default for enterprise) vs Gradle/Kotlin DSL (faster, expressive greenfield); dependency management for multi-module LLM projects
- [[java/langchain4j]] — ChatLanguageModel, AI Services annotations, @Tool function calling, RAG pipeline, MCP SDK, virtual threads
- [[java/spring-ai]] — Spring Boot auto-config, ChatClient, structured output, function calling beans, RAG advisors, pgvector
- [[java/anthropic-java-sdk]] — Official Anthropic Java SDK; strongly-typed builders, sync/async clients, streaming, tool use without framework overhead
- [[java/grpc]] — Protobuf + bidirectional streaming for high-performance AI service communication between Java services

---

## Cloud Brain — Platform and Delivery Engineering

### `cloud/` — Cloud Platforms and Infrastructure
- [[cloud/cloud-hub]] — Cloud Brain central hub: all cloud, IaC, containers, CI/CD, networking, observability
- [[cloud/aws-core]] — EC2 instance families, Lambda, ECS/EKS, S3 storage classes, RDS/Aurora/DynamoDB, VPC design, IAM, Secrets Manager, CloudWatch
- [[cloud/gcp-core]] — Compute Engine, Cloud Run, GKE Autopilot, Cloud Storage, BigQuery, Vertex AI (Gemini Enterprise Agent Platform), IAM, Secret Manager
- [[cloud/azure-core]] — AKS, Azure Functions, App Service, Blob Storage smart tiering, Cosmos DB, Entra ID, Key Vault, Azure OpenAI Service
- [[cloud/terraform]] — HCL syntax, plan/apply lifecycle, S3+DynamoDB remote state, modules, workspaces, OpenTofu fork
- [[cloud/aws-cdk]] — CDK constructs (L1/L2/L3), TypeScript and Python stack examples, App-of-Apps, L3 patterns, cross-stack references, Aspects
- [[cloud/aws-rds-aurora]] — RDS vs Aurora, Multi-AZ, read replicas, Aurora Serverless v2, RDS Proxy, parameter groups, PITR backups
- [[cloud/aws-lambda-patterns]] — Cold starts, client initialisation, SQS batchItemFailures, EventBridge, Layers, URL streaming, SAM template
- [[cloud/aws-sqs-sns]] — SQS visibility timeout, DLQ, SNS fan-out, filter policies, SQS vs SNS vs EventBridge comparison
- [[cloud/aws-step-functions]] — State types, ASL definition, Parallel/Map/Choice/Wait states, SDK integrations, task token pattern, CDK example
- [[cloud/aws-api-gateway]] — HTTP API vs REST API, Lambda v2 payload, JWT authoriser, custom domain, WebSocket handler
- [[cloud/aws-ecs]] — Task definitions, Fargate vs EC2, service creation, ECR auth, Application AutoScaling
- [[cloud/docker]] — Dockerfile best practices, multi-stage builds (Go 980MB→10MB, Node 900MB→120MB), BuildKit cache mounts, Compose, security scanning
- [[cloud/kubernetes]] — Pods/Deployments/Services, rolling updates, HPA, RBAC, Helm, Pod Disruption Budgets, Network Policies, security hardening
- [[cloud/kubernetes-operators]] — CRDs, kubebuilder scaffolding, Go reconciler, RBAC markers, operator maturity levels, popular operators
- [[cloud/helm-advanced]] — Named templates, pre-upgrade hooks, OCI registry, chart dependencies, helm test, helm diff
- [[cloud/argo-rollouts]] — Canary/blue-green strategies, analysis templates (Prometheus), traffic weighting, kubectl plugin, ArgoCD integration
- [[cloud/github-actions]] — OIDC (no static credentials), caching (60-80% job time reduction), matrix strategy, reusable workflows, Terraform CI pattern
- [[cloud/argocd]] — GitOps principles, Application CRD, app-of-apps pattern, ApplicationSets for progressive delivery, Image Updater, CI/CD split
- [[cloud/service-mesh]] — Istio VirtualService/DestinationRule/PeerAuthentication, canary routing, circuit breaking, Linkerd comparison
- [[cloud/cloud-networking]] — VPC 3-tier design, security groups vs NACLs, L7/L4 load balancing, Route 53 routing policies, CDN, Private Link, Zero Trust
- [[cloud/cloud-monitoring]] — CloudWatch, Prometheus/Grafana, PromQL, OpenTelemetry, SLIs/SLOs/error budgets, alerting best practices
- [[cloud/observability-stack]] — kube-prometheus-stack, Loki LogQL, Tempo tracing, OTel Collector config, Python auto-instrumentation
- [[cloud/secrets-management]] — AWS Secrets Manager (auto-rotation), HashiCorp Vault (KV v2, dynamic secrets, Vault Agent), GCP/Azure equivalents, External Secrets Operator
- [[cloud/pulumi]] — Python/TypeScript stacks, pulumi stack commands, unit testing with Mocks, Pulumi vs Terraform
- [[cloud/ansible]] — Playbooks, Jinja2 templates, inventory, roles, Ansible Vault, ad-hoc commands, CI integration
- [[cloud/cloud-security]] — IAM least privilege, SCPs, GuardDuty, WAF, Security Hub, CloudTrail, secrets management, Falco
- [[cloud/keda]] — Kubernetes Event-Driven Autoscaling: Kafka/SQS/Prometheus scalers, TriggerAuthentication (IRSA), ScaledJob for batch, scale-to-zero
- [[cloud/disaster-recovery]] — RTO/RPO definitions, 4 DR strategies, Aurora Global failover, S3 cross-region replication, Velero, DR runbook
- [[cloud/gitops-patterns]] — GitOps principles, Flux vs ArgoCD comparison, Flux bootstrap, HelmRelease, SOPS encryption, ImageAutomation
- [[cloud/gitops-quality-gates]] — Quality gates in a GitOps pipeline: CI gates, ArgoCD sync hooks (PreSync/PostSync), Flux health checks, Argo Rollouts canary analysis, environment promotion gates, drift detection, QA checklist
- [[cloud/platform-engineering]] — SPACE framework, Backstage catalog+templates, golden paths, IDP scaffolding, platform KPIs (DORA)
- [[cloud/serverless-patterns]] — Lambda invocation types, SAM template, Powertools (Logger/Tracer/Metrics), cold start mitigation, Cloud Run
- [[cloud/aws-elasticache]] — Redis vs Memcached, ElastiCache Terraform, redis-py async, cache-aside, rate limiting, pub/sub, alarms
- [[cloud/container-security]] — Secure Dockerfile (distroless), Trivy scanning, Kubernetes Pod Security, NetworkPolicy, Falco rules, Cosign signing
- [[cloud/cloud-native-patterns]] — Twelve-factor app, health checks (live/ready/startup), graceful shutdown, sidecar, circuit breaker, retry backoff
- [[cloud/aws-eventbridge]] — Custom event buses, put_events Python, CDK rules+targets, EventBridge Pipes (SQS→enrich→bus), schema registry, cross-account routing
- [[cloud/blue-green-deployment]] — Strategy comparison table, ArgoCD Rollout YAML (blueGreen strategy, analysis templates), ECS CodeDeploy CDK, feature flag decoupling, automated promotion gates
- [[cloud/infrastructure-monitoring]] — CloudWatch custom metrics + EMF, CDK dashboards, anomaly detection alarms, AWS X-Ray auto-instrumentation + manual spans, CloudWatch Synthetics canaries, SLO calculation + emission
- [[cloud/finops-cost-management]] — Tag enforcement SCP, CDK RequiredTagsAspect, AWS Budgets per-service alerts, Cost Explorer rightsizing recommendations, Savings Plans vs Reserved Instances, Spot Fargate strategy
- [[cloud/aws-fargate]] — Fargate vs EC2 comparison, task definition JSON (distroless/secrets/health), CDK ApplicationLoadBalancedFargateService, Spot capacity provider strategy (80/20), awsvpc networking, EFS persistent storage
- [[cloud/multi-tenancy]] — Silo/pool/bridge/namespace models, PostgreSQL RLS policies, SQLAlchemy tenant context, Kubernetes ResourceQuota, Redis per-tenant rate limiting, async tenant provisioning
- [[cloud/cdn-patterns]] — CDN fundamentals, CloudFront CDK (cache policies, S3/HTTP origins), Cache-Control headers, invalidation patterns, CloudFront Functions (URL rewrite), Lambda@Edge JWT auth
- [[cloud/aws-networking-advanced]] — Transit Gateway (multi-VPC), PrivateLink (S3/Secrets Manager endpoints), Route 53 latency-based and failover routing, WAF rate-based rules, ENA/EFA network performance
- [[cloud/data-engineering-cloud]] — Data lake zones (raw/curated/analytics), AWS Glue PySpark ETL, Athena serverless SQL, dbt incremental models, S3 event-driven Lambda pipeline
- [[cloud/lambda-powertools]] — Logger (inject_lambda_context, correlation IDs, EMF), Tracer (capture_lambda_handler, annotations/metadata, subsegments), Metrics (log_metrics, dimensions), Idempotency (DynamoDBPersistenceLayer, @idempotent, jmespath key), Batch (SQS partial failure), Parser (event model validation)
- [[cloud/security-compliance]] — Security Hub CDK managed rules, Config custom Lambda evaluator + managed rules (S3/RDS/CloudTrail/RootMFA), GuardDuty CDK (S3/K8s/MalwareProtection), EventBridge GuardDuty pattern, Inspector v2 critical CVE query, WAF CDK WebACL (rate-based + known-bad-inputs, ALB association)
- [[cloud/load-balancing-advanced]] — ALB vs NLB comparison table, CDK path-based routing + weighted target groups (90/10 canary), health check config + FastAPI /health/ready endpoint, sticky sessions (duration-based + app cookie), Global Accelerator CDK (2-region), connection draining guidance
- [[cloud/aws-eks]] — EKS vs self-managed K8s, CDK cluster with managed node groups + Fargate profiles, IRSA (IAM Roles for Service Accounts) CDK setup, managed addons (VPC CNI/EBS CSI/CoreDNS), eksctl cluster config + scale + upgrade commands, Cluster Autoscaler Helm install
- [[cloud/cloud-migration]] — The 6 Rs (Retire/Retain/Rehost/Replatform/Repurchase/Re-architect), migration decision matrix, wave planning (Wave 0 foundation → Wave 3 revenue-critical), AWS Migration Hub CLI, DMS database migration (full-load + CDC + cutover), migration runbook template with rollback procedure
- [[cloud/aws-sagemaker]] — SageMaker vs vLLM decision guide, HuggingFace model deploy to real-time endpoint, target tracking autoscaling (invocations/instance), batch transform (multi-record, async polling), model registry + A/B testing (weighted traffic split), when to use ECS/vLLM instead
- [[cloud/vpc-design-patterns]] — 3-tier VPC CIDR allocation, CDK ProductionVPC (NAT per AZ, flow logs, isolated data subnets), security groups vs NACLs (stateful vs stateless), CDK ALB/app/RDS security group chain, VPC endpoints (S3 gateway free, Secrets Manager interface), Fargate private subnet endpoints, multi-account Transit Gateway routing table isolation, NAT Gateway cost optimisation
- [[cloud/bedrock-agentcore]] — AWS serverless agent hosting; microVM session isolation; $0.0895/vCPU-hr; LangGraph/Strands/CrewAI support; GA October 2025

---

## QA Brain — Quality Assurance

### `qa/` — QA Methodology
- [[qa/qa-hub]] — QA Brain central hub: all QA methodology, tools, and specialist testing
- [[qa/test-strategy]] — Testing pyramid, testing trophy, test quadrants, shift-left, coverage metrics, test environments, regression strategy
- [[qa/test-case-design]] — Equivalence partitioning, boundary value analysis, decision tables, state transition testing, use case testing, negative testing checklist
- [[qa/bug-lifecycle]] — New→Assigned→Open→Fixed→Retest→Closed states, bug report template, severity vs priority, triage, root cause classification
- [[qa/exploratory-testing]] — Session-based testing, charters ("Explore/With/To discover"), HICCUPPS heuristics, mind maps, SBTM report format
- [[qa/bdd-gherkin]] — Gherkin syntax, Three Amigos, step definitions (Python/JS/Java), anti-patterns, frameworks comparison, BDD workflow
- [[qa/risk-based-testing]] — Risk = Likelihood × Impact, risk register, assessment matrix, 80/20 rule, FMEA, communicating risk to stakeholders
- [[qa/qa-metrics]] — Defect density, detection rate, escape rate, flaky test rate, automation ROI, dashboard design, reporting to stakeholders
- [[qa/qa-tools]] — TestRail, Zephyr Scale, qTest, Jira JQL patterns, Postman collections, Newman CLI, accessibility tools, visual regression
- [[qa/uat]] — UAT vs QA testing, types (Alpha/Beta/Contract/OAT/Regulation), UAT process, entry/exit criteria, regulated industries (GxP, SOX, GDPR)
- [[qa/uat-governance]] — Process ownership layer above UAT execution: entry/exit criteria, stakeholder briefings, scope dispute resolution, defect triage with business owners, sign-off documentation, sign-off refusal, agile vs waterfall governance
- [[qa/agile-qa]] — Sprint lifecycle, DoD/DoR checklists, Three Amigos questions, shift-left approach, continuous testing pipeline, sprint metrics
- [[qa/regression-testing]] — Test selection strategies, smoke/core/full suite structure, git bisect, coverage gates, visual regression
- [[qa/accessibility-testing]] — WCAG 2.2 POUR principles, axe-core (Playwright/Python), ARIA patterns, screen reader checklist, CI integration
- [[qa/non-functional-testing]] — Performance/reliability/usability/compatibility testing types, SLOs, chaos engineering, Lighthouse CI budgets
- [[qa/mobile-testing]] — Appium (Python), XCUITest (Swift), Espresso (Kotlin), BrowserStack real devices, mobile-specific scenarios
- [[qa/test-data-management]] — factory_boy/Fishery factories, database seeding, data anonymisation, synthetic data generation, cleanup strategies
- [[qa/security-testing-qa]] — OWASP Top 10 QA scope, SAST/DAST tools, dependency scanning, QA security test cases, pen test coordination
- [[qa/test-environments]] — Env parity problems, ephemeral PR environments (Kubernetes), feature flags, env variable matrix, health checks
- [[qa/cross-browser-testing]] — Playwright multi-browser config, BrowserStack Automate, CI strategy, common CSS issues, visual diffing
- [[qa/qa-in-devops]] — Quality pipeline (pre-commit → PR → staging → production), quality gates YAML, pre-commit hooks, synthetic monitoring
- [[qa/test-reporting]] — Allure (pytest integration, GitHub Pages), JUnit XML, coverage reporting, Slack notifications, flaky test tracking
- [[qa/test-automation-strategy]] — What to automate, automation pyramid, tool selection, build vs buy, ROI calculation, automation debt, phased roadmap
- [[qa/ai-testing]] — LLM-as-judge, hallucination testing, format validation (Pydantic), safety red teaming, k6 AI load testing
- [[qa/defect-prevention]] — Cost of defects by stage, AC checklist, static analysis CI (ruff/mypy/bandit), code review checklist, mutation testing signal
- [[qa/smoke-sanity-testing]] — Smoke vs sanity table, smoke test suite (httpx), CI gate YAML, sanity examples, production Lambda canary
- [[qa/compliance-testing]] — GDPR test scenarios (right to access/erasure), PCI DSS test cases, WCAG 2.1 Playwright tests, audit logging
- [[qa/continuous-testing]] — Shift-left/shift-right, 5-stage pipeline, pre-commit hooks, feedback loop optimisation, test selection, maturity model
- [[qa/production-monitoring-qa]] — Synthetic monitoring (Lambda), SLO definition+tracking, Core Web Vitals RUM, error budget alerting, regression loop
- [[qa/test-planning]] — IEEE 829-lite test plan structure, in/out scope, risk register, test approach per layer, entry/exit criteria, defect severity SLA, lightweight sprint checklist, plan review checklist
- [[qa/end-to-end-testing]] — Critical path framework (what earns E2E), Playwright E2E structure, API-seeded state fixtures, fresh user factory, CI sharding YAML, flakiness taxonomy and quarantine process
- [[qa/shift-left-testing]] — Cost of bug by stage, Three Amigos checklist, Gherkin as spec tool, pre-commit hooks YAML, API contract review script, shift-left metrics (defect escape rate, requirements defect rate)
- [[qa/international-testing]] — i18n vs l10n, pseudo-localisation (char substitution + bracket wrapping), locale parametrize (en-GB/de-DE/ar-SA/ja-JP), RTL layout Playwright assertions, Unicode round-trip tests, locale test checklist
- [[qa/usability-testing]] — Nielsen's 10 heuristics, moderated session protocol, Maze API integration, SUS questionnaire + scoring, A/B testing with feature flags
- [[qa/performance-testing-qa]] — NFR acceptance criteria (GIVEN/WHEN/THEN), baseline measurement script, regression threshold (20%), performance test sign-off table, Lighthouse CI budget
- [[qa/performance-test-reporting]] — Run report structure, NFR pass/fail table, p95/p99 framing for PMs vs developers vs executives, trend analysis across releases, interim vs final report differences, go/no-go sign-off pack, defect reporting fields for performance cycles
- [[qa/root-cause-analysis]] — 5-whys example (expired API key → no monitoring), fishbone diagram (Technology/Process/People), full post-mortem template (timeline/impact/root-cause/contributing/lessons), DefectEscape dataclass + escape rate calculation, prevention loop per RCA type
- [[qa/test-documentation]] — Documentation that earns its existence vs waste, test case template (preconditions/steps/expected/actual), when to write formal cases vs use charters, requirements traceability matrix, test summary report template (executive summary/defect table/coverage/risk), exploratory test charter format
- [[qa/automation-debt]] — Debt signals table (slow CI/flaky/coupled tests), debt inventory scripts (magic string finder/duplicate selectors/no-assertion tests), debt quadrant (impact × effort), Page Object extraction pattern, quarantine with --run-flaky flag, automation debt roadmap markdown template
- [[qa/defect-clustering]] — Pareto 80/20 in defects, defect density calculation (defects/1000 LOC), hotspot matrix (defect history × change frequency), DefectCategory enum + pattern analysis + escape rate by category, complexity-churn combined risk score, using hotspot data in sprint planning
- [[qa/risk-based-test-selection]] — Selection strategies comparison table (changed files/modules/historical/risk-tier/all), file-based selection script (git diff → test file mapping), pytest-testmon (dependency tracking), risk-tiered suites (tier1 < 3min / tier2 < 15min / tier3 < 60min), historical failure correlation map, PR comment with selection decision
- [[qa/negative-testing]] — 7 categories (invalid input/boundary/business rule/state/not-found/dependency/concurrency), parametrize INVALID_QUANTITIES, missing-field tests, error response quality assertions (no stack trace leakage), respx dependency failure simulation, state-transition INVALID_TRANSITIONS, concurrent stock decrement test
- [[qa/pair-testing]] — 5 pair formats (Driver/Observer, Dev+QA, QA+QA adversarial, QA+PO, QA+user), session structure (charter/roles/debrief), markdown session template, when to use/not use pair testing, rotating pairs cadence
- [[qa/qa-leadership]] — 5-level QA maturity model (reactive→optimising), QA strategy template (goal/activities/tools/metrics), metrics table (escape rate/detection stage/automation ROI/MTTD/flaky rate), audience-specific communication (PO/EM/CTO/developers), 3-level quality gate framework, hiring signals + red flags, QA roadmap template
- [[qa/process-improvement-model]] — TMMi 5-level maturity model, TPI Next 16 key areas, Process Improvement Model (PIM) consulting workflow; capability assessment and benefits-driven roadmap methodology
- [[qa/test-estimation]] — Three-point PERT, T-shirt sizing, analogy-based, UCP; estimating test writing/execution/retesting/automation separately; agile story points and velocity tracking; context-switch tax for concurrent streams; capacity model (testers × days × utilisation); new-client ramp-up; presenting ranges not single-point figures; scope creep playbook; re-baselining when requirements change

---

## Technical QA Brain — Test Automation Engineering

### `technical-qa/` — Automation and Non-Functional Testing
- [[technical-qa/tqa-hub]] — Technical QA Brain central hub: all test automation engineering knowledge
- [[technical-qa/performance-testing]] — k6 (scenarios, thresholds, ramp profiles, CI integration), JMeter (CLI mode), Gatling, load/stress/spike/soak test types, DB monitoring under load
- [[technical-qa/api-testing]] — REST Assured (Java), httpx+pytest (Python), schema validation (JSON Schema/Pydantic), GraphQL testing, CI integration
- [[technical-qa/contract-testing]] — Pact consumer-driven contracts, .pact file generation, provider verification, PactFlow broker, can-i-deploy gate
- [[technical-qa/test-architecture]] — Page Object Model (Python/Java Playwright examples), component objects, Screenplay pattern, fixture management, factory pattern, anti-patterns
- [[technical-qa/cypress]] — Cypress vs Playwright, cy.intercept stubs/spies, custom commands (API login), component testing with mount, CI integration
- [[technical-qa/playwright-advanced]] — Custom fixtures, API testing, network interception, tracing, codegen, Healer agent, sharding
- [[technical-qa/visual-testing]] — Playwright screenshots, Percy, Applitools Eyes, Chromatic (Storybook), masking dynamic content, update policy
- [[technical-qa/wiremock]] — Request matching, stateful scenarios, response templating, standalone Docker, Admin API, record mode
- [[technical-qa/testcontainers]] — Real Postgres/Redis/Kafka in tests (Python + Java), fixture scoping, CI Docker image caching
- [[technical-qa/database-testing]] — Schema tests, constraint verification, migration safety, query plan analysis, volume testing
- [[technical-qa/flaky-test-management]] — Root cause taxonomy, detection (pytest-repeat), quarantine strategy, fix patterns, flaky SLA
- [[technical-qa/mutation-testing]] — mutmut (Python), PIT (Java), Stryker (JS), mutation score, CI integration (nightly)
- [[technical-qa/security-automation]] — Secrets detection, Semgrep SAST, Trivy scanning, Checkov IaC, ZAP DAST, Falco runtime, security test cases
- [[technical-qa/chaos-engineering]] — Chaos Toolkit JSON experiments, AWS FIS experiments, Toxiproxy network faults, Chaos Mesh pod/network chaos, game days, CI scheduling
- [[technical-qa/graphql-testing]] — Schema validation, query/mutation/auth tests (gql+pytest), N+1 detection, Apollo MockedProvider, subscriptions
- [[technical-qa/ci-cd-quality-gates]] — Gate taxonomy (pre-commit/PR/post-merge/deploy), full CI pipeline YAML, coverage config, branch protection, SonarQube
- [[technical-qa/mock-strategies]] — Test double taxonomy (dummy/stub/fake/spy/mock), unittest.mock, fake repository pattern, respx async HTTP, when not to mock
- [[technical-qa/infrastructure-testing]] — Terraform validate/tflint/Checkov, Terratest Go tests, Pulumi Automation API, OPA Rego policies, Infracost
- [[technical-qa/load-testing-advanced]] — k6 realistic scenarios (ramping VUs, spike, custom metrics), Locust Python, SLO validation script, DB load patterns, nightly CI
- [[technical-qa/parallel-test-execution]] — pytest-xdist worker isolation (per-worker DB schema), Playwright sharding + GitHub matrix + blob report merge, Playwright+xdist hybrid, port management, Amdahl's Law measurement
- [[technical-qa/pytest-advanced]] — Fixture scoping (session/module/function with savepoints), conftest architecture, parametrize patterns (indirect/IDs/matrix), factory fixtures, custom hooks (makereport/terminal_summary), coverage config with branch coverage, plugin list
- [[technical-qa/e2e-framework-design]] — 5-layer framework architecture, Page Object pattern (fluent interface, named locators), Journey pattern (flow composition), thin declarative test layer, E2E fixture design, selector priority order, framework anti-patterns
- [[technical-qa/api-contract-testing]] — Consumer-driven vs provider-driven, Pact consumer Python (Like/EachLike interactions), provider verification + provider states, PactFlow CLI, message contract testing for Kafka
- [[technical-qa/accessibility-automation]] — Auto vs manual catch table, Playwright+axe-core TypeScript, Python axe injection, ARIA patterns, keyboard nav test (focus trap, Escape), CI integration
- [[technical-qa/test-data-generation]] — Seeded Faker, asyncpg COPY bulk insert (100k rows), statistical distributions (lognormal/Pareto), diurnal timestamps, edge case parametrize sets, TestDataTracker cleanup
- [[technical-qa/browser-automation-patterns]] — Session-scoped auth state (API login + storage_state file), network interception (route handler + request recording), waiting strategies (expect_response/expect_request/wait_for_url), infinite scroll, drag_to, file download/upload, iframe frame_locator, multi-tab context.expect_page, axe accessibility assertions
- [[technical-qa/test-reporting-dashboards]] — Allure with pytest (--alluredir, @allure.feature/story/severity/step, allure.attach screenshot), CI YAML (artifact + JUnit publish + PR comment), Slack webhook with JUnit XML parsing, FlakyTracker pytest plugin (pass rate tracking), dashboard metrics table
- [[technical-qa/api-performance-testing]] — Latency percentiles (p50/p90/p95/p99/p999), throughput/error rate/resource utilisation metrics, k6 multi-stage test (ramp/steady/stress, thresholds, Trend/Rate/Counter), Python asyncio+httpx baseline benchmark (200 iterations, semaphore concurrency), regression detection pytest (25% threshold), SLO validation function
- [[technical-qa/postman-newman]] — Collection structure (folder hierarchy, auth folder, teardown), environment JSON files (base_url/token vars), pre-request script (auto-refresh token with expiry check), test scripts (status/schema/chaining/latency/headers), Newman CLI flags (--bail/--timeout-request/--folder), CI YAML with htmlextra reporter, when to convert to pytest vs keep in Postman
- [[technical-qa/api-testing-advanced]] — Contract-first workflow (OpenAPI as source of truth), Schemathesis auto-generated tests + pytest plugin (case.validate_response), schema drift detection (jsonschema validate + CI check), Hypothesis fuzz testing (never-500 property, SQL injection payloads), API versioning tests (v1/v2 parametrize + legacy field name tests), error response quality assertions (no stack trace leakage, JSON-serialisable)
- [[technical-qa/test-observability]] — Why test observability matters (flakiness hidden by retry-and-merge), test_runs/test_results PostgreSQL schema, pytest plugin (TestResultRecorder, pytest_runtest_makereport + pytest_sessionfinish → asyncpg flush), flakiness detection SQL (flakiness_rate_pct by test), duration trend query (P95 per week), Datadog CI Visibility YAML setup, Grafana dashboard panels + alerts
- [[technical-qa/selenium-grid]] — Grid 4 architecture (Router/Hub/Node/Distributor), standalone mode, Docker Compose grid with node scaling, pytest remote webdriver fixture (parametrize chrome/firefox), CI with GitHub Actions services (selenium-hub + nodes), Grid vs Playwright decision guide
- [[technical-qa/self-healing-tests]] — Healenium (tree-edit-distance algorithm, SelfHealingDriver, Docker backend, healing reports), Playwright Healer Agent v1.56 (75% success rate, GitHub PR auto-fix), Mabl (cloud ML multi-signal healing), testRigor (plain English, no selectors), Applitools visual AI, decision framework (Playwright migration vs Healenium wrapper), when self-healing is not the answer, ROI calculation, client presentation guide for 3000-test legacy suites
- [[technical-qa/websocket-testing]] — WebSocket protocol (handshake, opcodes, lifecycle), why it differs from REST testing, Playwright framesent/framereceived/routeWebSocket, websocat CLI, Postman WS, k6/ws 10-minute soak script (100 connections), performance metrics (RTT p50/p95/p99, fan-out latency, drop rate), SSE vs WebSocket, JSON Schema contract validation, Pact async messaging, common failure modes (ordering, backpressure, token expiry), CI integration (Node.js echo server, WireMock limitation)
- [[technical-qa/jmeter]] — Apache JMeter test plan structure (Test Plan/Thread Group/Samplers/Config Elements/Assertions/Timers/Listeners), HTTP/JDBC/WebSocket samplers, CSV Data Set Config parameterisation, correlation (Regex/JSON Extractor), Constant Throughput Timer, Backend Listener to InfluxDB/Grafana, CLI non-GUI mode (`jmeter -n -t`), distributed testing (controller/injector, >500 VUs), GitHub Actions CI integration with JTL threshold enforcement, JMeter vs k6 decision framework, plugin ecosystem (Stepping Thread Group, Throughput Shaping Timer, 3 Basic Graphs)

---

## Layer 5 — Knowledge and Intelligence

### `data/` — Data Engineering
- [[data/synthetic-data]] — Self-Instruct, Orca reasoning traces, preference pair generation, quality filtering, distilabel
- [[data/distilabel]] — Argilla's synthetic data pipeline framework; DPO/RLHF pair generation; composable steps; HuggingFace Hub integration
- [[data/datasets]] — HuggingFace datasets library; Alpaca/OpenHermes/HH-RLHF/The Stack; streaming large datasets; push_to_hub
- [[data/rlhf-datasets]] — HH-RLHF, UltraFeedback, building custom preference datasets, LLM-as-judge labelling, quality checks
- [[data/pipelines]] — dbt transformations, Airflow/Prefect orchestration, DVC versioning, RLHF feedback loops
- [[data/data-engineering-hub]] — data engineering hub: orchestration comparison, storage tiers, AI-specific quality checks, deduplication
- [[data/annotation-tooling]] — Label Studio (pairwise RLHF templates, ML pre-annotation) and Argilla (purpose-built LLM preference collection) — the human-in-the-loop layer for fine-tuning datasets

### `papers/` — Research Papers
- [[papers/key-papers]] — Reading list by area: Architecture, Alignment, Agents, RAG, Efficient Training, Safety, Scaling — one-day and one-week priority order
- [[papers/attention-is-all-you-need]] — Vaswani 2017: self-attention, multi-head, positional encoding, what changed since
- [[papers/gpt-3]] — Brown 2020: in-context learning, few-shot at scale, emergence, decoder-only architecture — lineage of every modern LLM
- [[papers/scaling-laws]] — Kaplan 2020 (model size > data) + Chinchilla 2022 (20 tokens/param corrects Kaplan) — how all post-2022 models are trained
- [[papers/rlhf]] — Stiennon 2020 (first large-scale RLHF) + InstructGPT 2022 (1.3B > 175B GPT-3 by human preference)
- [[papers/constitutional-ai]] — Bai 2022: AI self-critique using a written constitution; how Claude is trained; RLAIF replaces human harm labels
- [[papers/chain-of-thought]] — Wei 2022: intermediate reasoning steps unlock multi-step reasoning; only works at ~100B params+
- [[papers/react]] — Yao 2022: Thought→Action→Observation loop; the pattern every agent framework implements
- [[papers/lora]] — Hu 2021: low-rank weight adaptation; 10,000× fewer trainable params; zero inference latency; dominant fine-tuning method
- [[papers/dpo]] — Rafailov 2023: eliminates reward model + PPO; direct loss on preference pairs; replaced RLHF for open-source fine-tuning
- [[papers/swe-bench]] — Jimenez 2024: 2,294 real GitHub issues as benchmark; Claude 3.7 Sonnet 62% on Verified; gold standard for coding agents
- [[papers/mechanistic-interpretability]] — Circuits (2020) → Superposition (2022) → Monosemanticity (2023) → Scaling Monosemanticity (2024); SAEs on Claude 3 Sonnet
- [[papers/toolformer]] — Schick 2023 (Meta, NeurIPS): self-supervised API call learning via perplexity-reduction filtering; proves tool use is learnable not just promptable
- [[papers/gpt-4-technical-report]] — OpenAI 2023: bar exam ~90th percentile, RLHF improves behaviour not capability, system card format, architecture opacity as competitive norm
- [[papers/llama]] — LLaMA (Meta 2023): efficient open-weight foundation models 7B-65B, sparked open-source ecosystem
- [[papers/llama-2]] — Llama 2 (Meta+Microsoft 2023): RLHF chat models 7B-70B, commercial licence, 2T tokens
- [[papers/mistral]] — Mistral 7B (Oct 2023) and Mixtral 8x7B (Dec 2023): SWA + GQA beat Llama 2 13B at 7B scale; sparse MoE matches GPT-3.5 at 12.9B active parameters

### `landscape/` — Competitive Intelligence
- [[landscape/ai-labs]] — Anthropic ($350B/Google $40B), OpenAI (revenue miss), Google DeepMind, Meta FAIR, Mistral
- [[landscape/enterprise-ai-adoption]] — Deloitte 2026 + McKinsey: adoption tiers, governance gap, why workflow redesign beats model selection
- [[landscape/ai-use-case-identification]] — 6 primitives, Impact/Effort framework, scaling bottlenecks, discovery sprint methodology
- [[landscape/model-timeline]] — Release history 2017-2026: Transformer → BERT → GPT-3 → Claude 4.x
- [[landscape/open-source-models]] — Llama 3.x, Mistral/Mixtral, DeepSeek R1, Qwen 2.5, Gemma 3, Phi-4 — when to use each
- [[landscape/regulation]] — EU AI Act (GPAI obligations, risk tiers), US EO 14110, UK AISI, GDPR, copyright litigation
- [[landscape/eu-ai-act]] — EU AI Act deep dive: risk tiers (prohibited/high-risk/limited/minimal), enforcement timeline (Feb 2025–Aug 2027), GPAI obligations, Annex III categories, FRIA + GDPR DPIA overlap, ISO 42001 mapping, engineering compliance checklist
- [[landscape/iso42001]] — ISO/IEC 42001:2023 AIMS: the first certifiable AI management system standard; clause structure, EU AI Act overlap, ISO 27001 integration, certification process, and engineering controls
- [[landscape/aws-cloud-practitioner]] — AWS CLF-C02 study guide: all 4 domains (Cloud Concepts 24%, Security 30%, Technology 34%, Billing 12%), shared responsibility model, Well-Architected 6 pillars, full service catalogue
- [[landscape/aws-ai-practitioner]] — AWS AIF-C01 study guide: all 5 domains (GenAI 24%, FM Applications 28%, Responsible AI 14%, Security 14%), Bedrock full feature set, RAG on AWS, SageMaker suite

---

## Synthesis

- [[synthesis/audit-report]] — First full vault audit (2026-05-02): 134 broken links, 167 frontmatter gaps, 3 confirmed complementary duplicate pairs
- [[synthesis/debugging-runbooks]] — Index of 32 production debugging runbooks by failure domain: AI/LLM, agents, database, infra, network, security, APIs, observability, CI/CD
  - [[synthesis/debug-hallucination-in-production]] — Model returning confident but incorrect answers
  - [[synthesis/debug-llm-high-latency]] — LLM API calls taking longer than expected
  - [[synthesis/debug-prompt-injection-detected]] — Injection attempt confirmed or suspected in production
  - [[synthesis/debug-rag-wrong-context]] — RAG pipeline retrieving irrelevant chunks
  - [[synthesis/debug-rag-pipeline-slow]] — RAG retrieval or generation latency regression
  - [[synthesis/debug-embedding-quality-degraded]] — Retrieval relevance dropped after a model or data change
  - [[synthesis/debug-fine-tuned-model-worse]] — Fine-tuned model underperforming the base model
  - [[synthesis/debug-agent-loop-not-terminating]] — Agent loops indefinitely without reaching a final answer
  - [[synthesis/debug-agent-not-using-tools]] — Agent ignores available tools and responds from context alone
  - [[synthesis/debug-slow-query]] — Query latency spike in production database
  - [[synthesis/debug-deadlock]] — Deadlock detected in transaction logs
  - [[synthesis/debug-database-migration-failing]] — Alembic or schema migration failing on apply
  - [[synthesis/debug-duplicate-writes]] — Duplicate rows appearing despite unique constraints
  - [[synthesis/debug-kubernetes-pod-not-starting]] — Pod stuck in CrashLoopBackOff or Pending
  - [[synthesis/debug-scaling-not-triggering]] — HPA or autoscaler not adding capacity under load
  - [[synthesis/debug-cloud-cost-spike]] — Unexpected billing increase in cloud account
  - [[synthesis/debug-high-cpu]] — CPU usage at or above capacity, service degraded
  - [[synthesis/debug-memory-leak]] — Memory usage growing without bound across restarts
  - [[synthesis/debug-cors-error]] — Cross-origin requests blocked in browser
  - [[synthesis/debug-ssl-certificate-error]] — TLS handshake failures or certificate errors
  - [[synthesis/debug-dns-resolution-failing]] — Service unable to resolve internal or external hostnames
  - [[synthesis/debug-auth-failing]] — Authentication or authorisation rejecting valid requests
  - [[synthesis/debug-secret-leaked]] — Secret or credential exposed in logs, code, or a public location
  - [[synthesis/debug-api-timeout]] — External or internal API calls timing out
  - [[synthesis/debug-websocket-dropping]] — WebSocket connections disconnecting unexpectedly
  - [[synthesis/debug-error-rate-after-deploy]] — Error rate increased following a deployment
  - [[synthesis/debug-cache-inconsistency]] — Cache returning stale or incorrect data
  - [[synthesis/debug-data-pipeline-failing]] — ETL or data pipeline job failing or producing bad output
  - [[synthesis/debug-no-logs-in-production]] — Logs absent from expected destination after deployment
  - [[synthesis/debug-alert-firing-incorrectly]] — Alert firing when system is healthy (or not firing when it is not)
  - [[synthesis/debug-ci-pipeline-failing]] — CI pipeline failing after a change that should have passed
  - [[synthesis/debug-flaky-test]] — Test passing and failing non-deterministically across runs
- [[synthesis/rag-vs-finetuning]] — Core distinction, when each wins, cost comparison, the 57% number
- [[synthesis/llm-decision-guide]] — Which model/embedding/vector store/agent framework/infra for every major decision
- [[synthesis/architecture-patterns]] — The 7 blueprints covering 90% of AI apps: RAG chatbot, document processing, classification, agentic loop, multi-agent, eval pipeline, hybrid human-AI
- [[synthesis/cost-optimisation]] — 7 levers (prompt caching, model routing, Batch API, compression, output control, semantic cache) achieving 60-90% savings
- [[llms/hallucination]] — Causes, types, detection (faithfulness check, self-consistency), mitigation strategies; Claude-specific behaviour
- [[synthesis/getting-started]] — First API call, SDK setup, system prompts, multi-turn chat, streaming, async, common first mistakes
- [[synthesis/learning-path]] — Staged curriculum for software engineers moving into AI engineering: foundations → building → production → advanced; project ladder
- [[synthesis/software-engineer-to-ai-engineer]] — Which SE skills transfer directly to AI engineering, what needs re-mapping, and the fastest learning order for a working developer
- [[synthesis/reasoning-model-patterns]] — Production decision framework for reasoning models: when extended thinking helps vs hurts, budget_tokens selection guide, cross-provider comparison (Claude adaptive, o3, Gemini thinking, DeepSeek R1), and cost/latency tradeoffs
- [[synthesis/gap-report]] — Ranked knowledge gaps relative to active projects and the 0→SE→AE learning path — what to research next
- [[synthesis/request-flow-anatomy]] — Full request chain User → CDN → API Gateway → Service → DB → Response: where latency accumulates, where failures happen, where retries apply
- [[synthesis/engineering-tradeoffs]] — The decisions that define senior engineers: cache vs recompute, RAG vs fine-tuning, scale up vs out, consistency vs availability
- [[synthesis/data-as-system]] — Data lineage, contracts, freshness SLAs, ownership, consistency across services, ETL pipeline failure modes
- [[synthesis/technical-communication]] — ADRs, RFCs, postmortems, stakeholder translation, explaining tradeoffs — the communication layer that multiplies technical skill
- [[cs-fundamentals/debugging-systems]] — Debugging as a first-class skill: correlation IDs, tracing across services, systematic elimination, reproducing production bugs

---

## Experiments

- [[experiments/model-latency-comparison]] — p50/p95/p99 latency for Anthropic and OpenAI models across 20 samples per model
- [[experiments/rag-chunking-benchmark]] — fixed-size vs semantic chunking on RAGAS faithfulness and answer relevancy scores
- [[experiments/embedding-mteb-local]] — BGE-M3 vs fastembed encode speed and retrieval quality benchmark
- [[experiments/prompt-caching-savings]] — real cache hit rate and cost savings with Anthropic prompt caching
