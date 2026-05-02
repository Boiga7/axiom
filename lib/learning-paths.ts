// lib/learning-paths.ts
// Client-safe — no fs/path imports.

import type { Brain } from "./constants";
import { BRAIN_MAP } from "./constants";

export type LearningStep = {
  category: keyof typeof BRAIN_MAP;
  slug: string;
  note?: string; // context shown on the path detail page
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  brain: Brain;
  estimatedHours: number;
  steps: LearningStep[];
};

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "ai-engineering-fundamentals",
    title: "AI Engineering Fundamentals",
    description:
      "Transformer internals → prompt engineering → RAG → evals. The foundation every AI engineer needs before touching a framework.",
    brain: "ai-engineering",
    estimatedHours: 5,
    steps: [
      { category: "llms", slug: "transformer-architecture" },
      { category: "llms", slug: "claude" },
      { category: "prompting", slug: "techniques" },
      { category: "rag", slug: "chunking" },
      { category: "rag", slug: "embeddings" },
      { category: "rag", slug: "pipeline", note: "Full RAG pipeline from retrieval to answer" },
      { category: "evals", slug: "methodology", note: "How to know if it's actually working" },
    ],
  },
  {
    id: "build-agents",
    title: "Build Agents",
    description:
      "Single-agent loops → multi-agent orchestration → tool protocols → what goes wrong and how to stop it.",
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
      "APIs → observability → multi-provider routing → managed RAG → content safety. How to run AI systems reliably.",
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
