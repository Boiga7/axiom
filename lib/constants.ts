// Client-safe constants and pure functions — no fs/path/matter imports

export type Brain =
  | "ai-engineering"
  | "infrastructure"
  | "engineering"
  | "intelligence"
  | "research"
  | "other";

export type WikiFrontmatter = {
  type?: string;
  category?: string;
  para?: string;
  tags?: string[];
  sources?: string[];
  updated?: string;
  [key: string]: unknown;
};

export type WikiPage = {
  slug: string;
  category: string;
  title: string;
  content: string;
  frontmatter: WikiFrontmatter;
  excerpt: string;
  href: string;
};

export type Category = {
  slug: string;
  label: string;
  brain: Brain;
  count: number;
};

export type SearchEntry = {
  title: string;
  category: string;
  slug: string;
  href: string;
  excerpt: string;
  tags: string[];
};

export const BRAIN_MAP: Record<string, Brain> = {
  llms: "ai-engineering",
  agents: "ai-engineering",
  rag: "ai-engineering",
  prompting: "ai-engineering",
  evals: "ai-engineering",
  safety: "ai-engineering",
  "fine-tuning": "ai-engineering",
  multimodal: "ai-engineering",
  math: "research",
  papers: "research",
  landscape: "research",
  infra: "infrastructure",
  apis: "infrastructure",
  observability: "infrastructure",
  protocols: "infrastructure",
  cloud: "infrastructure",
  python: "engineering",
  "web-frameworks": "engineering",
  "test-automation": "engineering",
  java: "engineering",
  javascript: "engineering",
  "cs-fundamentals": "engineering",
  qa: "engineering",
  "technical-qa": "engineering",
  "ai-tools": "engineering",
  data: "intelligence",
  synthesis: "intelligence",
  security: "intelligence",
  sql: "engineering",
};

export const BRAIN_LABELS: Record<Brain, string> = {
  "ai-engineering": "AI Engineering",
  infrastructure: "Infrastructure",
  engineering: "Engineering",
  intelligence: "Intelligence",
  research: "Research",
  other: "Other",
};

export const BRAIN_COLORS: Record<Brain, string> = {
  "ai-engineering": "#22d3ee",
  infrastructure: "#60a5fa",
  engineering: "#a78bfa",
  intelligence: "#34d399",
  research: "#fb923c",
  other: "#94a3b8",
};

export function slugToLabel(slug: string): string {
  const overrides: Record<string, string> = {
    llms: "LLMs",
    rag: "RAG",
    apis: "APIs",
    "ai-tools": "AI Tools",
    "ai-engineering": "AI Engineering",
    "cs-fundamentals": "CS Fundamentals",
    "fine-tuning": "Fine-Tuning",
    "test-automation": "Test Automation",
    "web-frameworks": "Web Frameworks",
    "technical-qa": "Technical QA",
    qa: "QA",
    javascript: "JavaScript / TypeScript",
    sql: "SQL",
  };
  return (
    overrides[slug] ??
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
