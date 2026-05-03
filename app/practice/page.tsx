import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PracticeClient from "@/components/PracticeClient";
import { getSearchIndex } from "@/lib/wiki";

export const metadata: Metadata = {
  title: "Practice Lab",
  description: "Hands-on exercises for each engineering role path. Build real skills, not just reading comprehension.",
};

const ROLE_PATHS = [
  {
    id: "ai-engineer",
    title: "AI Engineer",
    description: "Prompt engineering, RAG, agents, evals, and production operations.",
    exercises: [
      {
        title: "Build a RAG pipeline from scratch",
        description: "Chunk a PDF, embed it with a local model, store it in Chroma, and answer questions against it using Claude — return the answer with cited source passages.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Write an LLM-as-judge eval",
        description: "Build a 10-case golden set and write a scorer that measures faithfulness using Claude as the judge. Output pass/fail per case and an aggregate score.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Build a LangGraph agent with memory",
        description: "Create a stateful agent with a web search tool and a persistent memory store. The agent should plan, search, and synthesise a structured summary for any given topic.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Implement and measure prompt caching",
        description: "Add cache_control blocks to a long system prompt, make 5 repeated calls, and measure the actual token savings and latency reduction using the Anthropic API usage fields.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Trace an LLM call end-to-end in Langfuse",
        description: "Instrument an existing chatbot with Langfuse spans, capture latency and token cost per call, and identify the highest-cost query across a simulated session of 10 turns.",
        difficulty: "Beginner" as const,
      },
    ],
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description: "Clean code, design patterns, system design, and production-grade implementation.",
    exercises: [
      {
        title: "Refactor a God class using SOLID",
        description: "Take a 50-line class that handles HTTP requests, database writes, and email sending. Split it into three single-responsibility classes connected by dependency injection.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Implement a circuit breaker decorator",
        description: "Write a Python decorator that opens the circuit after 3 consecutive failures, enters half-open state after 30 seconds, and closes when the next request succeeds.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "TDD a log line parser",
        description: "Build a function that parses a structured log format (timestamp, level, message) using strict red-green-refactor. Write all 5 tests before writing a single line of implementation.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Design a multi-tenant Postgres schema",
        description: "Design a schema for a multi-tenant SaaS product where each tenant's data is isolated. Implement row-level security policies and verify they work with two test tenants.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Find and fix an N+1 query",
        description: "Set up a SQLAlchemy model with a lazy-loaded relationship. Load 100 parent records, confirm the N+1 in query logs, then fix it with selectinload and measure the query count before and after.",
        difficulty: "Intermediate" as const,
      },
    ],
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    description: "AWS, containers, Kubernetes, infrastructure as code, and cost engineering.",
    exercises: [
      {
        title: "Containerise and deploy a FastAPI app",
        description: "Write a Dockerfile with multi-stage build, a health check endpoint, and a non-root user. Deploy the image to AWS ECS Fargate and confirm it returns 200 from the health check.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Provision infrastructure with Terraform",
        description: "Use Terraform to create an S3 bucket with versioning enabled, a CloudFront distribution, and an origin access identity. Destroy and re-create it cleanly with no state drift.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Build a CI/CD pipeline with GitHub Actions",
        description: "Write a workflow that lints, runs tests, builds a Docker image, pushes it to ECR, and triggers an ECS deployment on every push to main. The pipeline must fail fast on test failure.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Set up billing alerts and cost reporting",
        description: "Configure a CloudWatch billing alarm at $100/month. Write a boto3 script that queries Cost Explorer and outputs spend by service for the last 30 days as a sorted table.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Configure Kubernetes autoscaling under load",
        description: "Deploy a stateless API to Kubernetes with a HorizontalPodAutoscaler targeting 60% CPU utilisation. Load test it with k6 at 200 VUs and verify pods scale up then back down.",
        difficulty: "Advanced" as const,
      },
    ],
  },
  {
    id: "qa-engineer",
    title: "QA Engineer",
    description: "Test strategy, exploratory testing, risk-based thinking, and quality in modern delivery.",
    exercises: [
      {
        title: "Write and execute test charters",
        description: 'Write three exploratory testing charters for a login page using the format "Explore [target] with [resources] to discover [information]". Execute one for 45 minutes and file any bugs found.',
        difficulty: "Beginner" as const,
      },
      {
        title: "Build a risk matrix for a checkout flow",
        description: "Identify the top 5 risks in a payment checkout flow, score each by likelihood × impact, and write 3 prioritised test cases per risk. Justify your severity scores.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Design boundary value test cases",
        description: "For a text field accepting 1–255 characters and a number field accepting 0–999, write the complete set of boundary value and equivalence class test cases. Identify which you would automate.",
        difficulty: "Beginner" as const,
      },
      {
        title: "File a reproducible bug report",
        description: "Find a bug in any open-source web app through exploratory testing. Write a complete bug report with steps to reproduce, expected vs actual behaviour, environment details, and severity.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Audit test coverage against user flows",
        description: "Map an existing feature's test suite against its user flows using a mind map. Identify 3 coverage gaps, write charters for each, and estimate the business risk of leaving each gap untested.",
        difficulty: "Intermediate" as const,
      },
    ],
  },
  {
    id: "technical-qa-engineer",
    title: "SDET",
    description: "API testing, performance, test architecture, and distributed systems debugging.",
    exercises: [
      {
        title: "Test a streaming LLM endpoint with Playwright",
        description: "Write a Playwright test that calls an SSE streaming endpoint, captures all chunks as they arrive, reconstructs the full response, and asserts it contains expected content and format.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Build an isolated database fixture chain",
        description: "Create a pytest fixture that spins up a Postgres test database, runs Alembic migrations, seeds 5 rows, yields the session to each test, and rolls back all changes after every test.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Write and run a k6 load test",
        description: "Load test an API endpoint ramping from 50 to 200 virtual users over 2 minutes. Assert p95 latency < 300ms and error rate < 0.1%. Generate a summary report and identify the bottleneck.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Implement consumer-driven contract testing",
        description: "Define a Pact contract between a Python consumer and a FastAPI provider for a user lookup endpoint. Run provider verification in CI and make the build fail when the provider breaks the contract.",
        difficulty: "Advanced" as const,
      },
      {
        title: "Debug a flaky Playwright test",
        description: "Take a Playwright test that fails roughly 20% of the time due to a timing issue. Use the Playwright trace viewer to identify the exact race condition, then fix it without any arbitrary sleep() calls.",
        difficulty: "Intermediate" as const,
      },
    ],
  },
  {
    id: "sql-engineer",
    title: "Analytics Engineer",
    description: "SQL, schema design, data tools, and the query performance skills production demands.",
    exercises: [
      {
        title: "Write a window function ranking query",
        description: "Write a SQL query that ranks customers by total spend in each product category using RANK() OVER, then finds customers who dropped out of the top 10 compared to the prior month.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Design a star schema",
        description: "Design a star schema for e-commerce analytics: fact_orders, dim_customer, dim_product, dim_date. Write the CREATE TABLE statements with appropriate indexes and explain your grain decision.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Analyse a large CSV with DuckDB",
        description: "Use DuckDB to query a 500MB CSV of transaction data without loading it into memory. Find the top 10 categories by revenue, the month with the highest average order value, and the busiest hour of day.",
        difficulty: "Beginner" as const,
      },
      {
        title: "Fix an N+1 query in SQLAlchemy",
        description: "Load 100 Order records and access each order's customer name, triggering 100 extra queries. Measure the query count with query logging, fix it with a joined load, and confirm the count drops to 1.",
        difficulty: "Intermediate" as const,
      },
      {
        title: "Build a dbt revenue model with tests",
        description: "Write a dbt model that transforms a raw orders table into a daily_revenue table with date, revenue, order_count, and a 7-day rolling average. Add a schema.yml with not_null and unique tests.",
        difficulty: "Intermediate" as const,
      },
    ],
  },
] as const;

export default function PracticePage() {
  const searchIndex = getSearchIndex();

  return (
    <>
      <Nav searchIndex={searchIndex} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-ae animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ae/80">
              Practice Lab
            </span>
          </div>
          <h1
            className="font-display text-4xl sm:text-5xl font-semibold text-primary mb-4 leading-[1.05]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Build real skills.
          </h1>
          <p className="text-secondary text-lg leading-relaxed max-w-2xl">
            Five exercises per role path. Each one is a concrete task you can complete
            in a sitting — not reading, not watching, building.
          </p>
        </section>

        {/* Interactive content */}
        <PracticeClient paths={ROLE_PATHS as unknown as Parameters<typeof PracticeClient>[0]["paths"]} />

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mt-16 mb-10" />
        <footer className="flex items-center justify-center gap-4 text-muted font-mono text-[11px] tracking-wider pb-2">
          <a href="/" className="hover:text-secondary transition-colors">Home</a>
          <span className="text-white/10">·</span>
          <a href="/graph" className="hover:text-secondary transition-colors">Graph</a>
          <span className="text-white/10">·</span>
          <a href="/scan" className="hover:text-secondary transition-colors">Scan</a>
          <span className="text-white/10">·</span>
          <span className="text-ae/40">elliot-digital.co.uk</span>
        </footer>
      </main>
    </>
  );
}
