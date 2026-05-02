---
type: entity
category: agents
para: resource
tags: [autogen, ag2, multi-agent, groupchat, event-driven, microsoft, async]
tldr: AG2 (formerly AutoGen) is Microsoft's event-driven multi-agent framework. GroupChat is its primary pattern — multiple agents in a shared conversation thread. Renamed from AutoGen in late 2024. Best for enterprise-scale, cross-language, and complex group coordination.
sources: []
updated: 2026-05-01
---

# AutoGen / AG2

> **TL;DR** AG2 (formerly AutoGen) is Microsoft's event-driven multi-agent framework. GroupChat is its primary pattern — multiple agents in a shared conversation thread. Renamed from AutoGen in late 2024. Best for enterprise-scale, cross-language, and complex group coordination.

## Key Facts
- Renamed from AutoGen to AG2 in late 2024; the GitHub repo and pip package still widely referenced as `autogen`/`pyautogen`
- v0.4 rearchitected with async-first, event-driven core; prior versions were synchronous
- GroupChat: multiple agents share a single conversation; a selector determines who speaks next
- AutoGen Studio: low-code UI for prototyping agent workflows without code
- Cross-language support: Python and .NET; framework interoperability via AgentOS runtime
- Full type safety via Pydantic (v0.4+)
- Best suited for research, enterprise, and scenarios requiring rich group dynamics

## Core Architecture (v0.4)

AG2 v0.4 introduced a layered architecture:

```
AgentOS (universal runtime)
  ├── Core API — event-driven, async messaging between agents
  └── AgentChat API — task-driven, conversation-style applications
```

**Core API**: low-level, event-driven. Agents communicate via message passing in an async event loop. Suitable for building custom orchestration.

**AgentChat API**: higher-level, familiar conversation model. `AssistantAgent`, `UserProxyAgent`, and `GroupChatManager` are the primary primitives. Most tutorials use this layer.

## GroupChat Pattern

GroupChat is AG2's defining pattern: multiple agents contribute to a shared conversation thread, with a selector deciding who speaks next.

```python
import autogen

config_list = [{"model": "claude-sonnet-4-6", "api_key": "...", "base_url": "..."}]

# Define agents
researcher = autogen.AssistantAgent(
    name="Researcher",
    system_message="You find and summarise technical information.",
    llm_config={"config_list": config_list},
)

critic = autogen.AssistantAgent(
    name="Critic",
    system_message="You challenge assumptions and identify gaps in the research.",
    llm_config={"config_list": config_list},
)

writer = autogen.AssistantAgent(
    name="Writer",
    system_message="You synthesise research and critiques into clear documentation.",
    llm_config={"config_list": config_list},
)

user_proxy = autogen.UserProxyAgent(
    name="User",
    human_input_mode="NEVER",  # fully automated
    max_consecutive_auto_reply=10,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
)

# Create GroupChat
group_chat = autogen.GroupChat(
    agents=[user_proxy, researcher, critic, writer],
    messages=[],
    max_round=15,
    speaker_selection_method="auto",  # or "round_robin", "manual"
)

manager = autogen.GroupChatManager(
    groupchat=group_chat,
    llm_config={"config_list": config_list},
)

# Start the conversation
user_proxy.initiate_chat(
    manager,
    message="Research MCP security vulnerabilities and write a summary.",
)
```

## Async-First Event Model (v0.4)

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.anthropic import AnthropicChatCompletionClient

model_client = AnthropicChatCompletionClient(model="claude-sonnet-4-6")

agent1 = AssistantAgent("Researcher", model_client=model_client)
agent2 = AssistantAgent("Critic", model_client=model_client)

team = RoundRobinGroupChat([agent1, agent2], max_turns=6)

import asyncio

async def main():
    result = await team.run(task="Analyse MCP server security posture")
    print(result.messages[-1].content)

asyncio.run(main())
```

## AutoGen Studio

Low-code interface built on the AgentChat API:
- Drag-and-drop agent composition
- Real-time message flow visualisation
- Rapid prototyping without code
- Export workflow definitions to Python

Use AutoGen Studio for exploring agent combinations before committing to code. Available at `localhost:8081` when run locally.

## Cross-Framework Interoperability (AgentOS)

AG2's AgentOS runtime enables agents from different frameworks to collaborate:
- AG2 agents + Google ADK agents + OpenAI Agents SDK agents in one team
- Universal runtime handles message translation between frameworks
- Useful for enterprises with existing investments in multiple frameworks

## AG2 vs LangGraph vs CrewAI

| Factor | AG2 | LangGraph | CrewAI |
|---|---|---|---|
| Primary pattern | GroupChat (shared thread) | Graph (nodes/edges) | Role-based crew |
| Async support | Native (v0.4+) | Yes | Limited |
| Complexity | Medium-high | High | Low |
| Group dynamics | Best-in-class | Manual | Good |
| Checkpointing | Limited | Full | Basic |
| Cross-language | Python + .NET | Python only | Python only |
| Observability | AutoGen Studio | LangSmith + Studio | Limited |
| Best for | Research, enterprise group tasks | Production stateful agents | Rapid prototypes |

> [Source: AG2 documentation and release notes, 2025]
> [Source: DEV Community — AutoGen, LangGraph, CrewAI comparison, 2025-2026]

## Common Failure Cases

**GroupChat enters a loop where two agents exchange turns without making progress**  
Why: both agents have instructions that defer decision-making to the other; the selector chooses them in alternation indefinitely.  
Detect: `max_round` is hit without `TERMINATE` appearing; verbose logs show A→B→A→B with no tool calls or task progress.  
Fix: ensure one agent has explicit authority to conclude the task; add a `TERMINATE` instruction that fires on completion conditions.

**`human_input_mode="NEVER"` causes UserProxyAgent to auto-approve unsafe actions**  
Why: the UserProxy with NEVER mode executes all code the assistant suggests without confirmation.  
Detect: in the transcript, code blocks are being executed automatically including file writes and network calls.  
Fix: use `human_input_mode="ALWAYS"` for any destructive or irreversible tool calls; reserve NEVER for sandboxed environments only.

**v0.4 async agents fail with event loop conflicts in Jupyter notebooks**  
Why: Jupyter runs its own event loop; `asyncio.run(main())` raises `RuntimeError: This event loop is already running`.  
Detect: `RuntimeError: This event loop is already running` in Jupyter cell output.  
Fix: use `nest_asyncio.apply()` before calling `asyncio.run()`; or use `await` directly in Jupyter with `%autoawait asyncio`.

**Agent message context grows unbounded in long GroupChats**  
Why: all agents receive the full shared conversation thread; at 30+ rounds this exceeds context budgets and degrades quality.  
Detect: token usage per call increases monotonically with round count; quality of responses degrades after ~20 rounds.  
Fix: set a lower `max_round` and spawn a fresh GroupChat for new subtasks; summarise prior context and inject as a system message.

**cross-framework agents via AgentOS don't complete tool calls**  
Why: AG2 and external frameworks use different tool call schemas; AgentOS translation may miss required fields.  
Detect: tool calls return empty results or errors when the tool is from a different framework.  
Fix: test each tool call independently in its native framework before mixing; check AgentOS compatibility matrix for supported framework versions.

## Connections
- [[agents/langgraph]] — production-grade stateful alternative
- [[agents/crewai]] — role-based prototype-first alternative
- [[agents/multi-agent-patterns]] — GroupChat is a variant of the Supervisor pattern
- [[agents/openai-agents-sdk]] — OpenAI's lightweight handoff alternative

## Open Questions
- When does AG2's GroupChat (shared thread) outperform LangGraph's graph routing on multi-agent tasks?
- Is AgentOS production-ready for mixing AG2 and LangGraph agents in enterprise deployments?
