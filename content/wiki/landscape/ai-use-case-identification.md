---
type: synthesis
category: landscape
para: resource
tags: [enterprise, use-cases, strategy, framework, openai, prioritisation, impact-effort]
tldr: Most enterprise AI use cases map to 6 primitives. Impact/Effort scoring with quarterly reassessment finds what to build. Governance and data access are the scaling bottleneck, not model quality.
sources: []
updated: 2026-05-01
---

# AI Use Case Identification

> **TL;DR** Most enterprise AI use cases map to 6 primitives. Impact/Effort scoring with quarterly reassessment finds what to build. Governance and data access are the scaling bottleneck, not model quality.

## Key Facts
- Analysis of 600+ enterprise use cases shows most reduce to 6 fundamental primitives
- Impact/Effort scoring should be reassessed quarterly — high-effort use cases today may become low-effort as models improve
- AI works best for repetitive high-volume tasks and skill-bottleneck tasks where AI bridges knowledge gaps
- 92% of enterprises plan to increase AI spending; only 1% feel they've achieved AI maturity
- Governance, security, and cost efficiency are the decisive factors for scaling beyond pilots — not model capability
- Piloting phase (39% → 13% of organisations) is over: enterprises are now failing at the scaling problem

## The 6 Use Case Primitives

Analysis of 600+ enterprise AI deployments shows most use cases reduce to one of six patterns. Knowing the primitive lets you reuse solutions across business units and estimate effort more accurately.

| Primitive | What it does | Common applications |
|---|---|---|
| **Summarisation** | Condense large content to key points | Meeting notes, document summaries, status reports, legal review |
| **Classification** | Assign inputs to predefined categories | Ticket triage, sentiment analysis, intent detection, content moderation |
| **Extraction** | Pull structured data from unstructured text | Invoice parsing, entity extraction, form filling, contract review |
| **Generation** | Create content from prompts or data | Email drafts, code generation, report writing, marketing copy |
| **Conversation** | Multi-turn interaction with context | Customer support, internal Q&A, onboarding assistants, HR queries |
| **Agentic execution** | Multi-step task completion with tool use | Workflow automation, research agents, code agents, data pipelines |

> [Source: OpenAI Identifying and Scaling AI Use Cases, 2025]

Each primitive applies across every department. The same summarisation primitive works for legal, finance, HR, and engineering. Build the primitive once; deploy it across business units.

Agentic execution is the hardest primitive to deploy (highest governance requirement, most failure modes) and the highest potential value. Start with the other five first.

## The Impact/Effort Framework

Score each candidate use case on two axes, plot on a 2x2 matrix, and prioritise.

### Impact factors (value delivered)
- Revenue impact or cost reduction magnitude
- Number of people or transactions affected
- Frequency — daily tasks beat quarterly ones
- Criticality to core business process

### Effort factors (implementation cost)
- Data availability and quality
- Integration complexity with existing systems
- Change management and adoption risk
- Compliance and governance overhead

### Prioritisation matrix

| | Low Effort | High Effort |
|---|---|---|
| **High Impact** | Build now | Plan carefully; reassess quarterly |
| **Low Impact** | Build for learning | Skip |

**Reassess quarterly.** A use case rated high-effort in 2024 may become low-effort in 2026 as foundation models improve. The framework is not static.

## Where AI Works Best

### Repetitive high-volume tasks
Tasks performed many times per day, currently done by humans following a fixed process, with well-defined success criteria. AI delivers consistent performance without fatigue.

Signals this is the right fit:
- The task is documented (there's a runbook or SOP)
- Success is measurable without human judgment
- Volume is high enough that small efficiency gains compound

### Skill-bottleneck tasks
Tasks where specialist knowledge is scarce and waiting for review creates a bottleneck. AI can provide 80% of the value at 1% of the specialist's time.

Signals this is the right fit:
- A specific expertise type (legal, medical, technical) is the constraint
- Generalists currently wait on specialists for knowledge they need frequently
- The specialist's time is better spent on edge cases, not routine applications

### Tasks that don't fit well
- Creative work requiring genuine novelty (AI assists; does not replace)
- Tasks requiring legal accountability (human must remain in the loop)
- Extreme precision requirements with no acceptable error rate
- Tasks where explainability of the decision is required by regulation

## The Scaling Bottleneck

Finding use cases is easy. Scaling them is where most enterprises fail.

Common failure modes when scaling:
1. **Data access** — the use case needs data that IT or legal won't expose to the AI system
2. **Governance** — no approval process for AI-generated outputs in regulated workflows
3. **Integration** — AI output can't feed back into existing systems of record
4. **Change management** — employees won't adopt the new workflow without investment in training and incentives

Governance, security, and cost efficiency have become the decisive factors. Not model capability. See [[landscape/enterprise-ai-adoption]] for the full governance picture.

## Running an AI Discovery Sprint

A practical framework for identifying use cases in a business unit in one week:

1. **Interview users** — what tasks are repetitive, frustrating, or require knowledge you don't have?
2. **Map to primitives** — categorise each candidate as one of the 6 primitives
3. **Score impact/effort** — apply the 2x2; identify quick wins and future investments
4. **Pick one quick win** — build one high-impact/low-effort use case to demonstrate value
5. **Document the pattern** — what data, integration, and approval process was needed
6. **Replicate** — apply the same primitive across other business units before moving to harder primitives

The quick win serves as internal proof of concept and builds the trust needed to tackle higher-effort use cases.

## For the AI Engineer

When advising a business on what to build, this framework makes you more credible than model recommendations:

- Leads with business value, not technology capability
- Produces a prioritised backlog, not an open-ended wish list
- Sets realistic expectations about what's easy vs what requires real investment
- Identifies governance requirements early, before they become blockers

The skill set to run this: stakeholder interviews, use case pattern recognition, and the ability to estimate technical effort. This is as much a software engineering skill as an AI skill.

## Common Failure Cases

**Selecting an agentic execution use case as the first deployment, before any simpler primitives have been validated**
Why: agentic execution has the highest governance requirements, the most failure modes, and the steepest integration complexity; teams attracted to the highest-value primitive underestimate the change management and trust-building required before an organisation will let an agent act autonomously.
Detect: the pilot is late, over budget, or blocked on legal/IT approval; the team is building governance processes from scratch in parallel with the product; stakeholders are nervous about autonomous actions.
Fix: use the 6-primitive ordering deliberately — pilot summarisation, classification, or extraction first; use the quick win to build organisational trust and the governance infrastructure that agentic execution will require.

**Impact/Effort scores are set once and never reassessed, causing high-effort use cases to remain deprioritised after model improvements make them viable**
Why: the framework depends on effort estimates that are a function of current technology; a use case rated high-effort in 2024 because of poor extraction accuracy may be low-effort in 2026 after model quality improvements, but the backlog is never revisited.
Detect: the prioritisation matrix still shows use cases from 18+ months ago in the "high effort, reassess later" quadrant; the team has not updated effort scores since the initial assessment.
Fix: schedule quarterly backlog reviews where effort scores are re-estimated; specifically re-evaluate any use case that was blocked on model capability, data quality, or integration complexity — all three evolve rapidly.

**Discovery sprint interviews only the loudest internal advocates, missing the use cases with the highest actual volume**
Why: interview-based discovery surfaces the use cases that motivated, articulate employees want to talk about; it systematically misses the high-volume repetitive tasks that workers have stopped noticing because they are so routine.
Detect: the use cases identified are all creative or knowledge-intensive tasks; no high-frequency, low-complexity tasks appear in the backlog despite the organisation processing millions of routine transactions.
Fix: supplement interviews with process mining — analyse system logs, ticket queues, and workflow data to find the highest-frequency human tasks; the best quick wins are often tasks that nobody thought to mention because they seem too simple.

## Connections
- [[landscape/enterprise-ai-adoption]] — the broader adoption context and governance gap
- [[agents/practical-agent-design]] — agentic execution primitive in depth
- [[evals/methodology]] — how to measure whether a use case is actually delivering value
- [[synthesis/rag-vs-finetuning]] — which AI approach suits which use case type
- [[synthesis/llm-decision-guide]] — model and infrastructure selection per use case
- [[synthesis/cost-optimisation]] — cost structure when scaling use cases
- [[synthesis/software-engineer-to-ai-engineer]] — SE skills that transfer to use case analysis

## Open Questions
- Do the 6 primitives hold across all industries, or do vertical-specific patterns emerge?
- How do you pick the right quick win — what criteria matter most for demonstrating value to leadership?
- At what point does an agentic execution use case require the full governance stack from day one?

