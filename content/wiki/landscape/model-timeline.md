---
type: synthesis
category: landscape
tags: [timeline, models, history, gpt, claude, gemini, llama, benchmarks]
sources: []
updated: 2026-04-29
para: area
tldr: Chronological history of frontier LLM releases from the 2017 Transformer paper through the Claude 4.x family in April 2026 — essential context for calibrating what constitutes progress vs expected trajectory.
---

# Model Release Timeline

> **TL;DR** Chronological history of frontier LLM releases from the 2017 Transformer paper through the Claude 4.x family in April 2026 — essential context for calibrating what constitutes progress vs expected trajectory.

The frontier LLM release history. Understanding the trajectory helps calibrate what's impressive vs expected.

---

## 2017–2019: Foundations

| Date | Model | Lab | Significance |
|---|---|---|---|
| Jun 2017 | **Transformer** | Google | Architecture that replaced RNNs |
| Oct 2018 | **BERT** | Google | Bidirectional transformers; NLP benchmarks shattered |
| Feb 2019 | **GPT-2** | OpenAI | 1.5B params; "too dangerous to release" (briefly) |

---

## 2020–2021: Scale

| Date | Model | Lab | Significance |
|---|---|---|---|
| May 2020 | **GPT-3** | OpenAI | 175B; in-context learning; API release |
| Jun 2021 | **GitHub Copilot** | GitHub/OpenAI | First mass-market AI coding tool |
| Aug 2021 | **Codex** | OpenAI | Code-focused GPT; powers Copilot |

---

## 2022: Alignment and ChatGPT

| Date | Model | Lab | Significance |
|---|---|---|---|
| Apr 2022 | **PaLM 540B** | Google | Scaling laws confirmed at 540B params |
| Dec 2022 | **ChatGPT** | OpenAI | Consumer breakout; 1M users in 5 days |
| Dec 2022 | **Constitutional AI paper** | Anthropic | CAI framework published |

---

## 2023: Open Source and Multimodal

| Date | Model | Lab | Significance |
|---|---|---|---|
| Feb 2023 | **LLaMA 1** | Meta | Open weights leak; open-source ecosystem born |
| Mar 2023 | **GPT-4** | OpenAI | Vision + text; SWE-bench debut model |
| Mar 2023 | **Claude 1** | Anthropic | First public Claude; Constitutional AI |
| Jul 2023 | **Llama 2** | Meta | Officially open; commercial license |
| Nov 2023 | **Mistral 7B** | Mistral | Best 7B model; MoE architecture introduced |
| Nov 2023 | **Mixtral 8x7B** | Mistral | MoE outperforms GPT-3.5; open weights |
| Dec 2023 | **Gemini 1.0** | Google | Native multimodal; Ultra/Pro/Nano tiers |

---

## 2024: Reasoning and Agents

| Date | Model | Lab | Significance |
|---|---|---|---|
| Mar 2024 | **Claude 3** (Haiku/Sonnet/Opus) | Anthropic | Haiku/Sonnet/Opus tiers; Opus #1 on Arena |
| Apr 2024 | **Llama 3 8B/70B** | Meta | Best open model at each tier |
| May 2024 | **GPT-4o** | OpenAI | Unified audio/vision/text; realtime API |
| Jun 2024 | **Claude 3.5 Sonnet** | Anthropic | Reclaimed #1; 50% SWE-bench; Claude Artifacts |
| Sep 2024 | **o1** | OpenAI | Reasoning model with internal chain-of-thought |
| Sep 2024 | **Llama 3.1 405B** | Meta | First open model competitive at frontier |
| Oct 2024 | **Claude 3.5 Haiku** | Anthropic | Sonnet-level quality at Haiku price |
| Nov 2024 | **Qwen 2.5** | Alibaba | Best Chinese open model family |

---

## 2025: Agents Take Over

| Date | Model | Lab | Significance |
|---|---|---|---|
| Jan 2025 | **DeepSeek V3/R1** | DeepSeek | o1-level reasoning, open weights, 96% cheaper API |
| Feb 2025 | **Claude 3.7 Sonnet** | Anthropic | Extended thinking; 70.3% SWE-bench Verified |
| Mar 2025 | **Gemini 2.5 Pro** | Google | Strong reasoning; 1M context becomes standard |
| Apr 2025 | **Claude 3.5 Sonnet refresh** | Anthropic | Agent capabilities; Claude Code ships |
| Jun 2025 | **GPT-4.5** | OpenAI | Improved instruction following |
| Jul 2025 | **Llama 3.1 405B Instruct** | Meta | Best open model for coding |
| Oct 2025 | **Claude Haiku 4.5** | Anthropic | 73.3% SWE-bench at lowest price tier |

---

## 2026 (April): Claude 4 Family

| Date | Model | Lab | Significance |
|---|---|---|---|
| Feb 2026 | **Claude Opus 4.6** | Anthropic | 80.8% SWE-bench; 91.3% GPQA |
| Feb 2026 | **Claude Sonnet 4.6** | Anthropic | 79.6% SWE-bench; $3/$15 per M tokens |
| Apr 2026 | **Claude Opus 4.7** | Anthropic | Latest Opus; released April 16 2026 |
| Apr 2026 | **Gemini 3 (unconfirmed)** | Google | [unverified] |

> [Source: Perplexity research, 2026-04-29 — post-August 2025 dates are from research]

---

## Key Themes by Year

**2017–2020:** Architecture innovation (Transformer → BERT → GPT-3)  
**2021–2022:** Alignment research + consumer products (ChatGPT)  
**2023:** Open source democratisation (Llama, Mistral); multimodal goes mainstream  
**2024:** Reasoning models (o1); agents start shipping  
**2025:** Agents are the product; open models reach frontier; Claude Code ships  
**2026:** Claude Opus 4.x takes SWE-bench lead; Anthropic overtakes OpenAI on revenue

---

## Key Facts

- GPT-3 (May 2020): 175B parameters; first mass in-context learning via API
- ChatGPT hit 1M users in 5 days (December 2022)
- LLaMA 1 leaked in Feb 2023; open-source ecosystem formed around it
- Claude 3.7 Sonnet (Feb 2025): extended thinking; 70.3% SWE-bench Verified
- DeepSeek R1 (Jan 2025): o1-level reasoning; 96% cheaper; MIT license; GRPO-only training
- Claude Opus 4.6 (Feb 2026): 80.8% SWE-bench Verified; 91.3% GPQA Diamond
- 2026 theme: Anthropic overtakes OpenAI on revenue; Claude Code ships as agentic tool

## Connections

- [[landscape/ai-labs]] — the companies behind each model release
- [[llms/claude]] — Claude family in depth with architecture and capability details
- [[llms/model-families]] — current model families and benchmark comparisons
- [[evals/benchmarks]] — what SWE-bench, GPQA, and MMLU actually measure

## Open Questions

- What does GPT-5 look like and when does it ship?
- Does the open-source tier continue to narrow the gap with frontier models at each generation?
- When does the Transformer architecture get meaningfully supplanted in production?
