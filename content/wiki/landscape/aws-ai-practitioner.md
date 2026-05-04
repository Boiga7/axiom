---
type: concept
category: landscape
para: resource
tags: [aws, certification, ai-practitioner, aif-c01, generative-ai]
sources: []
updated: 2026-05-04
tldr: AWS Certified AI Practitioner (AIF-C01) — all 5 domains, AWS AI/ML services, generative AI on AWS, responsible AI
---

# AWS Certified AI Practitioner (AIF-C01)

Foundational certification validating understanding of AI/ML concepts and AWS AI tooling. Target audience: developers, business analysts, product managers, and anyone who works adjacent to AI systems and wants a structured grounding in the field.

Related: [[landscape/aws-ecosystem]], [[llms/foundation-models]], [[agents/overview]], [[prompting/techniques]], [[rag/overview]], [[safety/responsible-ai]], [[landscape/aws-cloud-practitioner]]

---

## Exam At a Glance

| Attribute | Detail |
|---|---|
| Exam code | AIF-C01 |
| Level | Foundational |
| Duration | 90 minutes |
| Scored questions | 50 |
| Unscored (pilot) questions | 15 (not flagged — treat all 65 equally) |
| Total questions | 65 |
| Passing score | 700 / 1,000 scaled |
| Question formats | Multiple choice, multiple response, ordering, matching |
| No penalty for guessing | Yes — always answer every question |

Question style is scenario-based: "a company wants to do X — which AWS service / approach is most appropriate?" The exam tests recognition of service purpose and appropriate use cases, not deep implementation.

---

## The 5 Domains

| Domain | Title | Weighting |
|---|---|---|
| 1 | Fundamentals of AI and ML | 20% |
| 2 | Fundamentals of Generative AI | 24% |
| 3 | Applications of Foundation Models | 28% |
| 4 | Guidelines for Responsible AI | 14% |
| 5 | Security, Compliance, and Governance for AI Solutions | 14% |

Domains 2 and 3 together account for 52% of the exam. Master [[#domain-2-fundamentals-of-generative-ai]] and [[#domain-3-applications-of-foundation-models]] first.

---

## Domain 1: Fundamentals of AI and ML (20%)

### Task Statement 1.1 — Explain basic AI concepts and terminologies

Key terms to define precisely:

- **AI vs ML vs Deep Learning vs GenAI**: AI is the broad field; ML is learning from data; deep learning uses neural networks with many layers; GenAI produces new content from learned patterns.
- **Supervised learning**: labelled training data; predicts a target (classification, regression).
- **Unsupervised learning**: unlabelled data; finds structure (clustering, dimensionality reduction).
- **Reinforcement learning**: agent learns by trial-and-error with reward signals; used for robotics, game-playing, and fine-tuning LLMs (RLHF).
- **Semi-supervised learning**: small labelled dataset + large unlabelled dataset.
- **Self-supervised learning**: model generates its own labels from the data structure (how LLMs are pretrained).
- **Model**: a mathematical function learned from data.
- **Algorithm**: the procedure used to learn the model.
- **Training vs inference**: training = learning weights; inference = applying the trained model to new inputs.
- **Feature**: an input variable used for prediction.
- **Label/target**: the output the model predicts.
- **Overfitting**: model learns noise in training data; high variance; poor generalisation. Remedy: more data, regularisation, dropout, early stopping.
- **Underfitting**: model too simple to capture patterns; high bias. Remedy: more model capacity, more features.
- **Bias-variance tradeoff**: there is a tension between a model that is too simple (high bias, underfits) and too complex (high variance, overfits). The goal is the sweet spot.
- **Training/validation/test split**: train on training set, tune hyperparameters on validation set, report final performance on held-out test set.
- **Hyperparameter**: a setting chosen before training (learning rate, batch size, number of layers). Distinct from model parameters which are learned.
- **Neural network**: layers of weighted connections; learns hierarchical representations.
- **Transformer**: attention-based architecture underpinning modern LLMs. See [[llms/transformer-architecture]].
- **LLM (Large Language Model)**: a transformer trained on massive text corpora; produces probabilistic next-token predictions.
- **Foundation model**: large pretrained model adaptable to many tasks via prompting or fine-tuning.
- **Generative AI**: models that generate novel content (text, image, audio, code).
- **Agentic AI**: systems where models plan and execute multi-step tasks using tools.
- **Token**: the unit of text processed by LLMs; roughly 3/4 of a word on average. Inference cost is denominated in tokens.
- **Context window**: maximum tokens a model can process in a single call.
- **Embedding**: a dense numeric vector representation of text (or other data) capturing semantic meaning.
- **Vector database**: a store optimised for similarity search over embeddings. Used in RAG pipelines.

### Task Statement 1.2 — Identify practical use cases for AI

Know the canonical mapping of AI technique to business problem:

| Use case | Technique / Service |
|---|---|
| Image classification / object detection | CNN, Amazon Rekognition |
| Fraud detection | Classification / anomaly detection |
| Product recommendation | Collaborative filtering, Amazon Personalize |
| Sentiment analysis / entity extraction | NLP, Amazon Comprehend |
| Document text extraction | Amazon Textract |
| Speech-to-text | Amazon Transcribe |
| Text-to-speech | Amazon Polly |
| Machine translation | Amazon Translate |
| Conversational chatbot | Amazon Lex |
| Enterprise search | Amazon Kendra |
| Code generation, summarisation, Q&A | GenAI, Amazon Bedrock |
| Demand forecasting | Amazon Forecast |

### Task Statement 1.3 — Describe the ML development lifecycle

Standard stages, and the AWS service that supports each:

1. **Business problem framing** — define the task, success metric, and data requirements.
2. **Data collection and preparation** — Amazon S3 (storage), AWS Glue (ETL), SageMaker Data Wrangler (no-code data prep).
3. **Feature engineering** — SageMaker Feature Store (centralised feature repository with offline/online stores).
4. **Model selection** — SageMaker JumpStart (pre-built algorithms and foundation models).
5. **Model training** — SageMaker Training Jobs (managed compute); SageMaker Experiments (tracking).
6. **Model evaluation** — SageMaker Clarify (bias + explainability), SageMaker Model Monitor.
7. **Deployment** — SageMaker Endpoints (real-time inference), SageMaker Batch Transform (batch inference).
8. **Monitoring** — SageMaker Model Monitor (data drift, concept drift, bias drift).
9. **Feedback loop** — retrain when drift detected; human-in-the-loop via Amazon Augmented AI (A2I).

**SageMaker Canvas** is the no-code visual interface for non-technical users to build and deploy ML models using AutoML, without writing code.

**MLOps**: the discipline of automating and operationalising the ML lifecycle. AWS MLOps tools include SageMaker Pipelines (orchestration), SageMaker Model Registry (versioning), and CodePipeline integration.

---

## Domain 2: Fundamentals of Generative AI (24%)

### Task Statement 2.1 — Explain basic GenAI concepts

**Foundation models and their families:**
- **LLM** (text): Claude, GPT-4, Llama, Mistral, Amazon Titan Text.
- **Multimodal** (text + image in/out): Claude 3, GPT-4V, Gemini, Amazon Titan Multimodal.
- **Diffusion models** (image generation): Stable Diffusion, DALL-E, Amazon Titan Image Generator.
- **Embedding models**: generate semantic vectors; Amazon Titan Embeddings, Cohere Embed.
- **Code models**: Amazon CodeWhisperer (rebranded to Amazon Q Developer), GitHub Copilot.

**Key GenAI vocabulary:**
- **Prompt**: input text that instructs the model.
- **Completion / response**: model output given a prompt.
- **System prompt**: context/instructions set before the conversation turn; controls model behaviour.
- **Context window**: total token capacity for a single call (prompt + response combined).
- **Hallucination**: model generates plausible-sounding but factually incorrect content. Root cause: models are probabilistic pattern matchers, not truth engines.
- **Temperature**: controls randomness of output. Low (0.0–0.3) = deterministic and focused. High (0.8–1.0) = creative and varied. Use low temperature to reduce hallucinations.
- **Top-p (nucleus sampling)**: restricts sampling to the smallest set of tokens whose cumulative probability exceeds p. Combined with temperature.
- **Top-k**: restricts sampling to the k most probable next tokens.
- **Max tokens / output length**: cap on generated tokens. Affects cost and latency.
- **Stop sequence**: a string that, when generated, terminates the response.
- **Token cost**: Bedrock charges per input token and per output token. Output tokens typically cost more.

**Foundation model lifecycle:**
Data selection → pretraining (self-supervised on massive corpora) → instruction fine-tuning (SFT) → alignment (RLHF/DPO) → evaluation → deployment → feedback loop.

### Task Statement 2.2 — Capabilities and limitations of GenAI

**Capabilities:** text summarisation, Q&A, translation, code generation, content creation, classification, sentiment analysis, chatbots, search, recommendation augmentation, image generation.

**Limitations:**
- Hallucinations (cannot be fully eliminated, only mitigated).
- Knowledge cutoff — model knowledge is frozen at training time; use RAG for current information.
- Context window limits — cannot process arbitrarily long inputs.
- Inconsistency — probabilistic outputs; same prompt may yield different responses.
- Bias — inherited from training data.
- No built-in reasoning about real-time state (no access to live internet unless given tools).
- Intellectual property and copyright risks.
- Cost — large models are expensive at inference time.

### Task Statement 2.3 — AWS infrastructure for GenAI

**Amazon Bedrock** is the primary AWS GenAI platform. Fully managed, serverless. Key concepts:

- **Model access**: single API to call foundation models from Anthropic (Claude), Meta (Llama), Mistral, Cohere, AI21 Labs, Amazon (Titan). No infrastructure to manage.
- **Knowledge Bases for Bedrock**: managed RAG pipeline. Ingest documents from S3, auto-chunk, auto-embed, store in a vector DB (OpenSearch Serverless, Aurora, Neptune, DocumentDB, Pinecone, Redis Enterprise, MongoDB Atlas, PostgreSQL). Retrieves context at query time and injects it into the prompt.
- **Bedrock Agents**: multi-step agentic workflows. Define actions (Lambda functions, API calls), the agent plans and executes; uses ReAct-style reasoning internally.
- **Bedrock Guardrails**: content safety layer. Configures filters for: hate/insults/sexual/violence/misconduct/prompt injection; PII detection and masking; topic denylists (block off-topic questions); grounding checks (reduce hallucinations by verifying responses against retrieved context).
- **Bedrock Model Evaluation**: compare models on custom metrics (accuracy, robustness, toxicity) using your own datasets. Integrates with SageMaker Clarify and fmeval.
- **Bedrock Fine-tuning / Continued Pre-training**: customise Titan and select other models on your own labelled data.
- **Bedrock Model Distillation**: compress large model knowledge into smaller, cheaper models.
- **PartyRock**: no-code Bedrock playground for building GenAI prototypes quickly without an AWS account.
- **Amazon Bedrock Studio**: collaborative low-code environment for building Bedrock applications.

**Amazon Q** services:
- **Amazon Q Business**: enterprise knowledge assistant. Connects to corporate data sources (S3, SharePoint, Confluence, Salesforce, etc.) and answers employee questions with citations. Enforces IAM permissions — users only see answers derived from data they are authorised to access.
- **Amazon Q Developer** (formerly CodeWhisperer): AI coding assistant in the IDE; generates, explains, and reviews code; has security scanning.
- **Amazon Q in Connect**: real-time AI assistance for customer service agents during live calls (powered by Lex + Connect + Bedrock).

**Amazon SageMaker JumpStart**: hub of 700+ pre-trained models (foundation models, domain-specific models) that can be deployed in one click to a SageMaker endpoint. Supports fine-tuning via the console.

---

## Domain 3: Applications of Foundation Models (28%)

### Task Statement 3.1 — Design considerations for FM applications

**Model selection criteria:**
- **Task requirements**: what modality, what output type.
- **Cost**: Bedrock charges per token; smaller models are cheaper. Amazon Titan is often the cost-effective default.
- **Latency**: smaller models respond faster. Haiku-class models for high-throughput, low-latency use cases.
- **Context window**: choose a model whose context window fits your use case (long documents require large context).
- **Accuracy / capability**: benchmark on your specific task; Bedrock Model Evaluation is the AWS answer.
- **Compliance**: some industries require data not to leave a region. Bedrock offers cross-region inference and provisioned throughput.
- **Environmental cost**: larger models = more energy. A relevant responsible AI consideration.

**When to use each customisation strategy:**

| Strategy | When to use | Cost | Data needed |
|---|---|---|---|
| Prompt engineering | Default starting point. Works well for most tasks | Cheapest | None |
| RAG | Knowledge is large, frequently updated, or proprietary | Low | Documents |
| Fine-tuning | Consistent style/format, task-specific vocabulary, prompt engineering + RAG insufficient | Medium | Labelled pairs (100–1000s) |
| Continued pre-training | Domain is highly specialised (legal, medical, finance), new knowledge not in base model | High | Large unlabelled corpus |

**RAG architecture on AWS (know this well):**
1. **Ingestion**: load documents from S3 → chunk (fixed-size or semantic) → embed with Amazon Titan Embeddings or Cohere → store vectors in OpenSearch Serverless or Aurora PostgreSQL with pgvector.
2. **Retrieval**: embed the user query → similarity search in vector DB → return top-k chunks.
3. **Augmentation**: inject retrieved chunks into the prompt as context.
4. **Generation**: FM generates a grounded response.

Bedrock Knowledge Bases automates all of the above. Bedrock Guardrails' grounding check validates that the generated response is supported by the retrieved context, reducing hallucinations.

**Agentic patterns on AWS:**
- **Bedrock Agents**: define a natural language instruction + a set of Action Groups (Lambda functions that call APIs). The agent plans which actions to call and in what order, then synthesises the result.
- **Amazon Bedrock Flows**: visual workflow builder for multi-step GenAI pipelines (condition branching, looping, parallel paths).
- Agents are the AWS answer to any scenario requiring "the model needs to take multi-step actions or call external APIs."

### Task Statement 3.2 — Prompt engineering techniques

| Technique | Description | When to use |
|---|---|---|
| Zero-shot | No examples; rely on model's pretrained knowledge | Quick tasks where model knowledge is sufficient |
| One-shot | Single example in the prompt | When output format needs to be demonstrated |
| Few-shot | 2–5 examples in the prompt | Consistent format, classification tasks, style control |
| Chain-of-thought (CoT) | Ask the model to reason step by step ("think step by step") | Arithmetic, logic, complex reasoning. Do not use with extended thinking models |
| System prompt | Persistent instructions before the conversation | Define persona, constraints, output format, safety rules |
| Role prompting | "You are an expert X..." | Shape tone and domain framing |
| ReAct | Interleaves reasoning and tool-use steps | Agent workflows |
| Retrieval-augmented (RAG) prompting | Inject retrieved context into the prompt | Knowledge-grounded Q&A with current or proprietary data |
| Prompt chaining | Output of one prompt fed into the next | Complex multi-step workflows |

**Prompt injection risk**: malicious user input overrides system prompt instructions. Bedrock Guardrails' prompt injection filter (in the "prompt attacks" category) is the AWS mitigation.

**Inference parameters that matter in the exam:**
- `temperature`: randomness. Lower = more deterministic.
- `top_p`: cumulative probability cutoff for sampling.
- `top_k`: top token candidates.
- `max_tokens`: output length cap.
- `stop_sequences`: custom termination strings.

### Task Statement 3.3 — Training and fine-tuning of FMs

The exam expects conceptual understanding, not implementation detail:

- **Pretraining**: self-supervised learning on massive text corpora. Produces the base model.
- **Instruction fine-tuning / SFT**: supervised learning on (instruction, response) pairs. Produces a helpful assistant model.
- **RLHF (Reinforcement Learning from Human Feedback)**: human raters compare responses; a reward model is trained; the LLM is further tuned to maximise the reward. Used to align models with human preferences.
- **DPO (Direct Preference Optimisation)**: alignment technique that skips the explicit reward model; simpler than RLHF. Increasingly used instead of PPO-based RLHF.
- **PEFT (Parameter-Efficient Fine-Tuning)**: fine-tune only a small fraction of parameters rather than the full model. Reduces compute cost.
- **LoRA (Low-Rank Adaptation)**: the dominant PEFT method. Adds low-rank adapter matrices; only these are trained. The base model weights are frozen.
- **QLoRA**: LoRA applied to a quantised (4-bit) base model. Reduces memory further.

On AWS: Bedrock fine-tuning (for Titan and select models) and SageMaker JumpStart fine-tuning (for most open models). SageMaker training jobs with HuggingFace containers for full control.

**Synthetic data generation**: use an LLM to generate labelled training pairs for fine-tuning. Reduces dependency on expensive human annotation.

### Task Statement 3.4 — Evaluating FM performance

**Automatic metrics:**
- **ROUGE** (Recall-Oriented Understudy for Gisting Evaluation): measures n-gram overlap between generated and reference text. Used for summarisation.
- **BLEU** (Bilingual Evaluation Understudy): precision of n-gram matches. Used for translation.
- **Perplexity**: how well the model predicts a held-out text sequence. Lower = better. Useful for language modelling.
- **BERTScore**: semantic similarity using contextual embeddings, more robust than exact n-gram matching.
- **Accuracy / F1 / Precision / Recall**: for classification tasks.

**LLM-as-judge**: use a stronger LLM to evaluate responses on dimensions such as helpfulness, harmlessness, accuracy. Scalable substitute for human annotation.

**Human evaluation**: gold standard. A/B testing, preference ratings, annotation queues.

**AWS tooling for FM evaluation:**
- **Bedrock Model Evaluation**: compare models side by side on built-in or custom metrics. Supports automatic and human-based evaluation workflows.
- **SageMaker Clarify**: bias detection + explainability (SHAP values) for traditional ML models and increasingly for FMs.
- **fmeval** (open-source): Amazon's library for FM evaluation; integrates with Bedrock Model Evaluation.
- **Amazon A2I (Augmented AI)**: human review workflow service. Route low-confidence predictions to human reviewers.

**Benchmarks referenced in the exam context:**
- MMLU (Massive Multitask Language Understanding) — general knowledge across 57 subjects.
- HumanEval — code generation.
- MATH — mathematical reasoning.
- HellaSwag, TruthfulQA — common sense and truthfulness.

---

## Domain 4: Guidelines for Responsible AI (14%)

### Task Statement 4.1 — Develop responsible AI systems

**Core responsible AI dimensions** (know these terms precisely):
- **Fairness**: model should not produce systematically different outcomes for different demographic groups without justification.
- **Bias**: systematic errors in model output caused by skewed or unrepresentative training data, or by historical inequities encoded in labels. Types: selection bias, confirmation bias, label bias, reporting bias.
- **Inclusivity**: AI systems should work for all users, including marginalised groups.
- **Robustness**: model maintains performance under input variation, adversarial inputs, and distribution shift.
- **Safety**: model does not produce harmful, dangerous, or offensive outputs.
- **Veracity / truthfulness**: model outputs should be accurate and not mislead. Hallucination is the antonym.
- **Transparency**: stakeholders can understand how and why the model makes decisions.
- **Explainability**: the model's predictions can be interpreted at the feature or reasoning level.
- **Accountability**: humans are responsible for AI system outcomes; clear lines of ownership.
- **Privacy**: training data and inference inputs should protect personal information.
- **Sustainability / environmental impact**: large model training and inference consume significant energy; environmental cost is a model selection consideration.

**AWS tools for responsible AI:**

| Tool | Purpose |
|---|---|
| **Amazon SageMaker Clarify** | Bias detection (pre-training and post-training), feature importance (SHAP), explainability reports |
| **SageMaker Model Monitor** | Detect data drift, model quality drift, bias drift, and feature attribution drift in production |
| **SageMaker Model Cards** | Structured documentation of model purpose, training data, evaluation results, ethical considerations — shareable with compliance and risk teams |
| **Amazon Bedrock Guardrails** | Content filtering (harmful categories, PII, off-topic), prompt injection defence, grounding checks |
| **Amazon A2I (Augmented AI)** | Human-in-the-loop review for low-confidence or high-stakes predictions |
| **AWS AI Service Cards** | AWS's own published documentation of responsible AI considerations for each managed AI service |

**Bias mitigation strategies:**
- Pre-processing: rebalance training data, remove or anonymise sensitive features.
- In-processing: fairness constraints during training.
- Post-processing: calibrate outputs per group.
- Monitoring: continuous drift detection post-deployment.

### Task Statement 4.2 — Transparent and explainable models

**Explainability approaches:**
- **SHAP (SHapley Additive exPlanations)**: quantifies each feature's contribution to a prediction. SageMaker Clarify uses SHAP.
- **LIME (Local Interpretable Model-agnostic Explanations)**: approximates the model locally with a simpler interpretable model.
- **Partial dependence plots**: show the effect of one feature on the prediction, marginalising over others.
- **Attention visualisation**: for transformer models, visualise which input tokens the model attended to (limited interpretability value but frequently mentioned).

**Why explainability matters for compliance:**
EU AI Act requires high-risk AI systems to provide explanations for automated decisions. AWS AI Service Cards + SageMaker Model Cards + Clarify reports address this.

**Legal risks of GenAI** (exam frequently tests these):
- Copyright / IP infringement from training data or generated content.
- Biased or discriminatory outputs.
- Privacy violations (PII in training data or outputs).
- Hallucinations leading to incorrect advice (medical, legal, financial).
- Loss of customer trust.
- Regulatory non-compliance.

---

## Domain 5: Security, Compliance, and Governance (14%)

### Task Statement 5.1 — Secure AI systems

**AWS shared responsibility model applied to AI:**
- AWS is responsible for security **of** the cloud: physical infrastructure, hypervisor, managed service availability.
- Customer is responsible for security **in** the cloud: IAM configuration, data encryption, network controls, application-level prompt injection defence.

**IAM for AI workloads:**
- Grant least-privilege roles to SageMaker training jobs and endpoints (what S3 buckets they can read, what KMS keys they can use).
- Bedrock resource policies control which IAM principals can invoke which models.
- SageMaker roles: execution role for training; separate endpoint invocation role for inference.
- Amazon Q Business uses IAM Identity Center for SSO and enforces source-level document permissions — users only see AI answers based on documents they are authorised to access.

**Data protection:**
- **Encryption at rest**: S3 SSE (SSE-S3, SSE-KMS), SageMaker encrypts training data volumes with KMS.
- **Encryption in transit**: TLS 1.2+ on all AWS API endpoints. VPC endpoints (AWS PrivateLink) keep traffic off the public internet.
- **Amazon Macie**: S3 data discovery and PII detection. Identifies buckets that may contain sensitive training data.
- **Amazon VPC**: isolate SageMaker training and inference in private subnets. VPC endpoints for Bedrock and SageMaker keep requests private.

**Threat detection and monitoring:**
- **AWS CloudTrail**: audit log of every API call (who called what, when, from where). Essential for detecting unauthorised model invocations.
- **Amazon GuardDuty**: threat detection using ML; identifies anomalous behaviour patterns.
- **Amazon Inspector**: vulnerability scanning for container images used in SageMaker (CUDA base images, dependencies).
- **AWS Config**: continuous compliance checking; enforce tagging, encryption, and access policies.

**Prompt injection defence (Domain 5 angle):**
- Input validation at the application layer.
- Bedrock Guardrails prompt attack filter.
- Principle of least privilege for agent Action Groups (tools should only have the minimum permissions needed).
- Output validation before acting on model-generated tool calls.

**AI-specific threats:**
- **Model inversion**: inferring training data from model outputs.
- **Membership inference attack**: determining whether a specific record was in the training set.
- **Adversarial examples**: inputs crafted to cause misclassification.
- **Data poisoning**: corrupting training data to manipulate model behaviour.
- **Model theft / extraction**: querying a model extensively to replicate its behaviour.

### Task Statement 5.2 — Governance and compliance

**AWS compliance tooling:**

| Service | Purpose |
|---|---|
| **AWS Audit Manager** | Continuously collect audit-ready evidence mapped to compliance frameworks (GDPR, HIPAA, SOC 2, NIST) |
| **AWS Artifact** | Self-service portal for AWS compliance reports and agreements |
| **AWS Config** | Continuous resource compliance evaluation with managed rules |
| **AWS CloudTrail** | Immutable audit log of all API activity |
| **AWS Trusted Advisor** | Best practice checks across security, cost, performance |
| **AWS Security Hub** | Centralised security findings aggregator |

**Regulatory frameworks referenced in the exam:**
- **GDPR**: right to explanation for automated decisions; data minimisation; right to erasure.
- **HIPAA**: PHI must not be used in AI training without authorisation; Bedrock and SageMaker have HIPAA-eligible services.
- **NIST AI Risk Management Framework (AI RMF)**: voluntary US framework; four functions: Govern, Map, Measure, Manage.
- **EU AI Act**: risk-tiered regulation; high-risk AI systems require conformity assessment, human oversight, explainability.
- **ISO 42001**: international AI management system standard (emerging; mentioned in AWS governance materials).

**Responsible AI governance on AWS:**
- **AWS Well-Architected Framework** has an AI/ML lens covering responsible AI pillars.
- SageMaker Model Cards serve as governance artefacts.
- Bedrock Guardrails serves as a runtime policy enforcement layer.
- AWS Bedrock has a model invocation logging feature — log all prompts and completions to S3 or CloudWatch Logs for audit.

---

## AWS AI/ML Services Reference

This is the service-recognition layer. The exam will describe a business problem; know which service solves it.

### Amazon SageMaker (family)

The end-to-end managed ML platform. Key sub-services:

| Sub-service | What it does |
|---|---|
| **SageMaker Studio** | IDE for ML; notebooks, pipelines, experiments in a unified UI |
| **SageMaker Canvas** | No-code AutoML for business analysts; drag-and-drop data prep and model training |
| **SageMaker Autopilot** | Automated ML (AutoML) with full visibility and explainability |
| **SageMaker JumpStart** | Pre-trained models (700+) and ML templates deployable in one click |
| **SageMaker Pipelines** | CI/CD for ML; define, automate, and reuse ML workflows |
| **SageMaker Feature Store** | Centralised feature repository; offline store for training, online store for real-time inference |
| **SageMaker Data Wrangler** | Visual data preparation and feature engineering |
| **SageMaker Experiments** | Track, compare, and analyse training runs |
| **SageMaker Model Registry** | Version, track, and manage ML models; approval workflows |
| **SageMaker Model Monitor** | Detect data drift, model quality drift, bias drift in deployed endpoints |
| **SageMaker Clarify** | Bias detection + SHAP-based explainability; pre-training and post-training |
| **SageMaker Model Cards** | Structured model documentation for governance |
| **SageMaker Ground Truth** | Human labelling service; active learning to reduce labelling cost |
| **Amazon A2I** | Human-in-the-loop review for model predictions |
| **SageMaker Inference** | Real-time endpoints, serverless inference, batch transform, async inference |

### Amazon Bedrock

See [[#domain-2-fundamentals-of-generative-ai]] and [[#domain-3-applications-of-foundation-models]] above for full coverage. Summary:

- Managed FM API access (Claude, Llama, Mistral, Titan, Cohere, AI21).
- Knowledge Bases = managed RAG.
- Agents = multi-step agentic workflows with tool use.
- Guardrails = runtime content and safety policy enforcement.
- Model Evaluation = FM benchmarking with custom datasets.
- Fine-tuning + Continued Pre-training for model customisation.
- Model Distillation for knowledge transfer to smaller models.

### AI-Powered Business Services (pre-built, no ML expertise needed)

These services call pre-trained AWS models via API. Know what each does and the typical use case.

| Service | What it does | Typical use case |
|---|---|---|
| **Amazon Rekognition** | Image and video analysis: object/scene detection, facial analysis, face comparison, celebrity recognition, content moderation, PPE detection | Automate content moderation; verify identity via face match; detect unsafe content |
| **Amazon Comprehend** | NLP: entity recognition, sentiment analysis, key phrase extraction, language detection, topic modelling, PII detection | Analyse customer feedback at scale; route support tickets; detect PII in documents |
| **Amazon Textract** | Document text and structure extraction: OCR + form/table extraction from PDFs and images. Beyond simple OCR — understands document layout | Extract data from insurance claims, tax forms, invoices; automate document processing pipelines |
| **Amazon Transcribe** | Speech-to-text (ASR): real-time and batch; speaker diarisation, custom vocabulary, language identification | Call centre transcription; subtitles; voice-to-text for accessibility |
| **Amazon Polly** | Text-to-speech: Neural TTS; multiple voices and languages; SSML support for prosody control | Convert articles to audio; IVR voice prompts; accessibility features |
| **Amazon Translate** | Neural machine translation; real-time and batch; custom terminology | Localise product content; translate customer communications |
| **Amazon Lex** | Conversational AI (chatbot builder): speech + text, intent recognition, slot filling, fulfilment via Lambda | Build customer service chatbots; voice IVR; integrate with Amazon Connect |
| **Amazon Kendra** | Enterprise intelligent search: understands natural language queries; indexes S3, SharePoint, Salesforce, RDS, etc.; returns ranked passages | Replace keyword search with semantic search over internal knowledge bases |
| **Amazon Personalize** | Real-time personalisation and recommendation: trains on user-item interaction data; handles cold start | Product recommendations; content personalisation; re-ranking search results |
| **Amazon Forecast** | Time-series forecasting: AutoML selects best algorithm; handles related time series | Demand forecasting; inventory planning; capacity planning |
| **Amazon Fraud Detector** | ML-based fraud detection; uses Amazon's fraud detection expertise baked in | Online payment fraud; account takeover; fake account creation |
| **Amazon Lookout for Metrics** | Anomaly detection in business metrics (time series); root cause analysis | Detect revenue anomalies, sudden drops in KPIs |
| **Amazon Lookout for Vision** | Visual anomaly detection for industrial inspection | Detect manufacturing defects from images on production line |
| **Amazon Rekognition Custom Labels** | Fine-tune Rekognition for custom object/scene detection with small labelled dataset | Detect specific branded items or proprietary product defects |
| **Amazon Comprehend Medical** | NLP specifically for medical text: extracts medical conditions, medications, dosages, anatomy, test results | Process clinical notes; populate EHR fields |
| **Amazon HealthLake** | FHIR-compatible data lake for healthcare; Comprehend Medical built in | Store, transform, and analyse health data at scale |

### Amazon Q Services (know the distinctions)

| Service | What it does | Who uses it |
|---|---|---|
| **Amazon Q Business** | Enterprise GenAI assistant over company data; respects IAM permissions; cites sources | Employees: find answers in internal knowledge bases |
| **Amazon Q Developer** | AI coding assistant in IDE and CLI; code generation, debugging, security scans, repo explanation | Developers |
| **Amazon Q in QuickSight** | NL to BI: ask questions, get charts and insights | Analysts |
| **Amazon Q in Connect** | Real-time agent assist during customer calls; surfaces KB articles | Contact centre agents |

### Supporting Infrastructure Services

Know why these appear in AI architecture scenarios:

- **Amazon S3**: store training data, model artefacts, evaluation results, Bedrock knowledge base documents.
- **AWS Lambda**: Bedrock Agent Action Groups; serverless inference triggers.
- **Amazon OpenSearch Service (Serverless)**: default vector store for Bedrock Knowledge Bases.
- **Amazon Aurora PostgreSQL with pgvector**: vector store option for Bedrock Knowledge Bases; familiar to teams already on Aurora.
- **Amazon DynamoDB**: session state storage for chatbot conversation history.
- **AWS Step Functions**: orchestrate complex ML workflows and agentic pipelines.
- **Amazon CloudWatch**: metrics, logs, dashboards for AI workload monitoring. Bedrock model invocation logging goes here or to S3.
- **AWS KMS**: customer-managed encryption keys for SageMaker and Bedrock data at rest.

---

## High-Frequency Exam Patterns

These are the scenarios the exam returns to repeatedly.

**"Filter harmful content from chatbot" → Bedrock Guardrails**
Guardrails is the single answer to content filtering, PII redaction, topic restrictions, and prompt injection defence on AWS.

**"Ground the model in company data / reduce hallucinations from internal knowledge" → RAG / Bedrock Knowledge Bases**
RAG is the primary answer for knowledge grounding. Knowledge Bases automates the full pipeline.

**"Model needs to call external APIs or take multi-step actions" → Bedrock Agents**
Agents are the answer to agentic, tool-using patterns. Do not conflate with Knowledge Bases (retrieval only).

**"Employees ask questions about internal documents" → Amazon Q Business**
Q Business is distinct from Bedrock-based custom chatbots. It ships as a managed product with connectors, not a build-it-yourself platform.

**"Detect bias in training data or model predictions" → SageMaker Clarify**
Clarify is the bias and explainability tool. Separate from Guardrails (which is runtime content filtering, not bias analysis).

**"Monitor a deployed model for data drift / performance degradation" → SageMaker Model Monitor**
Model Monitor is the production observability tool. Not the same as Clarify (which runs at training time).

**"No-code ML for business analyst" → SageMaker Canvas**
Canvas provides AutoML without code. Distinct from JumpStart (pre-trained models for developers).

**"Extract text and structure from documents/forms" → Amazon Textract**
Textract goes beyond OCR — it understands form key-value pairs and tables. Comprehend does not extract from images; Textract does.

**"Build a chatbot / voice IVR" → Amazon Lex + optionally Amazon Connect**
Lex handles intent recognition and slot filling. Connect is the cloud contact centre platform that uses Lex for IVR.

**"Translate speech to text from call recordings" → Amazon Transcribe**
Transcribe for ASR. Polly is the inverse (text to speech). Do not swap them.

**"Search internal knowledge base with natural language" → Amazon Kendra**
Kendra for enterprise semantic search. For GenAI-augmented search with source attribution, the newer answer is Amazon Q Business.

**"Evaluate multiple FMs before choosing one" → Bedrock Model Evaluation**
Model Evaluation lets you benchmark models on your dataset before committing.

**"Need ML model but don't want to train from scratch" → SageMaker JumpStart**
JumpStart provides 700+ pre-trained models deployable in one click, including FMs for fine-tuning.

**"Audit who invoked which Bedrock model" → CloudTrail + Bedrock invocation logging**
CloudTrail logs all API calls. Bedrock invocation logging (enabled separately) captures prompt/response content to S3 or CloudWatch.

---

## Exam-Taking Strategy

**Scoring and format:**
- 65 questions total; 50 scored, 15 unscored pilot questions. You cannot identify which is which — answer all carefully.
- Passing score: 700/1000. Roughly 65–70% correct on scored questions.
- No penalty for wrong answers. Never leave a question blank.
- Time: 90 minutes for 65 questions = ~83 seconds per question. The exam is not time-pressured for most candidates; the bottleneck is knowledge, not speed.

**Reading questions:**
- Identify the constraint word first: "most cost-effective", "least operational overhead", "no code", "real-time", "batch". These constraints eliminate most distractors.
- "Managed" or "fully managed" points toward Bedrock, Lex, Rekognition, Comprehend, Textract, Kendra, Q Business — not SageMaker (which requires more setup).
- "No ML expertise / no-code" points toward SageMaker Canvas, the pre-built AI services, or Amazon Q.
- "Foundation models / GenAI" almost always points into the Bedrock ecosystem.
- "Proprietary data / current knowledge" points toward RAG / Bedrock Knowledge Bases over fine-tuning.

**Elimination tactics:**
- Eliminate answers that introduce unnecessary infrastructure (the question rarely wants you to build a custom solution when a managed service exists).
- Eliminate "train a custom model from scratch" when the scenario can be solved with a pre-built service or prompt engineering.
- For responsible AI questions: Guardrails (runtime), Clarify (training-time bias), Model Monitor (production monitoring), A2I (human review). Match the stage of the lifecycle to the tool.

**Practice:**
- Tutorials Dojo AIF-C01 practice exams are widely considered close to the real exam difficulty.
- Target 80%+ on practice tests before sitting (real exam requires 65–70%).
- After each practice test: review wrong answers against AWS documentation, not just the explanation provided.
- The official AWS Skill Builder "AWS Certified AI Practitioner Official Practice Question Set" is free and worth completing.

**Recommended preparation path:**
1. Read this page to build the conceptual map.
2. Complete the AWS Skill Builder learning plan for AIF-C01 (free tier available).
3. Take one Tutorials Dojo timed practice exam cold to identify gaps.
4. Study the domains where you scored below 70%.
5. Re-test until consistently above 80%.
6. Review all AWS service "What is" pages for services in scope.

---

## In-Scope AWS Services (official list, non-exhaustive)

The official exam guide lists these services as explicitly in scope:

**AI/ML specific:**
Amazon Augmented AI (A2I), Amazon Bedrock, Amazon Comprehend, Amazon Comprehend Medical, Amazon Forecast, Amazon Fraud Detector, Amazon Kendra, Amazon Lex, Amazon Lookout for Metrics, Amazon Lookout for Vision, Amazon Personalize, Amazon Polly, Amazon Q (Business, Developer, in Connect, in QuickSight), Amazon Rekognition, Amazon SageMaker (all sub-services), Amazon Textract, Amazon Transcribe, Amazon Translate, PartyRock

**Supporting AWS services:**
Amazon CloudWatch, Amazon DynamoDB, Amazon EC2, Amazon EventBridge, Amazon OpenSearch Service, Amazon S3, Amazon Step Functions, AWS Glue, AWS IAM, AWS KMS, AWS Lambda, AWS Macie, Amazon VPC, AWS CloudTrail, AWS Config, AWS Audit Manager, AWS Artifact

---

## Key Distinctions (Common Confusion Points)

| Confusion pair | The distinction |
|---|---|
| Bedrock Guardrails vs SageMaker Clarify | Guardrails = runtime content policy; Clarify = statistical bias + explainability at training/evaluation time |
| Bedrock Knowledge Bases vs Bedrock Agents | Knowledge Bases = retrieval only (RAG); Agents = multi-step actions + optional knowledge base |
| Amazon Kendra vs Amazon Q Business | Kendra = document search, returns passages; Q Business = GenAI assistant with source citations and permission-aware answers |
| SageMaker Canvas vs SageMaker Autopilot | Canvas = no-code UI for business users; Autopilot = AutoML API with full code transparency |
| Amazon Transcribe vs Amazon Polly | Transcribe = speech to text; Polly = text to speech |
| Amazon Comprehend vs Amazon Textract | Comprehend = NLP on text (sentiment, entities, PII); Textract = extract text/structure from documents/images |
| RAG vs fine-tuning | RAG = inject external knowledge at inference time, no training; fine-tuning = retrain model weights on labelled data |
| Hallucination mitigation | Temperature reduction + RAG grounding + Bedrock Guardrails grounding check |
| Bias vs fairness | Bias = the problem (systematic error); fairness = the property we want (equitable outcomes); Clarify measures bias |

## Connections
- [[landscape/aws-cloud-practitioner]] — foundational CLF-C02 certification; AIF-C01 is the AI-specialist companion
- [[llms/ae-hub]] — AI engineering hub that covers the underlying concepts tested in domains 1-3
- [[rag/pipeline]] — RAG architecture that Bedrock Knowledge Bases implements; heavy exam coverage
- [[agents/practical-agent-design]] — agentic patterns that Bedrock Agents implement
- [[safety/responsible-ai]] — responsible AI concepts mapped to domain 4
- [[landscape/iso42001]] — ISO 42001 referenced in domain 5 governance materials
- [[landscape/regulation]] — EU AI Act and NIST AI RMF covered in domain 5

## Open Questions
- How closely does the AIF-C01 exam track changes in Bedrock's service offerings, and how often does the question bank refresh?
- Which domain 3 fine-tuning concepts (LoRA, QLoRA, DPO) appear at the level of definition recognition vs deeper implementation understanding?
- Does passing AIF-C01 provide meaningful exemption credit toward AWS Solutions Architect or ML Specialty exams?
