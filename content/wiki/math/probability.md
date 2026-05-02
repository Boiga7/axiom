---
type: concept
category: math
tags: [probability, information-theory, entropy, kl-divergence, softmax, bayesian]
sources: []
updated: 2026-04-29
para: resource
tldr: Probability and information theory foundations every AI engineer needs — covers cross-entropy loss, KL divergence (used in DPO/RLHF), softmax/temperature, perplexity, and sampling strategies that drive LLM training and inference.
---

# Probability and Information Theory for AI Engineers

> **TL;DR** Probability and information theory foundations every AI engineer needs — covers cross-entropy loss, KL divergence (used in DPO/RLHF), softmax/temperature, perplexity, and sampling strategies that drive LLM training and inference.

The probability foundations behind LLM training objectives, sampling, and evaluation. You need this to understand cross-entropy loss, temperature, KL divergence (DPO), and why perplexity means what it means.

---

## Probability Distributions

A probability distribution assigns a probability to each possible outcome. Discrete distributions sum to 1:

```
P(X = x₁) + P(X = x₂) + ... + P(X = xₙ) = 1
```

For LLMs, the output distribution is over vocabulary tokens at each step. With a 100K-token vocabulary, the model outputs 100K probabilities summing to 1.

---

## Softmax

Converts raw logits (any real numbers) into a valid probability distribution:

```
softmax(zᵢ) = exp(zᵢ) / Σⱼ exp(zⱼ)
```

Properties: all outputs in (0, 1), sum to 1, preserves relative ordering.

### Temperature Scaling

```
softmax(z/T)ᵢ = exp(zᵢ/T) / Σⱼ exp(zⱼ/T)
```

- `T = 1.0` — default, unmodified distribution
- `T < 1.0` (e.g. 0.3) — "colder", peaks sharper, more deterministic
- `T > 1.0` (e.g. 1.5) — "hotter", flatter distribution, more random

```python
import torch
import torch.nn.functional as F

logits = torch.tensor([2.0, 1.0, 0.1, -1.0])

print(F.softmax(logits, dim=-1))           # T=1 default
print(F.softmax(logits / 0.5, dim=-1))     # T=0.5 sharper
print(F.softmax(logits / 2.0, dim=-1))     # T=2 flatter
```

---

## Entropy

Measures uncertainty (information content) of a distribution:

```
H(P) = -Σᵢ P(xᵢ) log P(xᵢ)
```

- High entropy = uncertain, spread distribution
- Low entropy = confident, peaked distribution
- Units: bits (log₂) or nats (ln)

For a fair coin: H = -0.5 log₂(0.5) - 0.5 log₂(0.5) = 1 bit.

**LLM context:** A model with high output entropy is less certain about its next token. Entropy is sometimes used as a signal for uncertainty or hallucination detection.

---

## Cross-Entropy Loss

The training objective for language models.

```
L = -Σᵢ y_true(xᵢ) log P_model(xᵢ)
```

For language modelling, the true distribution is a one-hot (the actual next token). So the loss simplifies to:

```
L = -log P_model(correct_token)
```

**Intuition:** punish the model for assigning low probability to the correct token. If the correct token has probability 0.9, loss = -log(0.9) = 0.105. If probability 0.01, loss = -log(0.01) = 4.6.

```python
import torch
import torch.nn.functional as F

logits = torch.tensor([[2.5, 0.5, -1.0]])  # model output
target = torch.tensor([0])                  # correct token index

loss = F.cross_entropy(logits, target)
# Equivalent to: -log(softmax(logits)[target])
```

---

## KL Divergence

Measures how different two probability distributions are:

```
KL(P || Q) = Σᵢ P(xᵢ) log (P(xᵢ) / Q(xᵢ))
```

Properties:
- KL(P || Q) ≥ 0 always
- KL(P || P) = 0
- Asymmetric: KL(P || Q) ≠ KL(Q || P)

**Why it matters for LLMs:**
- RLHF KL penalty: `reward - β × KL(policy || reference)` — penalises the model from diverging too far from the reference policy during RLHF training
- DPO loss function contains KL terms implicitly
- Evaluating fine-tuned models: how different is the fine-tuned distribution from the base?

```python
def kl_divergence(p: torch.Tensor, q: torch.Tensor) -> torch.Tensor:
    # p, q are probability distributions (after softmax)
    return (p * (p.log() - q.log())).sum()
```

---

## Perplexity

Measures how well a language model predicts a test set. Lower is better.

```
PPL = exp(H(P, Q)) = exp(-1/N Σ log P_model(xᵢ))
```

Where N is the number of tokens. Equivalently: perplexity = exp(average cross-entropy loss).

```python
import torch
import math

def compute_perplexity(model, tokenizer, text: str) -> float:
    tokens = tokenizer(text, return_tensors="pt").input_ids
    with torch.no_grad():
        outputs = model(tokens, labels=tokens)
    return math.exp(outputs.loss.item())
```

**Reference values:**
- 5-bit models (random): ~100K (vocabulary size)
- Strong LLM on Wikipedia: ~5-15
- GPT-4 on various tasks: ~10-25

Perplexity is not directly comparable across tokenisers. A model with a larger vocabulary that splits words less will have lower perplexity by construction.

---

## Sampling Strategies

How to convert a probability distribution into actual token selections:

### Greedy Decoding

```python
next_token = torch.argmax(logits, dim=-1)
```

Always picks the most probable token. Deterministic, but repetitive.

### Top-k Sampling

Sample only from the top k most probable tokens, redistributing probability to zero for the rest:

```python
def top_k_sampling(logits, k=50):
    values, indices = torch.topk(logits, k)
    # Zero out all but top k
    filtered = torch.full_like(logits, float('-inf'))
    filtered.scatter_(0, indices, values)
    probs = F.softmax(filtered, dim=-1)
    return torch.multinomial(probs, 1)
```

### Top-p (Nucleus) Sampling

Sample from the smallest set of tokens whose cumulative probability exceeds p:

```python
def top_p_sampling(logits, p=0.9):
    sorted_logits, sorted_indices = torch.sort(logits, descending=True)
    cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
    
    # Remove tokens with cumulative prob above threshold
    sorted_indices_to_remove = cumulative_probs - F.softmax(sorted_logits, dim=-1) > p
    sorted_logits[sorted_indices_to_remove] = float('-inf')
    
    # Restore original order
    logits = sorted_logits.scatter(0, sorted_indices, sorted_logits)
    return torch.multinomial(F.softmax(logits, dim=-1), 1)
```

Top-p adapts the number of candidates to the distribution shape. When the model is confident (peaked), few tokens pass the threshold. When uncertain, more do.

**Typical settings:**
- Creative writing: `temperature=0.8-1.0, top_p=0.95`
- Factual Q&A: `temperature=0.0-0.3` (near greedy)
- Code generation: `temperature=0.2, top_p=0.95`

---

## Bayes' Theorem

```
P(A|B) = P(B|A) × P(A) / P(B)
```

In LLM context: if you observe output B, what's the probability the true answer was A? Used in:
- Calibration evaluation: does P(model says "yes") match true frequency?
- Bayesian prompt selection in DSPy/MIPROv2

---

## Mutual Information

Measures how much information X and Y share:

```
I(X; Y) = H(X) - H(X|Y) = KL(P(X,Y) || P(X)P(Y))
```

**LLM relevance:**
- Measuring how much a retrieved document reduces uncertainty about the answer
- Attention head analysis: heads that maximise mutual information between query position and attended positions

---

## Key Facts

- Softmax: `softmax(zᵢ) = exp(zᵢ) / Σⱼ exp(zⱼ)` — converts raw logits to probabilities summing to 1
- Temperature scaling divides logits by T before softmax: T < 1.0 sharpens, T > 1.0 flattens the distribution
- Entropy: `H(P) = -Σᵢ P(xᵢ) log P(xᵢ)` — measures uncertainty; high entropy = uncertain model
- Cross-entropy loss simplifies to `L = -log P_model(correct_token)` for language modelling (one-hot target)
- KL divergence: `KL(P || Q) = Σᵢ P(xᵢ) log(P(xᵢ)/Q(xᵢ))` — always ≥ 0, asymmetric; used in RLHF penalty and DPO
- RLHF KL penalty formula: `reward - β × KL(policy || reference)` — β controls how far the model can drift
- Perplexity = `exp(average cross-entropy loss)`; strong LLM on Wikipedia scores ~5-15; random baseline ~100K
- Perplexity is not comparable across tokenisers — larger vocabularies that split words less yield lower scores by construction
- Top-p (nucleus) sampling adapts candidate set size to distribution shape; typical settings: creative T=0.8-1.0, code T=0.2

## Connections

- [[math/information-theory]] — entropy, mutual information, and bits-per-character in depth; the information-theoretic foundations behind cross-entropy and perplexity
- [[llms/transformer-architecture]] — softmax and cross-entropy are the core of the attention mechanism and pretraining objective
- [[fine-tuning/dpo-grpo]] — DPO loss function contains implicit KL terms; the RLHF KL penalty is explicit in the reward formula
- [[evals/methodology]] — perplexity is a standard offline eval metric; entropy can signal hallucination risk
- [[math/optimisation]] — gradients of cross-entropy loss drive all parameter updates via SGD/Adam
- [[math/transformer-math]] — perplexity and cross-entropy applied specifically to LLM architecture; cross-entropy loss and perplexity in context
- [[prompting/techniques]] — temperature and top-p/top-k are sampling parameters set at inference time in API calls
- [[evals/benchmarks]] — perplexity as a benchmark metric

## Open Questions

- Is high output entropy reliably predictive of hallucination in practice, or does it vary too much by task type to use as a production signal?
- How does DPO's implicit KL treatment compare empirically to explicit KL-penalised RLHF (PPO) — are there documented cases where one outperforms the other on alignment tasks?
- What is the practical impact of tokeniser choice on perplexity benchmarks — is there a normalisation method that makes perplexity comparable across models with different vocabulary sizes?
