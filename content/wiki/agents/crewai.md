---
type: entity
category: agents
para: resource
tags: [crewai, multi-agent, role-based, crews, orchestration, framework]
tldr: CrewAI is the fastest path to a working multi-agent prototype — role-based crews, linear workflows, readable code. LangGraph wins on production-grade control. Use CrewAI for content pipelines and research automation; LangGraph for anything with cycles, branching, or checkpointing.
sources: []
updated: 2026-05-01
---

# CrewAI

> **TL;DR** CrewAI is the fastest path to a working multi-agent prototype — role-based crews, linear workflows, readable code. LangGraph wins on production-grade control. Use CrewAI for content pipelines and research automation; LangGraph for anything with cycles, branching, or checkpointing.

## Key Facts
- Role-based model: each agent has a `role`, `goal`, `backstory`, and a list of `tools`
- Tasks are assigned to specific agents; output of one task feeds into the next
- Sequential (default) and hierarchical (manager agent delegates) process modes
- Shared crew memory: all agents in a crew share context across tasks
- CrewAI Flows (added 2025): event-driven pipeline mode for production workloads
- Multimodal support added 2025; agentic RAG capabilities added
- Much lower boilerplate than LangGraph for simple linear workflows
- Weaker on cycles, branching, and debugging — painful for complex stateful agents

## Core Concepts

### Agent

An agent is a role with goals and tools:

```python
from crewai import Agent
from crewai_tools import SerperDevTool, FileReadTool

researcher = Agent(
    role="AI Research Analyst",
    goal="Find and summarise the latest developments in MCP security",
    backstory="""You are a senior security researcher specialising in AI protocols.
    You know how to find credible sources and synthesise technical information.""",
    tools=[SerperDevTool(), FileReadTool()],
    verbose=True,
    allow_delegation=False,  # can this agent delegate to other agents?
)

writer = Agent(
    role="Technical Writer",
    goal="Write clear, accurate wiki pages from research material",
    backstory="You turn dense research into structured, readable documentation.",
    tools=[],
    verbose=True,
)
```

### Task

A task is a specific assignment for an agent:

```python
from crewai import Task

research_task = Task(
    description="""Research the latest MCP security vulnerabilities (2025-2026).
    Focus on: auth boundary issues, PKCE enforcement gaps, token scope violations.
    Output a structured summary with CVE IDs where available.""",
    expected_output="A bullet-point report covering at least 5 specific vulnerabilities",
    agent=researcher,
)

write_task = Task(
    description="""Using the research provided, write a wiki page for the Nexus vault
    covering MCP auth vulnerabilities. Follow the standard frontmatter format.""",
    expected_output="A complete markdown wiki page ready to save",
    agent=writer,
    context=[research_task],  # receives output of research_task as context
)
```

### Crew

The crew orchestrates agents and tasks:

```python
from crewai import Crew, Process

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.sequential,  # or Process.hierarchical
    verbose=True,
    memory=True,  # enable shared crew memory
)

result = crew.kickoff()
print(result.raw)
```

## Process Modes

### Sequential (default)

Tasks run in order. Output of task N is available as context to task N+1.

```
researcher → research_task → writer → write_task → final output
```

For linear pipelines (A → B → C → done), this is almost always sufficient.

### Hierarchical

A manager agent (automatically created or explicitly defined) delegates tasks to worker agents based on their roles and goals.

```
Manager
  ├── Researcher (research_task)
  ├── Analyst (analysis_task)
  └── Writer (write_task)
```

Use when you have 5+ agents and want the framework to handle routing rather than you defining it explicitly.

## CrewAI Flows (2025)

Flows provide event-driven, structured pipelines with more predictable execution than crews:

```python
from crewai.flow.flow import Flow, listen, start

class SecurityAuditFlow(Flow):
    @start()
    def scan_servers(self):
        return scan_mcp_servers()

    @listen(scan_servers)
    def analyse_findings(self, scan_results):
        return analyse_security_findings(scan_results)

    @listen(analyse_findings)
    def generate_report(self, findings):
        return create_scorecard(findings)

flow = SecurityAuditFlow()
result = flow.kickoff()
```

Flows are closer to LangGraph in their explicit pipeline definition. Use Flows when you need predictable step sequencing without the full LangGraph graph.

## CrewAI vs LangGraph Decision Matrix

| Factor | Use CrewAI | Use LangGraph |
|---|---|---|
| Time to first working agent | Hours | Days |
| Workflow shape | Linear (A→B→C) | Cyclic (A→B→A if condition) |
| Control needed | Low-medium | High |
| Audience | Solo dev, prototype | Engineering team, production |
| Debugging | Console logging | Graph visualisation, state inspection |
| Checkpointing | Basic | Full (resumable across crashes) |
| Human-in-the-loop | Limited | First-class support |
| Observability | Limited | LangSmith integration |
| Memory | Shared crew memory | Full LangGraph memory store |
| Cost estimation | Difficult | Built into state tracking |

**Rule of thumb:** If you can prototype in CrewAI in a day, do it. If it hits a wall (you need cycles, complex branching, or production checkpointing), port to LangGraph. The agent logic transfers — only the orchestration changes.

> [Source: LangGraph vs CrewAI comparison, DEV Community and DataCamp, 2025-2026]

## Connections
- [[agents/langgraph]] — the production-grade alternative for complex workflows
- [[agents/multi-agent-patterns]] — supervisor and handoff patterns that CrewAI implements at higher abstraction
- [[agents/practical-agent-design]] — framework-agnostic decision: single agent vs multi-agent
- [[agents/autogen]] — Microsoft's event-driven alternative (GroupChat pattern)
- [[agents/openai-agents-sdk]] — OpenAI's lightweight alternative (handoff pattern)

## Open Questions
- At what point in mcpindex's scan parallelism does CrewAI Flows become a viable orchestration layer vs LangGraph?
- How does CrewAI's shared crew memory interact with concurrent agent runs?
