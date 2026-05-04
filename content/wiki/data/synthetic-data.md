---
type: concept
category: data
tags: [synthetic-data, fine-tuning, datasets, llm, data-generation, distillation]
sources: []
updated: 2026-05-04
para: resource
tldr: LLM-generated synthetic data enables thousands of domain-specific training examples per hour for pennies, but requires quality filtering to remove the 10-30% garbage and must guard against model collapse across generations.
---

# Synthetic Data Generation

> **TL;DR** LLM-generated synthetic data enables thousands of domain-specific training examples per hour for pennies, but requires quality filtering to remove the 10-30% garbage and must guard against model collapse across generations.

Using LLMs to generate training data for smaller models or fine-tuning runs. The fastest and cheapest way to create domain-specific datasets at scale.

---

## Why Synthetic Data

Collecting human-labelled data is slow (weeks), expensive ($1–$50 per example), and requires domain experts for technical domains. LLMs can generate thousands of high-quality examples per hour for pennies, if you can define what "high quality" means.

**Proven use cases:**
- Instruction-following datasets (GPT-3 → Alpaca → Orca pipeline)
- Code generation training data
- Domain-specific Q&A pairs for RAG evaluation (RAGAS golden sets)
- Preference pairs for DPO training
- Edge case generation for eval suites

---

## The Basic Pipeline

```python
import anthropic
import json

client = anthropic.Anthropic()

def generate_examples(topic: str, n: int = 100) -> list[dict]:
    examples = []
    for _ in range(n):
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",  # cheap for generation
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""Generate a realistic customer support message about {topic}
                and an ideal response. Return JSON: {{"message": "...", "response": "..."}}
                Vary the tone, complexity, and specific issue each time."""
            }]
        )
        try:
            examples.append(json.loads(response.content[0].text))
        except json.JSONDecodeError:
            continue  # skip malformed
    return examples
```

Use **Haiku** for generation (high volume, low cost), **Opus/Sonnet** for quality filtering.

---

## Techniques

### Self-Instruct

Generate instructions from a small seed set. The LLM produces new instructions similar to but different from the seeds.

1. Start with 175 human-written seed instructions
2. Prompt a capable model: "Generate a new instruction different from these examples"
3. Filter duplicates (ROUGE similarity), filter impossible or harmful instructions
4. Use filtered instructions as new training data

Stanford Alpaca (52K examples) was generated this way from 175 seeds using `text-davinci-003`. Cost: ~$500.

### Orca / Orca 2 Pattern

Generate not just answers but **reasoning traces** from a powerful teacher model. The student model learns to reason, not just pattern-match.

```python
teacher_response = claude_opus.messages.create(
    messages=[{
        "role": "user",
        "content": f"""Solve this step by step, showing all reasoning:
        
        Problem: {problem}
        
        Think through this carefully."""
    }]
)

# Training example = (problem, full reasoning trace + answer)
```

Models trained on Orca-style data significantly outperform models trained on output-only data.

### Preference Pair Generation

Generate (chosen, rejected) pairs for DPO/GRPO training:

```python
def generate_preference_pair(prompt: str) -> dict:
    # Generate two responses
    good_response = claude_sonnet.generate(prompt, system="Be thorough and accurate.")
    bad_response = claude_haiku.generate(prompt)  # typically lower quality
    
    # Or: generate two responses with different temperatures and have the model judge
    judge_response = claude_opus.messages.create(messages=[{
        "role": "user",
        "content": f"Which response is better and why?\nA: {response_a}\nB: {response_b}"
    }])
    
    chosen, rejected = select_based_on_judgment(judge_response, response_a, response_b)
    return {"prompt": prompt, "chosen": chosen, "rejected": rejected}
```

### Evol-Instruct (WizardLM)

Evolve simple instructions into harder ones:

1. Start with a simple instruction: "Write a function to sort a list"
2. Evolve: "Write a function to sort a list using merge sort, handling edge cases including empty lists, single elements, and lists with duplicates"
3. Evolve again: "Implement merge sort in Python with type hints, docstring, and unit tests"

Repeat for N rounds. Generate from easy to hard. The resulting dataset has a natural difficulty curve ideal for fine-tuning.

---

## Quality Filtering

Raw LLM-generated data has ~10–30% garbage. Always filter.

**Automated filters:**
- **Deduplication** — MinHash or SimHash; remove near-duplicates (similarity > 0.85)
- **Length filters** — remove responses < 50 characters (too short) or > 2000 characters (too long for many tasks)
- **Format validation** — if you're generating JSON, filter non-JSON
- **LLM-as-judge** — use a second model to score quality; keep top 70–80%
- **Perplexity filtering** — high-perplexity text may be nonsense; low-perplexity text may be duplicated

```python
def quality_filter(examples: list[dict]) -> list[dict]:
    judge = anthropic.Anthropic()
    filtered = []
    for ex in examples:
        score = judge.messages.create(
            model="claude-haiku-4-5-20251001",
            messages=[{"role": "user", "content": f"Rate quality 1-5 (JSON): {ex}"}]
        )
        if json.loads(score.content[0].text)["score"] >= 4:
            filtered.append(ex)
    return filtered
```

---

## Limitations and Risks

- **Distribution collapse** — training on LLM-generated data can reduce diversity over multiple generations (model collapse)
- **Bias amplification** — LLMs amplify biases in their training data; synthetic data inherits and concentrates them
- **Capability ceiling** — a model can't generate training data for capabilities it doesn't have
- **Contamination** — if synthetic data overlaps with eval benchmarks, benchmarks become invalid

For critical applications, mix synthetic and human-labelled data (50/50 or 70/30 human-heavy).

---

## Tools

- **distilabel** (Argilla) — structured pipeline for synthetic data generation with quality scoring
- **DataDreamer** — research-oriented framework for LLM-based dataset creation
- **LLMDataHub** — curated list of high-quality open datasets to start from

---

## Key Facts

- Alpaca (52K examples) generated via Self-Instruct from 175 seeds using text-davinci-003; cost ~$500
- Raw LLM-generated data contains 10-30% garbage — always filter
- Near-duplicate deduplication threshold: ROUGE/MinHash similarity > 0.85
- Orca-style reasoning traces outperform output-only training data significantly
- Mix synthetic and human-labelled 50/50 or 70/30 (human-heavy) for critical applications
- Batch API provides 50% cost reduction for large-scale generation runs
- Quality filter: keep top 70-80% by LLM-as-judge score

## Common Failure Cases

**`json.loads(response.content[0].text)` raises `JSONDecodeError` because the model wraps its output in a markdown code fence**  
Why: even when explicitly instructed to return JSON, Claude occasionally wraps the JSON in triple-backtick code blocks (`\`\`\`json ... \`\`\``); `json.loads` fails on the fence characters.  
Detect: the `except json.JSONDecodeError: continue` block skips 10-30% of examples; printing the raw `response.content[0].text` shows fence-wrapped JSON.  
Fix: strip the fence before parsing: use a regex `re.search(r'\{.*\}', text, re.DOTALL)` to extract the JSON object; or use `instructor` to enforce structured output without relying on string parsing.

**Self-Instruct generates semantically near-identical instructions because the seed diversity is too low and the model pattern-matches**  
Why: with fewer than 50 seeds covering only 2-3 topic areas, the model generates variations on the same template rather than genuinely diverse instructions; ROUGE deduplication removes the obvious duplicates but many semantically identical examples survive.  
Detect: after deduplication, plot an embedding UMAP of the generated instructions; tight clusters indicate low diversity; topic coverage is narrow relative to the original seed diversity goal.  
Fix: increase the seed set to 175+ instructions across 10+ domains before generating; prompt the model to explicitly avoid generating instructions similar to the provided examples; add embedding-based deduplication with a cosine similarity threshold of 0.85.

**LLM-as-judge quality filter scores all generated examples 4-5 out of 5, passing garbage through because the judge prompt does not provide calibration examples**  
Why: without concrete examples of what a score-2 or score-3 response looks like in the prompt, the judge model applies a liberal interpretation and rates almost everything high; this is the same calibration problem that affects LLM-as-judge in evals.  
Detect: the quality filter retains 95%+ of examples; spot-checking filtered examples manually shows responses that are clearly low quality; the distribution of scores is heavily right-skewed.  
Fix: include 2-3 concrete examples at each score level (1, 3, 5) in the judge prompt with explanations; or use a comparative rating (rank A vs B vs C) rather than absolute scoring to force discrimination.

**Benchmark contamination occurs because synthetic data was generated from prompts that include eval benchmark examples as seeds**  
Why: if any of the 175 seed instructions are drawn from HumanEval, MBPP, or another standard benchmark, the generated dataset may contain near-duplicates of eval examples; fine-tuning on this data inflates benchmark scores without genuine capability improvement.  
Detect: run the generated dataset through an n-gram overlap check against the benchmark test sets; overlap > 5% with any benchmark indicates potential contamination.  
Fix: explicitly exclude known benchmark examples from the seed set; run contamination checks before publishing or training on the dataset; keep a held-out test set that was never used as seed material.

## Connections

- [[fine-tuning/decision-framework]] — where synthetic data fits in the fine-tuning decision tree
- [[fine-tuning/dpo-grpo]] — preference pair generation for DPO using teacher-student approach
- [[evals/methodology]] — synthetic data for generating golden eval sets (RAGAS style)
- [[evals/llm-as-judge]] — LLM-as-judge quality filtering of generated examples
- [[apis/anthropic-api]] — Batch API for high-volume generation at 50% cost reduction
- [[data/rlhf-datasets]] — preference pair generation as one synthetic data use case
- [[data/pipelines]] — Airflow/Prefect orchestration for the generation, filtering, and dedup stages
- [[data/model-cards]] — documenting synthetic data generation methodology is a model card section

## Open Questions

- At what dataset size does model collapse (distribution narrowing) become measurable?
- Is there a reliable automated way to detect benchmark contamination in synthetic datasets?
- How does Orca-style reasoning trace quality degrade when the teacher model is smaller (e.g., Sonnet vs Opus)?
