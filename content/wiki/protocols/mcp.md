---
type: entity
category: protocols
tags: [mcp, model-context-protocol, agents, tools, security]
sources: []
updated: 2026-04-29
para: resource
tldr: MCP is the standard for agent-to-tool connectivity — stdio for local, HTTP/SSE for remote, OAuth 2.0 auth, 66% of 1,808 scanned servers had security findings, 30+ CVEs in April 2026.
---

# Model Context Protocol (MCP)

> **TL;DR** MCP is the standard for agent-to-tool connectivity — stdio for local, HTTP/SSE for remote, OAuth 2.0 auth, 66% of 1,808 scanned servers had security findings, 30+ CVEs in April 2026.

The standard protocol for connecting AI agents to external tools and data sources. Spec 2025-11-05 is the current stable revision (also referenced as 2025-03-26 in some SDK versions).

> [Source: Perplexity research, 2026-04-29] [unverified]

Called "the new HTTP for agents". Every major AI framework adopted it within 12 months of the first public release.

---

## What MCP Solves

Before MCP, every tool integration was a bespoke API wrapper. An agent needing filesystem access, web search, and a database required three incompatible integration patterns. MCP standardises the interface: one protocol, any tool, any agent runtime that speaks MCP.

---

## Architecture

```
┌─────────────────────────────────┐
│            MCP Host             │  (Claude Code, LangGraph app, etc.)
│  ┌──────────┐  ┌──────────┐     │
│  │  Client  │  │  Client  │     │  One client per server connection
│  └────┬─────┘  └────┬─────┘     │
└───────┼─────────────┼───────────┘
        │ MCP Protocol│
   ┌────┴────┐   ┌────┴────┐
   │ Server  │   │ Server  │       Local or remote
   │ (stdio) │   │ (HTTP)  │
   └─────────┘   └─────────┘
```

**Host** — the application that manages one or more MCP clients (Claude Code, a LangGraph app).  
**Client** — one connection to one MCP server; maintained by the host.  
**Server** — a process that exposes tools, resources, and prompts over the MCP protocol.

---

## Primitives

### Tools

The primary integration surface. A tool has:

```json
{
  "name": "read_file",
  "description": "Read the contents of a file. Use this to inspect source code.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Absolute file path" }
    },
    "required": ["path"]
  }
}
```

Tools are called by the LLM as part of the `tool_use` turn in the Messages API. The MCP client dispatches the call to the correct server, runs it, and returns the result to the LLM.

### Resources

Static or dynamic data the server exposes for reading. Files, database rows, API responses. The LLM can request resources explicitly. Less common than tools in practice.

### Prompts

Reusable prompt templates the server defines. The host can inject them as system prompts or message prefixes. Useful for server-specific instructions.

---

## Transports

| Transport | Use case | Auth |
|---|---|---|
| **stdio** | Local processes (Claude Code, CLI tools) | Process-level (OS permissions) |
| **HTTP** | Remote servers, Vercel/Cloudflare Workers | OAuth 2.0 / API key |
| **Streamable HTTP (SSE)** | Long-running tools, streaming results | OAuth 2.0 / API key |

stdio is the default for local development. HTTP is required for remote servers (shared MCP servers, SaaS integrations).

---

## Auth

- **OAuth 2.0** — spec-recommended for remote servers; supports PKCE
- **API keys** — headers or query params; simpler but less secure
- **Scoped tokens** — limit what a server can do; principle of least privilege

The MCP spec requires server discovery at `/.well-known/mcp` for HTTP servers.

---

## Security Surface

MCP is the largest new attack surface in AI systems in 2026. 66% of 1,808 scanned servers had security findings; 30+ CVEs filed in April 2026 alone.

**Key attack vectors:**

| Attack | Description |
|---|---|
| **Tool poisoning** | Malicious description text triggers prompt injection in the LLM |
| **Rug pull** | Server changes tool behaviour after gaining trust |
| **SSRF** | Tool accepts URL inputs and can be directed at internal services |
| **Cross-origin escalation** | Combining two trusted servers in unexpected ways |
| **Namespace shadowing** | Installing a malicious server that shadows a trusted server's tool names |

See [[security/mcp-cves]] for the live CVE tracker and [[security/owasp-llm-top10]] for the broader threat model.

**Defence patterns:**
- Pin server versions; never auto-update without review
- Validate all inputs before passing to tools; never pass LLM output directly as a command
- Scope tokens to minimum permissions
- Audit tool descriptions for injection payloads (see [[security/prompt-injection]])
- Use `mcpindex` to scan servers before deployment [unverified]

---

## Ecosystem

- **MCP Registry** — official directory of community-built servers
- **MCP Inspector** — visual debugger; connects to any server and lets you call tools interactively
- **Claude Code** — ships with 10+ first-party MCP servers; supports plugin system via `claude mcp add`
- **LangGraph** — `langchain-mcp-adapters` turns any MCP server into a LangGraph tool node
- **Cursor, Copilot (VS Code 1.99+)** — MCP support for IDE agents

Perplexity's official MCP server ([perplexityai/modelcontextprotocol](https://github.com/perplexityai/modelcontextprotocol)) was used as the research tool for this wiki. It exposes `perplexity_research`, `perplexity_search`, and `perplexity_ask`.

---

## MCP vs Function Calling

| Aspect | MCP | Direct function calling |
|---|---|---|
| Discovery | Dynamic (server lists tools) | Static (defined at app build time) |
| Transport | Network or process | In-process |
| Reuse | Server shared across many agents | One-off per integration |
| Security | Larger surface, more attack vectors | Smaller, more controlled |

Use direct function calling for tight, internal tools. Use MCP for anything meant to be reused across agents or exposed to third-party clients.

---

## Key Facts

- Spec versions: 2024-11-05 (initial public), 2025-03-26 (current SDK default)
- Transports: stdio (local/default), HTTP, Streamable HTTP/SSE (long-running/remote)
- Auth: OAuth 2.0 recommended for HTTP; server discovery at `/.well-known/mcp`
- Security: 66% of 1,808 scanned servers had findings; 30+ CVEs in April 2026
- MCP vs function calling: MCP tools are dynamic/discoverable and reusable across agents; function calls are static and in-process
- Claude Code: ships with 10+ first-party MCP servers; `claude mcp add` for plugins
- LangGraph: `langchain-mcp-adapters` wraps any MCP server as a LangGraph tool node

## Common Failure Cases

**Tool poisoning via malicious tool description**  
Why: a third-party MCP server includes prompt injection instructions in its tool `description` field; the LLM reads the description and follows the injected instruction instead of the caller's intent.  
Detect: agent takes unexpected actions after calling a tool from a third-party server; the action matches instructions in the tool description, not the user's request.  
Fix: audit all tool descriptions before connecting a server; treat tool descriptions as untrusted content; run a separate screening call to check descriptions for injection payloads.

**Rug pull: server changes tool behaviour after initial review**  
Why: the server was approved at version 1.0 but was auto-updated to a version that changes tool side effects or permissions scope.  
Detect: agent behaviour changes after a server update; tool call results differ from expected for the same inputs.  
Fix: pin server versions; never auto-update MCP servers without a review gate; use `mcpindex` checksums to detect changes.

**stdio transport leaks environment variables to child process**  
Why: the MCP server process inherits the full environment of the host; secrets in environment variables (API keys, tokens) are accessible to the server.  
Detect: the child MCP server process can read `os.environ` and exfiltrate secrets through its tool results.  
Fix: scrub the environment before spawning stdio servers; pass only the minimum required environment variables.

**Cross-origin escalation: two trusted servers combined unexpectedly**  
Why: Server A has read access to the filesystem and Server B can make HTTP requests; an attacker crafts a request that chains A's read output into B's HTTP call to exfiltrate data.  
Detect: audit logs show a tool call sequence that reads sensitive data and immediately sends it to an external URL; no single tool call looks malicious in isolation.  
Fix: scope each server's permissions to the minimum needed; add a policy layer that checks cross-server data flows against an allow-list.

**Tool schema missing `required` fields — LLM omits required parameters**  
Why: `required: []` in the JSON Schema input; the LLM treats all parameters as optional and omits critical ones, causing the tool to fail or behave unexpectedly.  
Detect: tool calls arrive with missing parameters; tool errors mention undefined or null required fields.  
Fix: list all non-optional parameters in the `required` array; write the `description` for each required field to make the expectation explicit.

## Connections

- [[agents/langgraph]] — how LangGraph consumes MCP tools via adapters
- [[security/mcp-cves]] — CVE tracker for known MCP vulnerabilities
- [[security/prompt-injection]] — #1 attack vector via tool description poisoning
- [[protocols/a2a]] — Google's agent-to-agent protocol (complements MCP)
- [[ai-tools/claude-code]] — primary host that popularised MCP; plugin system
- [[protocols/tool-design]] — how to write safe, well-designed MCP tool schemas
- [[agents/mcp-server-development]] — building MCP servers in Python with FastMCP

## Open Questions

- Will MCP stabilise at a 1.0 spec in 2026, and will that reduce the current security findings rate?
- How does the MCP Registry plan to handle malicious or poorly-maintained community servers at scale?
- Does `langchain-mcp-adapters` introduce latency overhead that matters for high-frequency agent tool calls?
