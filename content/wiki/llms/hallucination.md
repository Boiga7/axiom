---
type: concept
category: llms
tags: [hallucination, grounding, factuality, rag, citations, detection, mitigation]
sources: []
updated: 2026-04-29
para: resource
tldr: Hallucination is a fundamental property of LLMs (not a bug) — covering why it happens, six types, detection methods (faithfulness checks, self-consistency sampling), and six mitigation strategies with RAG as the most effective.
---

# Hallucination

> **TL;DR** Hallucination is a fundamental property of LLMs (not a bug) — covering why it happens, six types, detection methods (faithfulness checks, self-consistency sampling), and six mitigation strategies with RAG as the most effective.

When a model generates confident, fluent, plausible-sounding output that is factually wrong. The model isn't lying — it has no concept of truth. It's pattern-matching on training data and producing statistically likely continuations. Hallucination is a fundamental property of how LLMs work, not a bug to be fixed.

---

## Why It Happens

LLMs are trained to produce probable next tokens, not true statements. During training, the model learns patterns like "the capital of France is ___" → "Paris", but also learns to complete sentences confidently even when it has no reliable signal.

**Root causes:**

- **Knowledge gaps:** the training data didn't contain the fact, so the model interpolates from related patterns
- **Outdated knowledge:** training cutoff means recent events, prices, versions are unknown
- **Long-tail facts:** rare facts appear few times in training data — the signal is weak
- **Retrieval failure in context:** even with facts in the context window, models sometimes ignore them and generate from parametric memory
- **Sycophancy:** models trained on human feedback learn to say what sounds good, not what's true

---

## Types of Hallucination

| Type | Example | Detection |
|---|---|---|
| **Factual fabrication** | Wrong date, made-up statistic | Cross-reference source |
| **Citation fabrication** | Real author, fake paper title | Check the citation exists |
| **Entity confusion** | Mixing up two similar people/companies | Named entity verification |
| **Temporal error** | Stating a future event as past | Date validation |
| **Numeric error** | Wrong calculation, wrong figure | Independent calculation |
| **Context ignore** | Ignoring provided document, answering from memory | Faithfulness check vs source |

---

## Detection

### LLM-as-Judge Faithfulness Check

For RAG systems: check whether the answer is grounded in the retrieved context.

```python
import anthropic

client = anthropic.Anthropic()

def check_faithfulness(context: str, answer: str) -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # cheap for bulk checking
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": f"""Is the following answer fully supported by the provided context?
Answer only with JSON: {{"faithful": true/false, "unsupported_claims": ["list any claims not in context"]}}

Context:
{context}

Answer:
{answer}"""
        }],
    )
    import json
    return json.loads(response.content[0].text)

result = check_faithfulness(
    context="Anthropic was founded in 2021 by Dario Amodei and others.",
    answer="Anthropic was founded in 2021 by Dario Amodei and Sam Altman.",
)
# {"faithful": false, "unsupported_claims": ["Sam Altman co-founded Anthropic"]}
```

### Self-Consistency Sampling

Run the same query multiple times with temperature > 0. If answers disagree, the model is uncertain.

```python
def self_consistency_check(prompt: str, n: int = 5) -> dict:
    answers = []
    for _ in range(n):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        answers.append(response.content[0].text.strip())

    from collections import Counter
    counts = Counter(answers)
    most_common, freq = counts.most_common(1)[0]
    confidence = freq / n

    return {
        "answer": most_common,
        "confidence": confidence,   # 1.0 = all identical, 0.2 = all different
        "all_answers": answers,
    }

result = self_consistency_check("What year was the Eiffel Tower built?")
# confidence 1.0 → reliable. confidence 0.4 → uncertain, verify.
```

### Uncertainty Probing

Ask the model if it's sure:

```python
def probe_uncertainty(claim: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=150,
        system="Be honest about uncertainty. If you're not sure, say so explicitly.",
        messages=[{
            "role": "user",
            "content": f"How confident are you in this claim, and why? Claim: {claim}"
        }],
    )
    return response.content[0].text
```

Claude is better calibrated than most models — it will often express genuine uncertainty when it has it. Don't suppress this with prompts like "answer confidently".

---

## Mitigation

### 1. RAG — Ground Every Answer in Retrieved Sources

The single most effective mitigation for factual hallucination. Force the model to answer from retrieved documents, not parametric memory.

```python
def grounded_answer(question: str) -> dict:
    # Retrieve relevant documents
    docs = vector_store.search(question, k=5)
    context = "\n\n".join(d.content for d in docs)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system="""Answer using ONLY the provided context.
If the answer is not in the context, say "I don't have information about that in the provided documents."
Do not use any knowledge outside the context.""",
        messages=[{
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}"
        }],
    )
    return {
        "answer": response.content[0].text,
        "sources": [d.metadata["source"] for d in docs],
    }
```

### 2. Citations — Force the Model to Point to Its Sources

```python
SYSTEM_PROMPT = """You are a research assistant.
When you make a factual claim, cite the source document using [1], [2], etc.
At the end, list your sources.
If you cannot cite a source for a claim, do not make that claim."""
```

Citations serve two purposes: they let humans verify, and they force the model to stay grounded — if it can't cite something, it shouldn't say it.

### 3. Constrain the Output Space

Reduce hallucination by reducing degrees of freedom:

```python
# Instead of open-ended generation, use structured output
from pydantic import BaseModel

class FactualResponse(BaseModel):
    answer: str
    confidence: float    # 0-1
    source_quote: str    # direct quote from context supporting the answer
    caveat: str | None   # any uncertainty to flag

# The model must find a source_quote — can't fabricate without one
```

### 4. Temperature = 0 for Factual Tasks

Higher temperature = more creative = more hallucination. For factual Q&A, use temperature 0.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=200,
    messages=[{"role": "user", "content": factual_question}],
    # temperature defaults to 1.0 — explicitly set to 0 for factual tasks
)
# Note: Anthropic API doesn't expose temperature parameter directly in all SDKs
# but the default is well-calibrated for factual tasks
```

### 5. Decompose Complex Queries

Long, multi-part queries increase hallucination risk. Break them down:

```python
# Instead of: "Compare the funding, team size, safety approach, and benchmark performance of Anthropic and OpenAI"
# Do:
questions = [
    "What is Anthropic's total funding?",
    "What is OpenAI's total funding?",
    "How does Anthropic approach AI safety?",
    "How does OpenAI approach AI safety?",
]
answers = [grounded_answer(q) for q in questions]
# Then synthesise
```

### 6. Post-Generation Verification

For high-stakes outputs, verify facts automatically:

```python
import re

def extract_and_verify_claims(text: str) -> list[dict]:
    """Extract factual claims and verify each one."""
    # Extract claims using Claude
    claims_response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"List all factual claims in this text as a JSON array of strings:\n\n{text}"
        }],
    )
    claims = json.loads(claims_response.content[0].text)

    results = []
    for claim in claims:
        # Verify each claim against your knowledge base
        verification = check_faithfulness(knowledge_base_text, claim)
        results.append({"claim": claim, "verified": verification["faithful"]})

    return results
```

---

## Hallucination by Task Type

| Task | Hallucination risk | Mitigation |
|---|---|---|
| Summarising a provided document | Low | Faithfulness check |
| Q&A with RAG context | Low-medium | Citations, faithfulness check |
| Creative writing | N/A — factual accuracy irrelevant | |
| Code generation | Medium (wrong APIs, wrong syntax) | Run the code, type check |
| Factual Q&A (no context) | High | RAG, self-consistency |
| Dates, numbers, names | High | Always verify externally |
| Citations / bibliography | Very high | Never trust, always verify |

---

## Claude Specifics

Claude is better calibrated than average for expressing uncertainty. It tends to say "I'm not certain but..." rather than fabricating confidently. This is partly from Constitutional AI training — honesty is an explicit value.

Claude's hallucination rate drops significantly on tasks where you:
- Provide the context it should answer from
- Ask it to cite specific quotes
- Explicitly tell it to say "I don't know" when uncertain

Do not prompt Claude to "always give a confident answer" — this actively increases hallucination.

---

## Key Facts

- Self-consistency confidence: 1.0 = all 5 runs identical (reliable); 0.2-0.4 = uncertain (verify externally)
- Temperature 0 for factual Q&A tasks; default temperature is calibrated for general tasks
- Citations as mitigation: forcing the model to cite prevents fabrication because it can't cite what doesn't exist
- Never prompt Claude to "always give a confident answer" — actively increases hallucination rate
- Citation fabrication (real author, fake paper) is very high risk — never trust LLM-generated citations
- Claude expresses genuine uncertainty more than average models (Constitutional AI honesty training)

## Connections

- [[rag/pipeline]] — RAG is the primary and most effective hallucination mitigation
- [[evals/llm-as-judge]] — faithfulness evaluation methodology for systematic detection
- [[prompting/techniques]] — prompting patterns to reduce hallucination risk
- [[safety/constitutional-ai]] — how honesty as an explicit value is trained into Claude
- [[llms/claude]] — Claude's calibration characteristics and uncertainty expression

## Open Questions

- Does extended thinking mode increase or decrease hallucination rate on factual tasks?
- Is there a reliable way to quantify hallucination rate per task domain without human labelling?
- How does RAG faithfulness change when the retrieved context itself contains inaccurate information?
