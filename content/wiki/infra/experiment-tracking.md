---
type: concept
category: infra
para: resource
tags: [weights-and-biases, mlflow, experiment-tracking, fine-tuning, training]
sources: []
updated: 2026-05-01
---

# Experiment Tracking

Logging and comparing ML training runs. Distinct from production LLM observability (see [[observability/platforms]]): experiment tracking is for the training phase — comparing hyperparameter runs, catching overfitting, reproducing results.

The two dominant tools: **Weights & Biases (W&B)** (industry standard, richer UX) and **MLflow** (open-source, self-hostable).

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

## Connections

- [[fine-tuning/frameworks]] — Axolotl and TRL, which integrate W&B/MLflow via HuggingFace Trainer
- [[fine-tuning/lora-qlora]] — the training technique being tracked
- [[fine-tuning/dpo-grpo]] — preference optimisation runs to compare
- [[observability/platforms]] — production LLM monitoring (different from training tracking)
- [[infra/huggingface]] — `Trainer` class that emits W&B/MLflow metrics
