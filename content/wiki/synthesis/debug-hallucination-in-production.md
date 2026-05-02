---
type: synthesis
category: synthesis
para: resource
tags: [debugging, hallucination, llm, production, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing LLM confidently returning wrong, fabricated, or outdated information in production.
---

# Debug: Hallucination in Production

**Symptom:** LLM returns plausible but factually wrong answers. Fabricates names, dates, citations, or API responses. Users report incorrect information being presented as fact.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Wrong on factual questions about recent events | Knowledge cutoff — model does not have current data |
| Wrong despite correct context being retrieved | Lost-in-the-middle — context present but ignored |
| Fabricates citations or sources | Model generating plausible-looking but fake references |
| Consistent errors on specific domain | Gap in training data — model guessing in unfamiliar territory |
| Correct in testing, wrong in production | Production prompts differ from test prompts; context quality differs |

---

## Likely Causes (ranked by frequency)

1. Prompt does not instruct the model to use only retrieved context — model blends parametric memory with retrieved facts
2. Retrieved context correct but too long — relevant chunk buried in middle of context window
3. No grounding instruction — model not told to say "I don't know" when uncertain
4. Temperature too high — model making creative leaps on factual tasks
5. RAG retrieval failing silently — empty context passed to model, which answers from memory

---

## First Checks (fastest signal first)

- [ ] Log the exact retrieved context — is the correct information actually being sent to the model?
- [ ] Check whether the prompt explicitly instructs the model to use only provided context
- [ ] Check whether the prompt includes an "I don't know" instruction for missing information
- [ ] Check temperature — factual tasks should use temperature 0 or close to it
- [ ] Reproduce with a direct API call — test the prompt and context in isolation to confirm the model is the issue, not the pipeline

**Signal example:** RAG system returns wrong product price — logs show retrieved context contains the correct price but the model returns a different value; context window has 15 documents and the correct one is in position 8 of 15 — lost-in-the-middle failure.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Lost-in-the-middle context failure | [[llms/hallucination]] |
| Prompt not grounding the model | [[prompting/techniques]] |
| RAG retrieval not returning correct context | [[synthesis/debug-rag-wrong-context]] |
| Evaluating hallucination rate | [[evals/methodology]] |
| Adding citations to ground answers | [[apis/anthropic-api]] |

---

## Fix Patterns

- Add explicit grounding instruction — "Answer using only the information in the provided context. If the answer is not in the context, say 'I don't have that information'"
- Set temperature to 0 for factual retrieval tasks — no creative variance needed
- Rerank retrieved chunks — put the most relevant context first, not buried in the middle
- Add citations to responses — force the model to reference the source; makes fabrication visible
- Eval hallucination rate before and after any prompt or model change — treat it as a regression metric

---

## When This Is Not the Issue

If the model is correctly instructed to use context and context is correct but answers are still wrong:

- The context itself may be wrong — check the source document, not just the retrieved chunk
- The model may be interpreting ambiguous context incorrectly — rewrite the source document to be unambiguous

Pivot to [[evals/methodology]] to build an offline eval that catches hallucinations on your specific domain before they reach production.

---

## Connections

[[llms/hallucination]] · [[prompting/techniques]] · [[evals/methodology]] · [[synthesis/debug-rag-wrong-context]] · [[apis/anthropic-api]]
