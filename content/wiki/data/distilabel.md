---
type: entity
category: data
para: resource
tags: [distilabel, synthetic-data, argilla, dpo, grpo, preference-datasets, pipeline]
tldr: distilabel is Argilla's framework for synthetic data pipelines — generating preference pairs, instruction datasets, and AI feedback at scale. Pipelines are Python code; steps are composable. Powers several SOTA open-source fine-tuning datasets.
sources: []
updated: 2026-05-01
---

# distilabel

> **TL;DR** distilabel is Argilla's framework for synthetic data pipelines — generating preference pairs, instruction datasets, and AI feedback at scale. Pipelines are Python code; steps are composable. Powers several SOTA open-source fine-tuning datasets.

## Key Facts
- Built by Argilla; open-source; used to generate datasets for SOTA models
- Framework for building synthetic data pipelines based on verified research methodologies
- Pipelines are Python code composed of steps (generators, labellers, filters)
- Generates: DPO preference pairs, RLHF datasets, instruction-following datasets, AI feedback annotations
- Key datasets produced: `argilla/distilabel-intel-orca-dpo-pairs`, `argilla/OpenHermesPreferences`, `argilla/distilabel-capybara-dpo-7k-binarized`
- Integrates with HuggingFace Hub for dataset push and pull
- Argilla (separate tool) handles dataset curation after distilabel generates

## Core Concepts

### Pipeline

A pipeline is a directed graph of steps. Each step takes rows in, transforms them, and passes rows to the next step.

```python
from distilabel.pipeline import Pipeline
from distilabel.steps import LoadDataFromDicts, KeepColumns
from distilabel.steps.tasks import TextGeneration, UltraFeedback

with Pipeline(name="preference-dataset") as pipeline:
    load = LoadDataFromDicts(
        data=[
            {"instruction": "Explain how PKCE prevents auth code interception"},
            {"instruction": "What is the difference between CrewAI and LangGraph?"},
        ]
    )

    generate_responses = TextGeneration(
        llm=AnthropicLLM(model="claude-sonnet-4-6"),
        num_generations=2,  # generate 2 responses per instruction
        system_prompt="You are an expert AI engineer."
    )

    rate_responses = UltraFeedback(
        llm=AnthropicLLM(model="claude-opus-4-7"),  # use stronger model as judge
        aspect="overall-rating",
    )

    keep = KeepColumns(columns=["instruction", "generations", "ratings", "chosen", "rejected"])

    load >> generate_responses >> rate_responses >> keep

# Run the pipeline
distiset = pipeline.run()
distiset.push_to_hub("your-org/your-dataset")
```

### Steps

Steps are the composable units:

| Step type | Purpose | Example |
|---|---|---|
| Generator | Creates initial rows | `LoadDataFromDicts`, `LoadDataFromHub` |
| Global step | Processes entire dataset | Deduplication, filtering |
| Task | LLM-powered transformation | `TextGeneration`, `UltraFeedback`, `SelfInstruct` |
| Labeller | Adds preference labels | Converts ratings to `chosen`/`rejected` pairs |

### LLM Connectors

```python
from distilabel.llms import AnthropicLLM, OpenAILLM, TransformersLLM

# Anthropic (Claude)
llm = AnthropicLLM(model="claude-sonnet-4-6", api_key="...")

# OpenAI
llm = OpenAILLM(model="gpt-4o-mini", api_key="...")

# Local (HuggingFace Transformers)
llm = TransformersLLM(model="mistralai/Mistral-7B-Instruct-v0.3")
```

## Generating DPO Preference Pairs

DPO training requires `(instruction, chosen_response, rejected_response)` triplets. distilabel generates them:

```python
from distilabel.steps.tasks import TextGeneration, UltraFeedback
from distilabel.steps import GroupColumns, FormatChatGenerationDPO

with Pipeline(name="dpo-preference-dataset") as pipeline:
    load = LoadDataFromHub(repo_id="your-org/instructions-dataset")

    # Generate multiple responses per instruction using different models
    gen_claude = TextGeneration(
        name="claude_gen",
        llm=AnthropicLLM(model="claude-sonnet-4-6"),
        num_generations=1,
    )
    gen_haiku = TextGeneration(
        name="haiku_gen",
        llm=AnthropicLLM(model="claude-haiku-4-5-20251001"),
        num_generations=1,
    )

    # Merge responses from both models
    group = GroupColumns(
        columns=["generation", "model_name"],
        output_columns=["generations", "model_names"],
    )

    # Rate with UltraFeedback (uses a judge LLM to score each response)
    feedback = UltraFeedback(
        llm=AnthropicLLM(model="claude-opus-4-7"),
        aspect="overall-rating",
    )

    # Format as DPO pairs (highest-rated = chosen, lowest = rejected)
    format_dpo = FormatChatGenerationDPO()

    load >> [gen_claude, gen_haiku] >> group >> feedback >> format_dpo

distiset = pipeline.run()
# distiset contains: instruction, chosen, rejected — ready for TRL DPOTrainer
```

## Self-Instruct (Instruction Generation)

Generating new instruction-following data from seed examples:

```python
from distilabel.steps.tasks import SelfInstruct

with Pipeline(name="instruction-generation") as pipeline:
    load = LoadDataFromDicts(data=[
        {"input": "How do I set up PKCE in OAuth 2.0?"},
        {"input": "What is the difference between semantic and episodic memory?"},
    ])

    generate_instructions = SelfInstruct(
        llm=AnthropicLLM(model="claude-sonnet-4-6"),
        num_instructions=5,  # generate 5 new instructions from each seed
        application_description="AI engineering and LLM security",
    )

    load >> generate_instructions

distiset = pipeline.run()
# Contains 10+ new instructions generated from 2 seeds
```

## Quality Filtering

After generation, filter before using for training:

```python
from distilabel.steps import FilterRowsWithIndenticalTextFields, DeitaFiltering

with Pipeline(name="quality-filter") as pipeline:
    load = LoadDataFromHub(repo_id="your-org/raw-dataset")

    # Remove duplicates
    dedup = FilterRowsWithIndenticalTextFields(fields=["instruction"])

    # DEITA quality filter (diversity + quality scoring)
    quality = DeitaFiltering(
        data_budget=1000,  # keep only top 1000 examples
    )

    load >> dedup >> quality

distiset = pipeline.run()
# High-quality, diverse subset ready for fine-tuning
```

## Key Datasets Produced with distilabel

| Dataset | Training objective | Use |
|---|---|---|
| `argilla/distilabel-intel-orca-dpo-pairs` | DPO | General instruction following |
| `argilla/OpenHermesPreferences` | DPO | Diverse preference pairs |
| `argilla/distilabel-capybara-dpo-7k-binarized` | DPO | Reasoning and creativity |

These datasets have been used to train several open-source SOTA models. Generating your own domain-specific version follows the same pipeline pattern.

## distilabel vs Manual Data Generation

| Approach | Scale | Reproducibility | Research-backed |
|---|---|---|---|
| Manual prompting | Low (100s) | Poor | No |
| distilabel pipeline | High (100k+) | Excellent | Yes |
| HuggingFace `datasets` only | Medium | Good | No |

distilabel's value: pipelines are version-controlled, reproducible, and based on published research (Self-Instruct, UltraFeedback, DEITA). You get the methodology, not just the data.

> [Source: Argilla distilabel documentation and GitHub, 2025]
> [Source: HuggingFace cookbook — Generate a Preference Dataset with distilabel]

## Common Failure Cases

**`UltraFeedback` step produces all identical ratings (e.g., every response scores 4/5) because the judge model is the same model that generated the responses**  
Why: when the generator and judge are the same model (e.g., both `claude-sonnet-4-6`), the judge has a self-enhancement bias and rates its own outputs consistently high, producing near-useless preference pairs where chosen and rejected scores are nearly equal.  
Detect: the output dataset shows `score_chosen` and `score_rejected` differing by less than 0.5 on average; DPO training on this data produces no measurable improvement.  
Fix: use a stronger model as judge (`claude-opus-4-7`) than the generator (`claude-sonnet-4-6` or `claude-haiku-4-5-20251001`); this hierarchy is the standard pattern in the distilabel documentation.

**`pipeline.run()` silently skips rows with generation errors, inflating perceived dataset size while actually producing fewer preference pairs than expected**  
Why: distilabel pipelines catch per-row generation errors by default and mark rows as failed without raising an exception at the pipeline level; if 20% of rows fail due to rate limits or content policy refusals, the output dataset is 20% smaller than the input, with no warning.  
Detect: `len(distiset["train"])` is smaller than `len(input_data)`; checking the output columns reveals a `generation_model_errors` column with non-null values for failed rows.  
Fix: check `distiset["train"]["generation_model_errors"]` after the run; set a failure rate threshold and raise if it exceeds your tolerance; retry failed rows or use a fallback model for content policy refusals.

**`GroupColumns` step merges responses from two parallel branches in the wrong order, producing mislabelled chosen/rejected pairs**  
Why: when two `TextGeneration` steps run in parallel and merge via `GroupColumns`, the column order in the merged output is not guaranteed to match the order the steps were defined; if the DPO formatter assumes `generations[0]` is from the stronger model, but order was swapped, chosen and rejected are inverted.  
Detect: DPO training on the output causes the model's quality to degrade; inspecting the `model_names` column shows the weaker model mapped to `chosen` and the stronger model to `rejected`.  
Fix: explicitly name the parallel branches and reference them by name in `GroupColumns`; verify the output order with `distiset["train"][0]["model_names"]` before running the full pipeline.

## Connections
- [[data/synthetic-data]] — the broader context for synthetic data generation
- [[data/rlhf-datasets]] — preference datasets that distilabel generates
- [[fine-tuning/dpo-grpo]] — the training objectives that consume distilabel's output
- [[fine-tuning/frameworks]] — TRL DPOTrainer consumes distilabel preference pairs
- [[evals/llm-as-judge]] — UltraFeedback uses LLM-as-judge methodology
- [[data/annotation-tooling]] — Argilla (built by the same team) for human review of distilabel-generated data

## Open Questions
- Does distilabel support GRPO training data generation (process reward model format)?
- What is the recommended budget (number of examples) for DPO fine-tuning a 7B model on a domain-specific task?
