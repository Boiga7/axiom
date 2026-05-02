---
type: entity
category: data
tags: [annotation, label-studio, argilla, rlhf, human-feedback, preference-data, fine-tuning, data-collection]
sources: [raw/inbox/annotation-tooling-websearch-2026-05-02.md]
updated: 2026-05-02
para: resource
tldr: Label Studio (general-purpose, strong RLHF pairwise templates) and Argilla (purpose-built for LLM preference data) are the two open-source defaults for building RLHF and fine-tuning datasets. RLHF annotation costs 5-10x more per sample than compute — this is why synthetic data is so attractive.
---

# Annotation Tooling

> **TL;DR** Label Studio (general-purpose, strong RLHF pairwise templates) and Argilla (purpose-built for LLM preference data) are the two open-source defaults for building RLHF and fine-tuning datasets. RLHF annotation costs 5-10x more per sample than compute — this is why synthetic data is so attractive.

Human annotation is the bottleneck of alignment. Models trained with RLHF need pairwise preference data (chosen/rejected response pairs), and models trained with SFT need demonstration data (human-written ideal responses). Both require tooling to present tasks to annotators and collect structured output.

---

## Cost Reality

RLHF annotation costs **5-10x more per sample than compute**. 600 high-quality RLHF annotations can cost ~$60,000. Roughly 167x the compute expense for the same training run. [Source: taskmonk.ai, 2026] [unverified]

This is the primary reason synthetic data generation (see [[data/distilabel]], [[data/synthetic-data]]) is so attractive: it replaces expensive human annotation with model-generated preference pairs, at the cost of some alignment quality.

---

## The Three Stages of LLM Training Data

Each stage of RLHF requires different annotation work:

| Stage | Task for Annotators | Output |
|---|---|---|
| **SFT (Supervised Fine-Tuning)** | Write ideal responses to prompts | Instruction-following pairs |
| **Reward Model Training** | Rate/rank pairs of model responses | Chosen/rejected preference pairs |
| **RL Prompt Collection** | Curate diverse prompts for RL training | Prompt set |

---

## Label Studio

General-purpose, open-source annotation platform. Covers image, audio, text, and video labelling. Most relevant for LLM work: **pairwise preference collection** (human preference for RLHF) and **instruction annotation** (SFT data).

### Setup

```bash
pip install label-studio
label-studio start
# UI at http://localhost:8080
```

### Pairwise Preference Template (RLHF)

Label Studio ships a pairwise human preference template. Annotators see two model responses side by side and select the preferred one:

```python
import label_studio_sdk as ls

client = ls.Client(url="http://localhost:8080", api_key="YOUR_API_KEY")
project = client.start_project(
    title="RLHF Preference Collection",
    label_config="""
    <View>
      <Header value="Choose the better response:"/>
      <Text name="prompt" value="$prompt"/>
      <PairwiseComparison name="pref" toName="prompt,response_a,response_b"
                          selectedChoices="$selected">
        <Text name="response_a" value="$response_a"/>
        <Text name="response_b" value="$response_b"/>
      </PairwiseComparison>
    </View>
    """
)
```

### Import and Export

```python
# Import tasks (prompt + two responses for comparison)
tasks = [
    {
        "data": {
            "prompt": "Explain gradient descent",
            "response_a": model_response_1,
            "response_b": model_response_2
        }
    }
    for model_response_1, model_response_2 in generate_response_pairs(prompts)
]
project.import_tasks(tasks)

# Export completed annotations as chosen/rejected pairs for DPO
annotations = project.export_tasks(export_type="JSON")
preference_pairs = [
    {
        "prompt": t["data"]["prompt"],
        "chosen": t["data"]["response_a"] if t["annotations"][0]["result"][0]["value"]["selected"] == "left" else t["data"]["response_b"],
        "rejected": t["data"]["response_b"] if t["annotations"][0]["result"][0]["value"]["selected"] == "left" else t["data"]["response_a"],
    }
    for t in annotations if t["annotations"]
]
```

### ML Backend for Pre-annotation

Label Studio supports plugging in a model to suggest labels before humans review:

```python
# label_studio_ml backend — auto-suggests responses for annotators to accept/edit
from label_studio_ml import LabelStudioMLBase
import anthropic

class ClaudePreannotator(LabelStudioMLBase):
    def predict(self, tasks, **kwargs):
        client = anthropic.Anthropic()
        predictions = []
        for task in tasks:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": task["data"]["prompt"]}]
            )
            predictions.append({
                "result": [{"value": {"text": response.content[0].text}, "from_name": "response", "to_name": "prompt", "type": "textarea"}],
                "score": 0.8
            })
        return predictions
```

---

## Argilla

Open-source data curation platform purpose-built for LLMs. Built by the team behind [[data/distilabel]]. The FeedbackDataset (v2.x) is the primary dataset type for LLM annotation tasks.

### Setup

```bash
pip install argilla
# Self-host
docker run -d --name argilla -p 6900:6900 argilla/argilla-quickstart:latest
```

Or deploy on Hugging Face Spaces (free tier available for small teams).

### Creating a Preference Collection Dataset

```python
import argilla as rg

# Connect
rg.init(api_url="http://localhost:6900", api_key="admin.apikey")

# Define the dataset schema
dataset = rg.FeedbackDataset(
    fields=[
        rg.TextField(name="prompt", title="User Prompt"),
        rg.TextField(name="response_a", title="Response A"),
        rg.TextField(name="response_b", title="Response B"),
    ],
    questions=[
        rg.RatingQuestion(
            name="preference",
            title="Which response is better?",
            values=[1, 2],   # 1=A, 2=B
            required=True
        ),
        rg.TextQuestion(
            name="reason",
            title="Why did you prefer this response?",
            required=False
        )
    ],
    guidelines="Rate responses on helpfulness, accuracy, and safety. "
               "Prefer concise, correct, non-harmful answers."
)

# Add records (prompt + two responses)
records = [
    rg.FeedbackRecord(fields={
        "prompt": "Explain gradient descent",
        "response_a": response_a,
        "response_b": response_b,
    })
    for response_a, response_b in response_pairs
]
dataset.add_records(records)

# Push to Argilla server for annotation
dataset.push_to_argilla(name="rlhf-preferences-v1", workspace="default")
```

### Export to DPO Training Format

```python
# Pull completed annotations
dataset = rg.FeedbackDataset.from_argilla("rlhf-preferences-v1", workspace="default")

# Convert to DPO chosen/rejected format
dpo_data = []
for record in dataset.records:
    if not record.responses:
        continue
    preference = record.responses[0].values["preference"].value
    dpo_data.append({
        "prompt": record.fields["prompt"],
        "chosen": record.fields["response_a"] if preference == 1 else record.fields["response_b"],
        "rejected": record.fields["response_b"] if preference == 1 else record.fields["response_a"],
    })

# Push to HuggingFace Hub
from datasets import Dataset
Dataset.from_list(dpo_data).push_to_hub("my-org/rlhf-preferences")
```

### Argilla + distilabel Integration

Argilla and distilabel are designed to work together: distilabel generates synthetic preference pairs, Argilla lets humans review and curate them.

```python
from distilabel.pipeline import Pipeline
from distilabel.steps import LoadDataFromHub
from distilabel.steps.tasks import UltraFeedback

# Generate synthetic preferences → push to Argilla for human review
pipeline = Pipeline(
    name="synthetic-to-argilla",
    steps=[
        LoadDataFromHub(repo_id="HuggingFaceH4/instruction-dataset"),
        UltraFeedback(llm=InferenceEndpointsLLM(model_id="meta-llama/Meta-Llama-3-8B-Instruct")),
        # ArgillaPushStep → uploads for human review
    ]
)
```

---

## Tool Comparison

| | Label Studio | Argilla |
|---|---|---|
| **Best for** | General annotation tasks; any modality | LLM preference/feedback data specifically |
| **UI** | Task-focused annotation UI | LLM-optimised review UI |
| **RLHF support** | Templates; custom config required | First-class FeedbackDataset |
| **distilabel integration** | Manual export | Native integration |
| **Self-host** | Docker, pip | Docker, HuggingFace Spaces |
| **License** | Apache 2.0 | Apache 2.0 |
| **Commercial** | Label Studio Enterprise | HuggingFace managed |

---

## Data Quality Signals

Key quality metrics to monitor:

- **Inter-annotator agreement** — Cohen's kappa > 0.6 is acceptable; > 0.8 is good
- **Annotation consistency** — same annotator rates similar items similarly (track per-annotator variance)
- **Task clarity** — vague rubrics produce noisy data; write explicit guidelines before data collection begins

Annotation guidelines should specify: what counts as "better" for your task (helpfulness? safety? factual accuracy?), examples of edge cases, and how to handle ties.

---

## When to Use Synthetic Data Instead

Annotation tooling is expensive. Consider [[data/synthetic-data]] and [[data/distilabel]] first:

| Situation | Approach |
|---|---|
| Need 100k+ preference pairs | Synthetic (LLM-as-annotator via UltraFeedback) |
| Domain-specific safety data | Human annotation (nuance matters) |
| Style/format preferences | Synthetic (clear rubric, LLM can judge) |
| Medical/legal accuracy | Human annotation (errors are high-stakes) |
| Limited budget | Synthetic generation + small human spot-check |

---

## Key Facts

- RLHF annotation costs 5-10x more per sample than compute; 600 pairs can cost ~$60,000 [unverified]
- Argilla FeedbackDataset (v2.x) is the current standard; v1 TextClassification/TokenClassification datasets are deprecated
- Label Studio ML Backend enables Claude/GPT pre-annotation — humans review, not write from scratch
- distilabel + Argilla pipeline: generate synthetically, human-review selectively
- Inter-annotator agreement (Cohen's kappa > 0.6) is minimum acceptable for training data quality

---

## Common Failure Cases

**Label Studio `PairwiseComparison` export produces ties where `selected` is neither "left" nor "right" because annotators skipped the question**  
Why: annotators can submit a task without selecting a preference; the export JSON contains an empty `result` array for those annotations, which causes a `KeyError` or `IndexError` when the processing script accesses `t["annotations"][0]["result"][0]`.  
Detect: the preference pair extraction script throws `IndexError: list index out of range` on some rows; the raw export shows tasks with `"annotations": [{"result": []}]`.  
Fix: filter out tasks with empty results before processing: `if t["annotations"] and t["annotations"][0]["result"]`; add a `required=True` constraint in the Label Studio template to force annotators to select before submitting.

**Argilla `FeedbackDataset.push_to_argilla()` fails silently after timeout, leaving a partially uploaded dataset**  
Why: large datasets (10,000+ records) can hit Argilla's HTTP timeout during upload; the Python call returns without error if the timeout is caught internally, but the Argilla server only received a fraction of the records.  
Detect: `rg.FeedbackDataset.from_argilla(name).records` returns fewer records than the uploaded list; checking the Argilla UI shows the dataset exists but with a lower row count.  
Fix: upload in batches using `dataset.add_records(batch)` in chunks of 500–1000; add a post-upload assertion that `len(dataset.records) == len(source_records)`.

**Inter-annotator agreement is measured only at the end of the project and reveals κ < 0.5, making the entire dataset unusable**  
Why: agreement is computed retrospectively on completed annotations; if the annotation guidelines were ambiguous, all annotators may have interpreted the task differently from the start, producing inconsistent labels throughout the dataset.  
Detect: Cohen's kappa across annotators is below 0.5 after all annotations are complete; reviewing disagreements shows systematic differences in how annotators interpret "helpfulness" rather than random noise.  
Fix: run an inter-annotator agreement calibration round on 50–100 overlap tasks before the main annotation begins; review disagreements, update guidelines, and retrain annotators before starting the full project.

## Connections

- [[data/distilabel]] — Argilla's synthetic data pipeline; works alongside Argilla for hybrid human+synthetic annotation
- [[data/synthetic-data]] — LLM-generated preference pairs to supplement human annotation
- [[data/rlhf-datasets]] — HH-RLHF, UltraFeedback — pre-built datasets before building your own
- [[fine-tuning/dpo-grpo]] — DPO/GRPO training uses chosen/rejected pairs produced by annotation tooling
- [[fine-tuning/decision-framework]] — when annotation cost is justified vs synthetic data

## Open Questions

- How does LLM-as-annotator quality compare to human annotation for safety-sensitive domains?
- Is Argilla v2.x API now stable enough to recommend over v1 for new projects?
- At what scale does commercial annotation (Scale AI, Surge) become cheaper than running an in-house Argilla deployment?
