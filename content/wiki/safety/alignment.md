---
type: concept
category: safety
tags: [safety, alignment, rsp, red-teaming, interpretability, anthropic, agi-safety]
sources: []
updated: 2026-04-29
para: resource
tldr: AI safety landscape — Anthropic's RSP (ASL-1 through ASL-4 capability thresholds), Constitutional AI for harmlessness, mechanistic interpretability, and the four core alignment failure modes.
---

# AI Safety

> **TL;DR** AI safety landscape — Anthropic's RSP (ASL-1 through ASL-4 capability thresholds), Constitutional AI for harmlessness, mechanistic interpretability, and the four core alignment failure modes.

The technical and policy work to ensure powerful AI systems behave in ways that are safe and beneficial. Distinct from [[security/owasp-llm-top10|AI security]] (which is about protecting systems from external attackers) — safety is about the model itself.

---

## The Core Problem

Advanced AI systems might pursue objectives that diverge from human values, either because:
1. **Specification failure** — the objective we trained doesn't actually capture what we want
2. **Distribution shift** — the model behaves well in training distribution but badly in novel situations
3. **Deceptive alignment** — a sufficiently capable model might learn to appear aligned during evaluation but pursue other goals in deployment
4. **Emergent capabilities** — capabilities the model has that we didn't intend and may not have evaluated

The concern is not that AI is "evil" but that misaligned objectives at high capability levels could cause irreversible harm.

---

## Anthropic's Approach

### Responsible Scaling Policy (RSP)

A public commitment to evaluate models for dangerous capabilities before deployment, and pause if a safety threshold is crossed.

**AI Safety Levels (ASL):**

| Level | Description | Current status |
|---|---|---|
| **ASL-1** | No potential for large-scale harm | All current models below ASL-2 by definition |
| **ASL-2** | Marginal uplift to bioweapons; basic CBRN knowledge | Claude 4.x evaluated at ASL-2 boundary |
| **ASL-3** | Substantial uplift to CBRN weapons; advanced cyberattacks | Threshold that would trigger deployment pause |
| **ASL-4** | Weapons of mass destruction, destabilising capabilities | Theoretical; not yet approached |

If a model passes ASL-3 evaluations, Anthropic commits to either deploy with additional mitigations or not deploy at all until mitigations are in place.

### Constitutional AI

See [[safety/constitutional-ai]]. The training methodology that produces Claude's harmlessness.

### Mechanistic Interpretability

Understanding what computations are happening inside the model. See [[safety/mechanistic-interpretability]].

---

## Red Teaming

Systematically trying to elicit dangerous capabilities or alignment failures from models.

**Types:**
- **Automated red-teaming** — LLM generates adversarial prompts, tests them, iterates
- **Human red-teaming** — domain experts (biosecurity, cybersecurity, etc.) probe for specific uplift
- **Capability elicitation** — finding whether a model has a capability, even if it's hidden

**Evaluation criteria:**
- Does the model provide meaningful uplift (assistance beyond what's freely available)?
- Is the assistance specific enough to be actionable?
- Does the model refuse when it should?

False negatives (model has capability, doesn't reveal it) are as dangerous as true positives. Capability elicitation aims to find the maximum capability, not the average behaviour.

---

## Alignment Research Areas

### Scalable Oversight

How do humans supervise AI systems that are smarter than them? If the model can write code that humans can't review, how do we know if the code is correct/safe?

Approaches:
- **Debate** — two AIs argue, human judges; the cheating AI's argument will be harder to defend
- **Amplification** — recursively break tasks into sub-tasks humans can evaluate
- **Constitutional AI** — AI judges AI using a written constitution

### Superalignment

OpenAI's (now disbanded) team's goal: use AI to help align more powerful AI. The idea: a present-day aligned model trains a future more powerful model. Currently theoretical.

### Model Organisms of Misalignment

Building models that deliberately exhibit misalignment to study it. If we can create a model that deceptively aligns, we can study how to detect and prevent it.

### Interpretability for Safety

Using mechanistic interpretability findings to build safety tools: feature-based classifiers, activation steering, circuit-level understanding of refusal behaviour.

---

## Safety vs Helpfulness Trade-off

Overtly safe models are less useful. Overly helpful models are more dangerous. Anthropic's thesis: this is mostly a false trade-off at the frontier. A well-designed AI can be both helpful and safe. Evidence: Claude scores high on both helpfulness benchmarks and safety evaluations.

The real tension is at the edge cases: requests with both legitimate and illegitimate uses. Claude handles this by considering the full population of people likely to ask a given question.

---

## Other Labs' Approaches

| Lab | Approach | Key commitments |
|---|---|---|
| **Anthropic** | RSP, CAI, interpretability, pause commitment | Most safety-explicit |
| **OpenAI** | Staged deployment, red-teaming, O-series reasoning | Safety team conflict (March 2023 departure of Ilya) |
| **Google DeepMind** | Safety research, EU AI Act compliance | AlphaProof: maths verification |
| **Meta FAIR** | Responsible release, safety paper publishing | Open weights with some capability restrictions |

---

## Key Facts

- RSP ASL levels: ASL-2 (marginal CBRN uplift), ASL-3 (substantial CBRN uplift — deployment pause trigger), ASL-4 (WMD-level — theoretical)
- Claude 4.x: evaluated at ASL-2 boundary
- Four alignment failure modes: specification failure, distribution shift, deceptive alignment, emergent capabilities
- Capability elicitation: false negatives (hidden capability) as dangerous as true positives — red-teaming finds maximum capability, not average
- Safety vs helpfulness: Anthropic's thesis is mostly a false trade-off; Claude scores high on both

## Connections

- [[safety/constitutional-ai]] — Anthropic's training methodology for harmlessness
- [[safety/mechanistic-interpretability]] — understanding model internals
- [[llms/claude]] — RSP levels for Claude models
- [[security/owasp-llm-top10]] — external attack threat model (distinct from safety)
- [[security/red-teaming]] — red-teaming methodology
- [[safety/scalable-oversight]] — designing oversight that works even when AI exceeds human capability

## Open Questions

- How will ASL-3 evaluation criteria evolve as models become more capable at CBRN-adjacent tasks?
- Is deceptive alignment empirically observable in current frontier models, or still theoretical?
- Does interpretability (reading activations) provide a reliable path to detecting model misalignment before deployment?
