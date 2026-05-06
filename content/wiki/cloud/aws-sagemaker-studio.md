---
type: concept
category: cloud
para: resource
tags: [aws, sagemaker, sagemaker-studio, canvas, autopilot, ground-truth, data-wrangler, feature-store, pipelines, model-monitor, clarify, jumpstart, aif-c01, saa-c03]
tldr: "SageMaker sub-services — Canvas (no-code ML), Autopilot (AutoML), Ground Truth (data labelling), Data Wrangler (feature prep), Feature Store, Pipelines (MLOps), Model Monitor (drift), Clarify (bias/explainability), JumpStart (foundation models). AIF-C01 Domain 3 core."
sources: []
updated: 2026-05-06
---

# Amazon SageMaker Sub-Services

> **TL;DR** SageMaker sub-services — Canvas (no-code ML), Autopilot (AutoML), Ground Truth (data labelling), Data Wrangler (feature prep), Feature Store, Pipelines (MLOps), Model Monitor (drift), Clarify (bias/explainability), JumpStart (foundation models). AIF-C01 Domain 3 core.

SageMaker is a platform, not a single service. AIF-C01 Domain 3 (Foundations of Generative AI Applications, 28%) and Domain 1 (AI/ML Fundamentals, 20%) test scenario-to-sub-service matching. The exam gives a job role or use case and expects you to identify which SageMaker capability solves it.

---

## Sub-Services at a Glance

| Sub-Service | Who uses it | What it does |
|---|---|---|
| **SageMaker Studio** | All ML practitioners | Unified IDE — notebook, experiments, pipelines |
| **Canvas** | Business analysts, non-coders | No-code ML — point-and-click model building |
| **Autopilot** | Data scientists wanting AutoML | AutoML — auto feature engineering, algorithm selection, tuning |
| **Ground Truth** | Data engineers | Data labelling — human + automated labelling workflows |
| **Data Wrangler** | Data scientists | Visual feature engineering and data preparation |
| **Feature Store** | ML engineers | Centralised, shared feature storage (online + offline) |
| **Pipelines** | MLOps engineers | CI/CD for ML — DAG-based training pipelines |
| **Experiments** | Data scientists | Track and compare training runs |
| **Model Monitor** | MLOps engineers | Detect data/model drift in production |
| **Clarify** | ML engineers, compliance | Bias detection and model explainability |
| **JumpStart** | All ML practitioners | Model hub — pre-trained models, fine-tuning, 1-click deploy |
| **Model Registry** | MLOps engineers | Versioned model catalogue with approval workflow |
| **A2I (Augmented AI)** | Product engineers | Human review routing for low-confidence predictions |

---

## Sub-Service Deep Dives

### SageMaker Studio

The unified web-based IDE for all SageMaker services. Replaces the need to navigate separate AWS console pages.

- Jupyter notebooks, terminals, file browser
- Access to all sub-services from a single interface
- Supports multiple ML practitioners on the same domain simultaneously
- SageMaker Studio Classic (old) → SageMaker Studio (new, JupyterLab-based, 2023+)

**Exam trigger:** "unified ML environment", "central IDE for the ML team", "notebook environment with SageMaker integration"

---

### Amazon SageMaker Canvas

No-code ML for business analysts and non-technical users.

**Capabilities:**
- Upload data (CSV, S3) via point-and-click — no SQL, no Python
- Canvas automatically detects column types and suggests the prediction target
- Runs AutoML under the hood (Autopilot) to build and evaluate models
- Time series forecasting, binary/multi-class classification, regression
- Generates predictions and confidence scores; exports to S3 or connects to QuickSight
- Ready Signal integration: can trigger retraining when data updates

**Who uses it:** Business analysts, domain experts who own the data but lack ML expertise.

**Exam trigger:** "non-technical users build ML models", "business analysts predict outcomes without coding", "no-code forecasting"

---

### Amazon SageMaker Autopilot

AutoML for data scientists — automatically explores feature engineering, algorithm selection, and hyperparameter tuning.

**Capabilities:**
- Input: tabular data (CSV/Parquet in S3) + target column
- Output: ranked model leaderboard with accuracy metrics; deployable best model
- Generates explainability reports (via Clarify integration)
- Modes: AutoPilot (full auto), HPO (custom algorithm + tune), Ensemble (combine multiple models)
- Supports: binary/multi-class classification, regression, time series forecasting (2023+)
- Produces editable notebooks showing what it tried — "glass box" AutoML

**vs Canvas:** Autopilot requires a data scientist; Canvas requires no ML knowledge. Autopilot gives code artefacts; Canvas gives a GUI and predictions.

**Exam trigger:** "AutoML", "automatically select the best algorithm", "auto-tune hyperparameters", "data scientist wants fast baseline"

---

### Amazon SageMaker Ground Truth

Managed data labelling service.

**Capabilities:**
- Send unlabelled data to human labellers (internal workforce, Amazon Mechanical Turk, or private vendor)
- Active learning: model labels high-confidence items automatically, humans handle low-confidence only
- Label types: image classification, bounding boxes, named entity recognition, text classification, semantic segmentation, video object tracking, 3D point clouds
- Produces labelled datasets ready for training
- Ground Truth Plus: fully managed labelling service (AWS handles the workforce)

**Exam trigger:** "label training data", "human review of images", "build training dataset", "annotate data", "bounding box labelling"

---

### Amazon SageMaker Data Wrangler

Visual data preparation and feature engineering — no code required.

**Capabilities:**
- 300+ built-in data transforms (impute missing values, encode categoricals, normalise, one-hot encode)
- Data flow: visual DAG of transformation steps
- Connects to S3, Athena, Redshift, EMR, Snowflake, and more
- Generates PySpark/Pandas code for the transformation steps (export to notebook)
- Data Quality and Insights Report: statistics, class imbalance, target leakage detection
- Exports directly to SageMaker Feature Store, Pipelines, or S3

**vs Glue DataBrew:** Both are visual, no-code data prep tools. Data Wrangler is purpose-built for ML and integrates directly into SageMaker. Glue DataBrew is for general data preparation for any downstream use.

**Exam trigger:** "prepare features for training", "visual feature engineering", "no-code data transformation for ML", "impute missing values without coding"

---

### Amazon SageMaker Feature Store

Centralised repository for ML features — enables reuse across models and teams.

**Two stores:**
- **Online store:** low-latency (<10ms) retrieval for real-time inference (backed by key-value store)
- **Offline store:** historical features in S3 for training and batch inference

**Capabilities:**
- Features written once, used by multiple models — eliminates training/serving skew
- Time-travel queries: retrieve features as they existed at a specific point in time (critical for correct backtesting)
- Feature groups: named collections of related features with a defined schema
- Integrated with Data Wrangler, Pipelines, and Autopilot

**Training/serving skew:** when the feature pipeline used at training differs from the one at inference, causing degraded production performance. Feature Store solves this with a single shared pipeline.

**Exam trigger:** "share features across teams", "consistent features between training and inference", "feature reuse", "training/serving skew", "time-travel feature queries"

---

### Amazon SageMaker Pipelines

MLOps CI/CD for machine learning — automates the end-to-end ML workflow.

**Capabilities:**
- DAG-based pipeline definition in Python SDK
- Steps: Processing, Training, Evaluation, RegisterModel, Condition (branch on metric), Transform (batch), CreateModel
- Integrated with SageMaker Experiments for run tracking
- Trigger via: scheduled events, S3 uploads, EventBridge, or API call
- Version-controlled pipeline definitions stored in SageMaker

**Exam trigger:** "automate training workflow", "retrain on new data automatically", "MLOps pipeline", "trigger model retraining on schedule", "CI/CD for ML"

---

### Amazon SageMaker Experiments

Track, compare, and organise ML training runs.

**Capabilities:**
- Log metrics, parameters, and artefacts for each training run
- Group runs into experiments; compare across runs with visual charts
- Integrated into Studio and Pipelines
- Supports automatic tracking when using SageMaker Training jobs

**Exam trigger:** "compare model training runs", "track hyperparameter experiments", "experiment management"

---

### Amazon SageMaker Model Monitor

Detect and alert on data and model drift in production endpoints.

**Monitor types:**

| Monitor | What it detects |
|---|---|
| Data Quality Monitor | Input feature distribution drift (vs training baseline) |
| Model Quality Monitor | Prediction drift (accuracy, precision drop) |
| Bias Drift Monitor | Emerging bias in live predictions (via Clarify) |
| Feature Attribution Drift Monitor | SHAP value changes over time |

**How it works:**
- Captures a sample of inference requests and predictions automatically
- Runs a scheduled processing job (hourly, daily, etc.) against a baseline from training
- Publishes metrics to CloudWatch; alerts via SNS
- Integrates with SageMaker Clarify for bias monitoring

**Exam trigger:** "detect data drift", "model degradation in production", "alert when model accuracy drops", "monitor inference for distribution shift"

---

### Amazon SageMaker Clarify

Bias detection and model explainability.

**Capabilities:**
- **Pre-training bias detection:** analyse the training dataset for class imbalance and demographic disparity before training
- **Post-training bias detection:** analyse model predictions for fairness issues across groups
- **Model explainability (SHAP):** compute feature importance scores — which features drive predictions most?
- **Explainability reports:** auto-generated PDFs attached to model cards
- Integrated with Model Monitor for continuous production bias/attribution drift

**Bias metrics:** Demographic parity difference, disparate impact, conditional demographic disparity.

**Exam trigger:** "detect bias in training data", "explain model predictions", "feature importance", "fairness audit", "regulatory compliance for ML model", "SHAP values"

**Responsible AI angle:** Clarify is SageMaker's answer to Responsible AI requirements — it surfaces both data bias and prediction bias, and generates documentation for model governance.

---

### Amazon SageMaker JumpStart

Model hub and deployment accelerator.

**Capabilities:**
- Catalogue of 700+ pre-trained models: foundation models (Llama 3, Mistral, Falcon, AI21, Stability AI), domain-specific models, and SageMaker built-in algorithm solutions
- 1-click fine-tuning: select a base model, provide fine-tuning data, launch a training job
- 1-click deployment: deploy any model to a SageMaker endpoint with auto-scaling
- Solution templates: end-to-end ML pipelines for common use cases (fraud detection, demand forecasting)
- Integrates with SageMaker Studio for browsing and deployment

**vs Bedrock:** JumpStart hosts and fine-tunes open-source models on your own SageMaker infrastructure. Bedrock provides managed API access to foundation models from Anthropic, Amazon, Meta, etc., without managing infrastructure.

**Exam trigger:** "deploy a pre-trained model", "fine-tune Llama on SageMaker", "model hub", "1-click foundation model deployment", "open-source LLM on AWS"

---

### Amazon SageMaker Model Registry

Versioned catalogue of trained models with approval workflow.

**Capabilities:**
- Register model versions with metadata: training metrics, dataset version, lineage
- Approval workflow: Pending → Approved → Rejected; gates production deployment
- Integrates with Pipelines (auto-register on passing evaluation) and CI/CD systems
- Cross-account model sharing

**Exam trigger:** "model version control", "approval gate before production", "model governance", "model lineage"

---

### Amazon Augmented AI (A2I)

Human review routing for low-confidence ML predictions.

**Capabilities:**
- Works with Rekognition (content moderation), Textract (document extraction), or any custom ML model
- Define confidence thresholds: predictions below threshold go to human review
- Human task UI: customisable review interface
- Integrates with Ground Truth workforce (Mechanical Turk, private, vendor)

**Exam trigger:** "human-in-the-loop", "review low-confidence predictions", "manual review of uncertain AI decisions", "escalate to human reviewer"

---

## Decision Matrix: Which SageMaker Service?

| Scenario | Service |
|---|---|
| Business analyst wants to predict customer churn without coding | Canvas |
| Data scientist wants best algorithm selected automatically | Autopilot |
| Team needs to label 10,000 images with bounding boxes | Ground Truth |
| Prepare and transform features visually before training | Data Wrangler |
| Share the same features between the training pipeline and real-time inference | Feature Store |
| Automate model retraining when new data arrives in S3 | Pipelines |
| Compare 50 training runs to find the best hyperparameters | Experiments |
| Alert when production input data starts diverging from training distribution | Model Monitor |
| Audit a model for demographic bias before deployment | Clarify |
| Deploy Llama 3 on SageMaker with one click | JumpStart |
| Require manager approval before promoting a model to production | Model Registry |
| Route uncertain medical image classifications to a radiologist | A2I |

---

## Key Facts

- Canvas: no-code ML for business analysts; runs Autopilot under the hood; no Python required
- Autopilot: AutoML for data scientists; produces editable notebooks; auto-selects algorithm + tunes hyperparameters
- Ground Truth: managed data labelling; active learning reduces human annotation cost; Ground Truth Plus is fully managed
- Data Wrangler: visual feature engineering; 300+ transforms; exports to Feature Store, Pipelines, or S3
- Feature Store: online store (<10ms latency for inference) + offline store (S3 for training); solves training/serving skew
- Pipelines: DAG-based ML CI/CD; triggered by schedule, S3 events, or API; integrates with Experiments and Model Registry
- Model Monitor: four monitor types (data quality, model quality, bias drift, attribution drift); publishes to CloudWatch
- Clarify: pre- and post-training bias; SHAP feature importance; generates explainability reports; Responsible AI tool
- JumpStart: 700+ models; 1-click fine-tune and deploy; open-source LLMs; vs Bedrock (managed API, no infrastructure)
- A2I: human-in-the-loop for low-confidence predictions; works with Rekognition, Textract, or custom models

## Connections

- [[llms/ml-fundamentals]] — the ML concepts (supervised/unsupervised, evaluation metrics, lifecycle) that SageMaker operationalises
- [[cloud/aws-ai-recognition-services]] — pre-built AI services for when custom SageMaker training is not needed
- [[cloud/aws-analytics-services]] — Glue, Athena, and Redshift feed data into SageMaker training pipelines
- [[apis/aws-bedrock]] — Bedrock for foundation model APIs without managing SageMaker infrastructure
- [[landscape/aws-ai-practitioner]] — AIF-C01 study guide; Domains 1 and 3 cover this page directly
- [[safety/responsible-ai]] — Clarify implements bias detection; connects to responsible AI principles
- [[evals/methodology]] — eval framework selection and golden sets; Model Monitor and Experiments operationalise the same eval loop
- [[observability/llmops]] — LLMOps maturity model; SageMaker Pipelines + Model Monitor implement the eval gate and drift detection patterns

## Open Questions

- When does SageMaker JumpStart become preferable to Bedrock for foundation model deployment — is it purely a cost/control decision?
- Does SageMaker Canvas now support image/NLP tasks, or is it still restricted to tabular data?
