---
type: concept
category: agents
tags: [react, agent-loop, tool-use, reasoning, acting, langchain, langgraph]
sources: []
updated: 2026-04-29
para: resource
tldr: ReAct (Reasoning + Acting) is the foundational agent loop that interleaves chain-of-thought with tool calls and observations, grounding reasoning in actual tool results rather than hallucinated facts.
---

# ReAct Pattern

> **TL;DR** ReAct (Reasoning + Acting) is the foundational agent loop that interleaves chain-of-thought with tool calls and observations, grounding reasoning in actual tool results rather than hallucinated facts.

**Re**asoning and **Act**ing interleaved in a single loop. The foundational pattern for tool-using agents. From the 2022 paper "ReAct: Synergizing Reasoning and Acting in Language Models."

---

## The Loop

```
Thought: I need to find the current weather in London.
Action: search_weather({"location": "London"})
Observation: 18°C, partly cloudy, humidity 72%
Thought: I have the weather. I can now answer the user.
Action: FINISH
Answer: It's 18°C and partly cloudy in London.
```

Interleaving **Thought** (chain-of-thought reasoning) with **Action** (tool calls) and **Observation** (tool results) lets the model:
- Plan before acting
- Adapt based on what tools return
- Know when to stop

---

## Why It Works

Vanilla chain-of-thought hallucinates facts. Tool use without reasoning picks the wrong tools. ReAct combines both: reasoning about *which* action to take, then grounding subsequent reasoning in actual observations.

---

## Implementation in LangGraph

```python
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-6")
tools = [search_tool, calculator_tool]

agent = create_react_agent(llm, tools)
result = agent.invoke({"messages": [("user", "What is 15% of the GDP of France?")]})
```

`create_react_agent` wires up the standard ReAct loop. For custom logic, build it manually as a [[agents/langgraph]] graph with a conditional edge after the LLM node.

---

## Failure Modes

| Failure | Cause | Fix |
|---|---|---|
| Infinite loop | Model never decides to finish | Add max_iterations hard limit |
| Wrong tool called | Tool descriptions ambiguous | Rewrite descriptions; add examples |
| Ignores observation | Model anchored to prior thought | Stronger "Based on the observation..." prompt |
| Hallucinated tool result | Model generates fake observation | Always validate tool returns before injecting |
| Excessive tool calls | Model over-queries | Add step count to state; prompt for efficiency |

---

## ReAct vs Other Patterns

| Pattern | Description | When to use |
|---|---|---|
| **ReAct** | Interleaved thought + action | General-purpose tool-using agents |
| **Plan-and-Execute** | Plan all steps first, then execute | Deterministic multi-step tasks |
| **Reflexion** | Self-critique and retry on failure | Tasks where quality > speed |
| **LATS** | Tree search over action space | Exploration-heavy tasks |

For most production use cases, ReAct is the right starting point. Add planning or reflection only when ReAct demonstrably fails.

---

## Extended Thinking + ReAct

With Claude's extended thinking enabled, the `Thought` step is replaced by internal chain-of-thought (more thorough, not visible). Don't add explicit `Thought:` prompts — the model reasons internally before each action. The net result is better tool selection with the same loop structure.

---

## Key Facts

- Paper: "ReAct: Synergizing Reasoning and Acting in Language Models" (2022)
- `create_react_agent` in LangGraph wires the standard loop in one call
- Infinite loop failure mode: always add a `max_iterations` hard limit
- With Claude extended thinking enabled, do not add explicit `Thought:` prompts — model reasons internally
- Reflexion adds self-critique; Plan-and-Execute plans all steps first; LATS uses tree search over actions
- For most production cases, ReAct is the correct starting point before adding complexity

## Connections

- [[agents/langgraph]] — implements ReAct as a LangGraph graph with conditional edges
- [[agents/multi-agent-patterns]] — ReAct is the inner loop for each agent in multi-agent systems
- [[apis/anthropic-api]] — tool use API provides the Action mechanism
- [[evals/methodology]] — evaluating agent trajectory quality (step-by-step, not just final answer)

## Open Questions

- How does extended thinking interact with Reflexion-style self-critique loops — does internal reasoning replace the external retry?
- What is the empirically optimal max_iterations for production ReAct agents across different task types?
- How does LATS tree-search scale in token cost vs accuracy gain compared to vanilla ReAct?