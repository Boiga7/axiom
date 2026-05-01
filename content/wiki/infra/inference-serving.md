---
type: concept
category: infra
tags: [inference, vllm, llama-cpp, serving, paged-attention, batching, quantisation]
sources: []
updated: 2026-04-29
para: resource
tldr: Production LLM inference is memory-bandwidth-bound, not compute-bound — vLLM solves this with paged attention (2-4x throughput over naive serving) and continuous batching; llama.cpp handles quantised local inference.
---

# Inference Serving

> **TL;DR** Production LLM inference is memory-bandwidth-bound, not compute-bound — vLLM solves this with paged attention (2-4x throughput over naive serving) and continuous batching; llama.cpp handles quantised local inference.

Running LLMs in production. The key challenge: transformers are memory-bandwidth-bound at inference time, and KV cache grows unboundedly with sequence length. Production serving requires careful memory management to maximise throughput.

---

## The Bottleneck: Memory, Not Compute

At inference time (after training), the GPU is not compute-limited — it's memory-bandwidth-limited. Moving weights from HBM (GPU memory) to CUDA cores is the bottleneck. Making the GPU do more computation per memory fetch (batch processing) is the key to throughput.

**Single-request serving:** The GPU is ~10% utilised because it's waiting for memory fetches. Wasteful.
**Batched serving:** Serving N requests simultaneously uses the same memory fetches to do N times the work. Batching is everything for throughput.

---

## vLLM

The standard open-source inference serving framework. Written in Python + CUDA.

**Key innovations:**

### Paged Attention
The KV cache in standard transformers requires contiguous pre-allocated memory. This causes fragmentation and wastes 60–80% of GPU memory.

vLLM uses a paged virtual memory scheme (like OS virtual memory) for the KV cache:
- Divide KV cache into fixed-size "pages" (blocks)
- Allocate pages dynamically as sequences grow
- Share pages across requests that have common prefixes (prefix caching)

Result: 2–4x higher throughput than naive serving, near-zero wasted memory.

### Continuous Batching
Standard batching waits for a full batch before processing. Continuous batching processes requests as they arrive and retires them when done — new requests join the in-flight batch dynamically.

Combined with paged attention: optimal GPU utilisation.

### Tensor Parallelism
Distribute a single model across multiple GPUs by splitting weight matrices along the tensor dimension. Required for 70B+ models on standard GPU hardware.

```bash
vllm serve meta-llama/Meta-Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.95
```

**OpenAI-compatible API:** vLLM exposes an endpoint compatible with the OpenAI API format — drop-in replacement for any OpenAI API client.

---

## llama.cpp

CPU and consumer GPU inference. The standard for running quantised models locally.

**GGUF format** — llama.cpp's quantised model format. Supports Q4_0, Q4_K_M, Q5_K_M, Q8_0, fp16, and others. The most widely used format for local inference.

```bash
./llama-cli -m llama-3-8b-q4_k_m.gguf -p "Hello, who are you?" -n 256
```

**Typical performance (M3 Max, 16-core GPU):**
- Llama 3 8B Q4_K_M: ~50 tokens/sec
- Llama 3 70B Q4_K_M: ~10 tokens/sec (requires enough unified memory)

**Python binding (llama-cpp-python):**
```python
from llama_cpp import Llama
llm = Llama(model_path="llama-3-8b-q4_k_m.gguf", n_gpu_layers=-1)
output = llm("Hello world", max_tokens=50)
```

---

## TensorRT-LLM

NVIDIA's optimised inference library. Maximum throughput on NVIDIA GPUs.

- Custom CUDA kernels optimised for transformer attention
- In-flight batching
- FP8 / INT8 / INT4 quantisation with calibration
- Model parallelism

Best for production deployments on owned/leased NVIDIA hardware. Higher setup cost than vLLM but 20–40% better throughput.

---

## Triton Inference Server

NVIDIA's model serving platform. Wraps TensorRT-LLM (and other backends) with:
- gRPC + REST API
- Dynamic batching
- Model ensemble support (chain models together)
- Prometheus metrics

Enterprise-grade, complex to configure. Use vLLM unless you need the enterprise features.

---

## Quantisation for Inference

See [[math/transformer-math]] for the numbers. Practical guide:

| Use case | Recommendation |
|---|---|
| Local, CPU | GGUF Q4_K_M (best quality/size balance) |
| Local, consumer GPU | GGUF Q5_K_M or fp16 if VRAM allows |
| Cloud serving, quality-first | bf16 or fp8 (H100) |
| Cloud serving, cost-first | int4/GPTQ with calibration |
| Development / API | Don't quantise — use API |

---

## Speculative Decoding

Technique to accelerate autoregressive generation without quality loss:

1. A small "draft" model generates N tokens quickly
2. The large "target" model verifies all N tokens in a single forward pass
3. Accept all tokens the target model agrees with; reject and regenerate from the first mismatch

**Result:** 2–3x throughput improvement when the draft model frequently agrees with the target. Draft and target must share the same tokeniser.

---

## Managed Inference Options

| Provider | Best for | Models |
|---|---|---|
| Anthropic API | Claude models (only option) | Claude 4.x family |
| OpenAI API | GPT family | GPT-4o, o3, etc |
| Together AI | Open models, fast | Llama, Mixtral, Qwen |
| Fireworks AI | Low latency, function calling | Llama, Firefunction |
| Replicate | Diverse models, pay-per-use | 1,000+ models |
| Modal | Serverless GPU, custom models | Any model |
| RunPod | Reserved GPU, cheap | Any model |

---

## Key Facts

- Single-request serving: GPU is ~10% utilised; batching is the primary throughput lever
- vLLM paged attention: 2-4x throughput over naive serving, near-zero wasted KV cache memory
- vLLM exposes OpenAI-compatible API — drop-in replacement for any OpenAI client
- llama.cpp GGUF Q4_K_M on M3 Max: Llama 3 8B at ~50 tok/s, 70B at ~10 tok/s
- Speculative decoding: 2-3x throughput improvement; draft and target must share same tokeniser
- TensorRT-LLM: 20-40% better throughput than vLLM; higher setup cost
- Local inference recommendation: GGUF Q4_K_M for CPU; Q5_K_M or bf16 for consumer GPU

## Connections

- [[infra/vector-stores]] — vector stores frequently collocated with inference serving in RAG systems
- [[infra/huggingface]] — model hub provides the checkpoints that vLLM and llama.cpp load
- [[infra/gpu-hardware]] — GPU selection determines which serving approach is viable
- [[math/transformer-math]] — KV cache memory calculations underlie paged attention design
- [[fine-tuning/lora-qlora]] — quantisation affects inference serving choices

## Open Questions

- How does vLLM prefix caching compare to Anthropic prompt caching for repeated system prompts?
- When does TensorRT-LLM's throughput advantage justify the higher setup complexity over vLLM?
- What is the realistic speculative decoding acceptance rate for general-purpose assistants vs coding tasks?
