// lib/learning-paths.ts
// Client-safe — no fs/path imports.
import type { Brain } from "./constants";
import { BRAIN_MAP } from "./constants";

export type LearningStep = {
  category: keyof typeof BRAIN_MAP;
  slug: string;
  note?: string;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  brain: Brain;
  estimatedHours: number;
  steps: LearningStep[];
};

// Role-based learning paths — what to study to build a career in each discipline
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "ai-engineer",
    title: "AI Engineer",
    description:
      "Prompt engineering, RAG, agents, evals, and production operations. The full curriculum for building AI products that hold up under load.",
    brain: "ai-engineering",
    estimatedHours: 9,
    steps: [
      { category: "llms", slug: "claude", note: "Start with the model you will use most" },
      { category: "llms", slug: "tokenisation", note: "What the model actually sees — tokens, embeddings, context mechanics" },
      { category: "prompting", slug: "techniques" },
      { category: "rag", slug: "pipeline", note: "Retrieval-augmented generation end-to-end" },
      { category: "data", slug: "pipelines", note: "Ingestion, chunking, freshness, versioning — bad data kills RAG" },
      { category: "agents", slug: "langgraph", note: "Stateful agent loops" },
      { category: "evals", slug: "methodology", note: "The only way to know if it is actually working" },
      { category: "llms", slug: "hallucination", note: "Failure modes: confabulation patterns and how to detect them" },
      { category: "security", slug: "prompt-injection", note: "Failure modes: injection, data leakage, tool misuse" },
      { category: "observability", slug: "tracing", note: "Trace every prompt, tool call, and latency spike in production" },
      { category: "security", slug: "owasp-llm-top10", note: "The full threat surface for AI systems" },
      { category: "agents", slug: "mcp-server-development", note: "Build tool integrations" },
    ],
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description:
      "Clean code, design patterns, system design, databases, and APIs — plus the behaviour-under-stress topics most paths skip.",
    brain: "engineering",
    estimatedHours: 7,
    steps: [
      { category: "cs-fundamentals", slug: "se-hub" },
      { category: "cs-fundamentals", slug: "clean-code" },
      { category: "cs-fundamentals", slug: "design-patterns" },
      { category: "cs-fundamentals", slug: "system-design" },
      { category: "cs-fundamentals", slug: "database-design" },
      { category: "cs-fundamentals", slug: "api-design" },
      { category: "cs-fundamentals", slug: "tdd-se", note: "Test-driven development in practice" },
      { category: "cs-fundamentals", slug: "concurrency", note: "Threads, async, race conditions, locks — most production bugs live here" },
      { category: "cs-fundamentals", slug: "distributed-systems", note: "Retries, idempotency, eventual consistency" },
      { category: "cs-fundamentals", slug: "error-handling-patterns", note: "Timeouts, retries, circuit breakers — real backend engineering" },
      { category: "cs-fundamentals", slug: "performance-optimisation-se", note: "CPU vs IO, memory leaks, slow queries — measure, do not guess" },
      { category: "cs-fundamentals", slug: "debugging-systems", note: "Systematic debugging under pressure: correlation IDs, tracing across services, reproducing production bugs" },
    ],
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    description:
      "AWS, containers, Kubernetes, infrastructure as code, and the failure modes, networking, and cost engineering that senior roles require.",
    brain: "infrastructure",
    estimatedHours: 7,
    steps: [
      { category: "cloud", slug: "cloud-hub" },
      { category: "cloud", slug: "aws-core", note: "The essential AWS services" },
      { category: "cloud", slug: "docker", note: "Containers first" },
      { category: "cloud", slug: "kubernetes", note: "Orchestration at scale" },
      { category: "cloud", slug: "terraform", note: "Infrastructure as code" },
      { category: "cloud", slug: "cloud-security" },
      { category: "cloud", slug: "github-actions", note: "CI/CD pipelines" },
      { category: "cloud", slug: "cloud-networking", note: "VPC flow, DNS, request path from client to pod — most cloud issues are networking" },
      { category: "cloud", slug: "disaster-recovery", note: "What happens when a pod, node, or AZ fails — design for failure, not success" },
      { category: "cloud", slug: "observability-stack", note: "Metrics, logs, traces together — how to debug incidents" },
      { category: "cloud", slug: "finops-cost-management", note: "Right-sizing, scaling policies, waste detection" },
    ],
  },
  {
    id: "qa-engineer",
    title: "QA Engineer",
    description:
      "Test strategy, case design, exploratory testing, risk-based thinking, and quality in modern delivery pipelines.",
    brain: "engineering",
    estimatedHours: 6,
    steps: [
      { category: "qa", slug: "qa-hub" },
      { category: "qa", slug: "test-strategy" },
      { category: "qa", slug: "test-case-design" },
      { category: "qa", slug: "exploratory-testing" },
      { category: "qa", slug: "regression-testing" },
      { category: "qa", slug: "bug-lifecycle" },
      { category: "qa", slug: "qa-in-devops", note: "Quality in CI/CD pipelines" },
      { category: "qa", slug: "risk-based-testing", note: "Test what matters most — coverage that maps to business risk" },
      { category: "qa", slug: "test-data-management", note: "Most test failures come from bad data, not bad tests" },
      { category: "qa", slug: "non-functional-testing", note: "Performance, security, reliability awareness" },
      { category: "qa", slug: "defect-prevention", note: "Find defects before code exists — requirements and shift-left thinking" },
    ],
  },
  {
    id: "technical-qa-engineer",
    title: "Technical QA Engineer",
    description:
      "API testing, performance, test architecture, Playwright, and the distributed-systems debugging skills that separate senior engineers.",
    brain: "engineering",
    estimatedHours: 7,
    steps: [
      { category: "technical-qa", slug: "tqa-hub" },
      { category: "technical-qa", slug: "api-testing" },
      { category: "technical-qa", slug: "playwright-advanced" },
      { category: "technical-qa", slug: "performance-testing" },
      { category: "technical-qa", slug: "test-architecture" },
      { category: "technical-qa", slug: "ci-cd-quality-gates", note: "Block broken code automatically" },
      { category: "technical-qa", slug: "flaky-test-management" },
      { category: "technical-qa", slug: "contract-testing", note: "Schema validation between services — catch integration breaks early" },
      { category: "technical-qa", slug: "test-observability", note: "Read logs, metrics, and traces as a tester" },
      { category: "qa", slug: "test-environments", note: "Why tests pass in QA but fail in prod" },
      { category: "cs-fundamentals", slug: "data-validation", note: "Comparing large datasets and validating at scale" },
    ],
  },
  {
    id: "sql-engineer",
    title: "SQL Engineer",
    description:
      "SQL, schema design, transactions, NoSQL tradeoffs, Python data tools, and the performance analysis skills production demands.",
    brain: "engineering",
    estimatedHours: 5,
    steps: [
      { category: "cs-fundamentals", slug: "sql" },
      { category: "cs-fundamentals", slug: "database-design" },
      { category: "cs-fundamentals", slug: "database-transactions", note: "Locks, contention, isolation levels" },
      { category: "cs-fundamentals", slug: "nosql-databases", note: "When SQL is the wrong tool" },
      { category: "cs-fundamentals", slug: "performance-optimisation-se", note: "Query plans, explain analyse, index usage — measure before you optimise" },
      { category: "python", slug: "sqlalchemy", note: "SQL from Python" },
      { category: "python", slug: "polars-duckdb", note: "Analytical workloads" },
      { category: "cloud", slug: "data-engineering-cloud", note: "Streaming vs batch: real-time pipelines vs scheduled jobs" },
    ],
  },
];

// Topic bundles — curated deep-dives into specific AI engineering areas
export const TOPIC_BUNDLES: LearningPath[] = [
  {
    id: "ai-engineering-fundamentals",
    title: "AI Engineering Fundamentals",
    description:
      "Transformer internals, prompt engineering, RAG, and evals. The foundation every AI engineer needs before touching a framework.",
    brain: "ai-engineering",
    estimatedHours: 5,
    steps: [
      { category: "llms", slug: "transformer-architecture" },
      { category: "llms", slug: "tokenisation", note: "What the model actually sees" },
      { category: "llms", slug: "claude" },
      { category: "prompting", slug: "techniques" },
      { category: "rag", slug: "chunking" },
      { category: "rag", slug: "embeddings" },
      { category: "rag", slug: "pipeline", note: "Full RAG pipeline from retrieval to answer" },
      { category: "evals", slug: "methodology", note: "How to know if it is actually working" },
    ],
  },
  {
    id: "build-agents",
    title: "Build Agents",
    description:
      "Single-agent loops, multi-agent orchestration, tool protocols, and what goes wrong and how to stop it.",
    brain: "ai-engineering",
    estimatedHours: 4,
    steps: [
      { category: "agents", slug: "langgraph", note: "Production standard for stateful agents" },
      { category: "agents", slug: "multi-agent-patterns" },
      { category: "protocols", slug: "mcp", note: "The protocol all agents use for tools" },
      { category: "agents", slug: "mcp-server-development", note: "Build your own tool servers" },
      { category: "agents", slug: "strands-agents-sdk", note: "AWS-native alternative" },
      { category: "security", slug: "owasp-llm-top10", note: "Attacks specific to agents" },
    ],
  },
  {
    id: "production-infrastructure",
    title: "Production Infrastructure",
    description:
      "APIs, observability, multi-provider routing, managed RAG, and content safety. How to run AI systems reliably.",
    brain: "infrastructure",
    estimatedHours: 4,
    steps: [
      { category: "apis", slug: "anthropic-api" },
      { category: "apis", slug: "aws-bedrock", note: "When you need IAM auth or managed RAG" },
      { category: "infra", slug: "litellm", note: "Route across providers without code changes" },
      { category: "observability", slug: "langfuse", note: "Trace every call, spot cost outliers" },
      { category: "infra", slug: "vector-stores" },
      { category: "security", slug: "guardrails" },
    ],
  },
  {
    id: "production-reality-ai",
    title: "Production Reality for AI",
    description:
      "How AI systems fail in production, how to see it happening, and how to recover. The depth gap between building and operating.",
    brain: "ai-engineering",
    estimatedHours: 5,
    steps: [
      { category: "llms", slug: "hallucination", note: "Confabulation patterns, silent RAG failures, model drift — and how to detect each" },
      { category: "security", slug: "prompt-injection", note: "Injection attacks, data exfiltration, tool misuse loops" },
      { category: "observability", slug: "tracing", note: "Latency breakdown per step, tool call tracing, prompt logging structure" },
      { category: "observability", slug: "langfuse", note: "Eval dashboards, token cost tracking, feedback loop instrumentation" },
      { category: "evals", slug: "methodology", note: "Online vs offline evals, shadow testing, A/B model comparison" },
      { category: "data", slug: "pipelines", note: "Data freshness, versioning, duplicate handling — pipeline health directly drives output quality" },
      { category: "cs-fundamentals", slug: "error-handling-patterns", note: "Retry and fallback across service boundaries — how AI systems degrade gracefully" },
    ],
  },
  {
    id: "production-thinking",
    title: "Production Thinking",
    description:
      "System-level reasoning across the full stack — request flow anatomy, debugging under pressure, failure engineering, and the tradeoff decisions that define senior engineers.",
    brain: "engineering",
    estimatedHours: 5,
    steps: [
      { category: "synthesis", slug: "request-flow-anatomy", note: "The full chain: where latency comes from, where failures hide, where retries apply" },
      { category: "cs-fundamentals", slug: "debugging-systems", note: "Systematic elimination, correlation IDs, tracing requests across services under pressure" },
      { category: "cs-fundamentals", slug: "observability-se", note: "Metrics, logs, traces — the instrumentation that makes debugging possible" },
      { category: "cs-fundamentals", slug: "distributed-systems", note: "How failures propagate: partial outages, inconsistency, cascade failure" },
      { category: "cs-fundamentals", slug: "error-handling-patterns", note: "Circuit breakers, retries with backoff, timeouts, graceful degradation" },
      { category: "synthesis", slug: "engineering-tradeoffs", note: "Cache vs recompute, RAG vs fine-tuning, scale up vs out, consistency vs availability" },
    ],
  },
  {
    id: "fine-tuning-and-evals",
    title: "Fine-Tuning & Evals",
    description:
      "When to fine-tune vs RAG vs prompting, how to do it cheaply with LoRA, and how to measure if it worked.",
    brain: "research",
    estimatedHours: 5,
    steps: [
      { category: "evals", slug: "methodology" },
      { category: "fine-tuning", slug: "lora-qlora", note: "Fine-tune on a single GPU" },
      { category: "fine-tuning", slug: "dpo-grpo", note: "Alignment without a reward model" },
      { category: "fine-tuning", slug: "frameworks", note: "The frameworks that make it practical" },
      { category: "data", slug: "annotation-tooling", note: "Your data quality sets the ceiling" },
      { category: "rag", slug: "ragas", note: "Eval framework built for RAG pipelines" },
    ],
  },
];
