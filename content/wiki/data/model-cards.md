---
type: concept
category: data
para: resource
tags: [data, governance, model-cards, huggingface, eu-ai-act]
tldr: A model card is a standardized document published alongside an ML model that records intended use, performance across subgroups, limitations, and ethical considerations — originating from Mitchell et al. 2018 and now required for HuggingFace Hub uploads and EU AI Act compliance.
sources: []
updated: 2026-05-04
---

# Model Cards

> **TL;DR** A model card is a standardized document published alongside an ML model that records intended use, performance across subgroups, limitations, and ethical considerations — originating from Mitchell et al. 2018 and now required for HuggingFace Hub uploads and EU AI Act compliance.

---

## Key Facts

- Mitchell et al. (2018, arXiv:1810.03993) coined "model card" and defined nine required sections
- Core insight: disaggregate performance metrics by subgroup (demographics, environment, instrumentation) — aggregate accuracy conceals failure modes that matter most in high-stakes deployment
- HuggingFace Hub renders any repo's `README.md` as a model card; YAML frontmatter parsed for search/filter metadata
- No single field is strictly mandatory on the Hub, but omitting `license` and `pipeline_tag` effectively buries the model in search
- EU AI Act Article 13(3) (transparency) and Annex IV (technical documentation) map directly to model card content; compliance deadline for high-risk systems is August 2, 2026
- GPAI providers have been required since August 2, 2025 to publish a public "model card" covering intended use and limitations alongside a private technical dossier for regulators
- Anthropic calls its format a "system card" — broader scope than Mitchell, focused on safety evaluations and responsible scaling policy evidence rather than general performance metrics
- A model card is warranted whenever a model will be shared externally, used in production, or evaluated by parties other than the builder; a plain README suffices for internal experiments that will not be deployed

---

## Detail

### Mitchell 2018 origin

Margaret Mitchell, Timnit Gebru, and co-authors at Google proposed model cards as a short document accompanying a trained model to communicate benchmark results and other relevant data to developers, policymakers, and downstream users. The nine sections they defined:

1. **Model Details** — architecture, version, developers, license, contact
2. **Intended Use** — primary intended uses, intended users, out-of-scope uses
3. **Factors** — relevant demographic or phenotypic groups, instrumentation, environment
4. **Metrics** — chosen performance measures and rationale (accuracy, FPR, FNR, F1, etc.)
5. **Evaluation Data** — dataset used, preprocessing, representativeness caveats
6. **Training Data** — high-level description (detailed disclosure optional given sensitivity)
7. **Quantitative Analyses** — disaggregated results per the factors defined above; intersectional analysis if data allows
8. **Ethical Considerations** — sensitive data use, downstream harm potential, mitigations in place
9. **Caveats and Recommendations** — residual limitations, conditions under which results may not hold, guidance for users

The disaggregated analysis requirement (section 7) is the most operationally demanding — it forces builders to collect test data stratified by subgroup and report results that aggregate metrics would hide.

### HuggingFace Hub format

The Hub treats the repo's `README.md` as the model card. A YAML block delimited by `---` at the top is parsed for structured metadata:

```yaml
---
language: [en, fr]
license: apache-2.0
library_name: transformers
tags: [text-generation, instruction-tuning]
datasets: [my-org/my-dataset]
base_model: meta-llama/Llama-3-8B
pipeline_tag: text-generation
metrics: [perplexity, rouge]
---
```

Key fields in practice:
- `license` — required for discoverability in filtered search
- `pipeline_tag` — determines which inference widget appears on the model page
- `library_name` — for repos created after August 2024, must be set explicitly if `transformers` is intended [unverified: exact cutoff date may shift]
- `base_model` — enables the Hub to surface fine-tune lineage graphs
- `language`, `datasets`, `tags` — improve search ranking

The markdown body below the YAML follows the Mitchell section order by convention; no mechanical enforcement. Hugging Face ships a Python helper (`huggingface_hub.ModelCard`) and a `ModelCard.validate()` method to lint cards against Hub rules before push.

### EU AI Act alignment

The Act creates a two-tier documentation burden:

**High-risk systems (Annex III)** — biometrics, critical infrastructure, employment, education, essential services, law enforcement, border control, justice administration. Technical documentation under Article 11 and Annex IV must include: model architecture, training methodology, data provenance, performance metrics, accuracy thresholds, and ongoing monitoring evidence. This is functionally a superset of a Mitchell-style model card. Deadline: August 2, 2026.

**General Purpose AI (GPAI) models** — since August 2, 2025, all GPAI providers must:
- Maintain a private technical dossier for regulators (capabilities, limitations, training data, test results)
- Publish a public summary of copyright-covered training material
- Provide customers a compact "model card" specifying what the model is and is not designed to do

A well-maintained model card covering Mitchell's sections satisfies Articles 11 and 13 compliance evidence for both tiers, though it does not replace the full private dossier regulators may request.

### Anthropic system cards

Anthropic publishes "system cards" (not "model cards") for each major Claude release. Differences from Mitchell-style cards:

| Dimension | Mitchell model card | Anthropic system card |
|---|---|---|
| Primary audience | Downstream developers, policymakers | AI safety researchers, regulators, public |
| Performance focus | Disaggregated benchmark metrics across subgroups | Safety evaluations: CBRN uplift, cybersecurity, deception, agentic risks |
| Governance hook | Responsible deployment guidance | Responsible Scaling Policy (RSP) evaluation evidence |
| Training data | High-level description | Not disclosed in detail |
| Format | Researcher-designed, flexible | Internal template, released as PDF or web page |
| Scope | Single model deployment | Model + deployment context + policy commitments |

Anthropic also publishes shorter "model card addenda" for minor version updates (e.g., Claude 3.5 Haiku addendum), supplementing the base system card rather than replacing it. The Anthropic Transparency Hub aggregates all system cards and pilot risk reports.

### When to write a model card vs lighter documentation

Write a model card when:
- The model will be shared publicly (Hub upload, paper release, API product)
- The model will be used in production by parties other than the team that trained it
- The domain involves sensitive decisions (hiring, credit, health, law enforcement)
- Regulatory compliance is required (EU AI Act, FDA AI/ML guidance, sector-specific rules)
- A third party will evaluate, audit, or integrate the model

A README is sufficient when:
- The model is an internal experiment not leaving the team
- The model is a brief fine-tuning checkpoint used to generate data for a downstream model
- There is no deployment plan and no external audience

---

## Connections

- [[landscape/open-source-models]] — HuggingFace Hub requires a model card (README.md with YAML) for all public submissions; it is the primary discovery surface on the Hub
- [[data/synthetic-data]] — documenting data generation methodology, model lineage, and generation prompts is a model card section (Training Data + Evaluation Data)
- [[landscape/eu-ai-act]] — Articles 11 and 13 plus Annex IV create the EU compliance demand that model cards partially satisfy
- [[safety/responsible-ai]] — responsible AI principles (fairness, transparency, accountability) are the normative grounding for what model cards are required to disclose
- [[safety/alignment-overview]] — Anthropic system cards are a model card variant oriented around alignment and safety evaluations rather than benchmark disaggregation
- [[safety/red-teaming-methodology]] — red-team results are a key input to the Ethical Considerations and safety evaluation sections of both Mitchell cards and Anthropic system cards

---

## Open Questions

- Will the EU AI Office publish an official model card template that satisfies Annex IV, or will industry converge on an informal standard?
- Do disaggregated evaluations for subgroups (gender, race, dialect) require collecting demographic data that itself triggers GDPR/privacy obligations in the EU?
- How should model card versioning work across fine-tuning iterations — one card per checkpoint, or a living document with a changelog?
- Anthropic's system cards report third-party evaluations for some safety categories — will regulators eventually require independent audits rather than self-reported results?

---

## Sources

- Mitchell et al. (2018), "Model Cards for Model Reporting" — [arXiv:1810.03993](https://arxiv.org/abs/1810.03993)
- HuggingFace Hub model card documentation — [huggingface.co/docs/hub/model-cards](https://huggingface.co/docs/hub/en/model-cards)
- EU AI Act practical model card guidance — [practical-ai-act.eu](https://practical-ai-act.eu/latest/engineering-practice/model-cards/)
- EU AI Act Article 16 (provider obligations) — [artificialintelligenceact.eu/article/16](https://artificialintelligenceact.eu/article/16/)
- EU AI Act GPAI 2025 compliance overview — [digital.nemko.com](https://digital.nemko.com/insights/eu-ai-act-rules-on-gpai-2025-update)
- Anthropic system cards index — [anthropic.com/system-cards](https://www.anthropic.com/system-cards)
- Anthropic Transparency Hub — [anthropic.com/transparency](https://www.anthropic.com/transparency)
