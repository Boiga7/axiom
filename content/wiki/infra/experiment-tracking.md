---
type: concept
category: infra
para: resource
tags: [weights-and-biases, mlflow, neptune, weave, experiment-tracking, fine-tuning, training]
sources: []
updated: 2026-05-03
tldr: "Logging and comparing ML training runs. Distinct from production LLM observability: experiment tracking is for the training phase — comparing hyperparameter runs, catching overfitting, reproducing results."
---

# Experiment Tracking

Logging and comparing ML training runs. Distinct from production LLM observability (see [[observability/platforms]]): experiment tracking is for the training phase. Comparing hyperparameter runs, catching overfitting, reproducing results.

The two dominant tools: **Weights & Biases (W&B)** (industry standard, richer UX) and **MLflow** (open-source, self-hostable).

> **Neptune deprecation notice:** Neptune SaaS was shut down in March 2026 following its acquisition by OpenAI. Any teams still using Neptune must migrate. Migration paths: MLflow (open-source, self-hosted, drop-in for most use cases), W&B (managed, best UX), Aim (open-source alternative). See the Migration section below.

---

## Why It Matters

Without experiment tracking you cannot:
- Compare two fine-tuning runs with different learning rates
- Know which checkpoint produced the best eval loss
- Reproduce a result from six weeks ago
- Share training curves with a colleague

---

## Weights & Biases

### Setup

```bash
pip install wandb
wandb login   # paste API key from wandb.ai
```

### Basic run logging

```python
import wandb

wandb.init(
    project="my-llm-finetune",
    name="lora-lr1e-4",
    config={
        "model": "mistral-7b",
        "learning_rate": 1e-4,
        "lora_rank": 16,
        "epochs": 3,
    }
)

for step, batch in enumerate(train_loader):
    loss = train_step(batch)
    wandb.log({"train/loss": loss, "step": step})

wandb.finish()
```

### Key features

| Feature | What it does |
|---------|-------------|
| `wandb.log()` | Log any scalar, image, table, or histogram |
| `wandb.config` | Track hyperparameters for each run |
| `wandb.save()` | Upload model checkpoints as artefacts |
| Sweeps | Hyperparameter search (grid, random, Bayesian) |
| Tables | Log eval datasets with per-row predictions |
| Artefacts | Version datasets, models, and code |

### Integration with Axolotl (fine-tuning)

In `config.yaml`:

```yaml
wandb_project: my-finetune
wandb_name: experiment-1
wandb_log_model: checkpoint   # upload checkpoints as W&B artefacts
```

Axolotl's HuggingFace `Trainer` will call the W&B callback automatically.

### Integration with TRL

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./output",
    report_to="wandb",
    run_name="dpo-mistral-v1",
    logging_steps=10,
)
```

### Hyperparameter sweeps

```python
sweep_config = {
    "method": "bayes",
    "metric": {"name": "eval/loss", "goal": "minimize"},
    "parameters": {
        "learning_rate": {"min": 1e-5, "max": 1e-3},
        "lora_rank": {"values": [8, 16, 32]},
    }
}

sweep_id = wandb.sweep(sweep_config, project="my-finetune")
wandb.agent(sweep_id, function=train, count=20)
```

### W&B Weave (LLM tracing and evaluation)

Weave is a separate W&B product for LLM-specific observability, distinct from W&B core which targets training runs. It shares the W&B dashboard but is its own product surface.

What Weave covers:
- **LLM call tracing** — logs input, output, latency, and cost for every LLM call; supports nested traces for multi-step chains and agents
- **Prompt versioning** — tracks prompt text alongside the model and parameters used, so you can diff prompts across experiments
- **Evaluation datasets** — attach a dataset to an experiment, run the model over every row, and compare results across runs
- **Human annotation** — annotation queues for labelling model outputs; feeds back into evals
- **Experiment comparison UI** — side-by-side comparison of prompt versions, model outputs, and scores

Quick setup:

```python
import weave
from anthropic import Anthropic

weave.init("my-llm-project")   # creates a W&B project with Weave enabled

client = Anthropic()

@weave.op()
def call_model(prompt: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

Weave automatically wraps the call, captures inputs/outputs, and logs latency and token usage. No manual `wandb.log()` calls required for tracing.

Relationship to W&B core: training metrics (loss curves, checkpoints) still go through `wandb.log()` / `wandb.init()`. Weave sits on top for the inference/evaluation side. Both appear in the same W&B project.

---

## Neptune Deprecation and Migration

Neptune SaaS shut down in March 2026 after acquisition by OpenAI. If migrating off Neptune:

| Destination | When to choose |
|-------------|---------------|
| MLflow | Self-hosted requirement; regulated environment; already in Databricks |
| W&B | Fastest migration; best UX parity; fine-tuning-heavy workflow |
| Aim | Open-source alternative with a local UI; lighter-weight than MLflow |

All three support logging params, metrics, and artefacts via patterns nearly identical to Neptune's `run["metrics/loss"].log(value)` pattern. The HuggingFace `Trainer` `report_to` argument accepts `"mlflow"` or `"wandb"` directly.

---

## MLflow

Open-source, self-hostable. Better for orgs that can't send training data to a third-party cloud.

### Setup

```bash
pip install mlflow
mlflow ui   # starts local tracking server at http://localhost:5000
```

### Basic logging

```python
import mlflow

mlflow.set_experiment("llm-fine-tuning")

with mlflow.start_run(run_name="lora-lr1e-4"):
    mlflow.log_params({
        "model": "mistral-7b",
        "learning_rate": 1e-4,
        "lora_rank": 16,
    })

    for step, batch in enumerate(train_loader):
        loss = train_step(batch)
        mlflow.log_metric("train_loss", loss, step=step)

    mlflow.log_artifact("./output/checkpoint-final")
```

### Model Registry

MLflow has a model registry for promoting models through staging → production. Useful when multiple fine-tuned variants are in flight.

```python
mlflow.pytorch.log_model(model, "model", registered_model_name="mistral-ft-v1")

client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="mistral-ft-v1",
    version=1,
    stage="Production"
)
```

### Integration with HuggingFace Trainer

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./output",
    report_to="mlflow",
    run_name="sft-v1",
)
```

---

## W&B vs MLflow

| | W&B | MLflow |
|--|-----|--------|
| Hosting | SaaS (self-host option) | Self-host or Databricks |
| UX | Richer — sweeps, tables, artefact lineage | Functional — experiments, runs, registry |
| Cost | Free tier (100GB storage); paid for teams | Open-source (infra cost only) |
| Ecosystem | Deep HuggingFace/Axolotl/TRL integration | Broad ML ecosystem (sklearn, PyTorch, XGBoost) |
| Model registry | Via artefacts | Native model registry |
| Best for | Active research, fast iteration | Enterprise, regulated environments |

**Default recommendation:** W&B for fine-tuning experiments. MLflow if you need self-hosted control or are already in a Databricks environment.

---

## What to Always Log

Minimum for reproducibility:

```python
config = {
    # Model
    "base_model": "mistralai/Mistral-7B-v0.1",
    "peft_method": "lora",
    "lora_rank": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.1,
    # Training
    "learning_rate": 2e-4,
    "batch_size": 4,
    "gradient_accumulation_steps": 4,
    "max_steps": 1000,
    "warmup_ratio": 0.03,
    "lr_scheduler": "cosine",
    # Data
    "dataset": "my-dataset-v3",
    "max_seq_length": 2048,
    "num_samples": 10000,
}
```

Metrics to log every N steps: `train/loss`, `eval/loss`, `learning_rate`, `grad_norm`.

---

## Common Failure Cases

**W&B run starts but logs nothing because `WANDB_API_KEY` is not set in the training container**  
Why: the API key is set locally but not passed to the Docker container or CI job environment.  
Detect: W&B silently creates an offline run; metrics appear in local `wandb/` directory but not on wandb.ai.  
Fix: pass `WANDB_API_KEY` as an environment variable to the container; set it as a GitHub Actions secret for CI training jobs.

**MLflow `log_artifact` fails silently when the path doesn't exist**  
Why: `log_artifact("./output/checkpoint")` quietly succeeds without validating the path; if training failed before saving the checkpoint, nothing is uploaded.  
Detect: MLflow run shows no artifacts; checkpoint directory is empty or absent.  
Fix: verify the artifact path exists before calling `log_artifact`; add an assertion or raise an explicit error if the checkpoint is missing.

**Two concurrent training jobs corrupt each other's W&B run**  
Why: `wandb.init()` called without `name` or `id` generates a random run ID; if two jobs share the same project and one resumes the wrong run, metrics are interleaved.  
Detect: W&B run shows step numbers that are non-monotonic or jump unexpectedly.  
Fix: set a deterministic `name` tied to the experiment config hash; use `resume="allow"` only when intentionally resuming a specific run.

**Hyperparameter sweep logs incorrect `eval/loss` because evaluation runs less frequently**  
Why: `evaluation_strategy="epoch"` logs eval loss once per epoch, but `logging_steps=10` logs train loss every 10 steps; the sweep's metric `eval/loss` has fewer data points and a slower update rate.  
Detect: sweep convergence looks artificially slow; eval loss curve is flat between epochs.  
Fix: use `evaluation_strategy="steps"` with `eval_steps` matching `logging_steps` for sweep runs; ensures the sweep metric is updated regularly.

**MLflow model registry promotion silently fails under concurrent promotion requests**  
Why: two CI jobs promoting different versions to "Production" at the same time may leave the registry in an inconsistent state.  
Detect: `get_latest_versions(stage="Production")` returns two models; or the "Production" model is the wrong version.  
Fix: serialize promotion through a deployment job that checks current production before promoting; add a mutex or use compare-and-swap via the MLflow REST API.

## Connections

- [[fine-tuning/frameworks]] — Axolotl and TRL, which integrate W&B/MLflow via HuggingFace Trainer
- [[fine-tuning/lora-qlora]] — the training technique being tracked
- [[fine-tuning/dpo-grpo]] — preference optimisation runs to compare
- [[observability/platforms]] — production LLM monitoring (different from training tracking)
- [[infra/huggingface]] — `Trainer` class that emits W&B/MLflow metrics
## Open Questions

- What operational burden does this introduce that the documentation does not cover?
- At what scale does this infrastructure pattern stop being cost-effective?
