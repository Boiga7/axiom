---
type: concept
category: protocols
tags: [tool-design, mcp, function-calling, tool-schema, json-schema, api-design]
sources: []
updated: 2026-04-29
para: resource
tldr: Tool schema design for reliable LLM tool calling — description writes "when/when not to use", enums eliminate string ambiguity, clean return values, and tool routing for 20+ tool sets.
---

# Tool Design for LLMs

> **TL;DR** Tool schema design for reliable LLM tool calling — description writes "when/when not to use", enums eliminate string ambiguity, clean return values, and tool routing for 20+ tool sets.

How to design tools (functions) that LLMs call reliably. Poor tool schemas are the #1 source of agent failures that aren't model failures. The model misunderstands the tool's purpose, passes wrong arguments, or invokes it at the wrong time.

---

## The Tool Calling Flow

1. You send the model a list of tools (JSON Schema descriptions)
2. The model decides when to call a tool and what arguments to pass
3. You execute the tool and return the result
4. The model uses the result to continue

The model never executes anything. It outputs a structured tool-call request that you execute. This means: the model only knows what you tell it in the schema.

---

## Anatomy of a Good Tool Schema

```json
{
  "name": "search_knowledge_base",
  "description": "Search the internal knowledge base for relevant documentation. Use this when the user asks about product features, policies, or technical specifications. Do not use for general knowledge questions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query. Be specific and include relevant keywords. Example: 'API rate limits for the Pro tier'"
      },
      "category": {
        "type": "string",
        "enum": ["technical", "billing", "policies", "general"],
        "description": "The documentation category to search in. Use 'technical' for API/SDK questions, 'billing' for pricing, 'policies' for terms/SLAs."
      },
      "max_results": {
        "type": "integer",
        "description": "Maximum number of results to return. Default 5, maximum 20.",
        "default": 5,
        "minimum": 1,
        "maximum": 20
      }
    },
    "required": ["query", "category"]
  }
}
```

Key principles in this schema:
- **When to use:** explicitly stated in `description`
- **When NOT to use:** explicitly stated ("Do not use for general knowledge")
- **Examples:** included in field descriptions
- **Constraints:** `enum`, `minimum`, `maximum` — removes ambiguity
- **Defaults:** stated so the model doesn't guess

---

## Tool Naming

Names must be `snake_case` (Anthropic) or `camelCase` (OpenAI). Check provider requirements.

```python
# Good names — verb_noun, specific
"search_documents"
"create_calendar_event"
"send_slack_message"
"get_user_by_email"
"execute_python_code"

# Bad names — vague, noun-only
"documents"      # What does it do?
"data"           # Do what with data?
"process"        # Process what?
"helper"         # Never
```

---

## Description Writing

The description is a system prompt for this specific tool. Write it for the model, not for humans.

**Good description:**
```
"Search company Slack messages for a given user and date range. 
Use this when the user asks about past conversations, decisions made in meetings, 
or information shared on Slack. Do not use for real-time information — this only 
searches historical messages. Query should be a specific search term, not a question."
```

**Bad description:**
```
"Searches Slack."
```

Include:
1. What it does (precise, concrete)
2. When to use it (trigger conditions)
3. When NOT to use it (important disambiguation)
4. Format notes for key parameters

---

## Parameter Design

### Use enums for categorical values

```json
{
  "status": {
    "type": "string",
    "enum": ["open", "closed", "pending", "cancelled"],
    "description": "Filter by ticket status."
  }
}
```

Without an enum, the model may generate any string. "Open", "OPEN", "active", "unresolved".

### Make required fields explicit

```json
{
  "required": ["user_id", "message"]
}
```

Never rely on the model to "figure out" what's required. Unspecified requirements lead to hallucinated values.

### Use constrained types

```json
{
  "confidence": {
    "type": "number",
    "minimum": 0.0,
    "maximum": 1.0,
    "description": "Confidence score between 0 and 1."
  },
  "page_size": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "default": 20
  }
}
```

### Avoid optional parameters the model can't know

If the model has no basis for choosing an optional parameter value, either:
- Make it required (and document what values to use)
- Give it a sensible default and hide it from the schema
- Provide an enum of meaningful choices

---

## Return Value Design

The model reads the tool return value and must extract information from it. Make returns model-readable:

```python
# Bad — too much noise, model has to parse
def search_docs(query: str) -> dict:
    results = db.search(query)
    return {
        "sql_query": "SELECT ...",  # model doesn't need this
        "execution_time_ms": 23,    # model doesn't need this
        "total_rows_scanned": 15020,
        "results": [{"id": 123, "vector_distance": 0.234, "raw_text": "...", "metadata": {...}}]
    }

# Good — return exactly what the model needs
def search_docs(query: str) -> dict:
    results = db.search(query)
    return {
        "results": [
            {
                "title": r.metadata["title"],
                "content": r.raw_text[:500],  # truncate to relevant length
                "source": r.metadata["source"],
                "relevance": round(1 - r.vector_distance, 2),
            }
            for r in results[:5]
        ],
        "total_found": len(results),
    }
```

### Error returns

Always return structured errors, not exceptions:

```python
def call_external_api(endpoint: str) -> dict:
    try:
        response = requests.get(endpoint, timeout=5)
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except requests.Timeout:
        return {"success": False, "error": "Request timed out after 5s. Try again or use a different endpoint."}
    except requests.HTTPError as e:
        return {"success": False, "error": f"API returned {e.response.status_code}: {e.response.text[:200]}"}
```

The model needs to know whether the call succeeded and what to do next if it didn't.

---

## Tool Count and Selection

**Fewer tools is better.** With 20+ tools, model confusion increases. The model has to read every description and reason about which to call.

Strategies for large tool sets:
1. **Tool routing:** use a fast model to select the relevant subset, then pass only 3-5 tools to the main model
2. **Hierarchical tools:** expose one `search_knowledge_base` that internally routes to 10 sub-searches
3. **Dynamic tool loading:** select tools based on conversation context before calling the model

```python
def select_tools_for_query(query: str, all_tools: list) -> list:
    routing_response = fast_llm.invoke(f"""
    User query: {query}
    Available tool categories: {[t["name"] for t in all_tools]}
    Return a JSON list of 3-5 tool names most relevant to this query.
    """)
    selected_names = json.loads(routing_response)
    return [t for t in all_tools if t["name"] in selected_names]
```

---

## MCP Tool Schema

MCP tools use the same JSON Schema format with one addition. The MCP spec requires `inputSchema` (not `parameters`):

```python
# MCP server tool definition
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict):
    if name == "search_documents":
        return await search_documents(**arguments)

@server.list_tools()
async def handle_list_tools():
    return [
        Tool(
            name="search_documents",
            description="Search the document index for relevant content.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "top_k": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        )
    ]
```

See [[protocols/mcp]] for the full MCP spec.

---

## Testing Tool Schemas

Always test with the model before deploying:

```python
def test_tool_schema(client, tool_schema: dict, test_cases: list[dict]):
    for case in test_cases:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            tools=[tool_schema],
            messages=[{"role": "user", "content": case["prompt"]}],
        )
        
        if response.stop_reason == "tool_use":
            tool_call = next(b for b in response.content if b.type == "tool_use")
            assert tool_call.name == case["expected_tool"], f"Wrong tool: {tool_call.name}"
            for field in case.get("required_fields", []):
                assert field in tool_call.input, f"Missing field: {field}"
        else:
            assert not case.get("should_call_tool"), "Expected tool call but model responded directly"
```

---

## Key Facts

- Tool schema format: Anthropic uses `inputSchema` (MCP style); OpenAI uses `parameters`
- Naming convention: `snake_case` for Anthropic, `camelCase` for OpenAI — check provider
- Description should include: what it does, when to use, when NOT to use, parameter format examples
- Enums are mandatory for categorical values — without them, models generate inconsistent strings
- Tool count threshold: >20 tools increases model confusion; use tool routing to select 3-5 relevant ones
- Return values: strip metadata (SQL query, execution time, row count) — return only what the model needs
- Errors: always return structured `{"success": false, "error": "..."}` — not raised exceptions

## Common Failure Cases

**Model calls the wrong tool because two tools have overlapping descriptions**  
Why: when two tools solve similar problems (e.g., `search_documents` and `search_knowledge_base`), the model chooses between them based on description wording; ambiguous or redundant descriptions cause the wrong tool to be selected on ~20-40% of calls.  
Detect: tool call logs show alternating selection between two similar tools for the same query type; the "wrong" tool is called and returns irrelevant results.  
Fix: add explicit disambiguation to both descriptions ("Do not use for X — use `tool_b` instead"); or merge redundant tools into one with a `source` enum parameter.

**Model passes a free-form string for a categorical field instead of a valid enum value**  
Why: without an enum constraint, the model generates plausible-sounding but non-canonical values ("Active", "in progress", "OPEN" for a status field); your code does a strict equality check and fails.  
Detect: tool execution errors show unrecognised values for status/type/category fields; the error pattern is inconsistent across runs.  
Fix: always add `"enum": [...]` to categorical string fields; the model will only select from the provided values.

**Tool returns a 500 error and the model retries indefinitely without escalating to the user**  
Why: the model's default behaviour on tool errors is to retry with slightly different arguments or rephrase; if the tool returns an error in an exception (not a structured `{"success": false}` dict), the model may loop instead of reporting failure.  
Detect: agent traces show 5+ consecutive calls to the same tool with similar arguments; the trace runs for an unusually long time.  
Fix: always return structured error responses from tools; add a retry counter in the agent loop and surface the error to the user after N failed attempts.

**Optional parameter with no default causes the model to hallucinate a plausible value**  
Why: if an optional parameter has no default and no example, the model infers a value; for fields like `start_date` or `limit`, it may pick a value that seems reasonable but is wrong for the use case.  
Detect: tool results are unexpectedly filtered or truncated; adding logging shows the optional parameter was set to a non-null value the user never specified.  
Fix: set sensible `"default"` values on all optional parameters and document them in the field description; if there is no safe default, make the field required.

**Tool result is too large for the context window, causing a mid-generation truncation error**  
Why: a search tool returning full document content can exceed the remaining context window if the model is already mid-conversation; the model either errors or silently truncates the tool result.  
Detect: tool calls succeed but the model's response refers to only the first portion of the results; error logs show context length exceeded.  
Fix: truncate tool results at a safe character limit before returning them (e.g., `content[:2000]` per result); use a `max_results` parameter so the model can request fewer items when context is tight.

## Connections

- [[protocols/mcp]] — MCP tool schema specification and `inputSchema` format
- [[agents/react-pattern]] — the ReAct loop that drives tool calling
- [[security/prompt-injection]] — tool descriptions and results as injection vectors
- [[agents/multi-agent-patterns]] — tool routing in multi-agent systems

## Open Questions

- Is there a principled way to measure tool schema quality before testing with the model, analogous to linting?
- At what exact tool count does model performance degrade — is 20 a real threshold or a rough heuristic?
- Do different frontier models (Claude vs GPT-4o vs Gemini) have meaningfully different tool schema preferences?
