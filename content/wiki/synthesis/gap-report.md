---
type: synthesis
category: synthesis
para: resource
tags: [gaps, intelligence]
tldr: Ranked list of knowledge gaps relative to active areas — what to research next.
updated: 2026-05-08
---

# Knowledge Gap Report — 2026-05-08

> **TL;DR** No gaps. All active areas current. SAA-C03 confirmed as a target cert — `landscape/aws-solutions-architect-associate.md` already exists and is complete.

No `para/projects.md` exists; running against active areas from `para/areas.md`.

## Active Areas Status

| Area | Status |
|---|---|
| LLM Release Tracking | Current — model-families, model-timeline, ai-labs up to date |
| MCP Security Watch | Current — mcp-cves synced, protocols/mcp current |
| AI Engineering Fundamentals | Current — rag/pipeline, langgraph, evals/methodology all production-current |
| Nexus Health | Improved — 8 broken wikilinks fixed, graph connections added to study guide pages |

---

## Fixed Since Run 2

- ✓ `safety/responsible-ai.md` expanded — full FATE framework, bias types, NIST AI RMF, AWS tooling per dimension, 10-row AIF-C01 scenario drill, Key Facts, Open Questions
- ✓ Comprehend Custom section added to `cloud/aws-ai-recognition-services.md` — decision matrix vs Bedrock fine-tuning, exam triggers
- ✓ `[[security/owasp-llm-top-10]]` slug corrected to `owasp-llm-top10` in aws-cloud-practitioner.md
- ✓ `landscape/aws-ai-practitioner.md` Connections updated — now links to all 5 new cert pages (ml-fundamentals, aws-sagemaker-studio, aws-ai-recognition-services, aws-amazon-q, aws-bedrock-guardrails)
- ✓ `landscape/aws-cloud-practitioner.md` Connections updated — now links to aws-analytics-services, aws-ai-recognition-services, aws-amazon-q
- ✓ `apis/aws-bedrock.md` Connections updated — now links to aws-bedrock-guardrails and aws-amazon-q

---

## Critical Gaps

None.

---

## What's Well Covered

- **SAA-C03:** `landscape/aws-solutions-architect-associate.md` ✓ — 4 domains, exam format, key patterns, Connections wired
- **CLF-C02:** core AWS ✓, analytics services ✓, AI recognition services ✓, Amazon Q ✓, shared responsibility ✓, Well-Architected ✓
- **AIF-C01 Domain 1 (20%):** ML fundamentals ✓, supervised/unsupervised/RL ✓, evaluation metrics ✓, ML lifecycle ✓
- **AIF-C01 Domain 3 (28%):** SageMaker sub-services ✓, pre-built AI APIs ✓, Comprehend Custom ✓, Amazon Q Business ✓, Bedrock ✓
- **AIF-C01 Domain 4 (14%):** FATE framework ✓, bias types ✓, NIST AI RMF ✓, AWS tooling ✓, scenario drill ✓
- **AIF-C01 Domain 5 (14%):** Bedrock Guardrails (all 6 policies) ✓, IAM/security ✓, Acceptable Use Policy ✓
- **MCP:** spec ✓, CVEs ✓, server development ✓, registry ✓, distribution ✓
- **RAG:** pipeline ✓, chunking ✓, embeddings ✓, reranking ✓, GraphRAG ✓
- **Agents:** LangGraph ✓, CrewAI ✓, memory systems ✓, multi-agent ✓
- **Evals:** methodology ✓, LLM-as-judge ✓, RAGAS ✓, DeepEval ✓
- **Tools:** GitHub Marketplace ✓, VS Code extension ✓, MCP server distribution ✓

## Connections

- [[para/areas]] — source of active area context
- [[index]] — coverage map source
- [[synthesis/graph-health]] — graph score; all known broken links fixed this session
- [[synthesis/audit-report]] — vault health snapshot from 2026-05-03 audit run
- [[synthesis/debugging-runbooks]] — runbooks for diagnosing common AI and infra failures

## Open Questions

- None.
