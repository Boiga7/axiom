---
type: concept
category: cloud
para: resource
tags: [aws, bedrock, guardrails, content-filtering, responsible-ai, aif-c01, security]
tldr: "Amazon Bedrock Guardrails — managed content safety layer for FM applications. Six policy types: content filters, denied topics, word filters, sensitive information redaction, grounding checks (hallucination), and contextual grounding. AIF-C01 Domain 5 core."
sources: []
updated: 2026-05-06
---

# Amazon Bedrock Guardrails

> **TL;DR** Amazon Bedrock Guardrails — managed content safety layer for FM applications. Six policy types: content filters, denied topics, word filters, sensitive information redaction, grounding checks (hallucination), and contextual grounding. AIF-C01 Domain 5 core.

Bedrock Guardrails is the AWS-managed content safety and policy enforcement layer that sits between your application and any Bedrock foundation model. It intercepts both the input prompt and the model's response, applying configured policies before anything reaches the user. AIF-C01 Domain 5 (Security, 14%) tests which guardrail type solves which problem.

---

## Why Guardrails

Without a guardrail layer:
- A RAG chatbot can be prompted to discuss topics outside its scope
- A customer service bot can reveal sensitive PII from its knowledge base
- A grounded assistant can hallucinate facts not present in the retrieved context
- An enterprise assistant can produce harmful or off-brand content

Guardrails adds a managed policy enforcement layer without modifying the FM or the application code.

---

## Six Policy Types

### 1. Content Filters

Detect and block harmful content in both inputs and outputs.

| Category | What it blocks |
|---|---|
| Hate | Discriminatory content targeting protected groups |
| Insults | Bullying, demeaning language |
| Sexual | Explicit sexual content |
| Violence | Graphic violence, threats |
| Misconduct | Illegal activity, fraud |
| Prompt attack | Jailbreak attempts, prompt injection |

**Configuration:** Each category has a filter strength: None → Low → Medium → High. Higher strength = more aggressive blocking at the cost of potential false positives.

**Exam trigger:** "block harmful content", "prevent inappropriate responses", "filter violent content"

---

### 2. Denied Topics

Block entire subjects from being discussed, regardless of how the question is phrased.

**How it works:** You define topics in natural language (e.g., "investment advice", "competitor pricing"). Guardrails uses an FM to determine if the input or output relates to a denied topic. If matched, the request is blocked.

**Example:** A financial services chatbot denies "specific stock buy/sell recommendations" to avoid regulatory risk.

**Exam trigger:** "prevent the assistant from discussing X", "topic restriction", "stop the bot from answering questions about competitors"

---

### 3. Word Filters

Block specific words, phrases, or profanity.

- Managed lists: Profanity (AWS-maintained list)
- Custom lists: Add specific words, product names, competitor names

Less sophisticated than denied topics (exact string match) but useful for hard-coded policy terms.

**Exam trigger:** "block specific words", "profanity filter", "prevent brand names from appearing"

---

### 4. Sensitive Information Redaction (PII)

Detect and redact or block personally identifiable information in inputs and outputs.

**Supported PII types:** Name, email address, phone number, SSN, date of birth, credit card number, IP address, driver's licence number, passport number, bank account number, and custom regex patterns.

**Two modes:**
- **Redact:** Replace detected PII with a placeholder (e.g., `[EMAIL]`) — the conversation continues without the sensitive value
- **Block:** Stop the interaction entirely if PII is detected

**Exam trigger:** "prevent PII from appearing in responses", "redact sensitive data", "GDPR compliance in chatbot", "block SSN from being returned"

---

### 5. Grounding Check (Hallucination Detection)

Verify that model responses are grounded in a provided reference source. This is the primary anti-hallucination guardrail for RAG systems.

**How it works:**
1. You pass a retrieved context (e.g., RAG chunks) alongside the query
2. Guardrails computes a grounding score: how well is the response supported by the source?
3. If the grounding score falls below a configured threshold, the response is blocked

**Grounding threshold:** 0–1 scale. Higher threshold = stricter grounding requirement.

**Relevance threshold:** Separately checks whether the retrieved source is relevant to the query.

**Exam trigger:** "prevent hallucinations in RAG", "ensure model only answers from retrieved context", "grounding check", "faithfulness enforcement"

**vs RAGAS Faithfulness:** RAGAS is an evaluation metric (post-hoc measurement). Guardrails grounding check is a runtime enforcement mechanism (blocks non-grounded responses in production).

---

### 6. Contextual Grounding (System Grounding)

An extension of grounding check specifically for agentic and multi-turn contexts — verifies that responses are grounded in the system prompt and conversation history, not just a single retrieved context.

---

## How Guardrails Integrates

Guardrails attaches to any Bedrock API call via a `guardrailIdentifier` and `guardrailVersion` parameter:

```python
import boto3

bedrock = boto3.client("bedrock-runtime")

response = bedrock.converse(
    modelId="anthropic.claude-sonnet-4-5",
    guardrailConfig={
        "guardrailIdentifier": "your-guardrail-id",
        "guardrailVersion": "DRAFT",
        "trace": "enabled",
    },
    messages=[{"role": "user", "content": [{"text": "Tell me about..."}]}]
)
```

**Trace mode:** When enabled, the response includes `guardrailTrace` — which policies triggered, what was detected, and the action taken. Essential for debugging and audit.

**Works with:**
- `InvokeModel` / `Converse` API (real-time)
- Bedrock Agents (applied to agent inputs/outputs)
- Bedrock Knowledge Bases (applied to RAG responses)

---

## Guardrail Actions

When a policy triggers, Guardrails takes one of three actions:

| Action | What happens |
|---|---|
| **BLOCKED** | The entire input or output is rejected; a configurable blocked message is returned |
| **ANONYMIZED** | PII is replaced with a placeholder; the interaction continues |
| **NONE** | No violation detected; normal response returned |

Blocked message is customisable: "I'm sorry, I can't discuss that topic."

---

## AIF-C01 Scenario Drill

| Scenario | Guardrail policy |
|---|---|
| Prevent the chatbot from discussing competitor products | Denied Topics |
| Ensure customer service bot never reveals SSNs | Sensitive Information Redaction |
| Block users from submitting jailbreak prompts | Content Filters (Prompt attack) |
| Verify a RAG response is supported by retrieved documents | Grounding Check |
| Stop the chatbot from generating violent content | Content Filters (Violence) |
| Prevent the word "lawsuit" from appearing in any response | Word Filters |
| Block responses about investment advice to avoid regulatory liability | Denied Topics |

---

## Key Facts

- Six policy types: Content Filters (6 categories), Denied Topics (NL-defined), Word Filters, Sensitive Information Redaction, Grounding Check, Contextual Grounding
- Content filter strengths: None / Low / Medium / High — controls blocking aggressiveness
- Denied topics use an FM to understand semantic intent — more robust than keyword matching
- PII redaction modes: Redact (placeholder) vs Block (stop interaction)
- Grounding check threshold 0–1: higher = stricter; requires retrieved context to be passed alongside the query
- Guardrails applies to both input (user prompt) and output (model response)
- Trace mode produces `guardrailTrace` for debugging and audit logging
- Works with Converse API, Bedrock Agents, and Bedrock Knowledge Bases
- Prompt attack filter specifically targets jailbreak and prompt injection attempts

## Connections

- [[apis/aws-bedrock]] — Bedrock platform; Guardrails is attached to Bedrock API calls via guardrailConfig
- [[landscape/aws-ai-practitioner]] — AIF-C01 Domain 5 (Security, 14%); Guardrails is the primary Bedrock security control tested
- [[security/prompt-injection]] — Content Filters "Prompt attack" category is Bedrock's managed prompt injection defence
- [[safety/responsible-ai]] — Guardrails is the AWS implementation of responsible AI content controls
- [[rag/pipeline]] — Grounding Check is the runtime enforcement counterpart to RAGAS Faithfulness evaluation
- [[cloud/aws-ai-recognition-services]] — Rekognition content moderation is the vision equivalent; Guardrails covers text

## Open Questions

- Does the grounding check use a separate smaller FM or the same model being guarded?
- Can Guardrails be applied cross-account (e.g., a central guardrail account enforcing policies for multiple application accounts)?
