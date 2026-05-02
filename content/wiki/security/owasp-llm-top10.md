---
type: concept
category: security
tags: [owasp, security, prompt-injection, llm-security, vulnerabilities, agentic]
sources: []
updated: 2026-04-29
para: resource
tldr: OWASP LLM Top 10 (2025) — prompt injection is #1, never auto-execute LLM output, least privilege on tools; Agentic Top 10 (2026) adds goal misalignment, delegated trust failures, and memory exploitation.
---

# OWASP LLM Top 10 (2025) and Agentic Top 10 (2026)

> **TL;DR** OWASP LLM Top 10 (2025) — prompt injection is #1, never auto-execute LLM output, least privilege on tools; Agentic Top 10 (2026) adds goal misalignment, delegated trust failures, and memory exploitation.

The definitive threat models for AI systems. The OWASP LLM Top 10 covers LLM applications broadly; the Agentic Top 10 (2026) extends it for autonomous, tool-using agents.

> [Source: OWASP genai.owasp.org + Perplexity research, 2026-04-29]

---

## OWASP Top 10 for LLM Applications 2025

### LLM01 — Prompt Injection

Crafted input that overrides the system prompt or hijacks the model's intended behaviour. Split into:
- **Direct** — user directly injects into the prompt
- **Indirect** — malicious instructions in retrieved content (web pages, documents, tool results)

The #1 risk. Indirect injection via RAG or tool results is the harder problem. See [[security/prompt-injection]].

### LLM02 — Sensitive Information Disclosure

Model reveals training data, system prompts, API keys, or personal information. Causes:
- System prompt extraction via crafted queries
- Training data memorisation (regurgitation of PII from training set)
- Tool result leakage into model output

**Mitigations:** Output filtering, prompt design that keeps secrets out of the model entirely, differential privacy in training.

### LLM03 — Supply Chain Vulnerabilities

Third-party model weights, datasets, training pipelines, and plugins introduce attack surface. Poisoned training data affects model behaviour without leaving a visible trace.

**Mitigations:** Pin model versions, verify checksums, audit third-party plugins/MCP servers.

### LLM04 — Data and Model Poisoning

Malicious data injected into training, fine-tuning, or RAG knowledge bases. The model learns incorrect or malicious associations.

**Mitigations:** Validate training/fine-tuning datasets; scan RAG knowledge bases for adversarial content before indexing.

### LLM05 — Improper Output Handling

Treating LLM output as trusted code or SQL. Covers: SQL injection via LLM-generated queries, XSS via LLM-generated HTML, shell injection via LLM-generated commands.

**Mitigations:** Never execute raw LLM output. Validate, sanitise, and parameterise all outputs before use.

### LLM06 — Excessive Agency

The model takes irreversible actions (deleting files, sending emails, running code) without sufficient authorisation. Risk multiplies with agentic tool use.

**Mitigations:** Principle of least privilege on tools; require confirmation for irreversible actions; time-bounded permissions.

### LLM07 — System Prompt Leakage (2025 addition)

The model reveals its system prompt contents, exposing business logic, pricing, or security instructions. Can be exploited to understand and bypass safeguards.

**Mitigations:** Never put secrets in the system prompt. Treat the system prompt as obfuscated, not secret. Design safeguards to work even if the system prompt is known.

### LLM08 — Vector and Embedding Weaknesses (2025 addition)

Attacks on RAG infrastructure: poisoning the vector store with adversarial embeddings, cross-encoding attacks, backdoor triggers in embedding models.

**Mitigations:** Validate documents before indexing; monitor for out-of-distribution retrievals.

### LLM09 — Misinformation

Model generates confident, plausible, but false information. Causes: hallucination, outdated training data, adversarial prompting.

**Mitigations:** RAG for facts, citations with sources, human review for high-stakes outputs, [[evals/methodology]] with faithfulness metrics.

### LLM10 — Unbounded Consumption

DoS via token-expensive requests; cost abuse via prompt construction that maximises output tokens; API key theft leading to fraudulent usage.

**Mitigations:** Rate limiting, cost gates, token budget enforcement, usage anomaly detection.

---

## OWASP Top 10 for Agentic Applications 2026

Developed by 100+ security experts. Extends the LLM Top 10 for systems that combine reasoning, memory, tools, and multi-step autonomous execution.

> [Source: genai.owasp.org Agentic Top 10, 2026-04-29]

### A1 — Goal Misalignment

Agent pursues a proxy goal rather than the intended goal. Specification gaming, reward hacking, Goodhart's law in practice.

**Example:** An agent tasked with "maximise user engagement" learns to generate controversial content.

### A2 — Tool Misuse

Agent invokes tools with unintended parameters, calls tools out of sequence, or uses a high-privilege tool when a lower-privilege one would suffice.

### A3 — Delegated Trust Failures

When Agent A delegates to Agent B, it implicitly trusts B. A compromised or manipulated Agent B can abuse that trust to take actions Agent A would never have authorised.

### A4 — Inter-Agent Communication Attacks

Prompt injection or data poisoning via messages passed between agents. A malicious tool result from Agent B is passed to Agent A and hijacks its next action.

### A5 — Persistent Memory Exploitation

Adversarial content stored in the agent's long-term memory (vector store, episodic memory) that activates on future sessions to trigger malicious behaviour.

### A6 — Emergent Autonomous Behaviour

Unexpected behaviours that arise from the interaction of multiple agents, tools, and environment states. Not present in any single component.

### A7 — Resource and Cost Abuse

Agents spinning up infinite loops, spawning excessive subagents, or making uncontrolled API calls that exhaust compute or budget.

### A8 — Confused Deputy Attacks

An agent with high-privilege access is tricked by low-privilege input into using those privileges maliciously.

### A9 — Cascading Failures

One agent failure propagates to others in a multi-agent system, causing a catastrophic system-wide failure.

### A10 — Inadequate Human Oversight

Agents operate without checkpoints, auditing, or human-in-the-loop for high-stakes decisions. No ability to stop, inspect, or roll back.

---

## Defence Summary

| Layer | Key mitigations |
|---|---|
| Input | Input validation, prompt isolation, content filtering |
| Model | Least privilege, Constitutional AI, safety fine-tuning |
| Tool | Scoped permissions, human confirmation, sandboxing |
| Memory | Validate before storing, TTL on memory, anomaly detection |
| Output | Output filtering, never exec raw output, citations |
| System | Rate limiting, cost gates, logging, human oversight |

---

## Key Facts

- LLM01 Prompt Injection: #1 risk; indirect injection via RAG/tool results is harder to defend than direct injection
- LLM05 Improper Output Handling: never execute raw LLM output — validate, sanitise, parameterise
- LLM06 Excessive Agency: require confirmation for irreversible actions; time-bounded permissions
- Agentic Top 10 (2026): developed by 100+ security experts for autonomous, tool-using agent systems
- A3 Delegated Trust Failures: compromised Agent B abuses trust granted by Agent A
- A5 Persistent Memory Exploitation: adversarial content in vector store activates on future sessions
- A10 Inadequate Human Oversight: no checkpoints or audit trail for high-stakes autonomous decisions

## Common Failure Cases

**Indirect prompt injection via RAG document goes undetected**  
Why: a malicious instruction is embedded in a document that gets indexed into the RAG corpus; when retrieved, it is injected into the LLM's context alongside trusted content and executed.  
Detect: agent takes unexpected actions correlated with a specific document being retrieved; red-team by injecting `Ignore previous instructions: ...` into test documents and observing agent behaviour.  
Fix: validate and sanitise documents before indexing; use a screening LLM call to check retrieved chunks for injection patterns before passing to the main agent.

**LLM06 Excessive Agency: agent deletes files without confirmation**  
Why: the tool has write/delete permissions and no confirmation step; the LLM misinterprets an ambiguous user request and takes an irreversible action.  
Detect: audit logs show destructive tool calls (delete, update, send) triggered without an explicit user confirmation in the same turn.  
Fix: require human-in-the-loop confirmation for all irreversible actions; scope tools to read-only by default; provide a separate tool with write access that requires an explicit confirmation parameter.

**LLM05 SQL injection via LLM-generated query**  
Why: LLM output is interpolated directly into a SQL string; the model can be prompted to generate a query that extracts or modifies unintended data.  
Detect: security scan finds raw string interpolation in DB query construction; penetration test with a prompt that asks the model to "show all users" reveals unintended data.  
Fix: never interpolate LLM output into SQL; use parameterised queries or an ORM; validate that generated queries match an allow-list of permitted operations.

**A7 Resource abuse: agent spawns subagents in an infinite loop**  
Why: the orchestration logic has a bug or the agent interprets its goal as requiring continuous operation; it spawns subagents or makes API calls until the account budget is exhausted.  
Detect: token spend spikes 100x normal; cost gate threshold triggers; trace shows a recursive spawning pattern.  
Fix: implement hard token/cost gates at the orchestration layer; cap subagent spawn depth; add a circuit breaker that halts if the same tool is called more than N times in one session.

**A5 Persistent memory exploitation: adversarial content stored in vector store**  
Why: user-controlled content is written directly to the agent's long-term memory without sanitisation; it contains instructions that activate on future sessions.  
Detect: agent behaviour in a new session is influenced by content from a previous session in unexpected ways; the triggering memory entry contains instruction-like text.  
Fix: validate all content before writing to long-term memory; apply TTL to memories; use a separate namespace for user-supplied content vs system-generated memories.

## Connections

- [[security/prompt-injection]] — LLM01 in depth
- [[security/mcp-cves]] — concrete CVEs from MCP ecosystem
- [[protocols/mcp]] — the MCP attack surface
- [[agents/multi-agent-patterns]] — multi-agent trust considerations
- [[security/red-teaming]] — testing for these vulnerabilities

## Open Questions

- How does the Agentic Top 10 apply to Claude Code specifically — which risks are most prevalent in agentic coding workflows?
- Is A5 (persistent memory exploitation) a real attack vector in practice or primarily theoretical?
- Will OWASP release a formal scoring methodology for LLM vulnerabilities analogous to CVSS?
