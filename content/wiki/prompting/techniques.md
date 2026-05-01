---
type: concept
category: prompting
tags: [prompting, xml, chain-of-thought, dspy, claude, few-shot, context-engineering]
sources: []
updated: 2026-04-29
para: resource
tldr: Claude-specific XML structuring outperforms Markdown, 2-5 few-shot examples in example tags, CoT for reasoning tasks but not with Extended Thinking, and DSPy for automated optimisation at scale.
---

# Prompt Engineering

> **TL;DR** Claude-specific XML structuring outperforms Markdown, 2-5 few-shot examples in example tags, CoT for reasoning tasks but not with Extended Thinking, and DSPy for automated optimisation at scale.

The craft of eliciting the best output from a language model through input design. More accurately called **context engineering** now — the discipline covers what to put in the context window, not just how to phrase a question.

> [Source: Perplexity research, 2026-04-29] [unverified]

---

## Why It's a Real Skill

The gap between a naive prompt and a well-engineered one is routinely 20–40% on task performance. DSPy auto-optimisation can find better prompts than human-written ones 60–80% of the time — but it needs a human-defined evaluation metric to optimise against.

The key insight: LLMs are extremely sensitive to framing, ordering, and structural signals in their input. Understanding *why* a prompt works makes you better at designing new ones.

---

## Claude-Specific: XML Structuring

Claude is trained on XML-structured documents and responds best to XML-tagged inputs. This is the most important Claude-specific prompt engineering fact.

**XML beats Markdown beats numbered lists beats plain prose for Claude.**

```xml
<role>
You are a senior software engineer reviewing a pull request.
</role>

<context>
The PR adds a new authentication middleware to a Django REST API.
<file name="auth/middleware.py">
{{ code }}
</file>
</context>

<task>
Review for security vulnerabilities, correctness, and code quality.
</task>

<output_format>
Return a JSON object with keys: "verdict" (approve|request_changes), "issues" (list), "suggestions" (list).
</output_format>
```

Use `<example>` tags to wrap few-shot examples. Use `<scratchpad>` to give Claude space to think before committing to an answer.

---

## Few-Shot Prompting

2–5 examples is the sweet spot. More examples help with consistent formatting and edge-case handling; too many dilute the context budget.

**Rules for good examples:**
- Wrap each in `<example>` ... `</example>` tags
- Include edge cases, not just happy paths
- Input and output should match the exact format you expect
- Order matters: hardest examples last (Claude is influenced by recency)

```xml
<examples>
<example>
<input>Classify sentiment: "The product is amazing!"</input>
<output>positive</output>
</example>
<example>
<input>Classify sentiment: "Worst experience I've had."</input>
<output>negative</output>
</example>
</examples>
```

---

## Chain-of-Thought (CoT)

Asking the model to reason step-by-step before answering. Significantly improves performance on multi-step reasoning, math, and code.

**Classic CoT:**
```
Think step by step before answering.
```

**More structured:**
```xml
<task>Solve this algebra problem: 3x + 7 = 22</task>
<scratchpad>Work through the solution step by step.</scratchpad>
<answer>State the final answer here.</answer>
```

**When NOT to use CoT:**
- **Extended Thinking models (claude-opus-4-7 with `thinking` enabled)** — the model reasons internally; adding explicit CoT instructions conflicts and degrades performance
- **Simple classification/extraction tasks** — CoT adds latency and tokens for no gain
- **When you need exactly-formatted output** — CoT can bleed into the output format

See [[apis/anthropic-api]] for extended thinking configuration.

---

## System Prompt Design

The system prompt sets the operating context for the entire conversation. Best practices:

1. **Role first** — establish identity/persona before instructions
2. **Constraints before capabilities** — say what Claude should NOT do before what it should
3. **Output format in system, not user message** — the format is constant; keep it out of the dynamic turn
4. **Long static context → cache it** — anything > 1,024 tokens in the system prompt should use `cache_control`
5. **Separate concerns with XML** — `<role>`, `<constraints>`, `<tools>`, `<output_format>` as distinct blocks

---

## Zero-Shot vs Few-Shot vs Fine-Tuning Decision

```
Start with zero-shot (well-structured XML prompt)
  → Wrong format / style? Add few-shot examples
  → Still inconsistent? Add DSPy optimisation
  → Style/domain mismatch that prompting can't fix? Consider fine-tuning
```

Fine-tuning should be the last resort, not the first. See [[fine-tuning/decision-framework]].

---

## DSPy

Auto-optimising prompt modules. Instead of hand-writing prompt strings, you define:
1. A **signature** (input fields → output fields)
2. An **evaluator** (ground-truth labels or LLM judge)
3. An **optimizer** (BootstrapFewShot, MIPROv2, etc.)

DSPy then searches the space of prompts and few-shot examples to find the best combination. Typical improvement: 10–40% over hand-written prompts on constrained tasks.

```python
import dspy

class Classify(dspy.Signature):
    """Classify customer support tickets by urgency."""
    ticket: str = dspy.InputField()
    urgency: Literal["low", "medium", "high"] = dspy.OutputField()

classifier = dspy.ChainOfThought(Classify)
# Then optimise with dspy.MIPROv2 against your labelled dataset
```

Best used when: you have a repeatable task with measurable correctness, and you're running it at scale (thousands of calls per day).

---

## Prompt Injection Defence

When user-provided content is included in prompts (RAG context, tool results, user messages in agents), it becomes an attack surface. See [[security/prompt-injection]] for full treatment.

Quick mitigations:
- Always separate user content from instructions with XML tags
- Never let user content appear before core instructions in the prompt
- Validate tool results before including them as context
- Use a separate model call to screen untrusted content before giving it to the main agent

---

## Advanced Techniques

The following are less commonly used but have well-evidenced gains for specific scenarios.

### Tree of Thoughts (ToT)

Instead of a single reasoning chain (CoT), generate multiple candidate reasoning paths, evaluate each, and select the best. Improves performance on tasks with multiple plausible solution paths (math puzzles, creative planning, search problems).

Cost: significantly more tokens and latency. Use only when CoT produces inconsistent results on a high-value task.

### Self-Consistency

Generate the same prompt multiple times with temperature > 0, then take the majority answer. The ensemble effect reduces variance on reasoning tasks.

```python
responses = [generate(prompt, temperature=0.7) for _ in range(5)]
final = majority_vote(responses)
```

Improvement: 10-20% on math/reasoning tasks. Cost: 5x tokens. Use when accuracy matters more than cost.

### Reflexion

After an initial response (especially a failed tool call or code output), feed the result back to the model with an explicit reflection prompt: "Review what you did, identify errors, try again."

Useful in agent loops where the model can observe the outcome of its actions and self-correct. Similar to the human debugging loop. See [[agents/react-pattern]].

### Prompt Chaining

Break complex tasks into a sequence of focused prompts, feeding each output as input to the next. Each step is simpler and more verifiable than doing everything in one prompt.

Example pipeline:
```
1. Extract key claims from document → claims list
2. Verify each claim against database → verified/unverified list
3. Summarise verified claims into report → final output
```

When to use: tasks that require distinct reasoning steps where intermediate outputs benefit from review or branching.

### Meta Prompting

Use the model itself to generate or improve prompts for a target task. Provide examples of the task and ask the model to write the best prompt to solve it. This is the manual version of what DSPy automates.

Useful for one-off tasks or as a starting point before DSPy optimisation.

---

## Context Engineering: Beyond the Prompt

The broader discipline of managing what goes into the context window:

- **Prompt compression** — LLMLingua and RECOMP reduce long contexts by 3-10x with minimal quality loss
- **Memory management** — for long agent runs, summarise old turns rather than dropping them
- **Tool result filtering** — strip verbose tool outputs before passing to the LLM
- **Dynamic system prompts** — inject only the relevant instructions for each request (reduces tokens, reduces confusion)

At scale, context engineering decisions affect cost as much as model selection. See [[prompting/context-engineering]] for context rot, compaction, and JIT retrieval.

---

## Quick Reference: What Works

| Technique | Improvement | Cost |
|---|---|---|
| XML structuring (Claude) | ~15–20% on formatting | Zero |
| Few-shot examples (3–5) | ~20–30% on consistency | +tokens |
| Chain-of-thought | ~20–40% on reasoning | +tokens + latency |
| DSPy optimisation | 10–40% on constrained tasks | Engineering time |
| Prompt caching | 0% quality, 90% cost reduction | Minimal setup |

---

## Key Facts

- XML vs Markdown for Claude: XML tags outperform Markdown and numbered lists; this is the single most impactful Claude-specific technique
- Few-shot sweet spot: 2-5 examples; wrap each in `<example>` tags; put hardest examples last (recency effect)
- CoT improvement: ~20-40% on multi-step reasoning; zero or negative effect with Extended Thinking enabled
- DSPy MIPROv2: 10-40% improvement over hand-written prompts; needs 50-100 labelled examples
- Prompt caching: system prompts >1,024 tokens should use `cache_control`; saves 90% on repeated calls
- Zero-shot → few-shot → DSPy → fine-tuning is the correct escalation order

## Connections

- [[apis/anthropic-api]] — extended thinking, prompt caching, tool use
- [[evals/methodology]] — measuring whether prompt changes actually improve task performance
- [[rag/pipeline]] — structuring retrieved context in prompts
- [[security/prompt-injection]] — prompt injection attack patterns and defences
- [[prompting/dspy]] — automated prompt optimisation
- [[prompting/context-engineering]] — managing context window beyond just prompt phrasing

## Open Questions

- Does XML structuring advantage persist for Claude 5+ or was it an artefact of specific training data?
- How does the optimal few-shot count vary by task domain — is 2-5 still right for highly technical tasks?
- When DSPy-optimised prompts are 40% better than hand-written ones, what does that imply about the upper bound of manual prompt engineering skill?
