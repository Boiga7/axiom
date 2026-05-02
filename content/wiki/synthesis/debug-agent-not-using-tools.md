---
type: synthesis
category: synthesis
para: resource
tags: [debugging, agents, tools, llm, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing LLM agents that ignore available tools and answer from memory instead.
---

# Debug: Agent Not Using Tools

**Symptom:** Agent answers from its own knowledge instead of calling the tool. Tool calls never appear in traces. Agent gives plausible but wrong or stale answers.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Tool never called across all queries | Tool not registered correctly or schema invalid |
| Tool called on some queries, not others | Tool description does not match how users phrase the task |
| Tool called but result ignored | Prompt does not instruct the model to use tool output |
| Agent calls wrong tool | Tool names or descriptions are ambiguous |
| Was working, stopped after prompt change | System prompt change removed or weakened tool instruction |

---

## Likely Causes (ranked by frequency)

1. Tool description does not match the user's phrasing — model does not recognise it as relevant
2. Tool schema has a validation error — model avoids calling a tool it cannot construct arguments for
3. System prompt does not instruct the model to use tools for this task type
4. `tool_choice` not set — model has the option to answer without calling
5. Too many tools registered — model cannot select the right one reliably

---

## First Checks (fastest signal first)

- [ ] Check traces — is the tool appearing in the model's context at all, or is it missing from the call?
- [ ] Validate the tool schema — does it conform to JSON Schema with `required` fields and clear descriptions?
- [ ] Check the tool description — does it describe *when* to use it, not just what it does?
- [ ] Check `tool_choice` — is it set to `auto`, `required`, or a specific tool name?
- [ ] Count registered tools — above 10-15 tools, selection reliability degrades

**Signal example:** Agent answers "the current price is approximately $X" from training data — trace shows tool list sent to model but zero tool calls returned; tool description says "retrieves product data" with no mention of when to use it for pricing queries.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Tool schema design and required fields | [[protocols/mcp]] |
| Tool description best practices | [[agents/mcp-server-development]] |
| Tracing tool calls in production | [[observability/tracing]] |
| Agent loop not acting on tool output | [[agents/langgraph]] |
| Reducing tool count with routing | [[agents/multi-agent-patterns]] |

---

## Fix Patterns

- Rewrite tool description to include *when* to use it — "Use this tool whenever the user asks about current prices or inventory" beats "retrieves product data"
- Add `required` fields to the schema — a tool with optional-everything is hard for the model to call confidently
- Set `tool_choice: required` to force at least one tool call per turn — use for debugging, then relax
- Reduce tool count — split into specialised agents each with 3-5 tools rather than one agent with 20
- Add an explicit instruction in the system prompt — "always use the search tool before answering factual questions"

---

## When This Is Not the Issue

If the tool is being called correctly but the answer is still wrong:

- The problem is in the tool output, not the tool selection
- Check whether the tool is returning the right data
- Check whether the model is correctly incorporating the tool result into its answer

Pivot to [[llms/hallucination]] to diagnose whether the model is ignoring tool output in favour of parametric memory.

---

## Connections

[[agents/langgraph]] · [[agents/mcp-server-development]] · [[protocols/mcp]] · [[agents/multi-agent-patterns]] · [[observability/tracing]] · [[llms/hallucination]]
