---
type: entity
category: infra
tags: [aws, bedrock, agents, agentcore, cloud, managed-service]
sources: []
updated: 2026-05-04
para: resource
tldr: AWS Bedrock AgentCore is a managed runtime for deploying, running, and monitoring AI agents at production scale — handles memory, tool execution, session management, and observability so teams don't build agent infrastructure from scratch.
---

# AWS Bedrock AgentCore

> **TL;DR** AWS Bedrock AgentCore is a managed runtime for deploying, running, and monitoring AI agents at production scale — handles memory, tool execution, session management, and observability so teams don't build agent infrastructure from scratch.

AWS's managed service for AI agent infrastructure. Announced 2025, part of the Amazon Bedrock platform. Targets teams building production agentic applications who want the agent logic without the operational overhead of managing the runtime, memory store, tool execution environment, and observability stack themselves.

> [Source: Perplexity research, 2026-05-04] [unverified — AWS feature set evolves rapidly]

---

## Core Capabilities

### Managed Agent Runtime

AgentCore hosts agent execution in AWS-managed infrastructure. The runtime handles:
- Session lifecycle (start, pause, resume, terminate)
- Context window management across long-running sessions
- Parallel sub-agent execution for multi-agent workflows
- Automatic retry and error recovery for transient failures

### Agent Memory

Built-in memory layer backed by AWS-managed storage:
- **Working memory:** In-flight session state, scoped to an agent invocation
- **Episodic memory:** Cross-session history, queryable by the agent at runtime
- **Semantic memory:** Vector-based long-term knowledge store (backed by pgvector or Bedrock Knowledge Bases)

### Tool Execution Environment

Sandboxed execution environment for agent tools:
- Code interpreter (Python sandbox)
- Browser tool (headless Chromium for web interaction)
- Custom Lambda-backed tools via function definitions
- AWS service integrations (S3, DynamoDB, RDS) with IAM-scoped permissions

### Observability and Monitoring

Native integration with CloudWatch and AWS X-Ray:
- Trace every agent step as a span
- Token usage and cost per session
- Tool call latency and error rates
- Alarm integration for anomaly detection

---

## Integration with Bedrock

AgentCore runs on top of Amazon Bedrock, giving access to:
- All Bedrock-hosted foundation models (Claude via Anthropic, Llama via Meta, Titan, Mistral, Cohere)
- Bedrock Knowledge Bases (managed RAG pipeline)
- Bedrock Guardrails (content filtering, PII redaction, topic blocking)
- Bedrock Model Evaluation

For Claude specifically, AgentCore can use any Claude model available in Bedrock, with prompt caching and the full Anthropic API feature set.

---

## When to Use AgentCore vs Self-Hosted

| Scenario | Recommendation |
|---|---|
| AWS-first shop with compliance requirements | AgentCore — data stays in AWS, IAM-native |
| Need maximum model choice flexibility | AgentCore (Bedrock hosts many models) |
| Already running LangGraph or AutoGen in self-managed infra | Evaluate migration cost vs operational savings |
| Need Anthropic-specific features (extended thinking, prompt caching) | Either — AgentCore exposes these via Bedrock |
| Cost-sensitive at high scale | Compare: AgentCore charges per-session on top of model costs |

---

## Key Facts

- Part of Amazon Bedrock; requires AWS account with Bedrock access
- Supports Claude (via Anthropic partnership with AWS), Llama, Titan, Mistral, Cohere
- Built-in memory layer eliminates need for a separate vector store for most agent use cases
- Sandboxed tool execution reduces security surface vs self-hosted code execution
- Native CloudWatch/X-Ray integration for observability without additional instrumentation
- IAM-native permissions for tool access — follows the principle of least privilege by default
- Supports A2A (Agent-to-Agent) protocol for multi-agent workflows

## Connections

- [[infra/inference-serving]] — self-hosted alternative for model serving outside AWS
- [[agents/practical-agent-design]] — agent architecture decisions that apply regardless of runtime
- [[agents/memory]] — memory patterns AgentCore implements in managed form
- [[protocols/a2a]] — Agent-to-Agent protocol for multi-agent orchestration
- [[infra/vector-stores]] — Bedrock Knowledge Bases uses managed vector storage
- [[security/owasp-llm-top10]] — security considerations apply to managed runtimes too
- [[observability/platforms]] — CloudWatch/X-Ray vs Langfuse/LangSmith tradeoff
- [[apis/anthropic-api]] — full Claude API available through Bedrock
