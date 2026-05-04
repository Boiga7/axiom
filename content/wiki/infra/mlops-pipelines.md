---
type: concept
category: infra
para: resource
tags: [mlops, pipeline, zenml, metaflow, kubeflow, flyte, airflow, orchestration]
sources: []
updated: 2026-05-03
tldr: "ML pipeline orchestration automates the multi-step ML workflow (data → train → eval → deploy) with reproducibility, lineage, and scheduling — distinct from agent orchestration, which coordinates LLM tool calls at runtime."
---

# ML Pipeline Orchestration

> **TL;DR** ML pipeline orchestration automates the multi-step ML workflow (data → train → eval → deploy) with reproducibility, lineage, and scheduling — distinct from agent orchestration, which coordinates LLM tool calls at runtime.

Distinct from [[agents/langgraph]] or [[agents/multi-agent-patterns]], which orchestrate LLM tool calls at inference time. ML pipeline orchestration is about running multi-step batch workflows reliably in production: data ingestion, preprocessing, training, evaluation, and deployment — with dependency tracking, artifact versioning, and scheduling.

---

## What ML Pipeline Orchestration Solves

Without it, ML workflows are typically ad-hoc scripts run by hand. The core problems an orchestrator addresses:

| Problem | Solution |
|---------|----------|
| Manual step execution | Dependency graph: step B runs only after step A succeeds |
| Irreproducible runs | Artifact versioning: every input/output is tracked and replayable |
| No lineage | Data lineage: trace a model prediction back to the exact data and code that produced it |
| Wasted recomputation | Caching: skip steps whose inputs haven't changed |
| Scattered infrastructure | Stack abstraction: decouple pipeline logic from execution environment |
| No scheduling | Cron or event triggers: daily retraining, data-arrival triggers |

The pipeline is the artifact. Running it again with the same inputs should produce an identical result.

---

## The Standard ML Pipeline Shape

```
raw data
  → ingest & validate
    → clean & deduplicate
      → format conversion (JSONL, preference pairs)
        → train (Axolotl / TRL)
          → eval (RAGAS / custom evals)
            → push to HuggingFace Hub
              → A/B test / shadow deploy
```

Each arrow is a step. Each step has defined inputs and outputs (artifacts). The orchestrator manages execution order, retries, and artifact storage.

---

## ZenML

**Origin:** Open-source, Apache 2.0. Purpose-built for ML pipelines.  
**Core idea:** Decouple pipeline code from infrastructure via a "stack" abstraction — swap the orchestrator, artifact store, or experiment tracker without changing a line of pipeline code.

```python
from zenml import pipeline, step
from zenml.config import DockerSettings

@step
def ingest_data() -> list[dict]:
    return load_from_source()

@step
def train_model(data: list[dict]) -> str:
    checkpoint_path = run_axolotl_training(data)
    return checkpoint_path

@step
def evaluate_model(checkpoint: str) -> dict:
    return run_eval_suite(checkpoint)

@step
def push_to_hub(checkpoint: str, metrics: dict) -> None:
    if metrics["score"] >= 0.85:
        push_model(checkpoint)

@pipeline(settings={"docker": DockerSettings(requirements=["axolotl", "datasets"])})
def fine_tuning_pipeline():
    data = ingest_data()
    checkpoint = train_model(data)
    metrics = evaluate_model(checkpoint)
    push_to_hub(checkpoint, metrics)
```

The stack is configured separately — the same `@pipeline` code runs locally, on Kubeflow, on SageMaker, or AWS Step Functions by switching the stack:

```bash
zenml stack set production-stack   # Kubeflow orchestrator + S3 artifact store
zenml stack set local-stack        # local orchestrator + local artifact store
```

**Integrations:** W&B, MLflow (both native first-class integrations), Langfuse, HuggingFace Hub, Seldon/BentoML for deployment, most major cloud artifact stores.

**Best for:** New projects that want infrastructure portability and vendor independence. Teams that don't want to manage Kubernetes themselves but want Kubernetes-level scale when needed. Strong default choice for fine-tuning pipelines.

**Limitations:** Not ML-specific infrastructure (delegates to underlying orchestrators for complex scheduling). Smaller community than Airflow or Kubeflow.

---

## Metaflow

**Origin:** Netflix-internal, open-sourced 2019. AWS-native extension available.  
**Core idea:** Data scientist-first. Minimal infrastructure concern. Write Python; Metaflow handles compute scaling.

```python
from metaflow import FlowSpec, step, batch, S3

class FineTuningFlow(FlowSpec):

    @step
    def start(self):
        self.next(self.preprocess)

    @step
    def preprocess(self):
        self.dataset_path = prepare_dataset()
        self.next(self.train)

    @batch(cpu=8, memory=32000, image="pytorch/pytorch:2.1-gpu")
    @step
    def train(self):
        self.checkpoint = run_training(self.dataset_path)
        self.next(self.evaluate)

    @step
    def evaluate(self):
        self.metrics = run_eval(self.checkpoint)
        self.next(self.end)

    @step
    def end(self):
        print(f"Done. Score: {self.metrics['score']:.3f}")

if __name__ == "__main__":
    FineTuningFlow()
```

`@batch` transparently runs that step on AWS Batch with the specified compute. Local development uses the same code without `@batch`.

**Best for:** AWS-native data science teams that want to write Python and not think about Kubernetes. Fast local iteration, scale on demand.

**Limitations:** AWS-dependent for production scale (weak GCP/Azure story). No native UI comparable to Kubeflow or ZenML dashboard. Not ML-concept-aware (no built-in model registry, artifact store requires custom setup).

---

## Kubeflow Pipelines

**Origin:** Google, open-source. Kubernetes-native.  
**Core idea:** Every pipeline component is a containerised step. Full UI for visualising DAGs, pipeline runs, and artifacts.

```python
from kfp import dsl
from kfp.components import create_component_from_func

@dsl.component(base_image="python:3.11")
def train_step(dataset_path: str) -> str:
    import subprocess
    subprocess.run(["accelerate", "launch", "train.py", "--data", dataset_path])
    return "/output/checkpoint"

@dsl.component(base_image="python:3.11")
def eval_step(checkpoint_path: str) -> float:
    return run_eval(checkpoint_path)

@dsl.pipeline(name="fine-tuning-pipeline")
def fine_tuning_pipeline(dataset_path: str):
    train_task = train_step(dataset_path=dataset_path)
    eval_task = eval_step(checkpoint_path=train_task.output)
    eval_task.after(train_task)
```

**Best for:** Organisations already deeply on Kubernetes with dedicated MLOps engineering headcount. The UI is the strongest of any option for visualising complex multi-branch pipelines and comparing run artifacts side by side.

**Limitations:** Heavy Kubernetes dependency is the main cost. Setting up Kubeflow itself requires significant MLOps engineering investment. Overkill for teams without Kubernetes expertise. Component containerisation adds friction for fast iteration.

---

## Flyte

**Origin:** Lyft, now Union.ai. Open-source.  
**Core idea:** Strong typing and data lineage as first-class design principles. Every task input and output has a defined type; the system tracks lineage automatically.

```python
from flytekit import task, workflow, Resources

@task(requests=Resources(cpu="4", mem="16Gi", gpu="1"))
def train(dataset: FlyteFile) -> FlyteFile:
    checkpoint = run_training(dataset.path)
    return FlyteFile(path=checkpoint)

@task
def evaluate(checkpoint: FlyteFile) -> float:
    return run_eval(checkpoint.path)

@workflow
def fine_tuning_wf(dataset: FlyteFile) -> float:
    ckpt = train(dataset=dataset)
    return evaluate(checkpoint=ckpt)
```

`FlyteFile` and `FlyteDirectory` are typed artifact handles — the system tracks every artifact version and can replay any execution.

**Best for:** Compliance-heavy environments where audit trails and exact reproducibility are mandatory. Teams that want strong type checking enforced at the orchestration layer.

**Limitations:** Steeper learning curve than ZenML. Kubernetes-native like Kubeflow, so similar infrastructure overhead. Smaller community and ecosystem than the others.

---

## Apache Airflow

**Origin:** Airbnb, open-source. General-purpose workflow orchestrator.  
**Core idea:** Python DAGs. Not ML-specific. Treats ML training steps the same as any other Python callable or Bash command.

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG("fine_tuning_dag", schedule="@weekly", start_date=datetime(2026, 1, 1)) as dag:
    ingest = PythonOperator(task_id="ingest", python_callable=ingest_data)
    train = PythonOperator(task_id="train", python_callable=run_training)
    evaluate = PythonOperator(task_id="evaluate", python_callable=run_eval)
    deploy = PythonOperator(task_id="deploy", python_callable=push_to_hub)

    ingest >> train >> evaluate >> deploy
```

**Best for:** Teams that already have Airflow running for data pipelines and want to bolt on ML training steps without adopting a new tool. The ecosystem is massive — connectors for every cloud service exist.

**Limitations:** Not ML-aware. No built-in artifact versioning, model registry, or experiment tracking. You wire in W&B or MLflow manually. XCom is not designed for large payloads (see [[data/pipelines]] for the common XCom bloat failure). Airflow is a general orchestrator wearing an ML hat.

---

## Neptune Shutdown (March 2026)

Neptune SaaS shut down on **March 5, 2026** after OpenAI announced an acquisition (deal valued at under $400M in OpenAI stock). Neptune's experiment tracking and model monitoring platform will be integrated into OpenAI's internal research stack rather than continued as an external product.

**Impact:** Teams using Neptune must migrate. Primary migration targets:
- [[infra/experiment-tracking]] — W&B (richer UX, sweeps) or MLflow (self-hosted, open-source)
- Langfuse for production LLM monitoring (see [[observability/langfuse]])

Neptune's self-hosted customers received direct account manager outreach for transition paths. SaaS customers' data was deleted after the shutdown date.

---

## Orchestrators vs Experiment Trackers

These are complementary layers, not competing tools:

```
Pipeline orchestrator          Experiment tracker
(ZenML / Kubeflow / Airflow)   (W&B / MLflow)
────────────────────────────   ────────────────────────
Runs the sequence of steps     Logs what happened inside steps
Manages retries and scheduling Compares hyperparameter runs
Tracks artifact versions       Stores training curves and metrics
Routes data between steps      Surfaces model checkpoints
```

ZenML integrates with both W&B and MLflow as first-class stack components — the orchestrator triggers the run; the tracker records it. See [[infra/experiment-tracking]] for the tracking layer in detail.

---

## Fine-Tuning Pipeline: ZenML Steps Mapped

The standard fine-tuning workflow maps cleanly to ZenML steps:

| Stage | ZenML Step | Tools |
|-------|-----------|-------|
| Data collection | `ingest_step` | dbt, Airflow (see [[data/pipelines]]) |
| Filtering / dedup | `clean_step` | datasets library, custom validators |
| Format conversion | `format_step` | Convert to JSONL / Alpaca / ChatML |
| Train | `train_step` | [[fine-tuning/frameworks]] — Axolotl, TRL, Unsloth |
| Eval | `eval_step` | [[evals/ragas]], custom evals, inspect-ai |
| Push to Hub | `push_step` | [[infra/huggingface]] — `push_to_hub()` |
| A/B test | `deploy_step` | Shadow traffic, feature flags |

Each step's inputs and outputs are tracked as artifacts. If eval fails (score below threshold), the push step is blocked — the pipeline doesn't deploy a regressed model.

---

## Decision Guide

| Situation | Recommendation |
|-----------|---------------|
| New project, want portability | ZenML |
| AWS-native data science team | Metaflow |
| Already on Kubernetes, have MLOps engineers | Kubeflow Pipelines |
| Compliance-heavy, need audit trails | Flyte |
| Already have Airflow, adding ML steps | Airflow (with W&B/MLflow wired in) |
| Was using Neptune SaaS | Migrate to W&B or MLflow |

The default recommendation for most new projects is **ZenML** — it has the lowest infrastructure burden, native integrations with W&B and MLflow, and lets you defer the orchestrator choice (Kubeflow, SageMaker, Step Functions) until you know your scale requirements.

---

## Key Facts

- ZenML stack abstraction: swap orchestrator and artifact store without changing `@pipeline` / `@step` code
- Metaflow `@batch` decorator: transparent AWS Batch execution for GPU steps, same code locally
- Kubeflow: strongest UI for visualising complex pipeline runs; highest infrastructure overhead
- Flyte: `FlyteFile` / `FlyteDirectory` typed artifacts provide automatic data lineage
- Airflow: general-purpose, not ML-aware — requires manual wiring of W&B/MLflow
- Neptune SaaS: shut down March 5, 2026; migrate to W&B or MLflow

---

## Connections

- [[infra/experiment-tracking]] — W&B and MLflow, the tracking layer that pipeline orchestrators complement
- [[fine-tuning/frameworks]] — Axolotl, TRL, Unsloth — the tools that run inside the train step
- [[fine-tuning/decision-framework]] — whether to fine-tune at all before building a pipeline for it
- [[data/pipelines]] — dbt, Airflow, Prefect for the data preparation stages upstream of training
- [[infra/huggingface]] — push_to_hub, datasets library, Trainer used within pipeline steps
- [[evals/ragas]] — evaluation framework that plugs into the eval step
- [[evals/methodology]] — eval-as-gate pattern for blocking deployment on quality regression
- [[observability/langfuse]] — production LLM monitoring post-deployment (distinct from training tracking)
- [[cloud/aws-step-functions]] — one of the orchestrator backends ZenML and Metaflow can target
