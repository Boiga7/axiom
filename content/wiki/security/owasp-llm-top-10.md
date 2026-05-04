---
type: concept
category: security
para: resource
tags: [owasp, llm, security, prompt-injection, vulnerabilities, agentic]
tldr: OWASP LLM Top 10 2025 — the ten most critical security risks for LLM applications, from prompt injection (#1) to model theft (#10), plus the Agentic Top 10 extending the taxonomy for autonomous agents.
sources: []
updated: 2026-05-04
---

# OWASP LLM Top 10 (2025)

The OWASP Top 10 for LLM Applications 2025 is the canonical threat taxonomy for AI systems exposed to untrusted input or producing output that influences downstream actions. It is the LLM-specific extension of OWASP's established web application security frameworks. See also [[security/owasp-wstg]] for the broader web security testing methodology.

---

## The Ten Risks

**LLM01 — Prompt Injection** — crafted input overrides system prompt instructions or hijacks intended behaviour. Direct injection comes from the user; indirect injection arrives via retrieved documents, tool results, or external web content in a RAG pipeline. The #1 risk because it is pervasive, hard to fully prevent, and the entry point for most other attacks.

**LLM02 — Insecure Output Handling** — LLM-generated content is passed to downstream systems (browsers, interpreters, shell commands) without sanitisation. An LLM that generates JavaScript executed in a browser, or a shell command run without validation, creates XSS and command injection vulnerabilities.

**LLM03 — Training Data Poisoning** — malicious actors corrupt training data to introduce backdoors, biases, or reduced accuracy. Relevant to any team building fine-tuning pipelines on external or user-contributed data.

**LLM04 — Model Denial of Service** — resource-exhaustive inputs (very long context, recursive prompts, inference-intensive queries) degrade availability or spike costs. Defence: input length limits, rate limiting, cost gates at the orchestration layer.

**LLM05 — Supply Chain Vulnerabilities** — third-party model weights, datasets, plugins, and MCP servers introduce untrusted code into the AI stack. MCP ecosystem: 66% of 1,808 scanned servers had security findings (April 2026). See [[security/mcp-cves]].

**LLM06 — Sensitive Information Disclosure** — models may reproduce memorised PII, credentials, or confidential content from training data, or expose system prompt contents via inference attacks. Defence: training data PII scrubbing, system prompt confidentiality testing, output filtering.

**LLM07 — Insecure Plugin Design** — LLM tool use with overly broad permissions allows a successful prompt injection to take destructive actions. Principle of least privilege for every tool: a tool that retrieves documents should not also have delete permissions.

**LLM08 — Excessive Agency** — the AI agent is granted more capabilities, permissions, or autonomy than the task requires. Defence: scope agent actions to the minimum necessary; require human confirmation for irreversible actions.

**LLM09 — Overreliance** — users or downstream systems treat LLM output as ground truth without verification, leading to decisions based on hallucinated or outdated information. Mitigation: grounding via RAG, citations, human review for high-stakes decisions.

**LLM10 — Model Theft** — systematic querying of a model's API to extract sufficient information to replicate or approximate its behaviour. Defence: rate limiting, output monitoring for extraction patterns, watermarking.

---

## Agentic Top 10 (2026)

The OWASP Agentic AI Top 10 (2026) extends the taxonomy for autonomous, multi-step, tool-using agents: goal misalignment, tool misuse, delegated trust failures, inter-agent communication attacks, and persistent memory exploitation are the five additions most relevant to agentic architectures.

---

## Connections

- [[security/mcp-cves]] — MCP-specific CVEs and the supply chain risk for agentic AI
- [[security/owasp-wstg]] — broader web application security testing methodology
- [[protocols/mcp]] — MCP architecture and the attack surface it introduces
- [[security/prompt-injection]] — deep dive on the #1 risk
