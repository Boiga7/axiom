---
type: entity
category: apis
tags: [google, gemini, vertex-ai, google-ai-studio, gemini-api, multimodal]
sources: []
updated: 2026-04-29
para: resource
tldr: Google's Gemini API covers both Google AI Studio (developer) and Vertex AI (enterprise GCP) entry points, with the largest context window of any commercial model and competitive pricing for high-volume workloads.
---

# Google AI API (Gemini)

> **TL;DR** Google's Gemini API covers both Google AI Studio (developer) and Vertex AI (enterprise GCP) entry points, with the largest context window of any commercial model and competitive pricing for high-volume workloads.

Google's LLM API surface spans two entry points: **Google AI Studio** (direct API, developer-friendly) and **Vertex AI** (enterprise, GCP-integrated). Both serve the Gemini model family. 650M monthly active Gemini users as of April 2026.

---

## Models (April 2026)

| Model | Context | Strength | Pricing (in/out per M) |
|---|---|---|---|
| **gemini-2.5-pro** | 1M | Best reasoning, long context | $1.25 / $10 |
| **gemini-2.5-flash** | 1M | Fast, cheap, thinking mode | $0.15 / $0.60 |
| **gemini-2.0-flash** | 1M | Previous gen, stable | $0.10 / $0.40 |
| **gemini-1.5-pro** | 2M | Largest context window | $1.25 / $5 |
| **text-embedding-004** | 2K | Embeddings | $0.025 / — |

Gemini 2.5 Pro has the highest context window of any commercial model at 2M tokens (Gemini 1.5 Pro). Strong on coding and reasoning; competitive with Claude Opus and o3.

---

## Setup

```bash
pip install google-generativeai          # Google AI Studio SDK
pip install google-cloud-aiplatform      # Vertex AI SDK
```

Get an API key from Google AI Studio (aistudio.google.com).

---

## Google AI Studio SDK

```python
import google.generativeai as genai

genai.configure(api_key="GOOGLE_API_KEY")  # or GOOGLE_API_KEY env var

model = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    system_instruction="You are a helpful assistant.",
)

# Simple generation
response = model.generate_content("Explain attention mechanisms.")
print(response.text)

# With generation config
response = model.generate_content(
    "Write a haiku about transformers.",
    generation_config=genai.GenerationConfig(
        temperature=0.9,
        max_output_tokens=100,
    ),
)
```

### Streaming

```python
for chunk in model.generate_content("Tell me a story.", stream=True):
    print(chunk.text, end="", flush=True)
```

### Multi-turn Chat

```python
chat = model.start_chat(history=[])

response = chat.send_message("What is RAG?")
print(response.text)

response = chat.send_message("How does it compare to fine-tuning?")
print(response.text)

# Access history
for message in chat.history:
    print(f"{message.role}: {message.parts[0].text[:100]}")
```

---

## Vision and Multimodal

```python
import PIL.Image

model = genai.GenerativeModel("gemini-2.5-pro")

# Image from file
image = PIL.Image.open("diagram.png")
response = model.generate_content(["Explain this architecture diagram:", image])

# Image from URL
response = model.generate_content([
    "What's in this image?",
    {"mime_type": "image/jpeg", "data": base64_image_bytes},
])

# PDF analysis (Gemini handles PDFs natively)
with open("contract.pdf", "rb") as f:
    pdf_data = f.read()

response = model.generate_content([
    {"mime_type": "application/pdf", "data": pdf_data},
    "Summarise the key terms and obligations in this contract.",
])
```

---

## Function Calling

```python
def get_stock_price(ticker: str) -> dict:
    """Get current stock price."""
    return {"ticker": ticker, "price": 185.42, "currency": "USD"}

# Define tool
get_stock_tool = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="get_stock_price",
            description="Get the current stock price for a given ticker symbol.",
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "ticker": genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="Stock ticker symbol, e.g. AAPL, GOOGL",
                    )
                },
                required=["ticker"],
            ),
        )
    ]
)

model = genai.GenerativeModel("gemini-2.5-pro", tools=[get_stock_tool])
response = model.generate_content("What's Apple's current stock price?")

# Handle tool call
if response.candidates[0].content.parts[0].function_call:
    fc = response.candidates[0].content.parts[0].function_call
    result = get_stock_price(**dict(fc.args))
    
    # Send result back
    response = model.generate_content([
        "What's Apple's stock price?",
        response.candidates[0].content,
        genai.protos.Content(
            parts=[genai.protos.Part(
                function_response=genai.protos.FunctionResponse(
                    name=fc.name, response=result
                )
            )],
            role="function",
        ),
    ])
```

---

## Structured Output (JSON Mode)

```python
import json

model = genai.GenerativeModel(
    "gemini-2.5-flash",
    generation_config={"response_mime_type": "application/json"},
)

response = model.generate_content(
    "List the top 3 Python web frameworks with a brief description each. Return as JSON array."
)
data = json.loads(response.text)
```

---

## Embeddings

```python
result = genai.embed_content(
    model="models/text-embedding-004",
    content="What is the capital of France?",
    task_type="retrieval_query",  # or "retrieval_document", "semantic_similarity"
)
embedding = result["embedding"]  # list of 768 floats
```

Task types affect the embedding — use `retrieval_query` for queries and `retrieval_document` for documents being indexed.

---

## Vertex AI (Enterprise)

Vertex AI adds: IAM/VPC security, regional data residency, enterprise SLAs, audit logging, private endpoints.

```python
import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="my-gcp-project", location="us-central1")

model = GenerativeModel("gemini-2.5-pro")
response = model.generate_content("Explain quantum computing.")
print(response.text)
```

Vertex AI uses Google Cloud credentials (Application Default Credentials) rather than API keys:
```bash
gcloud auth application-default login
```

---

## LangChain Integration

```python
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",
    google_api_key="GOOGLE_API_KEY",
    temperature=0.7,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key="GOOGLE_API_KEY",
)
```

---

## Thinking Mode (Gemini 2.5)

Gemini 2.5 Pro/Flash support a thinking mode similar to Claude's extended thinking:

```python
model = genai.GenerativeModel("gemini-2.5-pro")
response = model.generate_content(
    "Prove that there are infinitely many prime numbers.",
    generation_config=genai.GenerationConfig(
        thinking_config=genai.ThinkingConfig(thinking_budget=5000)
    ),
)
# response includes thinking steps + final answer
```

---

## Google AI vs Anthropic vs OpenAI

| Feature | Gemini 2.5 Pro | Claude Sonnet 4.6 | GPT-4o |
|---|---|---|---|
| Max context | 2M tokens | 1M tokens | 128K tokens |
| Pricing (input) | $1.25/M | $3/M | $2.50/M |
| Code (SWE-bench) | ~70%+ | 79.6% | ~73% |
| Google Workspace integration | Native | None | None |
| Multimodal | Strong | Strong | Strong |

Gemini is the natural choice for teams already on GCP or deeply integrated with Google Workspace.

---

## Key Facts

- Gemini 2.5 Pro context window: 1M tokens; Gemini 1.5 Pro: 2M tokens (largest commercial)
- 650M monthly active Gemini users as of April 2026
- Gemini 2.5 Pro pricing: $1.25/M input, $10/M output
- text-embedding-004 output: 768 floats, $0.025/M tokens
- Vertex AI adds IAM/VPC, regional data residency, audit logging, and private endpoints
- `task_type` matters for embeddings: `retrieval_query` vs `retrieval_document` produce different vectors
- Thinking mode configured via `ThinkingConfig(thinking_budget=N)` in generation config

## Connections

- [[apis/anthropic-api]] — Anthropic API comparison (caching, tool use, extended thinking)
- [[apis/openai-api]] — OpenAI API comparison (context window, pricing, function calling)
- [[llms/model-families]] — Gemini 2.5 Pro/Flash in the broader model landscape
- [[landscape/ai-labs]] — Google DeepMind's position and research agenda
- [[rag/embeddings]] — text-embedding-004 vs Cohere vs OpenAI embeddings

## Open Questions

- How does Gemini 2M context quality degrade on retrieval tasks at full window utilisation?
- What is the practical cost difference between Vertex AI and AI Studio for production workloads?
- How does Gemini thinking mode quality compare to Claude extended thinking on complex reasoning benchmarks?
