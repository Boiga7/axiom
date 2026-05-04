---
type: concept
category: landscape
para: resource
tags: [eu-ai-act, regulation, compliance, gpai, high-risk-ai, enforcement, fria, iso-42001]
sources: []
updated: 2026-05-03
tldr: "The EU AI Act (Regulation (EU) 2024/1689) is the world's first comprehensive AI law; a risk-tiered framework with phased enforcement from February 2025 through August 2027 — the August 2026 deadline for high-risk Annex III systems is the one that affects most commercial AI products."
---

# EU AI Act

> **TL;DR** The EU AI Act (Regulation (EU) 2024/1689) is the world's first comprehensive AI law; a risk-tiered framework with phased enforcement from February 2025 through August 2027 — the August 2026 deadline for high-risk Annex III systems is the one that affects most commercial AI products.

The EU AI Act entered into force on 1 August 2024. It is horizontal regulation — it applies across sectors, and it follows the product wherever it is deployed inside the EU, regardless of where the developer is based. The [[landscape/regulation]] page covers the broader regulatory picture; this page goes deep on the Act itself.

---

## Enforcement Timeline

Four deadlines, each adding a new layer of obligation:

| Date | What applies |
|---|---|
| **2 February 2025** | Prohibited practices enforceable. AI systems that pose unacceptable risk are banned outright. |
| **2 August 2025** | GPAI model obligations apply. Governance infrastructure (AI Office, notified bodies) must be operational. AI literacy requirements begin. |
| **2 August 2026** | **High-risk AI systems (Annex III)** obligations enforceable — Articles 9-17 (provider) and Article 26 (deployer). This is the deadline affecting most commercial AI products. |
| **2 August 2027** | High-risk AI embedded in regulated Annex I products (medical devices, vehicles, machinery). GPAI models placed on the market before August 2025 must also comply by this date. |

### Digital Omnibus Caveat

The European Commission published the Digital Omnibus on AI on 19 November 2025, proposing to defer the August 2026 high-risk deadline to 2 December 2027. As of May 2026, trilogue negotiations are ongoing — the second political trilogue (28 April 2026) failed to reach agreement; a third is scheduled for 13 May 2026. **If the Omnibus is not formally adopted before 2 August 2026, the original deadline applies.** Treat August 2026 as the planning baseline.

---

## Risk Tiers

### Prohibited (Unacceptable Risk)

Banned outright since 2 February 2025. No exemptions for private actors:

- Social scoring by public or private entities that evaluates individuals and leads to detrimental treatment
- Real-time remote biometric identification in publicly accessible spaces for law enforcement (narrow exceptions: missing children, imminent terror threats)
- Retrospective remote biometric identification (except for serious crimes with judicial authorisation)
- Biometric categorisation inferring sensitive attributes (race, political views, trade union membership, religious beliefs, sexual orientation)
- Subliminal manipulation or deceptive techniques that bypass conscious awareness to influence behaviour
- Exploiting vulnerabilities of specific groups (age, disability, social/economic circumstances)
- AI-based predictive policing of individuals (not areas)
- Emotion recognition in workplace and educational contexts (with exceptions for medical/safety use)

### High-Risk (Annex III) — Enforceable August 2026

Eight domains. AI systems that fall in any of these areas are presumptively high-risk; Article 6(3) allows an operator to rebut this by documenting why the system poses no significant risk to health, safety, or fundamental rights.

**1. Biometrics**
Remote biometric identification systems; biometric categorisation systems; emotion recognition systems.

**2. Critical Infrastructure**
Safety components in management/operation of critical digital infrastructure, road traffic, water, gas, heating, electricity supply.

**3. Education and Vocational Training**
Systems that determine access to educational institutions; evaluate learning outcomes; assess competence levels; monitor for prohibited behaviour during exams.

**4. Employment, HR, and Access to Self-Employment**
CV screening; shortlisting for vacancies; evaluating candidates; making or influencing promotion, termination, or task allocation decisions; monitoring worker performance and behaviour.

**5. Access to Essential Private and Public Services**
Credit scoring; life insurance and health insurance risk assessment; emergency service dispatch (police, fire, medical); social benefits assessment including fraud detection; healthcare triage.

**6. Law Enforcement**
Assessing risk or predicting criminal or antisocial behaviour; polygraph-style emotional state detection; evaluating reliability of evidence; assessing victim risks; profiling in investigations.

**7. Migration, Asylum, and Border Control**
Risk assessment for irregular migration; examination of asylum applications; detecting emotions at borders; document authenticity; verifying identity documents.

**8. Administration of Justice and Democratic Processes**
Research and interpretation of facts or law; dispute resolution; influencing elections or referenda.

### Limited Risk — Transparency Obligations

| System type | Obligation |
|---|---|
| Chatbots / AI-generated interaction | Must disclose that the user is interacting with AI (unless obvious from context) |
| Deepfakes / AI-generated content | Must label content as artificially generated or manipulated |
| Emotion recognition / biometric categorisation | Must inform individuals that the system is used |

No conformity assessment required; just disclosure.

### Minimal Risk

Spam filters, AI in games, most productivity tools, recommendation systems with no significant fundamental rights impact. No obligations. Voluntary codes of practice encouraged.

---

## GPAI Model Obligations (August 2025)

GPAI model = any model trained using more than 10^23 FLOPs capable of generating language, image, audio, or video outputs. The definition captures essentially every frontier foundation model.

### All GPAI Providers

| Obligation | Notes |
|---|---|
| Technical documentation | Model card, training details, architecture, data sources |
| Copyright compliance policy | Policy to respect rightsholders; summary of training data available on request |
| Transparency to downstream deployers | Info needed for downstream compliance; must be made public |
| AI literacy | Ensure staff deploying the model are AI-literate |

### Systemic Risk Models (>10^25 FLOPs)

Models presumed to have systemic risk face additional requirements. Claude Opus 4, GPT-4o, and Gemini 2.5 Pro all exceed the 10^25 threshold.

| Additional obligation | Detail |
|---|---|
| Adversarial testing (red teaming) | Before and after placing on market; cover catastrophic risks |
| Incident reporting | Notify EU AI Office of serious incidents within two weeks of becoming aware |
| Cybersecurity measures | Appropriate protections for the model, infrastructure, and users |
| Model evaluations | By independent experts; results shared with AI Office |
| Systemic risk assessment | On an ongoing basis |
| Notify when threshold reached | Two-week window after reaching or foreseeing the 10^25 FLOPs threshold |

### GPAI Code of Practice

The AI Office published guidelines and a voluntary Code of Practice covering transparency, copyright, and safety/security. Providers who adhere to the Code gain increased trust and lighter compliance monitoring. Code adherence can also be a mitigating factor when the AI Office calculates fines.

Note: The AI Office does not have full enforcement powers (including model recalls and fines) until August 2026.

---

## What "High-Risk" Means in Practice for Engineers

If your product deploys AI that falls under Annex III, these are the concrete technical and organisational obligations before deployment:

### 1. Risk Management System (Article 9)

Written risk management process covering the entire lifecycle:
- Identify foreseeable risks to health, safety, and fundamental rights
- Estimate and evaluate residual risks after controls
- Document risk controls and test effectiveness
- Update throughout the product lifecycle

### 2. Data Governance (Article 10)

For training, validation, and testing data:
- Document data collection methodology and sources
- Examine for possible biases that may affect output
- Ensure data is relevant, representative, complete, and free of errors where possible
- Personal data used for debiasing must be appropriately protected

### 3. Technical Documentation (Article 11 + Annex IV)

A technical file maintained throughout the lifecycle covering:
- System description, intended purpose, and version history
- Architecture (components, training method, algorithm type)
- Training, validation, and testing datasets — sources, labels, cleaning methods
- Accuracy and robustness metrics and test methodology
- Computational resources used

### 4. Logging and Record-Keeping (Article 12)

High-risk systems must automatically log events sufficient to ensure traceability:
- Date, time, and duration of each use
- Reference database the system checked against
- Input data where technically feasible
- Results and confidence levels
- Identification of natural persons involved in verification

Logs must be kept for the period specified in EU law or at minimum 6 months.

### 5. Transparency and Information for Users (Article 13)

Instructions for use (human-readable) must disclose:
- That the system is a high-risk AI
- Identity and contact of the provider
- Capabilities and limitations, including foreseeable misuse
- Level of accuracy, robustness, and cybersecurity
- Circumstances that may affect performance
- Human oversight measures

### 6. Human Oversight Measures (Article 14)

Must be designed so a natural person can:
- Fully understand the system's capabilities and limitations
- Monitor operation and detect anomalies
- Disregard, override, or intervene in the system's output
- Interrupt the system via a stop button or equivalent

### 7. Accuracy, Robustness, and Cybersecurity (Article 15)

- Declare and test the level of accuracy
- Resilience to errors, faults, inconsistencies, and adversarial inputs
- Technical redundancy measures where appropriate
- Cybersecurity protections appropriate to the risks

### 8. Conformity Assessment and CE Marking

Before placing on the EU market:
- Complete conformity assessment (self-assessment or third-party, depending on the domain)
- Draw up EU Declaration of Conformity
- Affix CE marking
- Register in the EU database for high-risk AI systems (public registry)

---

## FRIA — Fundamental Rights Impact Assessment (Article 27)

Article 27 requires specific deployers of Annex III high-risk AI to conduct a FRIA before deployment. The obligation applies to:

- Public bodies and bodies governed by public law
- Private entities providing public services
- Deployers of high-risk systems in points 5(b) and 5(c) of Annex III (credit scoring, social benefits)

A FRIA must cover:
1. A description of the processes where the high-risk system is to be used and their purpose
2. The period and frequency of use
3. The categories of natural persons affected, including vulnerable groups
4. The specific risks of harm to fundamental rights identified
5. Human oversight measures and remedies available

### FRIA and GDPR DPIA Overlap

High-risk AI systems that process personal data trigger both:
- **Article 27 FRIA** under the EU AI Act
- **Article 35 DPIA** under GDPR (mandatory where processing is "likely to result in high risk")

These can be consolidated into a single integrated assessment. Article 27(4) explicitly permits leveraging an existing DPIA for FRIA purposes. Key difference: a DPIA is scoped to data protection rights; a FRIA covers the full EU Charter of Fundamental Rights — non-discrimination, human dignity, freedom of expression, access to justice, workers' rights. The FRIA is always broader. Run them together, but ensure the FRIA addresses rights the DPIA never evaluated.

FRIA results must be notified to the national market surveillance authority and updated when material circumstances change.

---

## Penalties

| Violation | Fine |
|---|---|
| Prohibited AI practices | Up to €35M or **7% of global annual turnover** |
| High-risk / GPAI non-compliance | Up to €15M or **3% of global annual turnover** |
| Providing incorrect/misleading information to AI Office | Up to €7.5M or **1.5% of global annual turnover** |

The higher figure applies (percentage vs absolute). For large multinationals, the percentage figure dominates.

---

## ISO 42001 Relationship

**ISO/IEC 42001:2023** is the first certifiable AI management systems (AIMS) standard. It provides a Plan-Do-Check-Act (PDCA) governance framework that maps directly to many EU AI Act obligations:

| EU AI Act requirement | ISO 42001 clause |
|---|---|
| Risk management system (Art. 9) | Clause 6 (Risk management) |
| Data governance (Art. 10) | Clause 8.4 (AI system impact assessment) |
| Technical documentation (Art. 11) | Clause 8 (Operation documentation) |
| Logging and record-keeping (Art. 12) | Clause 9 (Performance evaluation) |
| Human oversight (Art. 14) | Clause 8.5 (AI system controls) |
| AI literacy (GPAI) | Clause 7.2 (Competence) |

ISO 42001 certification does **not** substitute for EU AI Act conformity assessment, CE marking, or FRIA. It demonstrates a systematic governance approach and can reduce friction during conformity assessments and regulatory inspections. It is the practical baseline for organisations preparing for multiple AI regulations simultaneously.

---

## Engineering Compliance Checklist (High-Risk Systems)

Before deploying an Annex III high-risk AI system into the EU:

**Scoping**
- [ ] Confirm the system falls under Annex III; document the rationale if asserting Article 6(3) exemption
- [ ] Identify role: provider (places on market), deployer (uses in own operations), or both

**Documentation**
- [ ] Write and maintain Annex IV technical file (architecture, training data, accuracy metrics)
- [ ] Prepare instructions for use per Article 13
- [ ] Draft EU Declaration of Conformity

**Risk Management**
- [ ] Implement a written risk management process covering full lifecycle
- [ ] Document data governance: sources, bias analysis, representativeness
- [ ] Run FRIA (if public body or Annex III points 5(b)/(c) deployer); consolidate with GDPR DPIA

**Technical Controls**
- [ ] Implement automatic logging sufficient for traceability (Article 12)
- [ ] Build human oversight interface: monitor, override, and stop functionality (Article 14)
- [ ] Test accuracy and robustness; declare metrics; test adversarial inputs

**Conformity**
- [ ] Select correct conformity assessment pathway (self-assessment vs notified body)
- [ ] Affix CE marking
- [ ] Register in the EU AI Act public database

**Ongoing**
- [ ] Assign post-market monitoring owner
- [ ] Establish incident reporting process (for systemic risk GPAI: 2-week window)
- [ ] Schedule FRIA refresh on material changes

---

## US Comparison

No equivalent federal AI law as of May 2026. EO 14110 (Biden, Oct 2023) was largely rescinded by the Trump administration in January 2025. NIST AI RMF remains voluntary. US enforcement is sector-based (FDA for medical devices, CFPB for credit, EEOC for employment AI). Colorado SB 205 (2024) is the closest US equivalent to the EU AI Act's high-risk AI provisions — it applies to consequential decisions but lacks the EU Act's depth on technical requirements. State-level efforts continue to fragment.

The divergence creates a practical burden for engineers building for both markets: EU AI Act technical documentation and logging requirements have no direct US equivalent, but implementing them is not harmful for US-only deployments.

---

## Connections

- [[landscape/regulation]] — broader regulatory context: US, UK, China, GDPR
- [[landscape/ai-labs]] — how Anthropic, OpenAI, and Google are responding to GPAI obligations
- [[security/owasp-llm-top10]] — OWASP LLM Top 10 mitigations overlap with AI Act security obligations
- [[security/red-teaming]] — adversarial testing required by Article 9 and for systemic risk GPAI models
- [[safety/alignment]] — Anthropic's RSP and Constitutional AI as internal governance complementing regulation
- [[evals/methodology]] — evaluation and testing requirements map to Articles 9, 10, and 15
- [[protocols/mcp]] — MCP tool use in high-risk agentic systems may trigger Annex III obligations

---

## Key Facts

- Regulation (EU) 2024/1689; entered into force 1 August 2024
- Prohibited practices enforceable: 2 February 2025
- GPAI obligations: 2 August 2025
- High-risk Annex III enforcement: 2 August 2026 (potential deferral to 2 December 2027 pending Digital Omnibus trilogue)
- GPAI definition: >10^23 FLOPs; systemic risk threshold: >10^25 FLOPs
- Maximum penalty: €35M or 7% of global annual turnover
- FRIA (Article 27) required for public-body deployers and Annex III points 5(b)/(c) deployers — can be consolidated with GDPR Article 35 DPIA
- ISO 42001:2023 provides a certifiable framework that maps to AI Act obligations but does not replace conformity assessment
- Digital Omnibus: proposed deferral under trilogue as of May 2026 — treat August 2026 as the planning deadline
