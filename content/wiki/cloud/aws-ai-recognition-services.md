---
type: concept
category: cloud
para: resource
tags: [aws, ai, rekognition, comprehend, lex, polly, transcribe, translate, textract, kendra, personalize, forecast, clf-c02, aif-c01]
tldr: "AWS pre-built AI services — Rekognition (vision), Comprehend (NLP), Lex (chatbots), Polly/Transcribe (speech), Translate (language), Textract (documents), Kendra (search), Personalize (recommendations), Forecast (time series). No ML expertise required."
sources: []
updated: 2026-05-06
---

# AWS Pre-Built AI Recognition Services

> **TL;DR** AWS pre-built AI services — Rekognition (vision), Comprehend (NLP), Lex (chatbots), Polly/Transcribe (speech), Translate (language), Textract (documents), Kendra (search), Personalize (recommendations), Forecast (time series). No ML expertise required.

CLF-C02 and AIF-C01 both test scenario-to-service matching for AWS's pre-built AI services. These are fully managed APIs that require no ML training data or expertise — you call them and they return predictions. The exam presents a business problem and expects you to identify which service solves it.

---

## Services at a Glance

| Service | What it does | Input → Output |
|---|---|---|
| **Rekognition** | Computer vision | Image/video → labels, faces, text, celebrities, content moderation |
| **Comprehend** | NLP | Text → sentiment, entities, key phrases, topics, language |
| **Lex** | Conversational AI (chatbots) | Voice/text → intent, slots, response |
| **Polly** | Text-to-speech | Text → audio (MP3/OGG) |
| **Transcribe** | Speech-to-text | Audio → text transcript |
| **Translate** | Machine translation | Text (language A) → text (language B) |
| **Textract** | Document extraction | PDF/image → text, tables, forms |
| **Kendra** | Enterprise search | Query → relevant document excerpts |
| **Personalize** | Recommendations | User behaviour → personalised recommendations |
| **Forecast** | Time series forecasting | Historical data → future predictions |
| **Fraud Detector** | Fraud detection | Transaction data → fraud probability |
| **Comprehend Medical** | Medical NLP | Clinical text → PHI, diagnoses, medications |
| **A2I (Augmented AI)** | Human review routing | Low-confidence predictions → human review workflow |
| **Lookout for Metrics** | Anomaly detection | Business metrics → anomalies with root cause |

---

## Service Deep Dives

### Amazon Rekognition

Computer vision for images and video.

**Capabilities:**
- Object and scene detection (labels)
- Facial analysis: age range, emotions, gender, smile, glasses, face comparison
- Face search: match a face against a collection (e.g., employee database)
- Celebrity recognition
- Text detection in images
- Content moderation (nudity, violence, offensive content)
- Video analysis: activity detection, scene analysis, person tracking

**When the exam points to Rekognition:** "detect faces", "content moderation", "identify objects in images", "verify identity", "analyse video for unsafe content"

**Exam note:** Rekognition facial analysis ≠ identity verification alone — it also compares faces and searches collections. If the scenario involves checking whether two photos are the same person, that is Rekognition.

---

### Amazon Comprehend

Natural language processing for text.

**Capabilities:**
- Sentiment analysis (positive/negative/neutral/mixed)
- Entity recognition (people, places, organisations, dates, quantities)
- Key phrase extraction
- Language detection (100+ languages)
- Topic modelling (grouping documents by theme)
- Custom classification and custom entity recognition (trained on your data)
- PII detection and redaction

**Comprehend Medical:** Specialised variant that extracts medical information — diagnoses, medications, dosages, Protected Health Information (PHI).

**When the exam points to Comprehend:** "analyse customer sentiment", "extract entities from documents", "classify support tickets", "detect PII in text", "medical record NLP"

---

### Amazon Lex

Build conversational interfaces (chatbots and voice assistants).

**Capabilities:**
- Automatic speech recognition (ASR) — speech to text
- Natural language understanding (NLU) — text to intent + slots
- Same technology that powers Amazon Alexa
- Integrates with Lambda for fulfilment logic
- Deploys to web, mobile, Amazon Connect (call centres)

**When the exam points to Lex:** "build a chatbot", "voice-based ordering", "customer service bot", "FAQ bot", "conversational interface"

**vs Polly/Transcribe:** Lex is the full conversational system (understands intent). Polly = text → speech only. Transcribe = speech → text only.

---

### Amazon Polly

Text-to-speech service.

**Capabilities:**
- Converts text to natural-sounding speech (MP3, OGG, PCM)
- Neural TTS (NTTS) voices — higher quality, more natural
- Multiple languages and voices
- SSML support for pronunciation control, pauses, emphasis
- Lexicons for custom pronunciation

**When the exam points to Polly:** "text-to-speech", "read content aloud", "generate audio from text", "accessibility for visually impaired", "podcast generation"

---

### Amazon Transcribe

Speech-to-text service.

**Capabilities:**
- Converts audio/video files and streams to text
- Speaker identification (diarisation) — distinguishes multiple speakers
- Custom vocabulary for domain-specific terms
- Automatic punctuation
- Redaction of PII in transcripts
- Call analytics: customer sentiment, talk time, silence, interruptions

**When the exam points to Transcribe:** "transcribe call centre recordings", "generate captions", "meeting transcription", "convert voice notes to text"

**vs Lex:** Transcribe = transcription only (no intent understanding). Lex = full conversational AI system.

---

### Amazon Translate

Neural machine translation.

**Capabilities:**
- Translate text between 75+ languages
- Batch translation of documents in S3
- Real-time translation API
- Custom terminology for brand names and domain-specific terms

**When the exam points to Translate:** "multilingual application", "translate customer reviews", "localise content", "real-time language translation"

---

### Amazon Textract

Intelligent document processing beyond basic OCR.

**Capabilities:**
- Extracts text, tables, and forms from PDFs and images
- Understands document structure (not just raw characters)
- Extracts key-value pairs from forms (e.g., "Date: 2026-05-06")
- Analyses tables and preserves relationships between cells
- Integrates with Comprehend for downstream NLP

**When the exam points to Textract:** "extract data from forms", "process scanned invoices", "read tables from PDFs", "OCR with structure understanding"

**vs simple OCR:** Textract understands that a table is a table — it preserves rows, columns, and relationships. Plain OCR returns a stream of characters.

---

### Amazon Kendra

Intelligent enterprise search powered by ML.

**Capabilities:**
- Indexes documents from S3, SharePoint, Salesforce, ServiceNow, RDS, websites
- Returns relevant document excerpts for natural language queries (not just keyword matches)
- Understands context and synonyms
- Incremental learning from user feedback

**When the exam points to Kendra:** "search internal documents", "enterprise knowledge base search", "employees search company policies", "intelligent search across multiple data sources"

**vs OpenSearch:** Kendra = enterprise document search with ML-powered relevance; OpenSearch = log analytics and raw full-text search without ML ranking.

---

### Amazon Personalize

Real-time personalised recommendations.

**Capabilities:**
- Same recommendation technology used on Amazon.com
- Train on user behaviour data (clicks, purchases, ratings)
- Generates personalised item rankings, similar items, user segments
- No ML expertise required — provide data, configure, deploy
- Real-time inference via API

**When the exam points to Personalize:** "product recommendations", "personalised content feed", "users who bought X also liked Y", "marketing personalisation"

---

### Amazon Forecast

Time series forecasting using ML.

**Capabilities:**
- Trains models on historical time series data
- Automatically selects the best algorithm (DeepAR+, Prophet, ARIMA, etc.)
- Accounts for related datasets (promotions, weather, price changes)
- Probabilistic forecasts with confidence intervals

**When the exam points to Forecast:** "demand planning", "inventory forecasting", "energy consumption prediction", "financial forecasting", "staffing prediction"

---

### Amazon Fraud Detector

Managed fraud detection ML service.

**Capabilities:**
- Builds and deploys fraud detection models without ML expertise
- Trained on Amazon's own fraud detection experience
- Supports: account fraud, payment fraud, fake account creation
- Rules engine for business logic alongside ML scores

**When the exam points to Fraud Detector:** "detect payment fraud", "flag suspicious account registrations", "online transaction fraud"

---

## Scenario → Service Drill

| Scenario | Service |
|---|---|
| Detect if an uploaded image contains adult content | Rekognition |
| Analyse customer support emails for sentiment | Comprehend |
| Build a chatbot for customer service | Lex |
| Convert a text article to audio for a podcast | Polly |
| Transcribe recorded sales calls | Transcribe |
| Translate a website into 10 languages | Translate |
| Extract purchase order data from scanned invoices | Textract |
| Let employees search the company wiki with natural language | Kendra |
| Recommend products to returning website visitors | Personalize |
| Predict next quarter's product demand | Forecast |
| Flag potentially fraudulent credit card transactions | Fraud Detector |
| Extract diagnoses and medications from clinical notes | Comprehend Medical |
| Route uncertain ML predictions to human reviewers | A2I |
| Verify two passport photos are the same person | Rekognition |
| Identify celebrities in marketing footage | Rekognition |

---

## Key Facts

- All pre-built AI services: no ML training or expertise required — call the API and get predictions
- Rekognition: image + video; labels, faces, text, content moderation, celebrity
- Comprehend: text NLP; sentiment, entities, key phrases, language, PII — Comprehend Medical for clinical text
- Lex: chatbot builder; ASR + NLU; powers Amazon Alexa; integrates with Amazon Connect
- Polly: text → audio; Neural TTS; SSML for pronunciation control
- Transcribe: audio → text; diarisation; custom vocabulary; PII redaction; call analytics
- Translate: 75+ languages; batch translation via S3; custom terminology
- Textract: structured document extraction; tables, forms, key-value pairs — more than OCR
- Kendra: ML-powered enterprise search across multiple data sources
- Personalize: ML recommendations; same technology as Amazon.com
- Forecast: time series forecasting; auto-selects best algorithm; probabilistic output
- Fraud Detector: managed fraud ML; rules + ML combined scoring
- Comprehend Custom: train domain-specific classifiers and NER models on labelled data; choose over Bedrock fine-tuning when the task is classification/NER and low-latency label output is needed

## Comprehend Custom

When the pre-built Comprehend API doesn't cover your specific domain, Comprehend Custom lets you train classification and entity recognition models on your own labelled data — without managing ML infrastructure.

| Feature | What it does |
|---|---|
| **Custom Classification** | Train a multi-class or multi-label text classifier on your categories (e.g., support ticket routing: billing / technical / returns) |
| **Custom Entity Recognition** | Train an NER model to detect domain-specific entities (e.g., product codes, medical device IDs, legal terms) |

**Training:** provide a CSV of labelled examples; Comprehend trains, evaluates, and hosts the model. No ML code required.

**When Comprehend Custom beats Bedrock fine-tuning for classification:**

| Criterion | Comprehend Custom | Bedrock fine-tuning |
|---|---|---|
| Task type | Classification or NER only | Any text task (generation, QA, summarisation) |
| Training data volume | Hundreds of labelled examples sufficient | Typically thousands of preference pairs |
| Output | Label + confidence score | Generated text |
| Latency | Low (discriminative model) | Higher (generative model) |
| Cost | Lower (small discriminative model) | Higher (FM-scale model) |
| AWS integration | Native Comprehend API | Bedrock API |

**Choose Comprehend Custom when:** the task is classification or entity extraction, you have labelled examples, and you want low-latency label output without generated text.

**Choose Bedrock fine-tuning when:** you need the model to generate text, explain its reasoning, or handle tasks beyond classification.

**Exam trigger:** "train a custom text classifier on company-specific categories", "domain-specific entity recognition", "classify support tickets with a custom model"

---

## Common Failure Cases

**Choosing Transcribe when Lex is needed**
Why: Transcribe converts speech to text — it has no understanding of intent or how to respond. Lex adds intent recognition and conversational flow on top of transcription.
Fix: If the scenario involves understanding what the user wants and responding, use Lex. If it involves converting audio to a text transcript for a human or downstream system, use Transcribe.

**Choosing OpenSearch when Kendra is needed**
Why: OpenSearch does keyword/BM25 full-text search; Kendra uses ML to understand query intent and return relevant passages from enterprise documents.
Fix: If the scenario involves employees searching internal knowledge bases with natural language questions, use Kendra. If it involves log analytics or custom search with full control, use OpenSearch.

## Connections

- [[cloud/aws-sagemaker-studio]] — SageMaker sub-services for when custom ML training is needed beyond pre-built services
- [[apis/aws-bedrock]] — Bedrock for foundation models when pre-built services are insufficient
- [[landscape/aws-cloud-practitioner]] — CLF-C02 Domain 3 service catalogue
- [[landscape/aws-ai-practitioner]] — AIF-C01 Domain 1 ML fundamentals; Domain 3 FM applications
- [[security/owasp-llm-top10]] — AI-specific security risks applicable to Rekognition/Comprehend deployments

## Open Questions

- How does Amazon Q (Business and Developer) relate to Kendra for enterprise search — is Kendra being superseded? (See [[cloud/aws-amazon-q]] for the Q Business vs Kendra distinction)
- Does AWS plan to expose Comprehend Custom models via the Bedrock Converse API, or will they remain separate service endpoints?
