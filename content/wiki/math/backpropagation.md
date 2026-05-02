---
type: concept
category: math
para: resource
tags: [backpropagation, gradients, chain-rule, vanishing-gradients, residual-connections, training]
sources: []
updated: 2026-05-01
tldr: "How neural networks learn: compute the loss, attribute it to each weight via the chain rule, update weights to reduce the loss."
---

# Backpropagation and Gradient Flow

How neural networks learn: compute the loss, attribute it to each weight via the chain rule, update weights to reduce the loss. Understanding gradient flow explains why deep networks are hard to train and why residual connections, layer normalisation, and careful initialisation exist.

---

## The Chain Rule — Core Mechanism

For a composed function f(g(h(x))), the gradient of the loss L with respect to x is:

```
∂L/∂x = (∂L/∂f) · (∂f/∂g) · (∂g/∂h) · (∂h/∂x)
```

In a neural network, this means: to find how much weight W at layer k contributed to the loss, multiply the loss gradient at the output through every layer from output back to layer k.

```python
# Conceptually: forward pass computes predictions, backward pass attributes loss
# PyTorch autograd handles this automatically

loss = criterion(predictions, targets)
loss.backward()   # computes ∂loss/∂W for every weight W with requires_grad=True

optimizer.step()  # W = W - lr * ∂loss/∂W
```

---

## Vanishing Gradients

In a deep network with L layers, the gradient at layer 1 is roughly:

```
∂L/∂W₁ ≈ ∏ᵢ (∂output_i/∂input_i) · ∂L/∂W_L
```

If each layer's Jacobian has values < 1 (common with sigmoid activations), multiplying L of them drives the gradient to zero exponentially:

```
0.9^50 ≈ 0.005   — 50 sigmoid layers, gradient is 0.5% of original
0.9^100 ≈ 0.00003 — 100 layers, gradient is essentially 0
```

**Consequence:** early layers receive near-zero gradient signal — they don't learn. Deep networks with sigmoid activations stall.

**Fixes:**
- ReLU activation: max(0, x), gradient is 1 for positive inputs (no shrinking)
- Residual connections: gradient highway that bypasses layers
- Layer normalisation: normalises activations to prevent collapse to zero
- Careful initialisation: Xavier/He init keeps activations in the right variance range

---

## Exploding Gradients

The opposite problem: Jacobians > 1 → gradients grow exponentially → weight updates are enormous → training diverges.

```
1.1^50 ≈ 117   — 50 layers, gradient is 117× the output gradient
1.1^100 ≈ 13780 — 100 layers, catastrophically large updates
```

**Fix:** Gradient clipping — cap the gradient norm before applying the update.

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
# Rescales gradient vector so its L2 norm ≤ 1.0
# Applied before optimizer.step()
```

Standard in transformer training: `max_norm=1.0` is the default in most training configs.

---

## Residual Connections — Gradient Highway

ResNets (He et al., 2015) and every Transformer block use residual connections:

```
output = F(x) + x
```

Where F(x) is the sublayer computation (attention or FFN). The gradient through this block:

```
∂loss/∂x = ∂loss/∂output · (∂F/∂x + 1)
```

The `+1` term means gradient always has a direct path through the identity shortcut — regardless of how small `∂F/∂x` is, the gradient is never smaller than `∂loss/∂output`.

In a 96-layer Transformer: gradient flows via 96 identity shortcuts in parallel with 96 learned transformations. Vanishing gradients are prevented architecturally.

---

## Layer Normalisation

Normalises the activation vector at each position to zero mean and unit variance, then applies learnable scale (γ) and shift (β):

```
LayerNorm(x) = γ · (x - μ) / (σ + ε) + β
```

Where μ and σ are computed over the feature dimension (not the batch). This:
- Keeps activations in a stable range during forward pass
- Prevents gradients from vanishing (output of each layer stays normalised)
- Makes training insensitive to weight scale

**Pre-LN vs Post-LN:**
- Original Transformer: Post-LN (normalise after residual add)
- Modern LLMs: Pre-LN (normalise before sublayer) — more stable training, dominant since GPT-2

---

## Initialisation — Xavier and He

Random initialisation determines the initial gradient scale.

**Xavier (Glorot) initialisation** — for tanh/sigmoid:
```
W ~ Uniform(-√(6/(n_in + n_out)), √(6/(n_in + n_out)))
```
Variance = 2 / (n_in + n_out). Keeps activation variance stable through layers.

**He initialisation** — for ReLU:
```
W ~ Normal(0, √(2/n_in))
```
Accounts for ReLU zeroing half of inputs — doubles the variance to compensate.

PyTorch default for Linear layers: Kaiming uniform (He variant).

---

## Gradient Descent Variants

| Optimizer | Update Rule | When to Use |
|---|---|---|
| SGD | W -= lr * ∂L/∂W | Simple; needs tuning |
| SGD + Momentum | velocity = β·v + ∂L/∂W; W -= lr·v | Smoother; less zig-zag |
| Adam | Adaptive per-weight lr (m/v estimates) | Default for LLMs |
| AdamW | Adam + weight decay decoupled | Standard for transformer training |
| Lion | Sign-based update; lower memory | Emerging; ~2× memory saving vs Adam |

Adam maintains running estimates of the gradient (first moment m) and squared gradient (second moment v):
```
m = β₁·m + (1-β₁)·g
v = β₂·v + (1-β₂)·g²
W -= lr · m̂/(√v̂ + ε)
```
Per-weight adaptive learning rate: weights with consistently large gradients get smaller updates (stabilising).

---

## Key Facts

- Chain rule: gradient of L w.r.t. W = product of Jacobians from output back to W
- Vanishing: sigmoid layers shrink gradients exponentially → early layers don't learn
- Exploding: gradients grow exponentially → fix with gradient clipping (max_norm=1.0)
- Residual connections: +1 term in gradient provides a highway that prevents vanishing
- He init: `std = √(2/n_in)` for ReLU; Xavier: `std = √(2/(n_in + n_out))` for sigmoid
- AdamW: Adam + decoupled weight decay — standard for all modern LLM training
- Gradient clipping: `clip_grad_norm_(params, 1.0)` — applied before every optimizer step

---

## Connections

[[math/optimisation]] · [[math/transformer-math]] · [[math/numerical-precision]] · [[llms/transformer-architecture]] · [[fine-tuning/frameworks]]
