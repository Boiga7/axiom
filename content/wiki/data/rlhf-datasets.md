---
type: concept
category: data
tags: [rlhf, datasets, preferences, dpo, training-data, huggingface, annotation]
sources: []
updated: 2026-05-01
para: resource
tldr: RLHF/DPO training requires chosen/rejected preference pairs — quality of the preference dataset directly determines alignment quality, and a bad dataset is worse than none at all.
---

# RLHF Datasets and Preference Data

> **TL;DR** RLHF/DPO training requires chosen/rejected preference pairs — quality of the preference dataset directly determines alignment quality, and a bad dataset is worse than none at all.

The training data behind alignment. RLHF, DPO, and GRPO all require datasets of human (or LLM-judged) preferences — chosen/rejected response pairs or ranked lists. Quality of the preference dataset directly determines alignment quality.

---

## Dataset Types

### Instruction Datasets (SFT)

Prompt + ideal response pairs. Used for supervised fine-tuning before any preference learning.

```jsonl
{"messages": [
  {"role": "user", "content": "Explain transformers in simple terms."},
  {"role": "assistant", "content": "A transformer is a type of neural network..."}
]}
```

**Key public datasets:**
- `tatsu-lab/alpaca` — 52K GPT-3-generated instruction-response pairs
- `Open-Orca/OpenOrca` — 4M examples with reasoning traces (Orca style)
- `HuggingFaceH4/ultrachat_200k` — 200K multi-turn conversations
- `teknium/OpenHermes-2.5` — 1M curated instruction pairs

### Preference Datasets (DPO/RLHF)

Triplets of prompt + chosen response + rejected response.

```jsonl
{
  "prompt": "What is the capital of France?",
  "chosen": "The capital of France is Paris.",
  "rejected": "I'm not sure, maybe Lyon?"
}
```

**Key public datasets:**
- `Anthropic/hh-rlhf` — 170K human preference pairs (helpful/harmless)
- `HuggingFaceH4/ultrafeedback_binarized` — 64K GPT-4 rated preferences
- `Intel/orca_dpo_pairs` — 12K high-quality reasoning preference pairs
- `jondurbin/truthy-dpo-v0.1` — truthfulness-focused preferences

---

## Anthropic HH-RLHF

The most-cited alignment dataset. 170K human preference pairs split into:
- **Helpful:** humans choose between two assistant responses based on helpfulness
- **Harmless:** humans choose the less harmful response

```python
from datasets import load_dataset

ds = load_dataset("Anthropic/hh-rlhf")
example = ds["train"][0]
# {
#   "chosen": "\n\nHuman: ... \n\nAssistant: [helpful response]",
#   "rejected": "\n\nHuman: ... \n\nAssistant: [less helpful response]"
# }
```

For DPO, you need to parse the conversation format into messages:

```python
def parse_hh_rlhf(example: dict) -> dict:
    def parse_conv(text: str) -> list[dict]:
        messages = []
        turns = text.split("\n\n")
        for turn in turns:
            if turn.startswith("Human:"):
                messages.append({"role": "user", "content": turn[7:].strip()})
            elif turn.startswith("Assistant:"):
                messages.append({"role": "assistant", "content": turn[11:].strip()})
        return messages
    
    chosen_messages = parse_conv(example["chosen"])
    rejected_messages = parse_conv(example["rejected"])
    
    return {
        "prompt": chosen_messages[:-1],  # all but last turn
        "chosen": chosen_messages[-1]["content"],
        "rejected": rejected_messages[-1]["content"],
    }
```

---

## UltraFeedback

64K instructions each rated by GPT-4 across four criteria:
- **Instruction following** (1-5)
- **Truthfulness** (1-5)
- **Honesty** (1-5)
- **Helpfulness** (1-5)

The `binarized` version converts ratings to chosen/rejected pairs (highest vs lowest rated for each prompt).

```python
ds = load_dataset("HuggingFaceH4/ultrafeedback_binarized")
# Columns: prompt, chosen, rejected, score_chosen, score_rejected
```

UltraFeedback is the dataset used to train Zephyr and many strong open models. Higher quality than Alpaca for alignment.

---

## Building Custom Preference Datasets

### Human Annotation

The gold standard. Tools:
- **Argilla** — open-source annotation UI with model-in-the-loop
- **LabelStudio** — general annotation, supports LLM tasks
- **Scale AI / Surge HQ** — managed annotation at scale

Annotation workflow:
1. Generate N responses per prompt using your model (usually N=2-4)
2. Show pairs to annotators, ask "which is better?"
3. Collect pairwise comparisons, convert to chosen/rejected
4. Quality check: inter-annotator agreement (target κ > 0.7)

### LLM-as-Judge for Preference Generation

```python
import anthropic
import json

client = anthropic.Anthropic()

def generate_preference_pair(prompt: str, response_a: str, response_b: str) -> dict:
    judge_prompt = f"""You are an expert judge evaluating AI assistant responses.

Given the following user prompt and two responses, determine which response is better.
Consider: accuracy, helpfulness, clarity, and safety.

User prompt: {prompt}

Response A: {response_a}

Response B: {response_b}

Respond with JSON: {{"winner": "A" or "B", "reasoning": "brief explanation"}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": judge_prompt}],
    )
    
    result = json.loads(response.content[0].text)
    return {
        "prompt": prompt,
        "chosen": response_a if result["winner"] == "A" else response_b,
        "rejected": response_b if result["winner"] == "A" else response_a,
    }
```

### Rejection Sampling (Constitutional AI style)

Generate many responses, filter to high-quality subset:

```python
def build_sft_dataset_via_rejection(prompts: list[str], n_samples: int = 8) -> list[dict]:
    dataset = []
    for prompt in prompts:
        # Generate n_samples responses
        responses = [generate(prompt) for _ in range(n_samples)]
        
        # Score each response
        scores = [score_response(prompt, r) for r in responses]
        
        # Keep only top-k
        top_k = sorted(zip(scores, responses), reverse=True)[:2]
        if top_k[0][0] > 0.8:  # quality threshold
            dataset.append({"prompt": prompt, "response": top_k[0][1]})
    
    return dataset
```

---

## Data Quality Checks

A bad preference dataset is worse than no preference dataset — it teaches the wrong thing.

```python
from datasets import Dataset

def quality_check(ds: Dataset) -> dict:
    issues = []
    
    # Length ratio check — rejected shouldn't be dramatically shorter
    for ex in ds:
        chosen_len = len(ex["chosen"].split())
        rejected_len = len(ex["rejected"].split())
        if rejected_len < chosen_len * 0.3:
            issues.append(f"Suspicious length ratio: {chosen_len}/{rejected_len}")
    
    # Duplicate check
    prompts = [ex["prompt"] for ex in ds]
    duplicates = len(prompts) - len(set(prompts))
    
    # Near-duplicate deduplication (MinHash)
    # ...
    
    return {"total": len(ds), "issues": len(issues), "duplicates": duplicates}
```

Key checks:
- **Length bias:** annotators often prefer longer responses regardless of quality
- **Duplicates:** near-duplicate prompts inflate apparent dataset size
- **Label noise:** inter-annotator agreement < 0.6 means preferences are unreliable
- **Distribution coverage:** dataset should cover the full input distribution of your use case

---

## The HuggingFace `datasets` API

```python
from datasets import Dataset, DatasetDict, concatenate_datasets

# Merge multiple preference datasets
hh = load_dataset("Anthropic/hh-rlhf", split="train").select_columns(["chosen", "rejected"])
uf = load_dataset("HuggingFaceH4/ultrafeedback_binarized", split="train_prefs")

# Align schemas
hh = hh.map(lambda x: {"prompt": extract_prompt(x["chosen"])})
combined = concatenate_datasets([hh, uf])

# Split
split = combined.train_test_split(test_size=0.05, seed=42)

# Upload to hub
split.push_to_hub("your-org/combined-preferences", private=True)
```

---

## Key Facts

- Anthropic/hh-rlhf: 170K human preference pairs (helpful + harmless splits)
- UltraFeedback: 64K prompts rated by GPT-4 on four criteria; binarized version used for Zephyr training
- Alpaca: 52K GPT-3-generated pairs, cost ~$500 to produce
- OpenHermes-2.5: 1M curated instruction pairs
- Inter-annotator agreement target: κ > 0.7 (below 0.6 = unreliable preferences)
- Length bias: annotators prefer longer responses regardless of quality — must control for this
- DPO requires prompt + chosen + rejected triplets; ensure rejected isn't just shorter than chosen

## Connections

- [[fine-tuning/dpo-grpo]] — DPO/GRPO training consumes these preference datasets
- [[data/synthetic-data]] — generating preference pairs when human annotation is too slow or expensive
- [[evals/llm-as-judge]] — LLM-as-judge for scalable preference labelling without human annotators
- [[safety/constitutional-ai]] — CAI's self-critique approach to preference data generation
- [[infra/huggingface]] — HuggingFace datasets API for loading and merging preference datasets
- [[data/pipelines]] — orchestrating preference collection, dedup, and PII filtering at scale

## Open Questions

- How does inter-annotator agreement hold up for preference pairs on highly technical coding tasks?
- What is the minimum viable dataset size for DPO to meaningfully shift model behaviour?
- How does LLM-judged preference quality compare to human annotation quality at scale?
