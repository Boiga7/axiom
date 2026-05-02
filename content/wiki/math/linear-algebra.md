---
type: concept
category: math
tags: [linear-algebra, matrices, vectors, eigenvalues, svd, embeddings]
sources: []
updated: 2026-04-29
para: resource
tldr: The linear algebra that makes LLMs legible — matrix multiplication as attention, SVD as the reason LoRA works, cosine similarity as the embedding search standard.
---

# Linear Algebra for AI Engineers

> **TL;DR** The linear algebra that makes LLMs legible — matrix multiplication as attention, SVD as the reason LoRA works, cosine similarity as the embedding search standard.

The matrix operations that underpin all of deep learning. You don't need to derive everything from scratch, but understanding these structures makes architecture decisions legible.

---

## Vectors and Matrices

A **vector** is an ordered list of numbers: `[0.1, 0.5, -0.3]`. In AI, vectors represent:
- Token embeddings (one vector per token)
- Weights in a layer
- The "direction" a feature points in embedding space

A **matrix** is a 2D grid of numbers. In neural networks, matrices represent:
- Weight matrices (d_in × d_out)
- Attention patterns (n_tokens × n_tokens)
- Batched inputs (batch_size × d_model)

---

## Matrix Multiplication

The core operation of all neural network layers:

```
y = W x

where W ∈ ℝ^(m×n), x ∈ ℝ^n → y ∈ ℝ^m
```

The (i,j) element of the output is the dot product of row i of W with column j of x.

**Intuition:** W transforms x from one space to another. A fully-connected layer is just this operation (plus a bias): `y = Wx + b`.

**Attention is matrix multiplication:** `Attention(Q, K, V) = softmax(QK^T / √d_k)V`

`QK^T` is a matrix multiply. Each row is the dot product of one query vector with all key vectors. Understanding this as a matrix operation lets you reason about what makes attention expensive (O(n²) for the n×n score matrix).

---

## Dot Product and Cosine Similarity

```
dot(a, b) = Σ a_i · b_i = |a| · |b| · cos(θ)
```

The dot product measures "alignment" between vectors. Cosine similarity normalises for magnitude:

```
cosine_similarity(a, b) = dot(a, b) / (|a| · |b|)
```

Range: -1 (opposite) to +1 (identical direction). This is why cosine similarity is the standard for embedding search. It measures semantic similarity regardless of magnitude.

---

## Eigenvalues and Eigenvectors

For square matrix A: `Av = λv` where v is an eigenvector and λ is an eigenvalue.

An eigenvector is a direction that the matrix only scales (doesn't rotate). The eigenvalue tells you by how much.

**Why it matters for AI:**
- Principal Component Analysis (PCA) decomposes data into principal directions (eigenvectors of the covariance matrix)
- Gradient descent convergence depends on the eigenspectrum of the Hessian
- Attention head specialisation: heads can be understood as projecting onto different eigenvector subspaces

---

## SVD (Singular Value Decomposition)

Any matrix M ∈ ℝ^(m×n) can be decomposed as:

```
M = U · Σ · V^T
```

Where:
- U ∈ ℝ^(m×m) — left singular vectors (orthogonal)
- Σ ∈ ℝ^(m×n) — diagonal singular values (non-negative, descending)
- V ∈ ℝ^(n×n) — right singular vectors (orthogonal)

**This is why LoRA works.** If weight updates ΔW have low rank, their SVD has only r non-zero singular values. LoRA parameterises ΔW = BA where B and A have rank r, implicitly capturing the dominant singular vectors. See [[fine-tuning/lora-qlora]].

**Low-rank approximation:** Keep only the top r singular values (set the rest to 0). The result is the best rank-r approximation of M.

---

## Vector Spaces and Subspaces

Embedding models map text into a high-dimensional vector space. The geometry of this space encodes semantic meaning:

- **Linear arithmetic works:** `king - man + woman ≈ queen` (Word2Vec's famous example)
- **Directions encode features:** There exist directions in embedding space for "sentiment", "formality", "syntactic role"
- **Subspaces:** Attention heads project into subspaces of the residual stream (from mechanistic interpretability)

Understanding the residual stream as a shared vector space helps explain why circuits can compose. Each attention head and MLP "writes" to this shared space.

---

## Norms

A norm measures vector "size":

| Norm | Formula | Name | Use |
|---|---|---|---|
| L1 | Σ \|x_i\| | Manhattan | Sparsity-promoting regularisation |
| L2 | √(Σ x_i²) | Euclidean | Most common; gradient descent |
| L∞ | max(\|x_i\|) | Chebyshev | Bounding maximum component |
| Frobenius | √(Σ M_ij²) | Matrix norm | LoRA regularisation |

**Weight decay = L2 regularisation.** `AdamW` adds L2 penalty to weights, encouraging smaller weights and reducing overfitting.

---

## Practical Reference

```python
import numpy as np
import torch

# Dot product
np.dot([1, 2, 3], [4, 5, 6])  # 32

# Matrix multiply
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
np.matmul(A, B)  # or A @ B

# Cosine similarity
def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# SVD
U, S, Vt = np.linalg.svd(A)

# PyTorch (GPU)
A = torch.tensor([[1., 2.], [3., 4.]])
B = torch.tensor([[5., 6.], [7., 8.]])
C = A @ B  # matrix multiply on GPU if tensors are on CUDA

# Normalise a vector
def normalise(v):
    return v / np.linalg.norm(v)
```

---

## Key Facts

- Cosine similarity range: -1 (opposite) to +1 (identical direction); standard for embedding search because it normalises for magnitude
- Attention is a matrix multiply: `QK^T` produces an n×n similarity matrix — this is why context is O(n²)
- SVD decomposition: any matrix M = U·Σ·V^T; top-r singular values give best rank-r approximation
- LoRA works because fine-tuning weight updates have low intrinsic rank — SVD captures this
- Weight decay = L2 regularisation; AdamW applies it correctly, decoupled from gradient scale
- "king − man + woman ≈ queen": embedding spaces encode semantic relationships as linear directions

## Connections

- [[math/transformer-math]] — attention as matrix operations in full
- [[math/optimisation]] — gradient descent using vector calculus
- [[fine-tuning/lora-qlora]] — SVD and why LoRA works
- [[rag/embeddings]] — embedding spaces in practice

## Open Questions

- Are there operations in frontier transformers that require higher mathematical structures beyond linear algebra (e.g., non-linear dynamics in MoE routing)?
- How does the intrinsic rank of fine-tuning updates vary by task type — does instruction following have lower rank than domain adaptation?
- Does cosine similarity remain the optimal retrieval metric as embedding dimensions grow beyond 3072?
