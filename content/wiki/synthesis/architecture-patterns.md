---
type: synthesis
category: synthesis
tags: [architecture, patterns, rag-chatbot, agent, classification, pipeline, design]
sources: []
updated: 2026-04-29
para: resource
tldr: Seven blueprints (RAG chatbot, document pipeline, classification routing, agentic loop, multi-agent, eval pipeline, hybrid human-AI) cover 90% of production AI applications — real systems combine two or three.
---

# AI Application Architecture Patterns

> **TL;DR** Seven blueprints (RAG chatbot, document pipeline, classification routing, agentic loop, multi-agent, eval pipeline, hybrid human-AI) cover 90% of production AI applications — real systems combine two or three.

The 7 blueprints that cover 90% of AI applications. Every production AI system is a variation or combination of these. Know these patterns and you can design or read any AI codebase.

---

## Pattern 1: RAG Chatbot

The most common pattern. A conversational interface over a private knowledge base.

```
User query
    ↓
Embed query → Vector search → Top-k chunks
    ↓
Build prompt (system + context + history + query)
    ↓
LLM → Answer with citations
    ↓
Store turn in conversation history
```

**Stack:** FastAPI or Next.js + Vercel AI SDK → Anthropic API → pgvector or Qdrant → Langfuse

```python
async def rag_chat(query: str, history: list, thread_id: str) -> str:
    # 1. Retrieve
    docs = await vector_store.search(query, k=5)
    context = "\n\n".join(d.content for d in docs)

    # 2. Build messages
    messages = trim_history(history) + [{"role": "user", "content": query}]

    # 3. Generate
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": f"Context:\n{context}"},
        ],
        messages=messages,
    )

    answer = response.content[0].text

    # 4. Persist history
    await db.append_turn(thread_id, query, answer)
    return answer
```

**When to use:** internal knowledge bases, customer support, documentation Q&A, policy assistants.

**Gotchas:** retrieval quality is the bottleneck. Add reranking before blaming the LLM.

---

## Pattern 2: Document Processing Pipeline

Batch-process documents to extract structured data.

```
Input documents (PDFs, emails, contracts)
    ↓
Parse + chunk
    ↓
LLM extraction (structured output per chunk)
    ↓
Aggregate + validate
    ↓
Store in database
```

```python
from pydantic import BaseModel

class ContractExtraction(BaseModel):
    parties: list[str]
    effective_date: str
    termination_date: str | None
    payment_terms: str
    key_obligations: list[str]
    governing_law: str

async def process_contract(pdf_path: str) -> ContractExtraction:
    text = extract_text_from_pdf(pdf_path)

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Extract the following from this contract as JSON:\n\n{text}"
        }],
    )

    return ContractExtraction.model_validate_json(response.content[0].text)

# Batch via Anthropic Batch API — 50% cheaper, async
```

**When to use:** contract review, invoice processing, form extraction, email triage, PDF parsing.

**Gotchas:** use structured output (Pydantic) to enforce schema. Validate every extraction before writing to DB.

---

## Pattern 3: Classification and Routing Pipeline

High-volume triage: route inputs to the right handler.

```
Input (text, email, support ticket, user query)
    ↓
LLM classifier (cheap model, few-shot)
    ↓
Route to handler A / B / C / escalate
```

```python
from enum import Enum

class TicketCategory(str, Enum):
    BILLING = "billing"
    TECHNICAL = "technical"
    REFUND = "refund"
    GENERAL = "general"
    ESCALATE = "escalate"

async def classify_ticket(ticket: str) -> TicketCategory:
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",  # always Haiku for classification
        max_tokens=20,
        system="""Classify support tickets. Respond with exactly one word:
billing, technical, refund, general, or escalate.
Escalate if the customer is angry or the issue seems legal.""",
        messages=[{"role": "user", "content": ticket}],
    )
    return TicketCategory(response.content[0].text.strip().lower())

async def route_ticket(ticket: str):
    category = await classify_ticket(ticket)
    handlers = {
        TicketCategory.BILLING: billing_team.handle,
        TicketCategory.TECHNICAL: tech_support.handle,
        TicketCategory.REFUND: refunds.handle,
        TicketCategory.GENERAL: general_bot.handle,
        TicketCategory.ESCALATE: human_agent.escalate,
    }
    return await handlers[category](ticket)
```

**When to use:** email triage, support ticket routing, content moderation, intent classification, spam detection.

**Gotchas:** always use Haiku or a small open model here. Classification at scale needs to be cheap.

---

## Pattern 4: Agentic Loop (ReAct)

The model reasons, chooses tools, observes results, and iterates until done.

```
User task
    ↓
┌─────────────────────┐
│  Think: what to do? │
│  Act: call tool     │◄─┐
│  Observe: result    │  │
└─────────────────────┘  │
    ↓ (if not done)      │
    └────────────────────┘
    ↓ (done)
Final answer
```

```python
from anthropic import Anthropic

client = Anthropic()
tools = [search_tool, calculator_tool, read_file_tool]

def agent_loop(task: str, max_steps: int = 10) -> str:
    messages = [{"role": "user", "content": task}]

    for _ in range(max_steps):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            return response.content[-1].text

        # Execute tool calls
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                })

        messages.append({"role": "user", "content": tool_results})

    return "Max steps reached."
```

**When to use:** coding assistants, research tasks, multi-step data gathering, any task requiring real-world actions.

**Gotchas:** bound the loop (max_steps). Log every tool call for debugging. Add human-in-the-loop for irreversible actions.

---

## Pattern 5: Multi-Agent Pipeline

Specialised agents in a workflow, each doing one thing well.

```
Orchestrator
    ├── Research agent  → web search, summarise sources
    ├── Writer agent    → draft content from research
    ├── Critic agent    → review and suggest improvements
    └── Final agent     → incorporate feedback, output
```

```python
from langgraph.graph import StateGraph, MessagesState

class PipelineState(MessagesState):
    research: str
    draft: str
    feedback: str
    final: str

graph = StateGraph(PipelineState)
graph.add_node("research", research_agent)
graph.add_node("write", writer_agent)
graph.add_node("critique", critic_agent)
graph.add_node("revise", reviser_agent)

graph.set_entry_point("research")
graph.add_edge("research", "write")
graph.add_edge("write", "critique")
graph.add_edge("critique", "revise")
graph.set_finish_point("revise")

pipeline = graph.compile()
result = pipeline.invoke({"messages": [HumanMessage(content="Write a blog post about RAG")]})
```

**When to use:** content generation pipelines, research assistants, code review pipelines, long-form document creation.

**Gotchas:** context doesn't automatically flow between agents — design handoffs explicitly. Use cheap models for simple stages.

---

## Pattern 6: Evaluation Pipeline

Automated quality measurement on every model output or change.

```
Test cases (golden set)
    ↓
Generate model outputs
    ↓
LLM-as-judge scoring
    ↓
Metrics dashboard + regression alerts
```

```python
import json
from dataclasses import dataclass

@dataclass
class EvalCase:
    input: str
    expected: str
    metadata: dict

def run_eval(cases: list[EvalCase], model: str) -> dict:
    results = []
    for case in cases:
        # Generate
        response = client.messages.create(
            model=model,
            max_tokens=512,
            messages=[{"role": "user", "content": case.input}],
        )
        output = response.content[0].text

        # Judge
        score = llm_judge(
            input=case.input,
            expected=case.expected,
            actual=output,
        )
        results.append({"case": case, "output": output, "score": score})

    return {
        "model": model,
        "avg_score": sum(r["score"] for r in results) / len(results),
        "pass_rate": sum(1 for r in results if r["score"] >= 4) / len(results),
        "results": results,
    }
```

**When to use:** before every model update, after every prompt change, in CI/CD pipeline.

**Gotchas:** golden sets go stale. Review and update them quarterly.

---

## Pattern 7: Hybrid Human-AI Workflow

AI handles the bulk; humans handle exceptions, edge cases, and quality gates.

```
Input volume
    ↓
AI triage (confidence scoring)
    ↓
High confidence → AI handles automatically
Low confidence  → Queue for human review
    ↓
Human reviews → Labels feed back to improve AI
```

```python
async def hybrid_process(item: str) -> dict:
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": item}],
    )

    output = response.content[0].text
    confidence = estimate_confidence(response)

    if confidence >= 0.9:
        # Auto-approve
        await db.save_result(item, output, reviewed_by="ai")
        return {"status": "auto", "output": output}
    else:
        # Queue for human
        task_id = await human_review_queue.enqueue(item, output)
        return {"status": "pending_review", "task_id": task_id}
```

**When to use:** content moderation, medical coding, legal review, financial decisions — anywhere AI needs human oversight for edge cases.

---

## Combining Patterns

Real systems combine patterns:

| System | Patterns used |
|---|---|
| Customer support bot | RAG chatbot + Classification routing + Hybrid human-AI |
| Code review tool | Document processing + Agentic loop + Evaluation pipeline |
| Research assistant | Agentic loop + Multi-agent + RAG chatbot |
| Content platform | Classification + Document processing + Evaluation |

---

## Key Facts

- 7 patterns cover ~90% of production AI systems; most real apps combine 2-3 patterns
- RAG chatbot stack: FastAPI/Next.js + Anthropic API + pgvector/Qdrant + Langfuse
- Classification routing: always use Haiku or a small open model — never Sonnet/Opus for classification at scale
- Agentic loop: always bound with max_steps; log every tool call; require human-in-the-loop for irreversible actions
- Multi-agent via LangGraph: context does not flow automatically between agents — design handoffs explicitly
- Evaluation pipeline: LLM-as-judge score >= 4 as pass threshold; golden sets go stale — review quarterly
- Hybrid human-AI: confidence >= 0.9 threshold for auto-approve; low confidence queued for human review
- Batch API for document processing pipeline: 50% cheaper, async, up to 10,000 requests per batch

## Connections

- [[agents/langgraph]] — LangGraph StateGraph for multi-agent pipelines (Pattern 5)
- [[rag/pipeline]] — full RAG chatbot implementation (Pattern 1)
- [[evals/methodology]] — evaluation pipeline pattern in depth (Pattern 6)
- [[synthesis/llm-decision-guide]] — which model and tool to use in each pattern
- [[synthesis/cost-optimisation]] — making each pattern cost-effective at scale
- [[agents/react-pattern]] — the ReAct loop underlying Pattern 4
- [[protocols/tool-design]] — tool definitions the agentic loop (Pattern 4) relies on
- [[synthesis/rag-vs-finetuning]] — which approach to reach for before choosing an architecture

## Open Questions

- At what point does combining Pattern 1 (RAG chatbot) and Pattern 4 (agentic loop) justify the added complexity over a simpler RAG-only system?
- Does Pattern 7 (hybrid human-AI) confidence thresholding generalise across domains, or does every domain need calibrated thresholds?
- Is the multi-agent pipeline (Pattern 5) genuinely better than a well-structured single-agent loop for content generation, or does the coordination overhead outweigh the gains?
