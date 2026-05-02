---
type: synthesis
category: synthesis
para: resource
tags: [debugging, fine-tuning, model, regression, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing a fine-tuned model that performs worse than the base model or regresses after training.
---

# Debug: Fine-Tuned Model Worse Than Base

**Symptom:** Fine-tuned model produces lower quality outputs than the base model. Evals regress. Model loses general capability while gaining narrow task performance.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Worse on general tasks, better on target task | Catastrophic forgetting — overtrained on narrow dataset |
| Worse on everything | Training data quality problem — noise or wrong examples |
| Better in training evals, worse in production | Overfitting to training set — poor generalisation |
| Random or incoherent outputs | Learning rate too high — weights corrupted |
| Good first epoch, worse by epoch 3 | Overtraining — should have stopped earlier |

---

## Likely Causes (ranked by frequency)

1. Training data too small or low quality — model memorises rather than generalises
2. Too many epochs — overfit to training examples
3. Learning rate too high — destabilises base model weights
4. Catastrophic forgetting — fine-tuning overwrites general capabilities
5. Training data distribution does not match production inputs

---

## First Checks (fastest signal first)

- [ ] Run evals on the base model and fine-tuned model with the same test set — quantify the regression exactly
- [ ] Check training loss curve — is it still decreasing at the final epoch, or has it plateaued or started rising?
- [ ] Check validation loss — if training loss is low but validation loss is high, the model is overfitting
- [ ] Inspect training examples for quality — are there noisy, contradictory, or incorrectly formatted examples?
- [ ] Check whether general capability tasks (summarisation, reasoning) regressed alongside the target task

**Signal example:** Fine-tuned customer support model gives worse answers than base model — eval shows 40% regression on general queries; training set had 200 examples, all from one support agent's writing style; model memorised the style, not the task.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Training data quality and size | [[data/annotation-tooling]] |
| LoRA to reduce catastrophic forgetting | [[fine-tuning/lora-qlora]] |
| Training hyperparameters | [[fine-tuning/frameworks]] |
| Eval methodology for fine-tuned models | [[evals/methodology]] |
| DPO for preference alignment without forgetting | [[fine-tuning/dpo-grpo]] |

---

## Fix Patterns

- Use LoRA instead of full fine-tuning — adapters train on top of frozen base weights, dramatically reducing forgetting
- Reduce epochs to 1-3 — more is rarely better; monitor validation loss and stop when it plateaus
- Lower learning rate — 1e-4 to 1e-5 for LoRA; higher rates corrupt base weights
- Improve data quality over quantity — 500 clean, diverse examples beats 5,000 noisy ones
- Include general instruction-following examples in the training mix — prevents capability regression on non-target tasks

---

## When This Is Not the Issue

If the model evals are acceptable but it still feels worse in production:

- The eval set may not represent production inputs — production queries may be phrased differently than training examples
- Test with real production examples, not synthetic ones

Pivot to [[evals/methodology]] to design an eval set that genuinely reflects production traffic before declaring a fine-tuned model ready.

---

## Connections

[[fine-tuning/lora-qlora]] · [[fine-tuning/dpo-grpo]] · [[fine-tuning/frameworks]] · [[evals/methodology]] · [[data/annotation-tooling]]
