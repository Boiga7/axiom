---
type: concept
category: llms
para: resource
tags: [inference-time-scaling, test-time-compute, PRM, MCTS, best-of-N, reasoning-models, self-consistency, speculative-reasoning]
sources: []
updated: 2026-05-04
tldr: "Allocating more compute at inference time — through sampling, search, or extended reasoning traces — produces quality gains that compound independently of training compute, with math and code tasks benefiting most."
---

# Inference-Time Scaling (Test-Time Compute)

## The Paradigm Shift

For most of deep learning's history, the primary lever for better model performance was more training compute: larger models, more data, longer training runs (formalised in [[papers/scaling-laws]]). Inference was assumed to be cheap and fixed.

Inference-time scaling overturns that assumption. By allocating additional compute at generation time — generating multiple candidates, searching over reasoning paths, or running extended chains of thought — models can solve problems they would fail on with a single greedy pass. The quality improvement is substantial enough that, in many cases, a smaller model with heavy inference compute outperforms a larger model run greedily.

The practical consequence: the model you deploy and the compute budget you allocate at serving time are now first-class design decisions, not afterthoughts. This is the foundation of o1, o3, and [[apis/anthropic-api]] Extended Thinking. For the production decision framework on when to use reasoning models, see [[synthesis/reasoning-model-patterns]].

---

## Core Techniques

### Best-of-N Sampling

Generate N independent candidate answers from the same prompt, then select the best using a verifier or reward model.

- Cost scales linearly with N — the simplest inference-time scaling approach.
- Requires a reliable scoring signal. Without a verifier, majority vote serves as a proxy (see Self-Consistency below).
- Works for any task with a verifiable answer: math, code, formal reasoning. Less useful for open-ended generation where "best" is subjective.
- An Outcome Reward Model (ORM) is sufficient for selection when you only need to rank final answers.
- At high N, best-of-N starts to plateau because all N samples are drawn from the same distribution — diversity of reasoning paths, not just number of samples, is what drives further gains. Beam search and tree search are more compute-efficient than best-of-N at very high budgets.

### Self-Consistency Sampling

Introduced by Wei et al. (2022) — the same paper as [[papers/chain-of-thought]]. Generate multiple independent chain-of-thought paths and take the majority vote over final answers.

- Effective without any reward model — purely sample-and-vote.
- Works well when the answer space is discrete (e.g., multiple-choice, numeric answers, code that either passes tests or doesn't).
- Diversity of reasoning paths matters: sampling at higher temperature produces better coverage than greedy repeated sampling.
- Marginal gains from adding more samples follow a log-linear curve; the first 10–20 samples capture most of the improvement.

### Process Reward Models (PRMs)

A PRM is a model trained to score the correctness of individual intermediate reasoning steps, not just the final answer. This enables tree search over reasoning paths — expanding promising branches and pruning dead ends mid-solution.

**PRM800K** (OpenAI, 2023, "Let's Verify Step by Step" — Lightman et al.) is the canonical training dataset: 800,000 step-level correctness labels on LLM solutions to MATH problems. Human labellers rated each step as correct (+1), neutral (0), or incorrect (−1). The process-supervised model trained on PRM800K solved 78% of a MATH test subset, substantially outperforming outcome-supervised baselines.

Key properties:
- More informative than ORMs for guiding search: a step-level signal lets the verifier redirect computation before a reasoning path fully fails.
- Expensive to build: PRM800K required labelling every intermediate step in thousands of solutions — a significant human annotation effort.
- **ThinkPRM** (2025): a generative PRM that writes a verification chain-of-thought per step rather than producing a scalar score. Outperforms discriminative PRMs while using only 1% of PRM800K's process labels. Enables simultaneous scaling of both generator and verifier compute.
- Process Advantage Verifiers (PAVs) — step-level PRMs trained via advantage estimation — are 8% more accurate than ORMs and 1.5–5x more compute-efficient, and enable a 6x gain in sample efficiency for online RL.

### Outcome Reward Models (ORMs)

An ORM scores only the final answer, not intermediate steps. Simpler to train: label just the final output as correct or incorrect, then train a reward model on that signal.

- Training data is much cheaper to produce than PRM data (no step-level annotation).
- Sufficient for best-of-N selection when the task has a clear final answer signal.
- Less useful for guiding tree search mid-solution: the ORM has no signal about whether a partial reasoning path is on track.
- PAVs and PRMs consistently outperform ORMs on tasks where reasoning depth matters.

### Monte Carlo Tree Search (MCTS) for LLMs

MCTS adapted for language generation: the "state" is a partial reasoning trace, "actions" are next reasoning steps, and the reward signal comes from a PRM or ORM.

Standard MCTS loop:
1. **Select** — traverse the tree using UCB (Upper Confidence Bound) to balance exploration and exploitation.
2. **Expand** — generate one or more next-step candidates from the current node.
3. **Simulate** — complete the reasoning path to a final answer (rollout).
4. **Backpropagate** — update value estimates up the tree with the reward.

Used in AlphaCode 2 for competitive programming and referenced in several o1-era research papers. In practice, vanilla MCTS can require much more compute than simply sampling multiple solutions — the overhead of tracking the tree structure and running rollouts is significant.

**Adaptive Branching MCTS (AB-MCTS, 2025)**: dynamically decides whether to "go wider" (expand new candidate paths) or "go deeper" (continue refining existing paths) based on external feedback. Consistently outperforms both repeated sampling and standard MCTS at the same compute budget.

Research finding (ICLR 2025): for low compute budgets, beam search dominates; at high compute budgets, best-of-N catches up; MCTS earns its overhead only on the hardest problems where exhaustive search over the reasoning tree is worth the cost.

### Iterative Refinement

The model generates a draft answer, critiques it (or receives external feedback), and revises. Repeating this loop produces progressive improvements.

- Related to [[safety/constitutional-ai]] self-revision: the same critique-revise pattern used for alignment is applicable for quality improvement.
- [[agents/react-pattern]] is a special case: the Observation step after each Action is a form of environmental feedback that drives refinement.
- Works well when the model can detect its own errors, which is not always the case — self-verification is a known weak point of current models.
- Can be combined with PRM scoring: generate a draft, score each step, revise the lowest-scored step, rescore.

### Speculative Reasoning

The reasoning analogue of speculative decoding (which uses a small draft model to generate tokens quickly, then verifies with the large model).

In speculative reasoning:
- A small, fast model drafts the intermediate reasoning steps (the "scratchpad").
- A large model verifies and accepts or rejects each reasoning block.
- On acceptance, the large model continues; on rejection, it regenerates from that point.

Still largely experimental as of 2025, but directly motivated by the cost structure of extended thinking: reasoning traces can be 10,000–40,000 tokens, and draft-then-verify can reduce the large-model compute needed to produce them.

---

## How o1, o3, and Claude Extended Thinking Implement This

Current leading reasoning models implement inference-time scaling through what is effectively a hidden, extended chain-of-thought:

1. The model runs an internal reasoning trace — not shown to the user by default — that is substantially longer than the visible output.
2. This trace is trained via reinforcement learning: the model is rewarded for producing reasoning that leads to correct final answers, learning to self-correct and explore alternatives mid-trace.
3. The trace itself is sampled (not deterministic): multiple partial paths are generated and filtered internally.
4. The final answer is selected from the reasoning trace, not produced independently.

**Budget tokens** (Anthropic: `budget_tokens` in Extended Thinking; OpenAI: `reasoning_effort` / token budgets) control how long this hidden reasoning phase runs:
- Higher budget → more steps explored → higher quality on hard problems → higher cost and latency.
- Lower budget → faster, cheaper, appropriate for straightforward tasks.
- A single complex request can legitimately consume 20,000–40,000 thinking tokens before producing a 500-token visible response. See [[apis/anthropic-api]] for `budget_tokens` configuration.

OpenAI's explanation for keeping reasoning traces hidden: the trace allows the model to "reason freely," and showing it to users would create pressure to train compliance onto the chain of thought, degrading its utility as an honest scratch space.

For practical guidance on when to enable Extended Thinking and how to set `budget_tokens`, see [[synthesis/reasoning-model-patterns]].

---

## The Scaling Curve

Performance vs. inference compute follows a characteristic curve:

- **Early gains are steep**: the first few extra samples or reasoning steps produce large quality jumps.
- **Diminishing returns**: above a task-dependent threshold, additional compute produces smaller incremental gains.
- **Task dependency is stark**:
  - Math and code benefit most — verifiable, discrete answer spaces let reward models give accurate signal.
  - Factual recall benefits least — the model either knows the fact or it doesn't; more sampling rarely surfaces new knowledge.
  - Open-ended reasoning sits in the middle — gains are real but harder to measure without an eval.
- **Question difficulty interacts with strategy**: for easy problems, best-of-N is optimal; for hard problems, beam search and tree search are more efficient at a given compute budget.
- **Non-monotonic depth scaling**: sequential (depth) scaling follows a non-monotonic curve — performance improves up to an optimum, then plateaus or can decline as long-context limits and propagated errors accumulate.

Key result (Snell et al., 2024 / ICLR 2025): scaling inference compute optimally can be more effective than scaling model parameters — a smaller model with heavy inference scaling can match a larger model run greedily.

As of 2025, inference compute is viewed as the primary remaining scaling lever as pretraining data bottlenecks tighten. Inference workloads accounted for roughly half of all AI compute in 2025, projected to reach two-thirds by end of 2026. [unverified — figures from Deloitte/industry analysts, not peer-reviewed]

---

## Security Implications

Longer reasoning traces expand the attack surface for [[security/prompt-injection]]:

- **Intermediate injection**: malicious content retrieved mid-reasoning (e.g., from a tool call result or RAG chunk) can redirect the reasoning trace before the final answer is produced. The injection is harder to detect because it occurs inside the hidden scratchpad.
- **Content filtering gap**: standard output filters operate on the visible response. Intermediate reasoning steps that influence the final output but are never shown are not covered by those filters.
- **Amplified reasoning hijacking**: in models that use reasoning traces to plan multi-step tool use (e.g., agentic loops), a successfully injected reasoning step can cause the model to issue harmful tool calls that look legitimate in the final action log.
- Mitigation approaches are immature: some providers apply separate filters to reasoning traces, but this is not universal. See [[security/owasp-llm-top10]] for the broader agentic threat model.

---

## Related Pages

- [[synthesis/reasoning-model-patterns]] — when to use reasoning models in production; budget selection guide
- [[llms/deepseek-r1]] — GRPO training (reinforcement learning without a reward model) as an alternative path to reasoning capability
- [[llms/claude]] — Extended Thinking in Claude Sonnet/Opus; `budget_tokens` pricing
- [[llms/transformer-architecture]] — KV cache and attention mechanisms that make extended reasoning traces expensive at the infrastructure level
- [[papers/chain-of-thought]] — Wei et al. 2022; self-consistency as the original inference-time scaling technique
- [[safety/constitutional-ai]] — self-critique and revision loop that shares structure with iterative refinement
- [[safety/scalable-oversight]] — prover-verifier games as a theoretical framing of generator-verifier scaling
- [[apis/anthropic-api]] — `budget_tokens`, Extended Thinking API parameters
- [[security/prompt-injection]] — indirect injection risk in reasoning traces
- [[infra/inference-serving]] — serving infrastructure cost implications of long reasoning traces

## Connections
- [[llms/ae-hub]] — parent hub for all foundation model and LLM content
- [[llms/transformer-architecture]] — the architectural substrate that makes extended reasoning traces expensive
- [[papers/chain-of-thought]] — origin of self-consistency, the first inference-time scaling technique
- [[security/prompt-injection]] — inference-time scaling expands the attack surface for intermediate injection
- [[infra/inference-serving]] — serving cost and latency implications of long reasoning traces
- [[synthesis/reasoning-model-patterns]] — practical production guidance for when to apply these techniques

## Open Questions
- At what `budget_tokens` threshold does Extended Thinking produce diminishing returns on non-math tasks, and is there published data?
- How does non-monotonic depth scaling interact with Anthropic's internal compaction mechanism for very long reasoning traces?
- Are there emerging verifier architectures between scalar ORMs and full generative PRMs (ThinkPRM) that offer better cost-quality tradeoffs?
