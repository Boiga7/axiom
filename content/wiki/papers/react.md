---
type: paper
category: papers
para: resource
tags: [react, agents, reasoning, acting, yao, 2022, tool-use, agentic]
sources: []
updated: 2026-05-01
tldr: Interleave chain-of-thought reasoning with tool-use actions in a single generation loop — the model reasons about what to do, takes an action, observes the result, reasons again — enabling LLMs to complete tasks requiring external information retrieval.
---

# ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)

**Citation:** Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2022). ReAct: Synergizing Reasoning and Acting in Language Models. ICLR 2023.

**One sentence:** Interleave chain-of-thought reasoning with tool-use actions in a single generation loop — the model reasons about what to do, takes an action, observes the result, reasons again — enabling LLMs to complete tasks requiring external information retrieval.

---

## What Problem It Solved

Chain-of-thought reasoning is purely internal. The model can only use information in its context and weights. This fails for tasks requiring up-to-date information, multi-step lookups, or external computation.

Separately, "acting" approaches (letting models call APIs) had no reasoning trace. The model would blindly call tools without deliberation, making it hard to understand or debug.

ReAct combines reasoning and acting: the model produces a trajectory of (Thought → Action → Observation) triplets, grounding its reasoning in real retrieved information.

---

## Core Pattern — Thought/Action/Observation Loop

```
Thought: I need to find who directed The Godfather to answer this question.
Action: Search[The Godfather director]
Observation: The Godfather was directed by Francis Ford Coppola.

Thought: Now I know the director. The question asks about his other films.
Action: Search[Francis Ford Coppola filmography]
Observation: Apocalypse Now (1979), The Conversation (1974), ...

Thought: I have enough information to answer.
Action: Finish[Francis Ford Coppola directed The Godfather. His other notable films include Apocalypse Now and The Conversation.]
```

The model generates Thoughts and Actions in natural language. A harness intercepts Action tokens, executes the tool, and appends the Observation to the context. The loop continues until the model generates Finish.

---

## Key Contributions

### 1. Interleaved Reasoning + Acting

The critical insight: reasoning and acting should not be separated. Thoughts let the model plan its next action and interpret observations. Actions ground reasoning in external reality.

Without thoughts: the model blindly calls tools and can get lost.
Without actions: the model hallucinates facts (pure CoT on factual QA).
With both: the model can recover from errors, revise plans, and produce interpretable trajectories.

### 2. Human-Interpretable Trajectories

Every step of reasoning is visible. When a ReAct agent fails, you can read the thought chain and see exactly where it went wrong. Unlike black-box tool-use approaches.

### 3. Outperforms Pure CoT and Pure Acting

On HotpotQA (multi-hop fact retrieval) and FEVER (fact verification):
- Pure CoT: confabulates facts not in context
- Pure acting: makes poor decisions without intermediate reasoning
- ReAct: outperforms both, and is more robust to errors

### 4. Error Recovery via Reasoning

When a search returns unexpected results, the model can reason about why and try a different query:
```
Observation: No results found for "Coppola 1974 films".
Thought: The search query was too specific. Let me search more broadly.
Action: Search[Francis Ford Coppola]
```

---

## Impact

- ReAct is the foundational pattern for virtually every LLM agent loop: LangChain AgentExecutor, LangGraph ReAct nodes, OpenAI function-calling agents
- Defined the vocabulary (Thought/Action/Observation) that agent frameworks use
- Extended in: Reflexion (2023) — agent reflects on failed trajectories and retries; Plan-and-Execute — plan first, then act; AutoGPT/BabyAGI — autonomous long-horizon agents
- Claude Code, GitHub Copilot Workspace, and Devin all implement variants of this pattern

---

## Limitations

- **Context grows with each step** — long tasks fill the context window with observation text
- **Prompt sensitivity** — the few-shot examples must closely match the task domain to elicit the right format
- **Hallucinated thoughts** — the model can reason incorrectly between observations, compounding errors
- **No learning from failures** — each trajectory starts fresh; no episodic memory across runs

---

## Key Facts

- Published October 2022 (arXiv); ICLR 2023; 7 authors, Princeton + Google Research
- Tools in the paper: Wikipedia Search API and Lookup for QA tasks
- Pattern: alternating Thought (reasoning) → Action (tool call) → Observation (result)
- Every major agent framework implements ReAct: LangChain, LangGraph, AutoGen, CrewAI
- Extended by Reflexion (2023): agent generates verbal reflection on failed trajectories
- Claude Code's agentic loop is a ReAct variant (Thought → tool call → observation)

---

## Connections

[[papers/key-papers]] · [[papers/chain-of-thought]] · [[agents/practical-agent-design]] · [[agents/langgraph]] · [[protocols/tool-design]] · [[prompting/techniques]]
## Open Questions

- What claims in this paper have since been challenged or superseded by follow-up work?
- What did later research reveal about the limitations of this approach?
