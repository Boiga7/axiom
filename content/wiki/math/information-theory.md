---
type: concept
category: math
para: resource
tags: [information-theory, entropy, kl-divergence, cross-entropy, perplexity, mutual-information]
sources: []
updated: 2026-05-01
tldr: The mathematical language for uncertainty, surprise, and divergence between distributions.
---

# Information Theory for AI Engineers

The mathematical language for uncertainty, surprise, and divergence between distributions. These concepts appear constantly in LLM training (cross-entropy loss), evaluation (perplexity), alignment (KL divergence in RLHF/DPO), and RAG (mutual information for retrieval).

---

## Entropy — Uncertainty in a Distribution

Shannon entropy H(X) measures the average surprise (information content) of a random variable:

```
H(X) = -∑ p(x) log₂ p(x)    [bits]
H(X) = -∑ p(x) ln p(x)      [nats]
```

Intuition: a fair coin has maximum entropy (1 bit — maximum uncertainty). A biased coin with p=0.99 has low entropy (0.08 bits — you're almost always right guessing heads).

**Examples:**
```
Fair coin (p=0.5):       H = -2 × 0.5 × log₂(0.5) = 1 bit
Biased (p=0.9, q=0.1):  H = -(0.9 log₂ 0.9 + 0.1 log₂ 0.1) ≈ 0.47 bits
Uniform over 8 outcomes: H = log₂(8) = 3 bits   [maximum for 8 outcomes]
```

**For vocabulary:** a uniform distribution over 50,000 tokens has H = log₂(50,000) ≈ 15.6 bits. A well-trained LLM concentrates probability on ~3-10 likely tokens — much lower entropy per prediction.

---

## Cross-Entropy — The Training Loss

Cross-entropy H(p, q) measures how many bits are needed to encode events from distribution p using a code designed for distribution q:

```
H(p, q) = -∑ p(x) log q(x)
```

**The LLM training loss** is cross-entropy between the true next-token distribution p (one-hot) and the model's predicted distribution q:

```
L = -∑ᵢ log q(yᵢ | y₁,...,yᵢ₋₁, x)
```

For a single token where the correct token has index j:
```
L = -log q(yⱼ)   [log probability of the correct token]
```

Minimising cross-entropy = maximising the log-likelihood of the training data = making the model assign high probability to the correct next tokens.

**Relationship to entropy:**
```
H(p, q) = H(p) + D_KL(p || q)
```
Cross-entropy is always ≥ H(p). When q = p (perfect model), cross-entropy equals entropy. The gap is the KL divergence.

---

## KL Divergence — How Different Two Distributions Are

Kullback-Leibler divergence D_KL(p || q) measures how much more surprise is expected when using q instead of p:

```
D_KL(p || q) = ∑ p(x) log(p(x) / q(x))
             = H(p, q) - H(p)
```

Properties:
- **Non-negative:** D_KL ≥ 0 always; = 0 iff p = q
- **Asymmetric:** D_KL(p || q) ≠ D_KL(q || p)
- **Not a distance metric** (triangle inequality doesn't hold)

### KL in RLHF and DPO

**RLHF KL penalty** — prevents the fine-tuned model from drifting too far from the reference (SFT) model:
```
objective = E[r(x,y)] - β · D_KL(π_RL || π_ref)
```
Without this penalty, the model exploits the reward model by drifting to degenerate outputs.

**Forward vs Reverse KL:**
- Forward D_KL(p || q): mode-seeking — q concentrates on the most likely modes of p
- Reverse D_KL(q || p): mean-seeking — q spreads to cover all modes of p

LLMs use forward KL (model q matches the data p) — this causes the model to be confident, not covering all possible outputs.

---

## Perplexity — The Evaluation Metric

Perplexity is the exponentiated average cross-entropy per token:

```
PP(model, test_set) = exp(-1/N · ∑ᵢ log p(xᵢ | x₁,...,xᵢ₋₁))
```

Intuition: perplexity ≈ the effective vocabulary size the model is "confused between" at each position. A perplexity of 10 means the model is as uncertain as if it were choosing uniformly among 10 options.

**Interpretation:**
- GPT-2 (2019): ~35 perplexity on WikiText-103
- GPT-3 (2020): ~20 perplexity on Penn Treebank  
- Modern LLMs: ~3-8 perplexity on held-out text (model is highly certain)
- Perplexity of 1: perfect model (always predicts the right token)
- Lower = better; exponentiated form makes it more interpretable than raw nats

**Limitation:** perplexity measures fit to the training distribution, not task performance. A model can have low perplexity but poor reasoning ability.

---

## Mutual Information — What RAG Retrieval Optimises For

Mutual information I(X; Y) measures how much information Y provides about X:

```
I(X; Y) = H(X) - H(X | Y)
         = ∑ p(x,y) log(p(x,y) / (p(x)p(y)))
```

= Reduction in uncertainty about X when you know Y.

**In RAG:** ideal retrieval maximises I(answer; retrieved_document | question). A retrieved document that tells you nothing new about the answer has I=0 and wastes context.

**Practical implication:** reranking models (Cohere Rerank, Jina Reranker) are implicitly estimating something like mutual information — which retrieved chunks are actually informative for this query.

---

## Temperature and Softmax

Temperature T rescales the logit distribution before softmax:

```
softmax(z/T)ᵢ = exp(zᵢ/T) / ∑ⱼ exp(zⱼ/T)
```

- T → 0: argmax — model picks the highest-probability token always (greedy)
- T = 1: standard softmax — model's calibrated probabilities
- T > 1: flattens distribution — more entropy, more creative/random outputs
- T < 1: sharpens distribution — less entropy, more confident/repetitive outputs

**In practice:** temperature 0.0 for deterministic outputs (code, factual Q&A); 0.7-1.0 for creative tasks; top-p (nucleus) sampling adds an additional constraint.

---

## Key Facts

- Entropy: H(X) = -∑ p(x) log p(x) — average surprise; bits if log₂, nats if ln
- Cross-entropy: the LLM training loss — H(p,q) = -∑ p(x) log q(x)
- KL divergence: H(p,q) - H(p); always ≥ 0; not symmetric
- Perplexity: exp(cross-entropy per token); lower is better; GPT-2 was ~35, modern LLMs ~3-8
- RLHF: KL penalty β · D_KL(π_RL || π_ref) prevents reward hacking
- DPO: implicitly minimises KL divergence to the optimal policy
- Temperature: scales logits before softmax; lower = more confident; higher = more diverse

---

## Connections

[[math/optimisation]] · [[math/transformer-math]] · [[papers/rlhf]] · [[papers/dpo]] · [[evals/methodology]] · [[rag/pipeline]]
