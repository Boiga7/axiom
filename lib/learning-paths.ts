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
      "Prompt engineering, RAG, agentic systems, evals, and production security. The core curriculum for building AI products.",
    brain: "ai-engineering",
    estimatedHours: 6,
    steps: [
      { category: "llms", slug: "claude", note: "Start with the model you will use most" },
      { category: "prompting", slug: "techniques" },
      { category: "rag", slug: "pipeline", note: "Retrieval-augmented generation end-to-end" },
      { category: "agents", slug: "langgraph", note: "Stateful agent loops" },
      { category: "evals", slug: "methodology" },
      { category: "security", slug: "owasp-llm-top10", note: "What goes wrong in production" },
      { category: "agents", slug: "mcp-server-development", note: "Build tool integrations" },
    ],
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description:
      "Clean code, design patterns, system design, databases, and APIs. The bedrock every backend engineer needs.",
    brain: "engineering",
    estimatedHours: 5,
    steps: [
      { category: "cs-fundamentals", slug: "se-hub" },
      { category: "cs-fundamentals", slug: "clean-code" },
      { category: "cs-fundamentals", slug: "design-patterns" },
      { category: "cs-fundamentals", slug: "system-design" },
      { category: "cs-fundamentals", slug: "database-design" },
      { category: "cs-fundamentals", slug: "api-design" },
      { category: "cs-fundamentals", slug: "tdd-se", note: "Test-driven development in practice" },
    ],
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    description:
      "AWS, containers, Kubernetes, infrastructure as code, and production security. Deploy and operate systems at scale.",
    brain: "infrastructure",
    estimatedHours: 5,
    steps: [
      { category: "cloud", slug: "cloud-hub" },
      { category: "cloud", slug: "aws-core", note: "The essential AWS services" },
      { category: "cloud", slug: "docker", note: "Containers first" },
      { category: "cloud", slug: "kubernetes", note: "Orchestration at scale" },
      { category: "cloud", slug: "terraform", note: "Infrastructure as code" },
      { category: "cloud", slug: "cloud-security" },
      { category: "cloud", slug: "github-actions", note: "CI/CD pipelines" },
    ],
  },
  {
    id: "qa-engineer",
    title: "QA Engineer",
    description:
      "Test strategy, case design, exploratory testing, and quality in modern delivery pipelines.",
    brain: "engineering",
    estimatedHours: 4,
    steps: [
      { category: "qa", slug: "qa-hub" },
      { category: "qa", slug: "test-strategy" },
      { category: "qa", slug: "test-case-design" },
      { category: "qa", slug: "exploratory-testing" },
      { category: "qa", slug: "regression-testing" },
      { category: "qa", slug: "bug-lifecycle" },
      { category: "qa", slug: "qa-in-devops", note: "Quality in CI/CD pipelines" },
    ],
  },
  {
    id: "technical-qa-engineer",
    title: "Technical QA Engineer",
    description:
      "API testing, performance, test architecture, Playwright, and flaky test management. QA at the code level.",
    brain: "engineering",
    estimatedHours: 5,
    steps: [
      { category: "technical-qa", slug: "tqa-hub" },
      { category: "technical-qa", slug: "api-testing" },
      { category: "technical-qa", slug: "playwright-advanced" },
      { category: "technical-qa", slug: "performance-testing" },
      { category: "technical-qa", slug: "test-architecture" },
      { category: "technical-qa", slug: "ci-cd-quality-gates", note: "Block broken code automatically" },
      { category: "technical-qa", slug: "flaky-test-management" },
    ],
  },
  {
    id: "sql-engineer",
    title: "SQL Engineer",
    description:
      "SQL, schema design, transactions, NoSQL tradeoffs, and Python data tools. Data at every level of the stack.",
    brain: "engineering",
    estimatedHours: 4,
    steps: [
      { category: "cs-fundamentals", slug: "sql" },
      { category: "cs-fundamentals", slug: "database-design" },
      { category: "cs-fundamentals", slug: "database-transactions" },
      { category: "cs-fundamentals", slug: "nosql-databases", note: "When SQL is the wrong tool" },
      { category: "python", slug: "sqlalchemy", note: "SQL from Python" },
      { category: "python", slug: "polars-duckdb", note: "Analytical workloads" },
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
