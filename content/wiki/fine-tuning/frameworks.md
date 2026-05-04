---
type: concept
category: fine-tuning
tags: [axolotl, trl, unsloth, peft, fine-tuning, training, huggingface]
sources: []
updated: 2026-04-29
para: resource
tldr: Fine-tuning framework selection guide — Axolotl for production (config-file driven, all objectives), TRL for custom training loops, Unsloth for maximum single-GPU speed; all build on HuggingFace PEFT underneath.
---

# Fine-Tuning Frameworks

> **TL;DR** Fine-tuning framework selection guide — Axolotl for production (config-file driven, all objectives), TRL for custom training loops, Unsloth for maximum single-GPU speed; all build on HuggingFace PEFT underneath.

The tooling layer for running LoRA, DPO, GRPO, and SFT on open-weight models. All build on HuggingFace PEFT and Transformers under the hood.

---

## Axolotl

The widest objective coverage in a config-file-driven package. The practical default for production fine-tuning.

**Why Axolotl:**
- Single YAML config defines the entire training run
- Supports SFT, DPO, GRPO, ORPO, KTO, RM, PPO in one tool
- Multi-GPU training via DeepSpeed or FSDP, configured automatically
- Active development and strong community

**Install:**
```bash
pip install axolotl[flash-attn,deepspeed]
```

**Minimal DPO config (`config.yml`):**
```yaml
base_model: meta-llama/Meta-Llama-3-8B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

load_in_4bit: true
adapter: qlora
lora_r: 16
lora_alpha: 32
lora_target_modules: [q_proj, k_proj, v_proj, o_proj]
lora_dropout: 0.05

datasets:
  - path: my_dpo_dataset.jsonl
    type: chatml.intel  # or alpaca, sharegpt, etc.

rl: dpo
beta: 0.1
learning_rate: 5e-5
num_epochs: 3
micro_batch_size: 2
gradient_accumulation_steps: 4
warmup_steps: 100
output_dir: ./output
```

**Run:**
```bash
accelerate launch -m axolotl.cli.train config.yml
```

**Multi-GPU:**
```bash
accelerate launch --num_processes 4 -m axolotl.cli.train config.yml
```

Axolotl v0.7.0 (February 2025) added GRPO support via HuggingFace TRL integration, including PEFT + vLLM support. Check [github.com/axolotl-ai-cloud/axolotl/releases](https://github.com/axolotl-ai-cloud/axolotl/releases) for the current version.

---

## TRL (Transformer Reinforcement Learning)

HuggingFace's canonical RLHF/preference library. More code than Axolotl, more flexible.

**When to use TRL:** Custom training loops, novel objectives, research experiments where you need to modify the loss function.

```python
from trl import SFTTrainer, SFTConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import load_dataset
from peft import LoraConfig

model = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
dataset = load_dataset("my_dataset")

peft_config = LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"])

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    peft_config=peft_config,
    tokenizer=tokenizer,
    args=SFTConfig(output_dir="./output", max_seq_length=2048),
)
trainer.train()
```

**TRL trainers:** `SFTTrainer`, `DPOTrainer`, `PPOTrainer`, `GRPOTrainer`, `ORPOTrainer`, `KTOTrainer`, `RewardTrainer`. All follow the same interface pattern.

---

## Unsloth

Speed-focused wrapper around TRL. 2–4x faster training, 50–80% less GPU memory.

**How:** Custom CUDA kernels for attention and weight operations. Integrates with TRL transparently.

```python
from unsloth import FastLanguageModel
import torch

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Meta-Llama-3-8B-bnb-4bit",
    max_seq_length=2048,
    dtype=None,  # auto-detect
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha=16,
    lora_dropout=0,
)

# Then use with TRL trainers normally:
from trl import SFTTrainer
trainer = SFTTrainer(model=model, tokenizer=tokenizer, ...)
trainer.train()
```

**Limitation:** Primarily single-GPU; multi-GPU support is more limited than Axolotl/TRL with DeepSpeed.

**Use Unsloth when:** You want maximum speed on a single GPU (e.g. renting a single A100 for a quick experiment).

---

## HuggingFace PEFT

The foundation library. Axolotl and TRL both use PEFT internally.

```python
from peft import LoraConfig, get_peft_model, PeftModel

config = LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"])
model = get_peft_model(base_model, config)

# Save adapter
model.save_pretrained("./adapter")

# Load adapter on top of base
model = PeftModel.from_pretrained(base_model, "./adapter")

# Merge and save as a single model
merged = model.merge_and_unload()
merged.save_pretrained("./merged_model")
```

---

## Choosing a Framework

| Situation | Use |
|---|---|
| Production fine-tuning, any objective | Axolotl |
| Custom training loop / novel loss | TRL |
| Single GPU, max speed | Unsloth |
| Multi-GPU, distributed training | Axolotl + DeepSpeed/FSDP |
| Learning / experimentation | TRL directly |

---

## Dataset Formats

Most frameworks support multiple format types. Common formats:

**alpaca format:**
```json
{"instruction": "...", "input": "...", "output": "..."}
```

**sharegpt / chatml format:**
```json
{"conversations": [{"from": "human", "value": "..."}, {"from": "gpt", "value": "..."}]}
```

**DPO format:**
```json
{"prompt": "...", "chosen": "...", "rejected": "..."}
```

Axolotl has 30+ built-in dataset type parsers. Specify `type: alpaca` or `type: sharegpt` in your YAML.

---

## Training at Scale

For runs that need multiple GPUs:

**DeepSpeed ZeRO-3:** Shard model weights, optimizer states, and gradients across GPUs. Enables training 70B models on 8× A100 40GB.

**FSDP (Fully Sharded Data Parallel):** PyTorch-native alternative. FSDP2 (PyTorch 2.3+) is cleaner but slightly lower throughput than DeepSpeed for most cases.

**Flash Attention 2:** Required for long-context fine-tuning. 3–4x faster attention, 5–8x less memory. Install: `pip install flash-attn --no-build-isolation`.

---

## Key Facts

- Axolotl v0.7.0 (February 2025): added GRPO support via TRL integration, including PEFT + vLLM support
- Axolotl supports 30+ built-in dataset type parsers
- Unsloth: 2-4x faster training, 50-80% less GPU memory; primarily single-GPU
- Flash Attention 2: 3-4x faster attention, 5-8x less memory; required for long-context fine-tuning
- DeepSpeed ZeRO-3: enables 70B training on 8× A100 40GB
- FSDP2 available in PyTorch 2.3+; slightly lower throughput than DeepSpeed for most cases
- TRL trainers: SFTTrainer, DPOTrainer, PPOTrainer, GRPOTrainer, ORPOTrainer, KTOTrainer, RewardTrainer

## Common Failure Cases

**Axolotl training crashes with `CUDA out of memory` even though VRAM appears sufficient**  
Why: Axolotl pre-allocates memory for the full sequence length across the micro batch; a `max_sequence_length: 4096` with `micro_batch_size: 2` can exceed 24GB on a single RTX 4090 even for a 7B model.  
Detect: OOM occurs at the start of training before any gradients are computed; `nvidia-smi` shows VRAM fully allocated before the first batch.  
Fix: reduce `max_sequence_length`, `micro_batch_size`, or both; increase `gradient_accumulation_steps` to compensate for effective batch size; enable `gradient_checkpointing: true` in the config.

**TRL `DPOTrainer` runs but loss goes negative, indicating reward hacking rather than learning**  
Why: if the reference model and policy model are not the same checkpoint, or if `beta` is set too low, the policy quickly diverges — chosen and rejected log-prob ratios collapse and the loss becomes undefined.  
Detect: DPO loss drops below zero in W&B/TensorBoard within the first 100 steps; generation quality degrades immediately.  
Fix: ensure `ref_model` is loaded from the same checkpoint as the policy model; increase `beta` to 0.1-0.5; validate dataset format (prompt/chosen/rejected columns must be strings, not lists).

**Unsloth raises `NotImplementedError` when used with a model not in its supported list**  
Why: Unsloth applies custom CUDA kernels that are model-architecture-specific; models outside its explicitly supported list (e.g., newer Llama variants, custom architectures) fall through to an unsupported code path.  
Detect: `NotImplementedError: Unsloth: Model X is not supported yet` at `FastLanguageModel.from_pretrained()`.  
Fix: use TRL directly for unsupported architectures; check the Unsloth GitHub releases for the current supported model list before planning training runs.

**Multi-GPU Axolotl run with FSDP silently uses only 1 GPU because `accelerate` was not configured**  
Why: running `accelerate launch` without first running `accelerate config` or providing a config file defaults to single-process execution; no error is raised.  
Detect: `nvidia-smi` shows only GPU 0 at >90% utilisation while others are idle; training time matches single-GPU baseline.  
Fix: run `accelerate config` to generate a distributed training config before multi-GPU training; or pass `--multi_gpu --num_processes <N>` explicitly to `accelerate launch`.

**Flash Attention 2 installed but Axolotl does not use it, leaving training 3-4x slower than expected**  
Why: `flash_attention: true` in the Axolotl config requires flash-attn to be installed with the correct CUDA version; a version mismatch causes Axolotl to silently fall back to standard attention.  
Detect: training throughput is 3-4x lower than expected for the model size; no `flash_attn` import error but FA2 is not shown in the training log.  
Fix: install with `pip install flash-attn --no-build-isolation`; verify the installed CUDA version matches the flash-attn wheel; check Axolotl startup logs for "Flash Attention enabled" confirmation.

## Connections

- [[fine-tuning/decision-framework]] — when to fine-tune and with which objective
- [[fine-tuning/lora-qlora]] — LoRA and QLoRA that these frameworks implement
- [[fine-tuning/dpo-grpo]] — the training objectives each trainer implements
- [[infra/huggingface]] — HuggingFace PEFT, Transformers, and datasets underpinning all frameworks
- [[infra/gpu-hardware]] — GPU requirements for each framework and model size

## Open Questions

- How does Axolotl FSDP2 compare to DeepSpeed ZeRO-3 in practice for 13B-70B fine-tuning jobs?
- When will Unsloth reach production-quality multi-GPU support?
- Is there a standardised benchmark for comparing framework training speed across the same model/dataset?
