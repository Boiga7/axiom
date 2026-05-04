---
type: synthesis
category: synthesis
para: resource
tags: [debugging, agents, loop, termination, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing agents that spin indefinitely, hit max iterations, or get stuck on a tool call.
---

# Debug: Agent Loop Not Terminating

**Symptom:** Agent keeps calling tools repeatedly without producing a final answer. Hits max iterations limit. Costs spiral. Never returns to the user.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Agent calls same tool repeatedly | Tool returns an error or unexpected result the agent cannot interpret |
| Agent produces plans but never acts | System prompt or instructions too cautious — agent seeks permission repeatedly |
| Agent hits max iterations on every run | Task is too large for a single loop — needs decomposition |
| Agent oscillates between two states | Two tools or instructions in conflict |
| Agent stops mid-task with no output | Tool call timed out or returned empty — agent has no fallback |

---

## Likely Causes (ranked by frequency)

1. Tool returning an error the agent retries indefinitely rather than escalating
2. Task too vague — agent cannot determine when it is done
3. No explicit stopping condition in the prompt or graph
4. Tool result format unexpected — agent cannot parse it and loops trying again
5. Max iterations too high — masks the real termination problem

---

## First Checks (fastest signal first)

- [ ] Check traces — which tool is being called repeatedly and what is it returning?
- [ ] Check whether the task has a clear success condition — can the agent determine when it is done?
- [ ] Check tool return format — is the agent receiving structured output it can act on or raw text it cannot parse?
- [ ] Check whether max iterations is masking a real bug — lower it to 5 to force early failure and diagnose
- [ ] Check for conflicting instructions — does the system prompt and user prompt give contradictory goals?

**Signal example:** Agent calls `search_tool` 47 times before hitting max iterations — tool returns `{"results": []}` on every call; agent cannot determine if the query should be reformulated or if no results is the answer.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Tool returning unexpected results | [[protocols/mcp-server-development]] |
| Graph termination condition missing | [[agents/langgraph]] |
| Multi-agent loop with no exit | [[agents/multi-agent-patterns]] |
| Tracing agent steps | [[observability/tracing]] |
| Agent security — tool misuse loop | [[security/owasp-llm-top10]] |

---

## Fix Patterns

- Add an explicit termination condition — "if you have attempted this 3 times without success, return what you have"
- Handle empty or error tool results explicitly — give the agent a fallback instruction for each failure case
- Return structured output from tools — JSON with a `success` field is easier for the model to branch on than raw text
- Set max iterations low during development — 5 to 10, not 50; forces you to design proper termination
- Add a human-in-the-loop interrupt after N iterations for long-running tasks — do not let agents run unbounded in production

---

## When This Is Not the Issue

If the agent terminates correctly but produces a wrong or incomplete answer:

- The loop is working but the reasoning is failing — the task may need decomposition into subtasks
- Check whether the context window is filling up mid-run — older tool results being dropped may cause the agent to re-run completed steps

Pivot to [[agents/langgraph]] to add explicit state checkpoints that let the agent verify completed steps before proceeding.

---

## Connections

[[agents/langgraph]] · [[protocols/mcp-server-development]] · [[agents/multi-agent-patterns]] · [[observability/tracing]] · [[security/owasp-llm-top10]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
