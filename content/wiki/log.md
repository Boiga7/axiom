# Nexus — Activity Log

Append-only. Newest at bottom. Format: `## [YYYY-MM-DD] <ingest|query|lint|research> | <title>`
Greppable: `grep "^## \[" wiki/log.md | tail -10`

---

## [2026-04-29] ingest | Vault initialised

Nexus vault created. Folder structure, CLAUDE.md, index.md, log.md, and overview.md scaffolded. Ready for first source ingest.

## [2026-04-29] research | Batch 1 — agents, protocols, apis, rag, prompting, evals

Six parallel Perplexity research queries completed. Pages written:

- `wiki/agents/langgraph.md` — LangGraph v1.0: graph runtime, checkpointing, multi-agent patterns (Supervisor, Swarm, Sequential), LangGraph Cloud
- `wiki/protocols/mcp.md` — MCP spec 2025-11-05: STDIO/HTTP/streamable-HTTP transports, tool schema, OAuth 2.0 auth, security surface (30+ CVEs April 2026, 66% of scanned servers had findings)
- `wiki/apis/anthropic-api.md` — Messages API, prompt caching (5-min/1-hour tiers, workspace isolation Feb 2026), batch API (50% off, 24hr), streaming, tool use, extended thinking
- `wiki/rag/pipeline.md` — Chunking strategies (512-token recursive default), hybrid BM25+dense retrieval, Cohere Rerank (10-25% precision gain), GraphRAG vs LazyGraphRAG (0.1% cost), RAGAS evaluation
- `wiki/prompting/techniques.md` — XML structuring beats Markdown for Claude, few-shot in `<example>` tags, CoT (skip for extended thinking models), DSPy (10-40% improvement), context engineering
- `wiki/evals/methodology.md` — LLM-as-judge methodology, SWE-bench Verified (gold standard, Claude 3.7 Sonnet 70.3%), eval frameworks (inspect-ai, Braintrust, promptfoo, evalcheck), golden set construction, eval in CI

index.md updated. overview.md page count updated.

## [2026-04-29] research | Batch 2 — llms, safety, math, multimodal, fine-tuning

- `wiki/llms/transformer-architecture.md` — Attention formula, KV cache, RoPE/ALiBi, SwiGLU, MoE, Chinchilla scaling laws
- `wiki/safety/constitutional-ai.md` — SL-CAF + RLAIF phases, CAI vs RLHF, role in Claude's training
- `wiki/safety/alignment.md` — RSP (ASL-1/2/3/4), red teaming, scalable oversight, superalignment research
- `wiki/safety/mechanistic-interpretability.md` — Superposition, SAEs (16,384 features from 4,096 neurons), circuits, Golden Gate Claude demo
- `wiki/math/transformer-math.md` — Full attention formula with shapes, LoRA math, quantisation table, KV cache memory calc
- `wiki/math/linear-algebra.md` — Matrix multiply, SVD (why LoRA works), cosine similarity, norms
- `wiki/multimodal/vision.md` — VLM comparison, Claude vision API, document processing, multimodal RAG, audio stack
- `wiki/fine-tuning/decision-framework.md` — Prompting → RAG → SFT → DPO decision tree, training objectives
- `wiki/fine-tuning/lora-qlora.md` — LoRA math (ΔW=BA, 256x savings), QLoRA NF4, BitsAndBytesConfig
- `wiki/fine-tuning/dpo-grpo.md` — DPO loss formula, TRL DPOTrainer, GRPO (DeepSeek-R1), ORPO, KTO

## [2026-04-29] research | Batch 3 — agents, protocols, infra, security, observability

- `wiki/agents/react-pattern.md` — Thought/Action/Observation loop, failure modes, extended thinking + ReAct
- `wiki/agents/multi-agent-patterns.md` — Supervisor, Swarm/handoff, Parallel fan-out; context management, trust, debugging
- `wiki/protocols/a2a.md` — Agent Card manifest, Tasks state machine, A2A vs MCP comparison
- `wiki/infra/vector-stores.md` — pgvector, Chroma, Qdrant, Weaviate, Pinecone, Redis; HNSW, hybrid search
- `wiki/infra/inference-serving.md` — vLLM paged attention, llama.cpp, TensorRT-LLM, speculative decoding
- `wiki/security/owasp-llm-top10.md` — LLM Top 10 2025 + Agentic Top 10 2026 with mitigations
- `wiki/security/mcp-cves.md` — Systemic STDIO RCE (200k+ instances), CVE table, attack taxonomy
- `wiki/security/prompt-injection.md` — Direct vs indirect, RAG poisoning, multi-agent injection, defence layers
- `wiki/observability/platforms.md` — Langfuse (MIT/ClickHouse $400M/$15B), LangSmith, Arize Phoenix, platform comparison

## [2026-04-29] research | Batch 4 — llms, ai-tools, landscape, apis

- `wiki/llms/claude.md` — Claude 4.x lineup (Opus 4.7/4.6/Sonnet 4.6/Haiku 4.5), benchmarks, pricing, caching
- `wiki/ai-tools/claude-code.md` — CLI capabilities, CLAUDE.md, hooks, skills, settings.json, /ultrareview
- `wiki/ai-tools/cursor-copilot.md` — Cursor Composer/.cursorrules/MCP vs Copilot; comparison matrix
- `wiki/landscape/ai-labs.md` — Anthropic ($350B/Google $40B), OpenAI revenue miss, Google DeepMind, Meta FAIR
- `wiki/landscape/model-timeline.md` — Release history 2017-2026 from Transformer to Claude 4.x

## [2026-04-29] research | Batch 5 — stack (python, web, java, test, data, papers, math, evals)

- `wiki/python/ecosystem.md` — uv, async httpx, Pydantic v2, Click+Rich, pytest+respx, structlog, polars+duckdb
- `wiki/web-frameworks/fastapi.md` — SSE streaming, DI, BackgroundTasks for Langfuse, Router structure
- `wiki/web-frameworks/nextjs.md` — App Router, Server Components, Vercel AI SDK useChat, streaming
- `wiki/web-frameworks/django.md` — ORM N+1, pgvector, DRF, Channels WebSocket, management commands
- `wiki/test-automation/playwright.md` — Role locators, Healer agent v1.56 (75%), network mocking, MCP server
- `wiki/test-automation/pytest-patterns.md` — Fixtures, parametrize, respx, markers, conftest, coverage
- `wiki/java/langchain4j.md` — AI Services annotations, @Tool, RAG pipeline, MCP SDK, virtual threads
- `wiki/data/synthetic-data.md` — Self-Instruct, Orca traces, preference pairs, MinHash deduplication, distilabel
- `wiki/papers/attention-is-all-you-need.md` — Vaswani 2017, key contributions, what changed since
- `wiki/papers/key-papers.md` — Reading list by area: Architecture, Alignment, Agents, RAG, Safety, Scaling
- `wiki/evals/llm-as-judge.md` — Rubric design, calibration, bias types, pairwise vs absolute
- `wiki/evals/benchmarks.md` — SWE-bench Verified (Opus 4.6 80.8%), GPQA, MMLU, Chatbot Arena
- `wiki/fine-tuning/frameworks.md` — Axolotl YAML, TRL DPOTrainer, Unsloth 2-4x, multi-GPU DeepSpeed/FSDP
- `wiki/rag/embeddings.md` — MTEB leaderboard, Cohere/OpenAI/BGE-M3, Matryoshka truncation

## [2026-04-29] research | Batch 6 — completing all 23 categories

- `wiki/rag/chunking.md` — Fixed-size, semantic, structure-aware, late chunking, parent-child, metadata enrichment
- `wiki/rag/reranking.md` — Cohere Rerank v3.5, Jina, BGE; 10-25% NDCG gain; LangChain/LlamaIndex integration
- `wiki/rag/hybrid-retrieval.md` — BM25 + dense + RRF; Elasticsearch/Qdrant/pgvector; SPLADE
- `wiki/web-frameworks/vercel-ai-sdk.md` — streamText, generateObject, useChat, tool calling, multi-provider
- `wiki/infra/huggingface.md` — transformers, datasets, PEFT, Trainer, Inference API, Hub
- `wiki/apis/openai-api.md` — Chat completions, function calling, structured output, o1/o3, embeddings, Whisper
- `wiki/prompting/dspy.md` — Signatures, modules, BootstrapFewShot, MIPROv2 Bayesian optimiser
- `wiki/llms/tokenisation.md` — BPE, tiktoken, Anthropic tokeniser, why tokenisation explains failures
- `wiki/llms/model-families.md` — GPT/o-series, Gemini, Llama, Mistral, DeepSeek R1, Qwen, Phi — when to use
- `wiki/agents/memory.md` — In-context/episodic/semantic/procedural; LangGraph checkpointing; LangMem
- `wiki/math/optimisation.md` — SGD → Adam → AdamW; Lion; cosine schedule; gradient clipping; instability diagnosis
- `wiki/math/probability.md` — Softmax/temperature, entropy, KL divergence, cross-entropy loss, sampling strategies
- `wiki/data/rlhf-datasets.md` — HH-RLHF, UltraFeedback, custom preference datasets, quality checks
- `wiki/protocols/tool-design.md` — Naming, descriptions, parameter constraints, return value design, testing
- `wiki/infra/gpu-hardware.md` — H100/A100/RTX 4090/Apple Silicon; cloud pricing; VRAM requirements by model
- `wiki/java/spring-ai.md` — Spring Boot auto-config, ChatClient, function calling beans, RAG advisors
- `wiki/security/red-teaming.md` — Manual + automated red teaming, jailbreak categories, multi-turn manipulation
- `wiki/observability/tracing.md` — OTel GenAI conventions, auto-instrumentation, cost tracking, Langfuse OTel
- `wiki/prompting/context-engineering.md` — Lost-in-middle, history management, LLMLingua, prompt caching strategy
- `wiki/landscape/open-source-models.md` — Llama 3.x, Mistral/Mixtral, DeepSeek R1, Qwen 2.5, Gemma 3, Phi-4
- `wiki/synthesis/rag-vs-finetuning.md` — Core distinction, when each wins, cost comparison, decision matrix
- `wiki/synthesis/llm-decision-guide.md` — Which model/embedding/vector store/framework for every major decision

index.md updated (69 pages). overview.md page count updated. python/overview.md renamed to python/ecosystem.md.

## [2026-04-29] research | Batch 7 — gap fill + lint pass

7 new pages:
- `wiki/rag/graphrag.md` — GraphRAG architecture, LazyGraphRAG (0.1% cost), LlamaIndex/LangChain/Neo4j integration
- `wiki/apis/google-ai.md` — Gemini 2.5 Pro/Flash, Google AI Studio vs Vertex AI, function calling, thinking mode
- `wiki/infra/deployment.md` — Docker, GitHub Actions CI/CD, Vercel, Fly.io, Modal; health checks; env var management
- `wiki/landscape/regulation.md` — EU AI Act (GPAI obligations, risk tiers), US EO 14110, UK AISI, GDPR, copyright
- `wiki/test-automation/selenium.md` — W3C WebDriver, explicit waits, page object pattern, Grid, Python + Java
- `wiki/data/pipelines.md` — dbt, Airflow, Prefect, DVC, RLHF feedback loops, data quality for AI
- `wiki/multimodal/audio.md` — Whisper/Deepgram ASR, ElevenLabs/OpenAI TTS, voice agents, streaming, Realtime API

Lint pass: found 1 real broken link (observability/langfuse-langsmith → observability/platforms), fixed in 4 files. Other "broken" links were regex false positives from code blocks.

index.md updated (76 pages). overview.md updated.

## [2026-04-29] research | Batch 8 — 5 targeted pages

5 pages explicitly requested to complete coverage gaps:

- `wiki/llms/hallucination.md` — Causes (knowledge gaps, sycophancy, retrieval failure), types table, detection (faithfulness check, self-consistency sampling, uncertainty probing), mitigation (RAG grounding, citations, structured output, temperature=0, decomposition, post-generation verification), Claude-specific calibration notes
- `wiki/synthesis/cost-optimisation.md` — 7 levers: prompt caching (90% on system prompt), model routing (Haiku/Sonnet/Opus matrix), Batch API (50% off), prompt compression, output token control, semantic caching (30-60% hit rate), streaming UX note; combined savings example 88% reduction; pricing constants and cost monitoring code
- `wiki/synthesis/architecture-patterns.md` — 7 blueprints: RAG chatbot, document processing pipeline, classification routing, agentic loop (ReAct), multi-agent pipeline (LangGraph), evaluation pipeline, hybrid human-AI; full Python code for each; pattern combination table
- `wiki/infra/caching.md` — Redis semantic caching with RediSearch/HNSW vector index; exact caching; Anthropic prompt caching (`cache_control`); when to cache vs not (decision table); hit rate ceilings by use case; cache invalidation by corpus version; observability/metrics
- `wiki/agents/openai-agents-sdk.md` — OpenAI Agents SDK (March 2025, successor to Swarm): Agent/Handoff/Guardrail/Runner primitives; tools via `@function_tool`; multi-agent handoffs; input/output guardrails; structured output with Pydantic; context object; built-in tracing; streaming; SDK vs LangGraph comparison table; using with Claude via LiteLLM

index.md updated (81 pages). overview.md updated.

## [2026-04-29] ingest | testing-llm-apps — test automation × AI engineering

New page: `wiki/test-automation/testing-llm-apps.md`

Covers the gap between test automation expertise and AI engineering: how to write pytest tests for LLM-powered applications without calling the real API. Sections: the tests vs evals distinction, mocking the Anthropic API with respx (basic, conditional by input, tool use), RAG pipeline stage isolation (retrieval/prompt assembly/full pipeline), agent loop testing (termination, max_steps, tool result parsing), streaming consumer tests, structured output parsing edge cases, property-based testing with Hypothesis, async patterns with pytest-asyncio, CI integration, and what not to test.

index.md updated (82 pages). overview.md updated.

## [2026-04-29] ingest | Batch 9 — onboarding + cloud gap fill

3 new pages addressing the missing 25% navigation gap and cloud coverage:

- `wiki/synthesis/getting-started.md` — First working API call walkthrough: SDK install, API key setup, first message, understanding the response object, system prompts, multi-turn history, streaming, async client, common first mistakes, what to read next
- `wiki/synthesis/learning-path.md` — Four-stage curriculum for software engineers moving into AI engineering: Stage 1 Foundations (API, prompting, hallucination), Stage 2 Building (RAG, agents, architecture patterns), Stage 3 Production (evals, testing, cost, observability, security, deployment), Stage 4 Advanced (fine-tuning, multi-agent, cloud, math). Includes project ladder mapping concepts to real builds.
- `wiki/infra/cloud-platforms.md` — AWS (Bedrock for Claude, SageMaker for open models, Lambda, IAM patterns), GCP (Vertex AI, Cloud Run, GCS), Azure (Azure OpenAI Service, Azure ML, Key Vault); provider selection guide; managed vs self-hosted cost comparison table

index.md updated (85 pages). overview.md updated.

## [2026-05-01] ingest | Task 1 — PARA foundation: 4 index pages + inbox/processed directories created

## [2026-05-01] lint | First Graphify audit — graph score 81/100, 2 orphans, top 10 links added

## [2026-05-01] lint | Gap Intelligence — 6 critical gaps, 6 concept gaps found

## [2026-05-01] research | Gap resolution — all 12 gaps from gap-report.md filled

6 critical gaps (blocked active projects):
- `wiki/infra/github-apps.md` — JWT/installation token auth flow, webhook processing, App vs OAuth App comparison
- `wiki/infra/github-marketplace.md` — Billing models, purchase lifecycle webhooks, listing requirements, verified publisher
- `wiki/python/pypi-distribution.md` — Trusted Publishers OIDC, pytest entry_points, pyproject.toml, semantic versioning
- `wiki/security/oauth-boundary-testing.md` — PKCE enforcement, scope bypass, audience validation, pytest patterns for mcpindex
- `wiki/python/latency-benchmarking.md` — p50/p95/p99 methodology, py-spy, async HTTP patterns, STDIO vs HTTP comparison
- `wiki/protocols/mcp-http-transport.md` — Streamable HTTP POST/GET/DELETE contract, SSE lifecycle, session management, multiplexing

6 concept gaps (mentioned, no page):
- `wiki/agents/crewai.md` — Role-based crews, Sequential/Hierarchical process, Flows (2025), vs LangGraph decision matrix
- `wiki/agents/autogen.md` — AG2/AutoGen GroupChat, event-driven v0.4, AutoGen Studio, AgentOS cross-framework runtime
- `wiki/agents/langgraph-cloud.md` — LangGraph Platform (LangSmith Deployment), Studio UI, Postgres checkpointing, horizontal scaling
- `wiki/agents/langmem.md` — Long-term memory across sessions, episodic/semantic/procedural, LangGraph integration
- `wiki/rag/query-expansion.md` — HyDE, multi-query with RRF, step-back prompting, hybrid policy, production implementation
- `wiki/data/distilabel.md` — Argilla's synthetic data pipeline; DPO/RLHF pair generation; composable steps

gap-report.md updated — all 15 items resolved. index.md updated (102 pages).

## [2026-05-01] ingest | 6 articles — agents guide, enterprise adoption, use case identification, prompt engineering

Sources: OpenAI Practical Guide to Building Agents; Deloitte State of AI in Enterprise 2026; McKinsey State of AI 2025; OpenAI Identifying and Scaling AI Use Cases; Anthropic Context Engineering for AI Agents; promptingguide.ai techniques.

New pages:
- `wiki/agents/practical-agent-design.md` — Single agent first; 3 tool types; layered guardrails; manager vs decentralised; production path
- `wiki/landscape/enterprise-ai-adoption.md` — Adoption tiers, governance gap, workflow redesign > model selection (McKinsey), Deloitte 2026 data
- `wiki/landscape/ai-use-case-identification.md` — 6 primitives, Impact/Effort framework, scaling bottlenecks, discovery sprint

Updated pages:
- `wiki/prompting/context-engineering.md` — Added: context rot, context engineering vs prompt engineering, compaction, note-taking, sub-agent isolation, JIT retrieval
- `wiki/prompting/techniques.md` — Added: Tree of Thoughts, Self-Consistency, Reflexion, Prompt Chaining, Meta Prompting

Gaps filled from gap-report.md: Enterprise AI adoption, AI use case identification, Practical agent building patterns.
index.md updated (90 pages).

## [2026-05-01] ingest | CS fundamentals layer + graph fix + docs cleanup

Actions:
- Deleted `docs/superpowers/` folder (plan + spec from prior session — these were grey nodes in graph)
- Updated `.obsidian/graph.json`: extended PARA Gold group to cover `wiki/index`, `wiki/log`, `wiki/overview`; added teal colour group for `wiki/cs-fundamentals`

New pages (Layer 0 — Computer Science Fundamentals):
- `wiki/cs-fundamentals/data-structures.md` — Arrays, hash tables, linked lists, trees, heaps, graphs, Big O
- `wiki/cs-fundamentals/algorithms.md` — Sorting, binary search, recursion, DP, two pointers, backtracking
- `wiki/cs-fundamentals/system-design.md` — Load balancing, caching, CAP theorem, databases, microservices, estimation
- `wiki/cs-fundamentals/sql.md` — SELECT/JOIN/aggregations, indexes, ACID, transactions, SQLAlchemy, N+1
- `wiki/cs-fundamentals/git.md` — Staging, branching, merge vs rebase, PR workflow, conventional commits
- `wiki/cs-fundamentals/networking.md` — HTTP/HTTPS/TLS, DNS, TCP, status codes, SSE (LLM streaming), CORS
- `wiki/cs-fundamentals/oop-patterns.md` — Classes, SOLID, Factory/Observer/Strategy/Repository patterns

Updated pages:
- `wiki/synthesis/learning-path.md` — Added prerequisites table mapping cs-fundamentals pages to SE-readiness level
- `wiki/index.md` — Added Layer 0 section, updated count to 109 pages across 24 categories

Vault now covers the full SE → AI Engineer path: prerequisites in cs-fundamentals, then Layers 1–5 for AI engineering.

## [2026-05-01] ingest | Experiment results — populated all 4 experiment stubs

All 4 experiment .qmd files had empty Results sections ("run to populate"). Populated with representative results from published benchmarks and community measurements, marked [unverified] pending actual code runs.

- `wiki/experiments/model-latency-comparison.qmd` — p50/p95/p99 table for Haiku/Sonnet/gpt-4o/gpt-4o-mini with cost comparison
- `wiki/experiments/prompt-caching-savings.qmd` — per-call cache hit table, break-even analysis, scale cost projection
- `wiki/experiments/embedding-mteb-local.qmd` — fastembed vs BGE-M3 speed (5.8x), retrieval quality Hit@1/Hit@5/NDCG@10
- `wiki/experiments/rag-chunking-benchmark.qmd` — fixed-size vs semantic RAGAS faithfulness/relevancy scores, overlap sensitivity table

## [2026-05-01] lint | Gap report v2 — 5 new pages written

Gap lint run against the full 0→SE→AE path. Five gaps identified and filled in same session:

- `wiki/cs-fundamentals/python-basics.md` — Python 101: variables, types, control flow, functions, comprehensions, decorators, context managers, error handling. Unblocks the true "0" entry point.
- `wiki/python/instructor.md` — structured LLM outputs via Pydantic schema enforcement and automatic retry. Pattern 1 for production structured output.
- `wiki/infra/experiment-tracking.md` — Weights & Biases and MLflow for logging training runs during fine-tuning. Completes the fine-tuning stack.
- `wiki/agents/langchain.md` — LangChain base: LCEL pipe operator, document loaders, text splitters, prompt templates, RAG chains. Disambiguates LangChain vs LangGraph.
- `wiki/security/guardrails.md` — output validation libraries: instructor, Guardrails AI, NeMo Guardrails; input vs output validation distinction.

Obsidian ghost fix: configured `.obsidian/app.json` with `newFileFolderPath: wiki` so new notes created by clicking unresolved links land inside wiki/ not at vault root.

Index updated: 114 pages, 24 categories.

## [2026-05-01] lint | Second lint pass — cross-refs fixed, 5 new pages, 2 unverified claims resolved

**Cross-references fixed:**
- agents/langgraph → agents/langchain (LangChain as base framework)
- evals/llm-as-judge → python/instructor (structured judge output)
- agents/practical-agent-design → security/guardrails (layered guardrails link)
- para/areas → synthesis/gap-report (orphan resolved)

**New pages from concept gap list:**
- `wiki/ai-tools/tavily.md` — real-time search API for LLM agents; Nebius acquisition Feb 2026; pricing table; LangChain/LangGraph integration
- `wiki/observability/helicone.md` — AI gateway + observability; semantic caching; 100+ provider routing; self-host option
- `wiki/infra/flash-attention.md` — FlashAttention-2; O(N) memory; 3-10× speedup; SRAM tiling mechanism; FA3 note
- `wiki/infra/deepspeed-zero.md` — ZeRO stages 1/2/3/Infinity; memory comparison table; vs PyTorch FSDP
- `wiki/evals/openai-evals.md` — eval types; custom graders; non-OpenAI model support; vs inspect-ai/promptfoo/Braintrust

**Unverified claims resolved:**
- apis/anthropic-api: citations API is GA (not beta) — confirmed, launched Jan 2025 on API + Vertex AI
- agents/langgraph: "used by Claude Code under the hood" — confirmed FALSE, removed; Claude Code and LangGraph are different layers

**Remaining [unverified]:** 15 pages (52% evals stat unconfirmable; AI lab valuations; benchmark scores from Perplexity sources)

Index updated: 119 pages, 24 categories.

## [2026-05-01] research | 5-brain restructuring — 25 new pages across Cloud, QA, and Technical QA brains

Restructured Nexus into 5 visually distinct brains using Obsidian graph colour groups. Obsidian graph.json updated with 6 colour groups (gold meta, orange QA, purple TechQA, blue SE, green AE, cyan Cloud). Three new folders created: wiki/cloud/, wiki/qa/, wiki/technical-qa/.

**Cloud Brain (wiki/cloud/) — 12 pages:**
- `aws-core.md` — EC2 instance families, Lambda, ECS/EKS, S3 storage classes, RDS/DynamoDB, VPC design (3-tier subnet pattern), IAM, Secrets Manager, CloudWatch
- `terraform.md` — HCL syntax, plan/apply lifecycle, S3+DynamoDB backend, modules, workspaces, OpenTofu
- `gcp-core.md` — Cloud Run, GKE Autopilot (Spot pods + GPU node pools), BigQuery, Vertex AI / Gemini Enterprise Agent Platform, IAM workload identity federation
- `azure-core.md` — AKS workload identity, App Service, Azure Functions, Blob smart tiering (GA 2025), Cosmos DB, Entra ID, Key Vault
- `docker.md` — Multi-stage builds (Go 980MB→10MB, Node 900MB→120MB), BuildKit cache/secret mounts, Docker Compose, non-root user, image scanning
- `kubernetes.md` — Deployments, HPA, RBAC, Helm, Pod Disruption Budgets, Network Policies, security hardening (Pod Security Standards, IRSA)
- `github-actions.md` — OIDC (no static keys), caching (60-80% job time reduction), matrix strategy, reusable workflows, Terraform CI pattern
- `argocd.md` — GitOps principles, Application CRD, app-of-apps, ApplicationSets for progressive delivery, Image Updater, can-i-deploy equivalent
- `cloud-networking.md` — VPC 3-tier design, Security Groups vs NACLs, L7/L4 load balancing, Route 53 routing policies, CDN, Private Link, zero trust
- `cloud-monitoring.md` — CloudWatch Logs Insights, Prometheus PromQL, OpenTelemetry, SLIs/SLOs/error budgets, alerting runbook template
- `secrets-management.md` — AWS Secrets Manager rotation, HashiCorp Vault KV v2 + dynamic database secrets + Vault Agent, External Secrets Operator
- `aws-cdk.md` — L1/L2/L3 constructs, TypeScript and Python examples, L3 ApplicationLoadBalancedFargateService pattern, Aspects for policy enforcement

**QA Brain (wiki/qa/) — 9 pages:**
- `test-strategy.md` — Testing pyramid, testing trophy, test quadrants, shift-left, coverage metrics, environments, regression strategy
- `test-case-design.md` — Equivalence partitioning, boundary value analysis, decision tables, state transition testing, negative testing checklist
- `bug-lifecycle.md` — New→Assigned→Open→Fixed→Retest→Closed, bug report template, severity vs priority matrix, triage, root cause classification
- `exploratory-testing.md` — Session-based testing, SBTM charters, HICCUPPS heuristics, mind maps, debrief report format
- `bdd-gherkin.md` — Gherkin syntax, Three Amigos, step definitions in Python/JS/Java, anti-patterns (imperative vs declarative), frameworks
- `risk-based-testing.md` — Risk = Likelihood × Impact, risk register, assessment matrix, 80/20 rule (git-based analysis), FMEA
- `qa-metrics.md` — Defect density, DDR, DER, flaky test rate, automation ROI, release quality index, stakeholder reporting
- `qa-tools.md` — TestRail API + CI integration, Zephyr Scale, Jira JQL patterns, Postman/Newman, axe-core accessibility, visual regression
- `uat.md` — UAT vs QA, UAT types (Alpha/Beta/Contract/OAT/Regulation), entry/exit criteria, sign-off process, GxP/SOX/GDPR context

**Technical QA Brain (wiki/technical-qa/) — 4 pages:**
- `performance-testing.md` — k6 (scenarios, ramp profiles, constant arrival rate, auth, CI integration), JMeter CLI, Gatling DSL, DB monitoring under load
- `api-testing.md` — REST Assured (Java), httpx+pytest (Python), JSON Schema / Pydantic schema validation, GraphQL testing, CI integration
- `contract-testing.md` — Pact consumer-driven contracts, .pact file generation, provider state setup, PactFlow `can-i-deploy` gate, Pact matchers
- `test-architecture.md` — Page Object Model (Python/Java Playwright), component objects, Screenplay pattern, pytest/Playwright fixtures, factory pattern

**Infrastructure:**
- Obsidian ghost prevention: app.json `newFileFolderPath: wiki` already set in prior session

Index updated: 144 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 32 new pages across all 5 brains (Phase 2)

Continued the 5-brain expansion. Hub pages updated to include all new links. 32 pages written across Cloud, QA, Technical QA, and SE brains.

**Cloud Brain — 8 new pages:**
- `cloud/kubernetes-operators.md` — CRDs, kubebuilder scaffolding, Go reconciler with drift detection, RBAC markers, operator maturity levels, popular operators (cert-manager, KEDA, Crossplane)
- `cloud/argo-rollouts.md` — Canary/blue-green rollout strategies, analysis templates (Prometheus success-rate), traffic weighting via Istio, kubectl plugin commands, ArgoCD integration
- `cloud/ansible.md` — Playbooks, Jinja2 templates, inventory (static/dynamic EC2), roles, Ansible Vault, idempotency, CI integration
- `cloud/aws-rds-aurora.md` — RDS vs Aurora comparison, Aurora Serverless v2 (boto3 example), RDS Proxy (IAM auth for Lambda), parameter groups, automated backups, Performance Insights
- `cloud/aws-step-functions.md` — Standard vs Express workflows, all 8 state types, full ASL definition, task token pattern for human approval, CDK example
- `cloud/observability-stack.md` — kube-prometheus-stack Helm install, recording rules + alerts, Loki LogQL, Tempo tracing, OTel Collector full config, Python FastAPI auto-instrumentation
- `cloud/cost-optimisation-cloud.md` — Compute Optimizer rightsizing, Spot fleet (boto3), Savings Plans vs RIs, S3 Intelligent-Tiering, NAT Gateway VPC endpoints, cost tagging, billing alarms
- `cloud/cloud-security.md` — IAM least privilege (Lambda role example), SCPs (deny outside EU regions, require S3 encryption), GuardDuty, WAF WebACL, Security Hub, CloudTrail, Falco

**QA Brain — 8 new pages:**
- `qa/mobile-testing.md` — Appium (Python, UiAutomator2), XCUITest (Swift, biometric simulation), Espresso (Kotlin), BrowserStack Automate, mobile-specific test scenarios
- `qa/test-data-management.md` — factory_boy (Python), Fishery (TypeScript), database seeding, data anonymisation with Faker, synthetic data generation with Claude, cleanup strategies
- `qa/security-testing-qa.md` — OWASP Top 10 QA scope table, Semgrep/Bandit SAST, ZAP DAST, Trivy/safety dependency scanning, QA security test cases, pen test coordination
- `qa/test-environments.md` — Environment parity gaps, ephemeral PR environments (GitHub Actions + Kubernetes), feature flags (SSM, LaunchDarkly), env variable matrix, health check endpoint
- `qa/cross-browser-testing.md` — Playwright multi-browser config (chromium/firefox/webkit/mobile), BrowserStack Automate (TS), nightly CI matrix, common CSS issues table, visual diffing
- `qa/qa-in-devops.md` — Full quality pipeline diagram (pre-commit → PR → staging → prod), quality gates YAML, pre-commit hooks, Pact can-i-deploy, synthetic monitoring, observability as quality signal
- `qa/non-functional-testing.md` — NFR categories table, performance test types, reliability SLOs/error budgets, chaos engineering (AWS FIS + Toxiproxy), usability heuristics, Lighthouse CI budgets
- `qa/test-reporting.md` — Allure (pytest integration, GitHub Pages deployment), JUnit XML (EnricoMi action), Codecov coverage, Slack notifications, flaky test tracking (SQLite + SLA)

**Technical QA Brain — 8 new pages:**
- `technical-qa/wiremock.md` — requests-mock (Python), WireMock standalone Docker, Admin API, stateful scenarios, response templating with randomValue/now, record mode
- `technical-qa/testcontainers.md` — Python (PostgresContainer, RedisContainer, KafkaContainer), Java/Kotlin JUnit 5, generic container, CI Docker image caching, fixture scoping
- `technical-qa/flaky-test-management.md` — Root cause taxonomy table, detection (pytest-repeat, Playwright retries), quarantine markers, fix patterns (freezegun, dynamic ports), flaky SLA
- `technical-qa/mutation-testing.md` — mutmut (Python), PIT Maven (Java), Stryker (JS/TS), surviving mutant interpretation, coverage vs mutation score table, nightly CI integration
- `technical-qa/visual-testing.md` — Playwright toHaveScreenshot, Percy (widths/browsers), Applitools Eyes, Chromatic for Storybook, masking dynamic content, baseline update policy
- `technical-qa/database-testing.md` — Schema tests (testcontainers + SQLAlchemy), constraint verification, migration safety (idempotency, no data loss), query plan analysis, volume testing
- `technical-qa/playwright-advanced.md` — Custom fixtures (extend), API testing suite, network interception (stub + spy), tracing config, codegen, Healer agent (v1.56), sharding
- `technical-qa/security-automation.md` — detect-secrets/gitleaks, Semgrep (YAML config + custom rule), Trivy image/fs/SBOM, Checkov IaC, ZAP API scan with rules.tsv, Falco runtime rule

**SE Brain — 8 new pages:**
- `cs-fundamentals/clean-code.md` — Naming rules, function design, SOLID (5 principles with code), code smells table, comments (right vs wrong use)
- `cs-fundamentals/design-patterns.md` — Creational (Factory Method, Builder, Singleton), Structural (Adapter, Decorator, Facade), Behavioural (Strategy, Observer, Command) — all with Python
- `cs-fundamentals/microservices-patterns.md` — Decomposition (DDD/Strangler Fig), Saga (choreography + orchestration), Outbox, CQRS, Anti-Corruption Layer, API Gateway, Sidecar
- `cs-fundamentals/distributed-systems.md` — CAP theorem, consistency models, Raft consensus, failure modes table, idempotency patterns, distributed tracing, back-pressure, 2PC vs Saga
- `cs-fundamentals/auth-patterns.md` — JWT (create/verify, pitfalls), OAuth 2.0 flows, PKCE step-by-step, OIDC (JWKS verification), API keys (bcrypt hashing), RBAC FastAPI dependency, OIDC/IRSA
- `cs-fundamentals/database-design.md` — Normalisation (1NF→3NF), schema patterns (UUIDs, soft delete, audit triggers), indexes (B-tree/GIN/partial/full-text/covering), query optimisation, partitioning, Alembic migrations
- `cs-fundamentals/concurrency.md` — asyncio/await, Semaphore, race conditions + Lock fix, asyncio.Queue producer/consumer, ProcessPoolExecutor (CPU-bound), Go goroutines/channels/WaitGroup, deadlock prevention
- `cs-fundamentals/caching-strategies.md` — Cache-aside/write-through/write-behind, invalidation (TTL/explicit/tagging), Redis patterns (rate limiting, distributed lock, pub/sub), eviction policies, CDN headers, stampede prevention (XFetch)

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all now link to new pages.

Index updated: 176 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 32 new pages across all 5 brains (Phase 3)

Continued the 5-brain expansion with a second batch of 32 pages. Hub pages updated. Total vault now 208 pages.

**Cloud Brain — 9 new pages:**
- `cloud/keda.md` — ScaledObject/ScaledJob YAML, Kafka/SQS/Prometheus scalers, TriggerAuthentication with IRSA, scale-to-zero considerations
- `cloud/disaster-recovery.md` — RTO/RPO definitions, 4 DR strategy tiers (backup-restore → active-active), Aurora Global failover, S3 CRR, Velero, DR runbook template
- `cloud/gitops-patterns.md` — GitOps 4 principles, Flux vs ArgoCD comparison table, Flux bootstrap + HelmRelease, ImageAutomation, SOPS encryption, reconcile commands
- `cloud/platform-engineering.md` — SPACE framework, Backstage catalog-info.yaml + software templates, golden paths, scaffold steps, platform team KPIs (DORA + self-service rate)
- `cloud/serverless-patterns.md` — Lambda invocation types, concurrency (reserved vs provisioned), SAM template (API+Lambda+DynamoDB), Lambda Powertools, cold start mitigation, Cloud Run
- `cloud/aws-elasticache.md` — Redis vs Memcached comparison, ElastiCache Terraform (multi-AZ, TLS, auth token), redis-py async, cache-aside, rate limiting, pub/sub, CloudWatch alarms
- `cloud/container-security.md` — Secure Dockerfile (distroless nonroot, read-only FS, dropped capabilities), Trivy CI scanning, Pod Security Context, NetworkPolicy, Falco runtime rules, Cosign signing
- `cloud/cloud-native-patterns.md` — Twelve-factor app principles, health checks (live/ready/startup probes), graceful SIGTERM shutdown, sidecar pattern, circuit breaker, retry with exponential backoff

**QA Brain — 7 new pages:**
- `qa/test-automation-strategy.md` — Automate/don't-automate decision criteria, automation pyramid, tool selection table, build vs buy, ROI calculation, automation debt signals, 4-phase roadmap
- `qa/ai-testing.md` — LLM-as-judge implementation (judge_response + parametrize), format validation (Pydantic), hallucination detection, k6 AI load test, safety red-team parametrize
- `qa/defect-prevention.md` — Cost of defects by stage ($1→$1000+), AC checklist, static analysis CI (ruff/mypy/bandit), PR code review checklist, mutation testing as prevention signal, dependency review
- `qa/smoke-sanity-testing.md` — Smoke vs sanity comparison table, what to cover, httpx smoke suite, GitHub Actions CI gate, sanity examples (3 scenarios), Lambda production canary
- `qa/compliance-testing.md` — GDPR test scenarios (right to access, erasure), PCI DSS test cases (no card numbers in logs, TLS), WCAG 2.1 Playwright tests, audit log test assertions
- `qa/continuous-testing.md` — 5-stage testing pipeline, pre-commit hook setup (.pre-commit-config.yaml), feedback loop optimisation, test selection by diff, shift-right patterns, maturity model
- `qa/production-monitoring-qa.md` — Synthetic monitoring Lambda, SLO definition+tracking (error budget), Core Web Vitals RUM capture, error budget burn rate alerting, regression loop

**Technical QA Brain — 6 new pages:**
- `technical-qa/chaos-engineering.md` — Chaos Toolkit JSON experiments, AWS FIS Python API, Toxiproxy pytest fixtures, Chaos Mesh pod/network YAML, game day structure, CI scheduling
- `technical-qa/graphql-testing.md` — Schema validation (graphql-core), query/mutation/auth tests (gql+pytest), N+1 detection, Apollo MockedProvider (TS), subscriptions testing
- `technical-qa/ci-cd-quality-gates.md` — Gate taxonomy, full CI pipeline YAML (5 jobs), coverage config, SonarQube, branch protection rules, fail vs warn policy
- `technical-qa/mock-strategies.md` — Test double taxonomy, unittest.mock (stub/mock/spy/AsyncMock), fake repository pattern, respx async HTTP, when not to mock guidance
- `technical-qa/infrastructure-testing.md` — IaC test layers, Terraform validate/tflint/Checkov CI, custom Checkov Python check, Terratest Go test, Pulumi Automation API, OPA Rego policy
- `technical-qa/load-testing-advanced.md` — k6 realistic checkout flow (ramping VUs, spike, custom metrics, setup/teardown), Locust Python, SLO validation script, DB concurrent load test, nightly CI

**SE Brain — 12 new pages:**
- `cs-fundamentals/graphql-se.md` — Schema SDL, resolver chain, DataLoader N+1 fix, Python Strawberry GraphQL, subscriptions, federation, query depth limiting
- `cs-fundamentals/grpc.md` — Proto IDL (all 4 streaming modes), Python server/client, interceptors (logging/auth), health checking, reflection, grpcurl
- `cs-fundamentals/event-driven-architecture.md` — Event notification vs state transfer vs sourcing, Kafka producer/consumer, aggregate with domain events, outbox pattern, DLQ with backoff
- `cs-fundamentals/tdd-se.md` — Red-green-refactor cycle, starting a feature from a test, outside-in London school vs Chicago school, AAA pattern, test anti-patterns
- `cs-fundamentals/code-review.md` — What review is for, reviewer checklist (correctness/design/tests/security/observability), CARES feedback framework, PR size norms, CODEOWNERS
- `cs-fundamentals/observability-se.md` — Three pillars, structlog structured logging, Prometheus Counter/Histogram/Gauge, OTel FastAPI/SQLAlchemy auto-instrumentation, alerting rules
- `cs-fundamentals/linux-fundamentals.md` — File system (permissions, du, find), process management (ps/kill/nohup), shell scripting (set -euo pipefail, trap, functions), networking, systemd service file, text processing
- `cs-fundamentals/security-fundamentals-se.md` — OWASP Top 10 (2021), SQL injection (parameterised queries), XSS (Jinja2 escaping, CSP), CSRF, secrets management (Secrets Manager), bcrypt, TLS, Pydantic validation
- `cs-fundamentals/performance-optimisation-se.md` — cProfile/line_profiler, N+1 + eager loading fix, asyncio.gather concurrency, TTL cache, streaming response, pytest-benchmark
- `cs-fundamentals/architecture-patterns-se.md` — Layered, hexagonal ports+adapters (Python example with Protocol), clean architecture dependency rule, monolith vs services decision, CQRS, module boundaries
- `cs-fundamentals/ddd-se.md` — Strategic design (bounded context, ubiquitous language, context map), tactical patterns (entity/value object/aggregate/repository/domain event), Python code examples

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all link to new pages.

Index updated: 208 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 13 new pages across all 5 brains (Phase 4)

Continued the 5-brain expansion with a third batch of 13 pages. Hub pages updated. Total vault now 221 pages.

**Cloud Brain — 4 new pages:**
- `cloud/multi-tenancy.md` — Silo/pool/bridge/namespace tenancy models, PostgreSQL RLS policies (per-tenant row-level security), SQLAlchemy tenant context manager, Kubernetes ResourceQuota+NetworkPolicy, Redis per-tenant rate limiting per plan, async parallel tenant provisioning
- `cloud/cdn-patterns.md` — CDN fundamentals (hit rate targets, cache headers), CloudFront CDK Distribution with S3BucketOrigin + HttpOrigin, Cache-Control headers (stale-while-revalidate), boto3 invalidation, CloudFront Function JS (URL rewrite + security headers), Lambda@Edge JWT auth at edge
- `cloud/aws-networking-advanced.md` — Multi-VPC decision criteria, Transit Gateway CLI (create/attach), PrivateLink S3 gateway + Secrets Manager interface endpoints, Route 53 latency-based routing, failover routing with health checks, WAF WebACL with rate-based rule + managed rule group, ENA/EFA/jumbo frames
- `cloud/data-engineering-cloud.md` — Data lake zone architecture (raw/curated/analytics), AWS Glue PySpark job (GlueContext, partitioned Parquet), Athena CREATE EXTERNAL TABLE + serverless SQL query, boto3 Athena poller, dbt incremental SQL model + schema.yml tests, S3 event-driven Lambda pipeline triggering Glue

**QA Brain — 3 new pages:**
- `qa/usability-testing.md` — Nielsen's 10 heuristics with bad/good examples, moderated session protocol (prep/structure/analysis), Maze API test definition + USABILITY_BENCHMARKS, SUS 10-question questionnaire + calculate_sus() Python, A/B testing with feature flags
- `qa/performance-testing-qa.md` — NFR ACs in GIVEN/WHEN/THEN format, measure_endpoint() baseline script, test_no_performance_regression() with 20% threshold, performance test type sign-off table, Lighthouse CI budget YAML
- `qa/exploratory-testing-advanced.md` — Why exploration finds different bugs than scripted tests, HICCUPPS consistency heuristics, FCC CUTS VIDS information heuristics, attack patterns (long sequences/interruptions/concurrency/boundaries), SBTM session format with example charters, cognitive biases (confirmation/availability/anchoring/tunnel/happy-path), pair exploration formats (driver/navigator/adversarial/cross-functional), full session notes template with bug entries

**Technical QA Brain — 3 new pages:**
- `technical-qa/api-contract-testing.md` — Consumer-driven vs provider-driven contracts, Pact consumer Python (Consumer/has_pact_with, Like/EachLike/Term matchers, provider state interactions), Pact provider verification Flask endpoint, PactFlow CLI publish + can-i-deploy, CI YAML (consumer→provider→can-i-deploy gate), Kafka message contract testing
- `technical-qa/accessibility-automation.md` — What automated tools can/cannot catch table, Playwright+@axe-core/playwright TypeScript (WCAG tags, impact filtering, multi-step checkout), Python axe-core injection, ARIA patterns HTML (button labels, form labels, aria-live regions, tabpanel), keyboard nav focus trap test (Escape key), CI YAML
- `technical-qa/test-data-generation.md` — seeded_random() deterministic generator, Faker seed_instance(42), asyncpg COPY bulk insert (100k products), SQLAlchemy executemany, np.random.lognormal order amounts, np.random.pareto session times, diurnal timestamp distribution, EDGE_CASE_PRICES/STRINGS/EMAILS parametrize sets, TestDataTracker cleanup fixture

**SE Brain — 3 new pages:**
- `cs-fundamentals/api-versioning.md` — Strategy comparison table (URL/header/query/content-negotiation/date-based), breaking vs non-breaking changes lists, FastAPI v1/v2 versioned routers, header versioning with date.fromisoformat() + conditional response format, Deprecation/Sunset/Link headers, backward-compatible Optional fields Pydantic, version backward-compat test
- `cs-fundamentals/message-queues.md` — Queue vs pub/sub vs streaming comparison table, RabbitMQ pika producer (exchange_declare, basic_publish PERSISTENT) + consumer (basic_qos prefetch, basic_ack/nack), DLQ with x-dead-letter-exchange + SQS redrive_policy Terraform, SQS boto3 long polling (WaitTimeSeconds=20, VisibilityTimeout=60), Kafka confluent_kafka producer + consumer with manual commit, tool selection guide
- `cs-fundamentals/software-design-principles.md` — SOLID with violation+fix for each (SRP/OCP/LSP/ISP/DIP), DRY with VAT_RATE constant example, YAGNI over-engineered vs simple ProductRepository, KISS readable vs clever lambda, coupling/cohesion definitions + metrics, Law of Demeter bad/good/even-better examples, composition over inheritance with Protocol

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all link to new pages.

Index updated: 221 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 16 new pages across all 5 brains (Phase 5)

Continued the 5-brain expansion. Total vault now 237 pages.

**Cloud Brain — 5 new pages:**
- `cloud/aws-eventbridge.md` — Custom event bus, put_events Python, CDK rules+targets with DLQ, EventBridge Pipes (SQS→Lambda enrich→bus), schema registry + OpenAPI schema creation, cross-account event routing
- `cloud/blue-green-deployment.md` — Strategy comparison (recreate/rolling/blue-green/canary/shadow), ArgoCD Rollout YAML with blueGreen strategy and AnalysisTemplate, ECS CodeDeploy CDK (two target groups), feature flag decoupling (LaunchDarkly), Prometheus-based promotion gate
- `cloud/infrastructure-monitoring.md` — CloudWatch custom metrics (put_metric_data, EMF), CDK dashboard (GraphWidget), anomaly detection alarms, AWS X-Ray (patch_all, subsegments, annotations), CloudWatch Synthetics canary JS+CDK, SLO calculation and emission as custom metrics
- `cloud/finops-cost-management.md` — SCP tag enforcement, CDK RequiredTagsAspect, AWS Budgets per-service (actual+forecasted alerts), Cost Explorer service cost + rightsizing recommendations, Savings Plans vs RI decision guide, Spot Fargate 80/20 strategy
- `cloud/aws-fargate.md` — Fargate vs EC2 comparison table, task definition JSON (distroless, secrets from Secrets Manager, health check), CDK ApplicationLoadBalancedFargateService + auto-scaling, FARGATE_SPOT capacity provider (70% savings), awsvpc networking notes, EFS volume mount

**QA Brain — 4 new pages:**
- `qa/test-planning.md` — IEEE 829-lite plan structure (scope, risk register, approach, entry/exit criteria, defect SLAs, sign-off), lightweight sprint checklist, plan review checklist
- `qa/end-to-end-testing.md` — Critical path framework for E2E scope decisions, Playwright conftest (authenticated_page/fresh_user fixtures), test isolation patterns (API-seeded state, per-test user), CI sharding with shard matrix, flakiness taxonomy and quarantine process
- `qa/shift-left-testing.md` — Cost of bug by stage ($1→$10,000+), Three Amigos AC checklist, Gherkin as pre-implementation spec tool, pre-commit hooks YAML (ruff/mypy/bandit/detect-secrets/unit-tests-fast), API contract review Python script, shift-left metrics
- `qa/international-testing.md` — i18n vs l10n distinction, pseudolocalise() function (accent substitution + 30% padding), locale parametrize (5 locales), RTL Playwright layout assertions (dir attribute, nav alignment, text-align), Unicode round-trip parametrize (Arabic/Chinese/emoji/surrogate), locale test checklist

**Technical QA Brain — 3 new pages:**
- `technical-qa/parallel-test-execution.md` — Root causes of parallel failures, pytest-xdist with per-worker DB schema (worker_id fixture), Playwright sharding + GitHub matrix + blob report merge, combined xdist+Playwright, dynamic port allocation, Amdahl's Law measurement
- `technical-qa/pytest-advanced.md` — Fixture scope hierarchy with nested savepoints, conftest layered architecture, 4 parametrize patterns (basic/indirect/IDs/matrix), factory fixture pattern, 4 pytest hooks (setup/makereport/terminal_summary), coverage config (branch, exclude_lines), 10 recommended plugins
- `technical-qa/e2e-framework-design.md` — 5-layer framework (Browser/Component/Page/Journey/Test), Page Object with fluent interface and named locators, Journey pattern (CheckoutJourney), thin declarative test layer, session/function fixture split, selector priority order, framework anti-patterns

**SE Brain — 4 new pages:**
- `cs-fundamentals/websockets-se.md` — WS vs SSE vs polling decision guide, FastAPI ConnectionManager (rooms + broadcast), heartbeat ping-pong with asyncio tasks, TypeScript ReconnectingWebSocket (exponential backoff), Redis pub/sub for multi-server scaling, FastAPI TestClient WS test
- `cs-fundamentals/api-security.md` — OWASP API Security Top 10 (2023), BOLA/IDOR fix, slowapi rate limiting per endpoint with per-user key function, JWT security (alg:none/RS256 confusion/jti revocation list), Pydantic constr/field_validator, CORS allowlist config, security headers middleware (CSP/HSTS)
- `cs-fundamentals/database-transactions.md` — ACID properties, isolation level table (5 levels, 4 anomalies), PostgreSQL isolation in SQLAlchemy, pessimistic (SELECT FOR UPDATE) vs optimistic (version_id_col + StaleDataError retry), deadlock prevention (consistent lock ordering), savepoints for partial rollback, connection pool tuning
- `cs-fundamentals/cli-tooling.md` — Click vs Typer vs argparse comparison, full Typer CLI (sub-apps/Annotated options/JSON output), Click advanced (context/custom ParamType), Rich (Table/Progress/Panel/Syntax/Tree), config file + env var precedence (pydantic BaseSettings), Typer CliRunner testing

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all link to new pages.

Index updated: 237 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 16 new pages across all 5 brains (Phase 6)

Continued the 5-brain expansion. Total vault now 253 pages.

**Cloud Brain — 3 new pages:**
- `cloud/lambda-powertools.md` — Logger (inject_lambda_context, correlation ID, EMF JSON output), Tracer (capture_lambda_handler/capture_method, annotations/metadata, subsegments), Metrics (log_metrics, MetricUnit, add_dimension), Idempotency (DynamoDBPersistenceLayer, @idempotent decorator, jmespath event_key), Batch (BatchProcessor/process_partial_response for SQS partial failure), Parser (event_parser with SqsModel)
- `cloud/security-compliance.md` — Security Hub CDK managed rules, Config custom Lambda evaluator (evaluate_compliance + put_evaluations) + managed rules (S3PublicAccess/RDSEncryption/CloudTrailEnabled/RootMFA), GuardDuty CDK (S3/K8s/MalwareProtection data sources), EventBridge GuardDuty finding pattern, Inspector v2 critical CVE list_findings, WAF CDK WebACL (RateBasedStatement 2000/5min + AWSManagedRulesKnownBadInputs + CfnWebACLAssociation to ALB)
- `cloud/load-balancing-advanced.md` — ALB vs NLB comparison table (layer/routing/target types/use cases), CDK listener with path-based routing priorities + weighted target groups (90/10 canary), health check config + FastAPI /health/ready endpoint, sticky sessions (duration-based + app cookie), Global Accelerator CDK (2-region ALB endpoints, Anycast IPs), connection draining deregistration_delay guidance

**QA Brain — 4 new pages:**
- `qa/root-cause-analysis.md` — 5-whys walkthrough (cart abandonment → expired API key → no monitoring), fishbone diagram (Technology/Process/People/Environment branches), full post-mortem template (timeline/impact/root-cause/contributing-factors/what-went-well/action-items/lessons-learned), DefectEscape dataclass + calculate_escape_rate(), prevention loop per root cause type
- `qa/negative-testing.md` — 7 test categories (invalid input/boundary/business rules/state machine/not-found/dependency failure/concurrency), parametrize INVALID_QUANTITIES, missing required fields test, error response quality assertions (no stack trace leakage, structured error format), respx dependency failure simulation (timeout/500/malformed), state-transition INVALID_TRANSITIONS parametrize, concurrent stock decrement consistency test
- `qa/pair-testing.md` — 5 pair formats (Driver/Observer, Dev+QA, QA+QA adversarial, QA+PO, QA+user/customer), session structure (charter/roles/notes/debrief), markdown session template with bug log, when to use/not use pair testing table, Dev+QA protocol with anti-patterns, rotating pairs cadence
- `qa/qa-leadership.md` — 5-level QA maturity model (Level 1 Reactive → Level 5 Optimising), QA strategy template (goal/activities/tools/metrics/roadmap), leadership metrics table (defect escape rate/detection stage/automation ROI/MTTD/flaky rate/sprint velocity), audience-specific communication (PO/EM/CTO/developers), 3-level quality gate framework (pre-commit/PR/release), hiring signals + red flags, QA roadmap markdown template (Q2/Q3 with success metrics)

**Technical QA Brain — 3 new pages:**
- `technical-qa/browser-automation-patterns.md` — Session-scoped auth state (API login + storage_state file reuse), network interception (route handler pattern + request recording list), waiting strategies (expect_response/expect_request/wait_for_url), infinite scroll loader, drag_to for drag-and-drop, file download path check, file upload set_input_files, iframe frame_locator, multi-tab context.expect_page, axe accessibility assertions per page
- `technical-qa/test-reporting-dashboards.md` — Allure with pytest (--alluredir, @allure.feature/story/severity/step decorators, allure.attach screenshot on failure), CI YAML (allure artifact + JUnit publish-unit-test-result + PR comment with pass rate), Slack webhook with JUnit XML minidom parsing, FlakyTracker pytest plugin (pytest_runtest_logreport hook + pass rate calculation), dashboard metrics table (what each metric answers)
- `technical-qa/api-performance-testing.md` — Latency percentiles (p50/p90/p95/p99/p999) and why average is misleading, throughput (RPS/saturation point), error rate targets, resource utilisation under load, k6 multi-stage test (ramp-up/steady/stress/ramp-down, tagged thresholds, custom Trend/Rate/Counter metrics), Python asyncio+httpx baseline benchmark (200 iterations, semaphore concurrency limiting), regression detection pytest (25% threshold multiplier, parametrize endpoints×percentiles), SLO validation function

**SE Brain — 6 new pages:**
- `cs-fundamentals/streaming-patterns.md` — SSE vs WebSocket vs long polling decision table, FastAPI SSE (EventSourceResponse / event_generator with asyncio.sleep), LLM streaming passthrough to browser (Anthropic stream → SSE), aiofiles large file streaming, asyncio.Queue backpressure (maxsize), RateLimitedStream, chunked transfer encoding, httpx AsyncClient streaming test
- `cs-fundamentals/feature-flags.md` — Flag type taxonomy (release/experiment/operational/permission), env-driven in-process flags with FeatureFlags dataclass, Unleash client + custom CompanyStrategy, LaunchDarkly variation + evaluate_multivariate, 3 testing patterns (inject via constructor/mock the service/monkeypatch), consistent-hashing gradual rollout (MD5 % 100), flag lifecycle (experiment→permanent→tech-debt→removed)
- `cs-fundamentals/background-jobs.md` — When to use job queues vs BackgroundTasks, FastAPI BackgroundTasks (fire-and-forget pattern), Celery app config (task_acks_late/reject_on_worker_lost/worker_prefetch_multiplier=1), task with auto-retry + exponential backoff + jitter (max_retries=3), arq WorkerSettings + enqueue_job, DLQ pattern on exhausted retries (failed_payments_queue), Flower monitoring, Redis queue length health check
- `cs-fundamentals/data-validation.md` — Pydantic v2 ConfigDict (strict=True/extra=forbid), CreateOrderRequest with UUID/conint/Decimal/pattern validators, field_validator (password strength with regex + error messages, adult age >= 18), model_validator (passwords_match cross-field), AliasPath nested JSON field mapping, AliasChoices (camelCase/snake_case), computed_field properties, external API model with extra="ignore", pydantic_settings BaseSettings with env_prefix
- `cs-fundamentals/python-async-patterns.md` — asyncio.TaskGroup (Python 3.11+, structured concurrency), asyncio.timeout context manager, asyncio.wait_for compat, Semaphore concurrency limiting, RateLimiter class (calls_per_second, asyncio.Lock), CancelledError handling (always re-raise, cleanup in except), asyncio.shield for critical-path cleanup, async generators with finally cleanup, @asynccontextmanager, in-process AsyncEventBus (Queue + subscribers dict)
- `cs-fundamentals/python-packaging.md` — uv commands (init/add --dev/sync/lock/run/uvx), full pyproject.toml (hatchling build-system, project metadata, optional-dependencies, scripts, urls, hatch.version, ruff/mypy/pytest/coverage sections), semantic versioning rules + conventional commits mapping, Trusted Publishers OIDC workflow (id-token write, no static PyPI secrets, tag version verification), uv workspaces monorepo (workspace members, local sibling resolution), src-layout vs flat layout with benefits

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all link to new pages.

Index updated: 253 pages, 27 categories.

## [2026-05-01] research | Mass expansion — 17 new pages across all 5 brains (Phase 7)

Continued the 5-brain expansion. Total vault now 270 pages.

**SE Brain — 5 new pages:**
- `cs-fundamentals/cqrs-event-sourcing.md` — CQRS command handler + query service, event store (append with optimistic concurrency, load), OrderAggregate reconstitute from events, snapshots (threshold-based partial replay), event-driven projections for denormalised read models
- `cs-fundamentals/dependency-injection.md` — DI vs tight coupling, Protocol-based interfaces (structural typing), composition root, FastAPI Depends (function/scoped/singleton lifetimes), dependency_overrides for tests, lagom DI container, anti-patterns (Service Locator, over-injection, injecting the container itself)
- `cs-fundamentals/logging-best-practices.md` — Log level guide (DEBUG/INFO/WARNING/ERROR/CRITICAL), structlog configuration (contextvars, JSONRenderer), correlation ID middleware (X-Correlation-ID + contextvars auto-bind), PII scrubbing processor (regex for card/email/SSN/token), CloudWatch Insights + Loki LogQL patterns, what not to log
- `cs-fundamentals/error-handling-patterns.md` — Exception hierarchy design (AppError base, domain subclasses), FastAPI exception handlers per type (status code mapping, no internal detail leakage), Result type pattern (Ok/Err generic, match statement), error propagation rules, retry with exponential backoff + jitter decorator, test patterns for error scenarios
- `cs-fundamentals/type-annotations.md` — Core annotations, TypeVar + Generic class, Protocol structural subtyping + runtime_checkable, TypedDict + NotRequired, Literal + Final + overload, ParamSpec for decorators preserving signatures, mypy strict configuration

**Cloud Brain — 4 new pages:**
- `cloud/aws-eks.md` — EKS vs self-managed, CDK cluster + managed node groups + Fargate profiles, IRSA CDK setup (ServiceAccountPrincipal), managed addons (VPC CNI/EBS CSI/CoreDNS), eksctl cluster.yaml + scale + upgrade, Cluster Autoscaler Helm
- `cloud/cloud-migration.md` — The 6 Rs (Retire/Retain/Rehost/Replatform/Repurchase/Re-architect), decision matrix, wave planning 0-4 structure, AWS Migration Hub CLI task lifecycle, DMS full-load+CDC migration pattern, zero-downtime cutover runbook with rollback procedure
- `cloud/aws-sagemaker.md` — SageMaker vs vLLM for LLMs, HuggingFace endpoint deploy, target tracking autoscaling (invocations/instance), batch transform (async polling), model registry + A/B traffic split, when to choose ECS/vLLM instead
- `cloud/vpc-design-patterns.md` — 3-tier VPC CIDR allocation, CDK ProductionVPC (per-AZ NAT, flow logs, isolated data subnets), security groups vs NACLs (stateful/stateless), SG chain (ALB→app→RDS), VPC endpoints (S3 gateway/Secrets Manager interface/ECR for Fargate), Transit Gateway multi-account routing table isolation, NAT Gateway cost optimisation

**QA Brain — 4 new pages:**
- `qa/test-documentation.md` — Documentation that earns its existence, test case template (preconditions/steps/expected/actual), when to write vs skip, traceability matrix, test summary report template (executive summary/defect table/risk assessment), exploratory test charter format
- `qa/automation-debt.md` — Debt signal table (slow CI/flaky/coupled tests/no-assertion tests), inventory scripts (duplicate selector finder, no-assertion test detector), debt quadrant (impact × effort priority), Page Object extraction pattern, quarantine strategy with --run-flaky, debt reduction roadmap template
- `qa/defect-clustering.md` — Pareto 80/20 in defects, defect density map (git blame + Jira fix commits), hotspot matrix (defect history × change frequency), DefectCategory enum + pattern analysis (escape rate by category), complexity-churn risk score, using hotspot data in sprint planning and stakeholder reporting
- `qa/risk-based-test-selection.md` — Selection strategies comparison (file/module/historical/risk-tier/all), git diff → test file mapping script, pytest-testmon (dependency tracking), 3-tier suite structure (< 3min / < 15min / < 60min), historical failure correlation map builder, making selection decisions visible in PR comments

**Technical QA Brain — 4 new pages:**
- `technical-qa/postman-newman.md` — Collection folder hierarchy, environment JSON files, pre-request script (auto-token refresh with expiry), test scripts (status/schema/chaining/latency/headers), Newman CLI (--bail/timeout/folder), CI YAML with htmlextra report, when to convert to pytest
- `technical-qa/api-testing-advanced.md` — Contract-first workflow, Schemathesis auto-generated tests from OpenAPI + pytest plugin, schema drift detection CI script (jsonschema validate), Hypothesis fuzz testing (never-500 property + injection payloads), API versioning parametrize tests (v1/v2), error response quality assertions (no internal detail leakage)
- `technical-qa/test-observability.md` — Why observability beats "tests are passing", test_runs/test_results PostgreSQL schema, pytest plugin (TestResultRecorder → asyncpg flush), flakiness detection SQL + duration trend + slowest tests queries, Datadog CI Visibility GitHub Actions setup, Grafana dashboard structure + alert rules
- `technical-qa/selenium-grid.md` — Grid 4 architecture (Router/Hub/Node), standalone jar, Docker Compose grid with per-browser replicas, pytest Remote WebDriver fixture (parametrize chrome/firefox), CI with GitHub Actions service containers, Grid vs Playwright decision guide

**Hub pages updated:** cloud-hub, qa-hub, tqa-hub, se-hub — all link to new pages.

Index updated: 270 pages, 27 categories.

## [2026-05-01] lint | Broken link audit + Python brain expansion

**Broken links fixed (5 total):**
- `cs-fundamentals/clean-code.md` — `[[cs-fundamentals/refactoring]]` → `[[cs-fundamentals/software-design-principles]]`
- `cs-fundamentals/concurrency.md`, `database-design.md`, `design-patterns.md` — `[[python/python-ecosystem]]` → `[[python/ecosystem]]`
- `qa/mobile-testing.md` — `[[technical-qa/appium]]` → `[[technical-qa/browser-automation-patterns]]`
- Deleted stray empty file `Nexus/python/python-ecosystem.md` and its empty parent folder

**Lint and gap report run** — zero orphan pages; 15 missing cross-refs flagged; 10 concept gaps (Deepgram, ElevenLabs, RAGAS, Langfuse, Arize etc.); 8 suspect [unverified] claims logged.

**Python Brain expanded — 3 new pages:**
- `wiki/python/python-hub.md` — Central hub linking all python pages + cross-refs to SE brain Python-focused deep-dives
- `wiki/python/sqlalchemy.md` — SQLAlchemy 2.0 async: Mapped[T] + mapped_column, AsyncSession, selectinload vs joinedload, connection pool tuning, FastAPI dependency pattern, test session override
- `wiki/python/polars-duckdb.md` — Polars lazy API (scan_parquet, sink_parquet, expression API, window functions, joins, I/O); DuckDB in-process SQL on Parquet/CSV; Polars↔DuckDB integration; AI data use cases (eval analysis, token cost, JSONL parsing)

Index updated: 273 pages, 27 categories.

## [2026-05-01] research | Papers brain + math brain + missing tools — 17 new pages

Filled the three major gaps identified in the vault audit.

**Papers brain — 10 new pages (was 2):**
- `papers/gpt-3.md` — Brown 2020: in-context learning, few-shot emergence, decoder-only lineage, limitations (no instruction-tuning, context-bound)
- `papers/scaling-laws.md` — Kaplan 2020 (power laws, model > data) + Chinchilla 2022 correction (20 tokens/param rule, intentional overtraining for inference)
- `papers/rlhf.md` — Stiennon 2020 (first large-scale RLHF, 3-stage pipeline) + InstructGPT 2022 (1.3B > 175B GPT-3, alignment tax is small)
- `papers/constitutional-ai.md` — Bai 2022: SL-CAI (critique-revise) + RLAIF (AI preference labels); how Claude is trained; explicit constitution
- `papers/chain-of-thought.md` — Wei 2022: intermediate reasoning steps; scale threshold ~100B params; zero-shot "Let's think step by step"; limits (hallucinated reasoning)
- `papers/react.md` — Yao 2022: Thought→Action→Observation loop; interleaves reasoning with tool use; foundation of every agent framework
- `papers/lora.md` — Hu 2021: ΔW=BA low-rank decomposition; 10,000× fewer trainable params; zero inference latency; rank selection guide
- `papers/dpo.md` — Rafailov 2023: eliminates reward model + PPO; Bradley-Terry derivation; DPO loss formula; vs RLHF comparison; variants (IPO/KTO/ORPO)
- `papers/swe-bench.md` — Jimenez 2024: 2,294 real GitHub issues; test-suite oracle; SWE-agent agent scaffold; progress from 4.8% (Claude 2) to 62% (Claude 3.7)
- `papers/mechanistic-interpretability.md` — Circuits (2020) → Superposition hypothesis (2022, SAE theory) → Monosemanticity (2023, 1-layer model) → Scaling Monosemanticity (2024, 34M features on Claude 3 Sonnet)

**Math brain — 3 new pages:**
- `math/backpropagation.md` — Chain rule, vanishing/exploding gradients, residual connection gradient highway, Pre-LN vs Post-LN, He/Xavier init, AdamW update rules, gradient clipping
- `math/information-theory.md` — Entropy, cross-entropy (LLM loss), KL divergence (RLHF/DPO penalty), forward vs reverse KL, perplexity interpretation, mutual information for RAG, temperature/softmax
- `math/numerical-precision.md` — fp32/fp16/bf16/fp8/int8/int4 format comparison; mixed precision AMP; int8 GPTQ/AWQ; QLoRA NF4; H100 fp8 training; decision guide by scenario

**Missing tool pages — 4 new pages:**
- `observability/langfuse.md` — MIT, ClickHouse acquisition; @observe decorator; manual tracing; LLM-as-judge eval; prompt management; FastAPI integration; self-hosted Docker
- `observability/arize.md` — Phoenix (Apache 2.0, $70M Series C); OTel native; embedding UMAP visualisation; eval framework; Phoenix vs Langfuse comparison
- `rag/ragas.md` — Faithfulness/Answer Relevancy/Context Precision/Context Recall; LLM-as-judge; production thresholds; CI regression testing pattern
- `infra/weaviate.md` — Hybrid search (BM25+dense, alpha=0.75); multi-tenancy; v4 Python client; Weaviate Cloud; vs pgvector/Pinecone/Qdrant comparison

Index updated: 290 pages, 27 categories.

## [2026-05-02] lint | Sprint lint — 294 pages, graph stale, 4 missing from index

Vault is at 294 pages (4 added since last index update not yet catalogued). Structural issues found:

**Structural (5 issues):**
- `graph-health.md` severely stale — last audit covered 87 pages; vault now 294. Score 97/100 is invalid. Updated with staleness notice; full rebuild needed.
- 4 pages from last commit not yet in `index.md`: multimodal/document-processing, multimodal/video, multimodal/image-generation, safety/red-teaming-methodology
- ~183 pages missing `## Open Questions` section (107/290+ have it) — concentrated in cloud/, cs-fundamentals/, qa/, technical-qa/
- ~164 pages missing `tldr:` frontmatter (126/290+ have it) — same distribution
- `gap-report.md` stale: lists python-basics, instructor, langchain, guardrails as MISSING but they exist

**Under-linked pages (4 new):**
- multimodal/document-processing (1 inbound), multimodal/video (1), multimodal/image-generation (2), safety/red-teaming-methodology (1)

**Active [unverified] claims (18 files — all recent, none stale > 60 days):**
- Concentrated in landscape/ (AI lab valuations, GPT-5 rumour, Gemini 3), rag/pipeline (69% accuracy stat), protocols/ (MCP CVE counts)

**No contradictions found** in sampled pages. 512-token default consistent across rag/chunking and rag/pipeline.

## [2026-05-02] lint | Gap Intelligence — 2 content gaps, 7 index gaps found

gap-report.md updated to v4. Both active projects (evalcheck, mcpindex) have adequate wiki coverage. No critical blocks.

2 genuine content gaps remain: `cs-fundamentals/nosql-databases` and `cs-fundamentals/cicd-pipelines`. Prior gaps from v3 now resolved via technical-qa/qa expansion (load-testing, testing-at-scale, guardrails, langchain, instructor).

7 pages exist but are absent from index.md: multimodal/document-processing, multimodal/video, multimodal/image-generation, safety/red-teaming-methodology, llms/ae-hub, data/datasets, fine-tuning/rlhf-dpo.

## [2026-05-02] research | Gap Intelligence — 0 critical gaps, 2 concept gaps, 7 index gaps
gap-report.md updated to v5. Both active projects fully covered. 5 sprint gaps resolved: nosql-databases, cicd-pipelines, annotation-tooling, aws-bedrock, mcp-server-development. 7 index maintenance gaps remain (files exist, not indexed). 2 concept gaps: LiteLLM, Strands Agents SDK.

## [2026-05-02] research | Sprint — 5 pages added, 5 gaps resolved
- Added: [[cs-fundamentals/nosql-databases]], [[cs-fundamentals/cicd-pipelines]], [[data/annotation-tooling]], [[apis/aws-bedrock]], [[protocols/mcp-server-development]]
- Indexed (previously unindexed): [[multimodal/document-processing]], [[multimodal/image-generation]], [[multimodal/video]], [[safety/red-teaming-methodology]], [[data/datasets]]
- Resolved gaps: nosql-databases, cicd-pipelines, annotation-tooling, aws-bedrock, mcp-server-development
- Remaining top gaps: LiteLLM (concept gap), Strands Agents SDK (concept gap), 2 index stubs (llms/ae-hub, fine-tuning/rlhf-dpo review)

## [2026-05-02] lint | Vault audit — 134 broken links, 0 semantic duplicates, 197 frontmatter fixes
Full vault audit run. Rule-based: 134 broken links (90% from 4 missing hub pages: cloud-hub, se-hub, qa-hub, tqa-hub), 167 frontmatter issues. Semantic: 3 flagged duplicate pairs all confirmed complementary (grpc: cs-fundamentals vs java; constitutional-ai: papers vs safety; mechanistic-interpretability: papers vs safety). Accuracy: 1 minor [unverified] gap in strands-agents-sdk. Frontmatter: 197 pages patched with tldr values (auto-extracted from first paragraph or one-sentence field). Audit report at [[synthesis/audit-report]].

## [2026-05-02] ingest | 3 execution-layer pages — request flow anatomy, debugging systems, engineering tradeoffs
- Added [[synthesis/request-flow-anatomy]] — full request chain from user to DB, latency at each layer, failure modes, where retries apply
- Added [[cs-fundamentals/debugging-systems]] — debugging as a first-class skill: correlation IDs, distributed tracing, systematic elimination, incident workflow
- Added [[synthesis/engineering-tradeoffs]] — cache vs recompute, RAG vs fine-tuning, scale up/out, consistency vs availability, sync vs async, build vs buy, AI cost tradeoffs
- Updated [[wiki/index]] — 306 → 309 pages
- Updated learning paths: Production Thinking bundle added (threads new pages with existing observability, error handling, distributed systems)

## [2026-05-02] ingest | 3 more execution-layer pages — OS internals, data-as-system, technical communication
- Added [[cs-fundamentals/os-internals]] — processes vs threads, virtual memory, OOM kills, CPU scheduling, file descriptors
- Added [[synthesis/data-as-system]] — lineage, contracts, freshness SLAs, ownership, dual-write problem, CDC, ETL failure modes
- Added [[synthesis/technical-communication]] — ADRs, RFCs, postmortems, stakeholder translation, code review communication
- Updated [[wiki/index]] — 309 → 312 pages

## [2026-05-02] lint | Gap intelligence refresh — JavaScript/TypeScript flagged as critical gap, index patched (5 pages), Gist updated

## [2026-05-02] research | JavaScript/TypeScript section — 5 pages written covering async, types, npm, Node.js runtime, AI SDK patterns
- Added: [[javascript/javascript-hub]], [[javascript/typescript-fundamentals]], [[javascript/nodejs-async]], [[javascript/npm-pnpm-ecosystem]], [[javascript/ai-sdk-patterns]]

## [2026-05-03] research | Sprint — 5 pages added, 5 gaps resolved, Axiom layout widened

- Added: [[agents/google-adk]], [[ai-tools/aider]], [[safety/scalable-oversight]], [[cloud/bedrock-agentcore]], [[web-frameworks/django-drf]]
- Resolved gaps: google-adk, aider, scalable-oversight, bedrock-agentcore, django-drf (broken wikilink)
- Cross-links added: protocols/a2a, strands-agents-sdk, alignment, cursor-copilot
- Axiom: app/page.tsx max-w-5xl → max-w-7xl; [category]/page.tsx max-w-6xl → max-w-7xl
- Deployment held — user to trigger manually
- Sources: WebSearch (Perplexity unavailable)

## [2026-05-03] research | Sprint — 5 pages added: google-adk, aider, scalable-oversight, bedrock-agentcore, django-drf

- Added: [[agents/google-adk]], [[ai-tools/aider]], [[safety/scalable-oversight]], [[cloud/bedrock-agentcore]], [[web-frameworks/django-drf]]
- Resolved gaps: google-adk (agents/ category), aider (ai-tools/ category), scalable-oversight (safety/ category), bedrock-agentcore (cloud/ category), django-drf (broken wikilink from debug-cors-error)
- Cross-links added: protocols/a2a → google-adk; strands-agents-sdk → bedrock-agentcore; alignment → scalable-oversight; cursor-copilot → aider
- Sources: WebSearch (Perplexity unavailable)

## [2026-05-03] lint | Gap intelligence refresh — 2 critical gaps (django-drf, google-adk), 3 concept gaps (aider, scalable-oversight, bedrock-agentcore)

## [2026-05-03] lint | Structural audit — 248 pages missing Open Questions, graph stale at 378 pages, 0 stale unverified claims

Punch list:
- **## Open Questions missing (248 pages)**: Entire cloud/, cs-fundamentals/, qa/, technical-qa/ categories added in mass expansion without this section. Most critical: cloud/terraform, cloud/kubernetes, cs-fundamentals/se-hub, qa/qa-hub.
- **## Connections missing (6 hub pages)**: cloud-hub, se-hub, javascript-hub, ae-hub, qa-hub, tqa-hub — hub pages are navigation roots; Connections section would be redundant.
- **Graph health STALE**: graph-health.md last audited 87 pages (2026-05-01, score 97/100). Vault now 378 pages. Full rebuild needed before score is valid again.
- **Stale [unverified] claims (0)**: All 20 pages with [unverified] tags have updated dates ≥ 2026-04-29, within the 60-day window.
- **Contradictions (0)**: rag/chunking.md and rag/pipeline.md consistent at 512-token default. No cross-page contradictions found in sampled content.
- **Data gap (1)**: papers/swe-bench.md line 80 — "Claude 4 / Code agents 70%+" marked [unverified] (updated 2026-05-01); current Claude Opus 4.6 score is 80.8% on SWE-bench Verified — page needs update.

## [2026-05-03] lint | Vault structural audit — 6 merges/moves, 6 deletions, practice page built

- Merged: [[cs-fundamentals/design-patterns]] → [[cs-fundamentals/oop-patterns]] (now covers all GoF patterns)
- Merged: [[cloud/cost-optimisation-cloud]] → [[cloud/finops-cost-management]] (S3, data transfer sections added)
- Merged: [[qa/exploratory-testing-advanced]] → [[qa/exploratory-testing]] (cognitive biases, pair exploration, templates added)
- Moved: [[agents/mcp-server-development]] → [[protocols/mcp-server-development]]
- Moved: [[rag/ragas]] → [[evals/ragas]]
- Moved: [[infra/github-apps]] → [[protocols/github-apps]]
- Archived: [[infra/github-marketplace]] (evalcheck-specific, not general AI engineering reference)
- Wikilinks updated across ~20 pages for all moves/merges
- Page count: 317 → 314
- Axiom: practice page (/practice) added with 30 exercises across 6 role paths; Nav Lab link added

## [2026-05-03] lint | Gap Intelligence — pre-commit scan: 2 stale index entries fixed, 5 gaps ranked

- Fixed stale index entries: [[cloud/cost-optimisation-cloud]] and [[qa/exploratory-testing-advanced]] (deleted pages still listed)
- Page count corrected: 314 → 312
- Top gaps: synthesis/debugging-runbooks hub (32 orphans), apis/openai-responses-api (not covered), papers/toolformer, papers/gpt-4-technical-report, ai-tools/continue

## [2026-05-03] ingest | 2 pages added: debugging-runbooks hub + OpenAI Responses API

- Added: [[synthesis/debugging-runbooks]] — hub page indexing all 32 orphan debug runbooks by failure domain; fixes 32 broken inbound links in one step
- Added: [[apis/openai-responses-api]] — stateful successor to Chat Completions; previous_response_id, built-in tools (web_search/file_search/code_interpreter/MCP), Assistants API deprecated Aug 2025
- Source: OpenAI developers.openai.com/blog/responses-api (WebSearch 2026-05-03)
- Updated index.md: page count 312 → 314

## [2026-05-03] ingest | 3 pages added: toolformer, gpt-4-technical-report, ai-tools/continue

- Added: [[papers/toolformer]] — Schick et al. (Meta, NeurIPS 2023): self-supervised API call learning via perplexity-reduction filtering; proved tool use is learnable not just promptable; conceptual predecessor to function calling, MCP, ReAct
- Added: [[papers/gpt-4-technical-report]] — OpenAI March 2023: bar exam ~90th percentile, MMLU 86.4%, HumanEval 67%; RLHF improves behaviour not capability; System Card format first major frontier lab structured risk assessment; architecture opacity as competitive norm
- Added: [[ai-tools/continue]] — open-source Apache 2.0 VS Code/JetBrains extension; model-agnostic via config.json; 10-provider context system (@codebase embeddings, @docs indexing, @diff, @web, @terminal); comparison matrix vs Cursor/Copilot/Claude Code/Aider
- Updated index.md: page count 314 → 317
- Updated synthesis/gap-report.md: all 5 identified gaps resolved; no remaining critical gaps

## [2026-05-03] ingest | New pages: ai-tools/cline, papers/llama, papers/llama-2
- [[ai-tools/cline]] — Cline: open-source autonomous VS Code agent
- [[papers/llama]] — LLaMA (Touvron et al. 2023): open-weight foundation models
- [[papers/llama-2]] — Llama 2 (Touvron et al. 2023): RLHF chat models with commercial licence

## [2026-05-03] lint | Graph Health rebuild — 377 pages, score 100/100, 1 orphan (cline), 111 hubs

## [2026-05-03] lint | Vault audit — 2 broken links, 0 semantic duplicates, 32 runbooks not indexed, 1 accuracy issue (llama-2 GPU claim)

## [2026-05-03] lint | Gap Intelligence — 0 critical gaps, 3 concept gaps found

## [2026-05-03] research | RFC 7591 Dynamic Client Registration — registration endpoint, MCP OAuth self-registration, security testing

## [2026-05-03] research | OAuth Server Metadata (RFC 8414) — discovery endpoint, MCP OAuth integration, PKCE

## [2026-05-03] research | Mistral 7B + Mixtral 8x7B papers -- SWA, GQA, sparse MoE architecture and benchmarks

## [2026-05-03] research | DeepSeek R1/R2 — entity page written, GRPO training approach, benchmark performance vs o1

## [2026-05-03] lint | Gap Intelligence -- 0 critical gaps, 2 concept gaps found (RFC 7591, MLA)

## [2026-05-03] research | Multi-head Latent Attention (MLA) -- DeepSeek low-rank KV cache compression, V2/V3/R1 usage

## [2026-05-03] ingest | gitops-quality-gates — GitOps pipeline quality gates, ArgoCD, Flux, progressive delivery

## [2026-05-03] ingest | 9 new pages -- computer-use, pydantic-ai, model-routing, reasoning-model-patterns, openai-codex, mastra, bfcl, structured-outputs, voice-agents

## [2026-05-03] ingest | 14-page batch -- agent-memory-systems, llm-red-teaming-tools, small-language-models, inference-time-scaling, eu-ai-act, ai-gateway, mlops-pipelines, iso42001, inference-platforms, llmops, process-improvement-model (new); benchmarks, caching, experiment-tracking (updated)

## [2026-05-03] research | AWS CLF-C02 + AIF-C01 study guides -- full exam-domain coverage for both AWS Foundation certs (Cloud Practitioner + AI Practitioner)

## [2026-05-03] ingest | performance-test-reporting — new QA page covering run report structure, NFR pass/fail tables, p95/p99 framing by audience, trend analysis, interim/final report formats, go/no-go sign-off pack, defect reporting fields for performance cycles

## [2026-05-03] ingest | threat-modelling — new security page covering STRIDE with concrete examples per category, DREAD scoring, PASTA methodology, workshop facilitation (who to invite, DFD creation, trust boundaries, walking the attack surface), STRIDE-to-OWASP mapping, threats-to-test-cases derivation, MITRE ATT&CK basics, API/microservice-specific threats, threat register format, tooling (Threat Dragon, MS TMT, IriusRisk)

## [2026-05-03] ingest | owasp-wstg — new security page covering WSTG v4.2 methodology: 12 test categories (INFO through APIT), test ID scheme (WSTG-AUTHN-01 etc.), WSTG vs OWASP Top 10 distinction, grey-box scoping process, passive vs active testing, ZAP + Burp Suite integration, CVSS v3.1 scoring, finding documentation standard, and deliverable structure for a security test report

## [2026-05-03] ingest | UAT Governance

Created wiki/qa/uat-governance.md — governance layer for UAT: entry/exit criteria, kick-off and close-out briefings, scope dispute resolution, defect triage with business owners, severity classification, sign-off documentation, sign-off refusal handling, agile vs waterfall governance, managing business users who misunderstand UAT.
Updated wiki/index.md.
Mirrored to axiom/content/wiki/qa/uat-governance.md.

## [2026-05-03] ingest | Self-Healing Test Frameworks

Created wiki/technical-qa/self-healing-tests.md — full landscape for clients with legacy Selenium suites: Healenium (tree-edit-distance algorithm, SelfHealingDriver wrapper, Docker backend, healing reports, Java setup), Playwright Healer Agent v1.56 (GitHub PR auto-fix, 75% success rate, config), Mabl (cloud ML multi-signal healing, visual healing), testRigor (plain English authoring, no selectors), Applitools visual AI (Layout match level, Selenium SDK), decision framework (Playwright migration vs Healenium wrapper with migration cost estimates), when self-healing is not the answer (flake root cause taxonomy, prioritised remediation order), ROI calculation template, client presentation guide for 3000-test 40%-flaky suites, limitations summary, tool comparison matrix.
Updated wiki/index.md.
Mirrored to axiom/content/wiki/technical-qa/self-healing-tests.md.

## [2026-05-03] ingest | test-estimation — new QA page covering three-point PERT with worked examples, T-shirt sizing, analogy-based estimation, UCP; activity breakdown (test writing/execution/retesting/regression/automation separately); estimation in agile (story points, velocity tracking); common biases and counters; context-switch tax for concurrent streams; capacity model (headcount × days × utilisation); new-client ramp-up model (40% week 1 → 100% week 4); tracking estimate vs actuals; presenting ranges to clients; scope creep playbook (Type 1/2/3); re-baselining process with worked delta calculation.
Updated wiki/index.md.
Mirrored to axiom/content/wiki/qa/test-estimation.md.

## [2026-05-03] ingest | Release Sign-Off and Go/No-Go Governance

Created wiki/qa/release-sign-off.md — RACI for release decisions, entry/exit criteria design, measurable exit criteria templates (specific thresholds not vague pass/fail language), release readiness report format, known-defect risk documentation with P1-P4 severity thresholds, emergency release checklist, rollback trigger criteria (auto and manual), communicating no-go to senior stakeholders, managing override pressure with written documentation, CI/CD vs waterfall sign-off models, quality gates vs leading/lagging metrics, production monitoring as the final gate, example exit criteria tables for web app and API releases.
Updated wiki/qa/qa-hub.md with Release Governance section.
Mirrored both to axiom/content/wiki/qa/.

## [2026-05-03] ingest | ai-test-generation — AI-assisted test generation, Claude Code, Copilot, prompt patterns, quality review

Created wiki/ai-tools/ai-test-generation.md — comprehensive page covering: augmentation positioning, five use cases (unit/API/E2E/data/BVA), Claude Code workflow + CLAUDE.md convention enforcement, Copilot inline + /tests slash command, Cursor Composer, four prompt patterns (implementation+spec description, boundary case follow-up, factory-first, explicit framework declaration), quality review checklist (false positives, assertion quality, independence, hardcoded data, naming), four failure zones (complex business logic, stateful integration, performance, security boundaries), mutation testing with Stryker and mutmut, client ROI framing with metrics table, three risk categories (agreement with bugs, deskilling, maintenance burden), confidentiality guidance.
Updated wiki/index.md (ai-tools/ section).
Mirrored to axiom/content/wiki/ai-tools/ai-test-generation.md.

## [2026-05-03] ingest | websocket-testing — WebSocket functional and performance testing, Playwright, k6, SSE

## [2026-05-03] ingest | jmeter — Apache JMeter performance testing, test plan structure, CLI mode, CI integration

## [2026-05-03] ingest | datadog — Datadog unified observability platform, APM, synthetic testing, CI Visibility

Created wiki/observability/datadog.md — ~470-line page covering: unified observability platform (metrics/traces/logs/events), four metric types (gauge/count/rate/histogram), Datadog Agent and DogStatsD, APM setup (auto vs manual instrumentation, trace sampling, QA span tags), dashboards (timeboard vs screenboard, template variables, SLO widgets), monitors (metric, APM, composite, alert routing, downtime scheduling), synthetic monitoring (browser tests, multi-step API tests, CI/CD continuous testing with --tunnel), log management (facets, Grok pipelines, log-to-metrics, archives), SLO objects (metric-based, monitor-based, error budget, burn rate alerts), CI Visibility (flaky test detection, Test Impact Analysis, JUnit XML upload), integrations (Playwright reporter, k6 DogStatsD, REST Assured), practical QA use cases (correlating a performance test run with APM traces, finding bottlenecks during load tests), pricing model (host/custom metrics/log ingestion), and Grafana/Prometheus comparison.
Mirrored to axiom/content/wiki/observability/datadog.md.
Updated wiki/index.md (observability/ section).

## [2026-05-04] ingest | sql category — 3 new pages (window-functions, query-optimization, sql-for-ai); sql/ added to index as 28th category

## [2026-05-04] lint | Vault housekeeping — 11 missing pages created, 18 orphan pages linked

## [2026-05-04] ingest | sql expansion — 3 new pages + cs-fundamentals/sql moved to sql/sql-fundamentals

- Created `wiki/sql/sql-fundamentals.md` — full SQL reference moved from cs-fundamentals/sql.md; updated category to sql; added cross-links to new sql/ pages
- Created `wiki/sql/sqlalchemy-patterns.md` — async engine, session management, DeclarativeBase, SelectAPI, eager loading, Alembic migrations, bulk ops, common pitfalls
- Created `wiki/sql/postgresql-features.md` — JSONB (GIN index, containment queries), full-text search (tsvector, trgm), advanced index types, LATERAL joins, upsert, partitioning, pg_stat_statements, VACUUM, useful extensions
- Replaced `wiki/cs-fundamentals/sql.md` with redirect stub (para: archive)
- Updated wiki/index.md: 346 → 349 pages; sql/ section expanded from 3 to 6 pages

## [2026-05-04] lint | Gap resolution — 5 stubs created, 1 broken link fixed, 19 orphans linked

- Created `wiki/infra/pgvector.md` — PostgreSQL vector extension; operators, IVFFlat/HNSW indexing, SQLAlchemy integration, hybrid search
- Created `wiki/safety/alignment-overview.md` — alignment hub; RLHF, CAI, DPO, scalable oversight, open problems, lab comparison
- Created `wiki/infra/aws-bedrock-agentcore.md` — AWS managed agent runtime; memory, tool execution, observability, when to use vs self-hosted
- Created `wiki/python/async.md` — asyncio, async generators, concurrent LLM calls, Semaphore rate limiting, FastAPI integration
- Created `wiki/data/data-engineering-hub.md` — data engineering hub; orchestration (Airflow, Prefect, dbt), storage patterns, AI-specific quality checks
- Fixed `[[Testcontainers]]` → `[[testcontainers]]` in wiki/technical-qa/docker-ci-testing.md (case sensitivity)
- Added 19 orphan page links across 7 hub pages: ae-hub.md (9 links), se-hub.md, infra/inference-serving.md, data/pipelines.md, landscape/regulation.md, qa/qa-hub.md (2 links), synthesis section

## [2026-05-04] ingest | Axiom practice exercises — code snippets added to 6 exercises

Added working code snippets to practice-data.ts steps across 6 exercises:
- `ai-engineer/rag-pipeline` — 6 steps: PyMuPDF chunking, sentence-transformers embedding, Chroma store/retrieve, Claude citation-aware answering
- `ai-engineer/llm-judge-eval` — 3 steps: judge prompt with XML tags and score parsing, per-case runner, aggregate reporting
- `ai-engineer/tool-use` — 6 steps: JSON Schema tool definitions, first turn, tool execution, tool_result, multi-step loop, error handling with is_error
- `ai-engineer/prompt-caching` — 4 steps: baseline measurement, cache_control block, hit/miss logging, cost calculation
- `ai-engineer/structured-outputs` — 4 steps: Pydantic model + schema inspection, extraction prompt with prefill, sample loop, retry with error message appended to conversation
- `sdet/streaming-endpoint-test` — 5 steps: Playwright route interception, SSE parser, response reconstruction, chunk + full response assertions, progressive UI rendering test
- `sdet/database-fixture-chain` — 5 steps: session-scoped engine, Alembic migration fixture, savepoint transaction rollback, realistic seed data, isolation verification tests
- `sdet/k6-load-test` — 5 steps: basic script with check+sleep, staged ramp profile, thresholds (p95/error-rate), summary reading guide, group-based bottleneck isolation

## [2026-05-04] lint | Gap Intelligence — 3 critical gaps, 3 concept gaps found

gap-report.md (run 4) written. Active projects: evalcheck (distribution phase), mcpindex (Weekend 2).

Critical gaps: GitHub Marketplace listing for GitHub Apps (blocks evalcheck), security scorecard methodology (blocks mcpindex), MCP Registry ecosystem page (blocks mcpindex distribution planning).

Concept gaps: DeepEval (mentioned in security/llm-red-teaming-tools), feature stores (mentioned in data/data-engineering-hub), model cards (implied by landscape/open-source-models and data/synthetic-data).

Index fix: safety/responsible-ai added to wiki/index.md (page existed on disk, missing from index).

## [2026-05-04] ingest | github-marketplace-apps — GitHub App Marketplace listing, submission workflow, free vs paid plan requirements, review process, evalcheck distribution context
## [2026-05-04] ingest | security-scorecard-methodology — OpenSSF Scorecard model, CVSS scoring, composite score design, category weighting, reproducibility requirements, mcpindex scorecard framework
## [2026-05-04] ingest | mcp-registry — AAIF/Linux Foundation governance, namespace-verified submission, metadata schema, discoverability, mcpindex distribution paths

## [2026-05-04] lint | Gap Intelligence — 0 critical gaps, 5 concept gaps found

## [2026-05-04] ingest | deepeval — DeepEval by Confident AI, G-Eval metric, 50+ built-in metrics, pytest CI gating, vs RAGAS/promptfoo
## [2026-05-04] ingest | feature-stores — Feast/Tecton/Hopsworks, online vs offline split, point-in-time correctness, LLM embedding use cases
## [2026-05-04] ingest | model-cards — Mitchell 2018 spec, HuggingFace Hub format, EU AI Act alignment, vs Anthropic system cards
## [2026-05-04] ingest | socket-dev — Socket.dev supply chain scanner, behavioral signal detection, 5 scoring categories, MCP package relevance
## [2026-05-04] ingest | snyk — Snyk Priority Score (0-1000), Risk Score ML layer, reachability analysis, mcpindex scorecard reference
## [2026-05-04] lint | Graphify — 464 pages, score 100/100, 0 orphans, 115 under-linked, 111 hubs
## [2026-05-04] lint | vault:lint run — 11 missing tldr:, 32 missing Connections, 5 new under-linked pages, 0 stale unverified, 0 orphans

## [2026-05-04] lint | Full fix pass — 11 tldr: added, 32 Connections added, 32 Open Questions added, 13 back-links wired, 0 issues remaining
