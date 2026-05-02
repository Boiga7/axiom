---
type: concept
category: landscape
tags: [regulation, eu-ai-act, policy, compliance, governance, risk]
sources: []
updated: 2026-04-29
para: area
tldr: AI regulation overview covering the EU AI Act (in force, phased to 2027), US EO 14110 and state laws, UK sector-based approach, and practical compliance checklist for teams building LLM products.
---

# AI Regulation

> **TL;DR** AI regulation overview covering the EU AI Act (in force, phased to 2027), US EO 14110 and state laws, UK sector-based approach, and practical compliance checklist for teams building LLM products.

The regulatory landscape every enterprise AI engineer needs to know. Laws are moving faster than most engineers realise. The EU AI Act is in force, US federal guidance is real, and state-level bills are proliferating.

---

## EU AI Act

The world's first comprehensive AI law. Regulation (EU) 2024/1689. In force August 2024, with phased application through 2027.

### Risk-Based Tiering

```
Unacceptable Risk → Prohibited
  - Social scoring by governments
  - Real-time biometric surveillance in public (mostly)
  - Subliminal manipulation
  - Exploiting vulnerabilities of specific groups

High Risk → Strict Obligations
  - CV screening, hiring decisions
  - Credit scoring
  - Critical infrastructure (energy, water, transport)
  - Education assessment
  - Law enforcement decisions
  - Medical devices
  - Biometric categorisation

Limited Risk → Transparency Obligations
  - Chatbots (must disclose AI)
  - Deepfakes (must label)
  - Emotion recognition systems

Minimal Risk → Voluntary Codes
  - AI in games
  - Spam filters
  - Most productivity tools
```

### GPAI (General Purpose AI) Obligations

Applies to frontier model providers including Anthropic, OpenAI, Google:

| Obligation | Threshold |
|---|---|
| Technical documentation | All GPAI models |
| Copyright compliance policy | All GPAI models |
| Transparency to downstream deployers | All GPAI models |
| Adversarial testing (red teaming) | Systemic risk models |
| Incident reporting to EU AI Office | Systemic risk models |
| Cybersecurity measures | Systemic risk models |

**Systemic risk threshold:** 10^25 FLOPs training compute (Claude Opus 4, GPT-4o, Gemini 2.5 Pro all exceed this).

### Application Timeline

| Date | What applies |
|---|---|
| Feb 2025 | Prohibited AI practices banned |
| Aug 2025 | GPAI obligations apply |
| Aug 2026 | High-risk AI systems obligations |
| Aug 2027 | High-risk AI embedded in regulated products |

### Penalties

- Prohibited AI violations: up to €35M or 7% of global turnover
- High-risk violations: up to €15M or 3% of global turnover
- Incorrect information to authorities: up to €7.5M or 1.5%

---

## US Policy

No comprehensive federal AI law as of April 2026. Regulation is sector-specific and executive-order-driven.

### Executive Order 14110 (Biden, Oct 2023)

Required:
- Frontier model developers to share safety test results with the US government before public release (invoking the Defense Production Act)
- NIST to develop AI safety standards framework
- Sector agencies (FDA, FTC, DOL, etc.) to issue AI guidance

**Status:** Partially rescinded by Trump administration (Jan 2025). Key provisions (safety reporting for frontier models) were largely retained through agency-level commitments, not law.

### NIST AI Risk Management Framework (AI RMF)

Voluntary framework, widely adopted by federal contractors and large enterprises:
- **Govern** — policies, accountability, culture
- **Map** — context and risk identification
- **Measure** — risk analysis and assessment
- **Manage** — risk treatment and monitoring

Not legally binding but effectively mandatory for federal procurement.

### State Laws

| State | Law | Status | Scope |
|---|---|---|---|
| California | SB 1047 | **Failed** (vetoed Sept 2024) | Frontier model safety requirements |
| California | AB 2013 | **Signed** | Training data transparency |
| Colorado | SB 205 | **Signed** (2024) | High-risk AI in consequential decisions |
| Illinois | AIIA | **Active** | AI in employment decisions |
| New York | Local Law 144 | **Active** | Automated employment decision tools |

SB 1047's failure was significant. It would have required safety testing and kill switches for large AI models. The AI industry lobbied heavily against it.

---

## UK AI Regulation

The UK chose a **pro-innovation, sector-based** approach rather than comprehensive legislation.

**UK AI Safety Institute (AISI):** Established Oct 2023, world's first. Conducts safety evaluations of frontier models. Signed agreements with Anthropic, OpenAI, Google, Meta to evaluate models before/after release.

**DSIT Framework:** Five principles, not law:
1. Safety, security, robustness
2. Transparency and explainability
3. Fairness
4. Accountability and governance
5. Contestability and redress

Each sector regulator (FCA for finance, CQC for healthcare, Ofcom for media) applies these principles within their domain.

---

## China

**Generative AI Regulations (effective Aug 2023):** Requires registration of generative AI services, security assessments before deployment, content moderation, labelling of AI-generated content.

**Algorithm Recommendation Regulations (2022):** Restrictions on personalisation, transparency requirements.

Chinese AI regulations are largely administered through the Cyberspace Administration of China (CAC).

---

## Copyright and Training Data

Active litigation globally:

| Case | Status | Relevance |
|---|---|---|
| NYT v. OpenAI | Ongoing (US) | Training on copyrighted news content |
| Getty Images v. Stability AI | Ongoing (US + UK) | Training on images |
| Authors Guild v. OpenAI | Ongoing (US) | Books used for training |
| Concord Music v. Anthropic | Settled (2025) | Lyrics in training data |

**Current legal position:** Training on publicly available data is likely (but not certainly) fair use in the US. The EU AI Act requires documentation of training data sources and compliance with copyright law.

**Practical guidance:**
- Keep records of training data sources
- Implement takedown mechanisms for generated content that reproduces copyrighted material
- Use datasets with clear provenance (Common Crawl with opt-outs, licensed datasets)

---

## GDPR and AI

The EU General Data Protection Regulation applies to AI systems processing personal data:

- **Automated decision-making:** GDPR Article 22 gives individuals the right not to be subject to solely automated decisions with significant effects (credit, hiring). Requires human review mechanisms.
- **Purpose limitation:** Data collected for one purpose can't be used to train AI models without additional legal basis.
- **Data minimisation:** Only collect data necessary for the purpose.
- **Right to explanation:** Must be able to explain automated decisions.

AI-specific GDPR guidance has been issued by multiple data protection authorities (French CNIL, Italian Garante, UK ICO).

---

## Practical Compliance Checklist

For teams building LLM products in regulated environments:

- [ ] Map your AI use cases to EU AI Act risk tiers
- [ ] Document training data sources and copyright compliance
- [ ] Implement human oversight for high-stakes decisions
- [ ] Label AI-generated content where required (EU, China)
- [ ] Maintain incident logs for safety/security events
- [ ] Red team before deploying customer-facing AI
- [ ] Privacy impact assessment if processing personal data
- [ ] Review terms of service — most LLM API providers prohibit certain high-risk uses

---

## Key Facts

- EU AI Act: Regulation (EU) 2024/1689; in force August 2024; GPAI obligations applied August 2025
- GPAI systemic risk threshold: 10^25 FLOPs training compute (Claude Opus 4, GPT-4o, Gemini 2.5 Pro all exceed)
- EU AI Act maximum penalty: €35M or 7% of global turnover (prohibited AI violations)
- California SB 1047: failed (vetoed September 2024) — would have required kill switches for large AI models
- GDPR Article 22: right not to be subject to solely automated decisions with significant effects
- UK AI Safety Institute: world's first; signed evaluation agreements with Anthropic, OpenAI, Google, Meta
- Chinese Generative AI Regulations: effective August 2023; mandatory registration and content moderation

## Connections

- [[landscape/ai-labs]] — how each lab is responding to regulation and GPAI obligations
- [[safety/alignment]] — Anthropic's RSP as voluntary safety governance complementing regulation
- [[security/red-teaming]] — adversarial testing required by EU AI Act for GPAI systemic risk models
- [[security/owasp-llm-top10]] — security obligations align with OWASP LLM guidance

## Open Questions

- How will the Trump administration's partial rescission of EO 14110 affect frontier lab safety commitments?
- Will the EU AI Act GPAI obligations create meaningful compliance differentiation between labs?
- What does the copyright litigation outcome (NYT v. OpenAI) mean for future training data strategy?
