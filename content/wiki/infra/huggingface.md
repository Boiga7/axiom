---
type: entity
category: infra
tags: [huggingface, transformers, datasets, hub, peft, tokenizers, inference]
sources: []
updated: 2026-04-29
para: resource
tldr: HuggingFace is the central infrastructure of the open-source LLM ecosystem — 700K+ models and 200K+ datasets on the Hub, with the transformers/datasets/PEFT/TRL library stack underpinning essentially all open model work.
---

# HuggingFace

> **TL;DR** HuggingFace is the central infrastructure of the open-source LLM ecosystem — 700K+ models and 200K+ datasets on the Hub, with the transformers/datasets/PEFT/TRL library stack underpinning essentially all open model work.

The central infrastructure layer of the open-source LLM ecosystem. If it's a public model, dataset, or fine-tuned checkpoint, it's on the Hub. The `transformers` library is the de-facto standard for running any open model locally.

---

## The Hub

`huggingface.co` hosts:
- **700,000+ models** — from BERT to Llama 3 to Stable Diffusion
- **200,000+ datasets** — training, benchmarking, evaluation
- **Spaces** — hosted Gradio/Streamlit demos

Model IDs follow `organization/model-name` format: `meta-llama/Meta-Llama-3-70B-Instruct`, `mistralai/Mistral-7B-Instruct-v0.3`.

```bash
# Authenticate (required for gated models like Llama)
huggingface-cli login

# Download a model
huggingface-cli download meta-llama/Meta-Llama-3-8B-Instruct
```

Models download to `~/.cache/huggingface/hub/` by default. Override with `HF_HOME` env var.

---

## `transformers`: Loading Models

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_id = "meta-llama/Meta-Llama-3-8B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.bfloat16,   # BF16 halves VRAM vs FP32
    device_map="auto",             # auto-shards across available GPUs/CPU
)

# Apply chat template
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is RAG?"},
]
input_ids = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    return_tensors="pt"
).to(model.device)

with torch.no_grad():
    outputs = model.generate(
        input_ids,
        max_new_tokens=512,
        temperature=0.7,
        do_sample=True,
    )

response = tokenizer.decode(outputs[0][input_ids.shape[-1]:], skip_special_tokens=True)
```

`device_map="auto"` is critical: it splits the model across available devices automatically, including CPU offload if VRAM is insufficient.

---

## `pipeline`: Quick Inference

For simple tasks, `pipeline` wraps the full inference loop:

```python
from transformers import pipeline

# Text generation
gen = pipeline(
    "text-generation",
    model="microsoft/phi-4",
    torch_dtype="auto",
    device_map="auto",
)
result = gen("Explain transformers in one paragraph", max_new_tokens=200)

# Embedding
embedder = pipeline(
    "feature-extraction",
    model="BAAI/bge-m3",
    torch_dtype=torch.float16,
)
embedding = embedder("This is a sentence")[0][0]  # [batch, seq_len, hidden] → first token

# Classification
classifier = pipeline("text-classification", model="ProsusAI/finbert")
classifier("Earnings beat estimates by 15%")
# [{'label': 'positive', 'score': 0.96}]
```

---

## `datasets`: Loading Training Data

```python
from datasets import load_dataset

# Public dataset
ds = load_dataset("tatsu-lab/alpaca")
# DatasetDict with 'train' split

# With streaming (for large datasets, no full download)
ds = load_dataset("HuggingFaceFW/fineweb", streaming=True, split="train")
for example in ds.take(10):
    print(example["text"][:200])

# Local files
ds = load_dataset("json", data_files={"train": "train.jsonl", "test": "test.jsonl"})

# Filter, map, select
ds = ds.filter(lambda x: len(x["text"]) > 100)
ds = ds.map(lambda x: {"text": x["text"].strip()}, batched=True, num_proc=8)
ds = ds["train"].select(range(10_000))  # first 10K examples
```

### Uploading to Hub

```python
from datasets import Dataset
import pandas as pd

df = pd.read_csv("my_dataset.csv")
ds = Dataset.from_pandas(df)
ds.push_to_hub("your-org/your-dataset-name", private=True)
```

---

## Tokenizers

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")

# Tokenise
tokens = tokenizer.encode("Hello world")         # [128000, 9906, 1917]
decoded = tokenizer.decode(tokens)               # "Hello world"

# Count tokens without full encoding
token_count = len(tokenizer.encode(long_text))

# Batch tokenisation for training
batch = tokenizer(
    ["text one", "text two", "a longer text three"],
    padding=True,           # pad to longest in batch
    truncation=True,
    max_length=512,
    return_tensors="pt",
)
# batch.input_ids, batch.attention_mask
```

---

## PEFT: Parameter-Efficient Fine-Tuning

See [[fine-tuning/lora-qlora]] for the full treatment. Quick reference:

```python
from peft import get_peft_model, LoraConfig, TaskType

config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
)
peft_model = get_peft_model(base_model, config)
peft_model.print_trainable_parameters()
# trainable params: 13,631,488 || all params: 8,043,188,224 || trainable%: 0.17
```

---

## `Trainer` API

High-level training loop:

```python
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,    # effective batch = 4*4 = 16
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    load_best_model_at_end=True,
    report_to="wandb",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_eval,
    tokenizer=tokenizer,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
)
trainer.train()
```

For fine-tuning, use TRL's `SFTTrainer` instead (handles chat templates and packing automatically). See [[fine-tuning/frameworks]].

---

## Inference API (Serverless)

Run models without local hardware:

```python
from huggingface_hub import InferenceClient

client = InferenceClient(
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    token="HF_TOKEN",
)

result = client.text_generation(
    "Explain gradient descent",
    max_new_tokens=300,
    temperature=0.7,
)

# Chat completion compatible endpoint
response = client.chat_completion(
    messages=[{"role": "user", "content": "Explain gradient descent"}],
    max_tokens=300,
)
```

Free tier with rate limits. For production, use Dedicated Endpoints or Inference Endpoints.

---

## Pushing Models to Hub

```python
model.push_to_hub("your-org/finetuned-model-name")
tokenizer.push_to_hub("your-org/finetuned-model-name")

# Or from a directory
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path="./fine-tuned-model",
    repo_id="your-org/model-name",
    repo_type="model",
)
```

---

## Key Repos

| Repo | Purpose |
|---|---|
| `transformers` | Load and run any model |
| `datasets` | Load and process datasets |
| `peft` | LoRA, QLoRA, IA³ adapters |
| `trl` | SFT, DPO, GRPO trainers |
| `accelerate` | Multi-GPU/TPU training wrapper |
| `diffusers` | Image generation models |
| `tokenizers` | Fast Rust tokenizer library |
| `huggingface_hub` | Hub API, upload, download |

---

## Key Facts

- Hub: 700,000+ models, 200,000+ datasets, Spaces for demos
- Model IDs format: `organization/model-name` (e.g., `meta-llama/Meta-Llama-3-70B-Instruct`)
- Models download to `~/.cache/huggingface/hub/` by default; override with `HF_HOME`
- Gated models (Llama) require `huggingface-cli login` and Hub access request
- `device_map="auto"` auto-shards models across GPUs and CPU — critical for large models
- For fine-tuning, use TRL `SFTTrainer` instead of `Trainer` — handles chat templates and packing
- Streaming datasets: `load_dataset(..., streaming=True)` avoids full downloads for large corpora

## Common Failure Cases

**`OSError: Gated model` or `401 Unauthorized` when loading a gated model**  
Why: Llama, Mistral, and other gated models require Hub access approval and authentication.  
Detect: `OSError: You are trying to access a gated repo` or `401 Client Error` when calling `from_pretrained`.  
Fix: request access on the model's Hub page; run `huggingface-cli login` and paste your token; set `HUGGINGFACE_TOKEN` env var.

**`CUDA out of memory` when loading with `device_map="auto"` on a multi-GPU system**  
Why: `device_map="auto"` tries to place the model sequentially across GPUs; if the first GPU fills up, subsequent allocations can fail.  
Detect: `RuntimeError: CUDA out of memory` even though total VRAM across all GPUs is sufficient.  
Fix: explicitly specify `max_memory` per device: `device_map="auto", max_memory={0: "40GiB", 1: "40GiB"}`; or use `device_map="balanced"`.

**`datasets` `map()` is orders of magnitude slower than expected**  
Why: `map()` defaults to single-process execution; for large datasets, `num_proc=1` is a bottleneck.  
Detect: `map()` on 100K rows takes >10 minutes with simple transformations; CPU utilisation is <100%.  
Fix: set `num_proc=8` (or the number of CPU cores); use `batched=True` for further speedup on most operations.

**Model pushed to Hub overwrites a prior version with no history**  
Why: `push_to_hub` replaces the current revision; there's no automatic versioning.  
Detect: prior checkpoint is gone from the Hub; team members lose access to the previous model.  
Fix: use `commit_message` and tag revisions explicitly; use the Hub's branch feature to preserve prior checkpoints before pushing a new one.

**Tokenizer apply_chat_template omits the generation prompt, causing the model to complete the user message instead of responding**  
Why: `add_generation_prompt=False` is the default in some versions; the model sees the full user message without an assistant turn marker.  
Detect: model output continues the user message text instead of generating a response.  
Fix: always pass `add_generation_prompt=True` when preparing inputs for inference.

## Connections

- [[fine-tuning/frameworks]] — Axolotl, TRL, Unsloth build on HF transformers and PEFT
- [[fine-tuning/lora-qlora]] — HF PEFT provides LoraConfig and get_peft_model
- [[fine-tuning/dpo-grpo]] — TRL DPOTrainer/GRPOTrainer are HF-native
- [[rag/embeddings]] — embedding models (BGE-M3, text-embedding-004) available on the Hub
- [[infra/inference-serving]] — vLLM and llama.cpp for production serving of HF models
- [[infra/gpu-hardware]] — `device_map="auto"` interacts directly with GPU availability

## Open Questions

- What is the practical performance difference between HF Inference API and a self-hosted vLLM endpoint for the same model?
- When does the Hub's 700K model count create discovery problems vs signal-to-noise advantages?
- How does HF Dedicated Endpoints pricing compare to Modal for production inference of 7B-13B models?
