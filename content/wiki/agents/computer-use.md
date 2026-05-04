---
type: concept
category: agents
para: resource
tags: [computer-use, agents, automation, anthropic, gui-automation, screenshot, tool-use]
sources: []
updated: 2026-05-04
tldr: "Computer Use lets Claude control a computer by observing screenshots and issuing mouse/keyboard actions in a tight loop — use only when structured APIs are unavailable, always inside a sandbox container."
---

# Computer Use

> **TL;DR** Computer Use lets Claude control a computer by observing screenshots and issuing mouse/keyboard actions in a tight loop — use only when structured APIs are unavailable, always inside a sandbox container.

Computer Use is an Anthropic-native capability that gives Claude models direct control over a graphical desktop. Rather than calling a structured API, the model perceives state through screenshots and emits low-level GUI actions. It is the most general form of [[agents/react-pattern|ReAct]] loop: the "observation" is always a screenshot, and the "action" is always a pointer or keyboard event.

---

## The Agent Loop

```
screenshot → model → action → execute → screenshot → …
```

1. **Capture** — the host process takes a screenshot of the virtual display and encodes it as a base64 image.
2. **Reason** — the screenshot is sent to Claude (via [[apis/anthropic-api|Anthropic Messages API]]) together with the conversation history and tool definition. Claude returns a `tool_use` block naming the next action.
3. **Execute** — the host maps the action to real OS calls (xdotool, PyAutoGUI, xte, or equivalent).
4. **Observe** — after execution, a fresh screenshot is taken and appended to the conversation as a `tool_result` image.
5. **Repeat** until Claude returns a plain `text` response with no further tool calls, or a hard iteration cap is reached.

The loop is stateless between turns — all context lives in the growing message list. This makes the conversation history the agent's working memory and means cost compounds with loop depth.

---

## Tool Schema — `computer_20251124`

The current stable tool version requires the beta header `computer-use-2025-11-24`.

```python
{
    "type": "computer_20251124",
    "name": "computer",
    "display_width_px": 1024,
    "display_height_px": 768,
    "display_number": 1,       # optional — X display index
    "enable_zoom": True        # enable zoom action (see below)
}
```

### Action types

| Action | Required fields | Notes |
|---|---|---|
| `screenshot` | — | Returns a base64 PNG of the current display |
| `mouse_move` | `coordinate: [x, y]` | Moves cursor without clicking |
| `left_click` | `coordinate: [x, y]` | Single left click |
| `right_click` | `coordinate: [x, y]` | Context-menu click |
| `middle_click` | `coordinate: [x, y]` | Middle click |
| `double_click` | `coordinate: [x, y]` | Double-click |
| `left_click_drag` | `start_coordinate`, `coordinate` | Click-and-drag |
| `left_mouse_down` | `coordinate: [x, y]` | Press without release |
| `left_mouse_up` | `coordinate: [x, y]` | Release held button |
| `type` | `text: str` | Types a string character by character |
| `key` | `text: str` | Sends a key sequence e.g. `"ctrl+c"` |
| `hold_key` | `text`, `duration` | Holds a key for N seconds |
| `triple_click` | `coordinate: [x, y]` | Selects a word/line |
| `scroll` | `coordinate`, `direction`, `amount` | `direction` ∈ {up, down, left, right} |
| `wait` | `duration` | Pauses the loop (avoid; prefer polling) |
| `zoom` | `region: [x1, y1, x2, y2]` | Returns that region at full resolution — requires `enable_zoom: True` |

**Version history:**
- `computer_20241022` — initial GA release; screenshot + basic mouse/keyboard
- `computer_20250124` — added scroll, hold_key, left_mouse_down/up, triple_click, wait
- `computer_20251124` — added zoom; available on Claude Opus 4.7/4.6, Sonnet 4.6, Opus 4.5

### Coordinate system

Coordinates are pixel positions `[x, y]` relative to the top-left corner of the virtual display, matching `display_width_px` × `display_height_px`. If the declared dimensions do not match the actual screenshot dimensions, misclicks are almost guaranteed.

### Beta header

```python
client.messages.create(
    model="claude-opus-4-5-20251101",
    betas=["computer-use-2025-11-24"],
    tools=[{
        "type": "computer_20251124",
        "name": "computer",
        "display_width_px": 1024,
        "display_height_px": 768,
        "enable_zoom": True
    }],
    ...
)
```

The beta header adds ~466–499 tokens to the effective system prompt automatically.

---

## Screenshot Resolution Tuning

Resolution is the primary cost and accuracy lever:

| Resolution | Tokens/screenshot | Use case |
|---|---|---|
| 1024 × 768 (XGA) | ~1,300–1,500 | Recommended default — accuracy/cost sweet spot |
| 1280 × 800 (WXGA) | ~1,800–2,200 | Larger UI elements that need more space |
| 1920 × 1080 (FHD) | ~3,500–4,500+ | Avoid — high latency, coordinate mismatch risk |

**Rules:**
- Set `display_width_px` and `display_height_px` in the tool definition to exactly match the virtual display resolution. Any mismatch causes proportional coordinate errors.
- Use 1024 × 768 unless the target application requires a wider viewport.
- The `zoom` action (v20251124) lets the model inspect a region at full resolution without permanently raising the display size — use it for reading small text or checking alignment.
- Images exceeding 2000 px on either axis are rejected by the API with a 413 error.

---

## Containerisation — Why and How

**Never run Computer Use against your host desktop.** Claude issues low-level OS actions. A misunderstood task, a prompt injection from a malicious web page, or a model error can delete files, exfiltrate credentials, or install software. The isolation boundary must be enforced at the OS level, not in the prompt.

**Minimum viable sandbox:**

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    xvfb x11vnc fluxbox python3 xdotool

ENV DISPLAY=:1
ENTRYPOINT ["Xvfb", ":1", "-screen", "0", "1024x768x24", "&"]
```

Key isolation controls:

| Control | Implementation |
|---|---|
| Virtual display | Xvfb (headless X11) — no framebuffer on host |
| Network egress | `--network` policy or firewall rules inside container |
| Filesystem | Read-only bind mounts; ephemeral container root |
| Process scope | Drop capabilities; run as non-root |
| Resource limits | `--cpus`, `--memory` cgroup limits |
| Secrets | Never put API keys in screenshots or the display; inject via env vars only |

Anthropic's reference implementation in `anthropics/claude-quickstarts` ships Docker Compose with Xvfb, a VNC server for human observation, and a hard iteration cap on the loop. Start there.

**Persistent vs ephemeral containers:** For long-running proactive agents, keep container instances alive across tasks. For short user-triggered tasks, spin up a fresh container per session to limit blast radius.

---

## Anthropic's Recommended Patterns

### System prompt structure

```
<SYSTEM_CAPABILITY>
* You are operating a virtual Ubuntu desktop via screenshot + action loop.
* Display: 1024x768. Coordinates are [x, y] from top-left.
* Actions take time; check the result with a screenshot before proceeding.
* If you reach a dead end or something unexpected appears, pause and report.
</SYSTEM_CAPABILITY>

<TASK>
{{user_task}}
</TASK>

<IMPORTANT>
* Prefer keyboard shortcuts over clicking where possible (faster, less error-prone).
* Never type credentials visible on screen — request them via the task description.
* If a confirmation dialog appears for an irreversible action, pause and verify with the user.
</IMPORTANT>
```

### Action confirmation for irreversible operations

For destructive or high-stakes actions (file deletion, form submission, purchases), inject a human-in-the-loop gate before execution:

```python
if action["action"] in IRREVERSIBLE_ACTIONS:
    confirmed = await ask_human(f"Claude wants to: {action}")
    if not confirmed:
        return tool_result("Action cancelled by user.")
```

### Loop termination

Without a hard cap, a confused model loops forever consuming tokens. Implement both:

1. **Iteration limit** — abort after N rounds (Anthropic's demo uses 100).
2. **No-progress detection** — if the last 3 screenshots are identical and Claude keeps issuing the same action, break and return an error.
3. **Token budget** — track cumulative `input_tokens + output_tokens`; halt when the budget is exhausted.

```python
MAX_ITERATIONS = 50
STALL_WINDOW = 3

for i in range(MAX_ITERATIONS):
    response = client.messages.create(...)
    if response.stop_reason == "end_turn":
        break
    # detect stall: compare screenshot hashes
    if detect_stall(screenshot_history[-STALL_WINDOW:]):
        raise AgentStallError("No progress detected")
```

---

## Common Failure Modes

| Failure | Root cause | Fix |
|---|---|---|
| Misclicks (off by N pixels) | `display_width_px`/`display_height_px` declared != actual screenshot dims | Verify the Xvfb geometry matches the tool definition exactly |
| Resolution coordinate drift | High-DPI scaling applied at OS level doubles logical coordinates | Set `GDK_SCALE=1`, `QT_SCALE_FACTOR=1` in container env |
| Infinite loop | Model retries a failing action without exit condition | Hard iteration cap + stall detection on screenshot hashes |
| Fragile UI selectors | Pixel coordinates break when fonts/themes change | Use the `zoom` action to inspect regions; prefer keyboard shortcuts |
| Prompt injection | Malicious content on screen manipulates the model | Render untrusted content in a separate process; output filtering on tool calls |
| Token explosion | Long sessions accumulate full screenshot history | Truncate old screenshots from context; keep only the last N images |
| Credential leakage | API keys rendered on screen end up in screenshot history | Never display secrets on the virtual desktop |

---

## Computer Use vs. Tool Calling

Computer Use is the option of last resort. The decision order:

```
1. Does a structured API exist? → use tool calling ([[protocols/tool-design]])
2. Can you write a script/CLI? → call the script as a tool
3. Is the app browser-based? → consider Playwright via MCP ([[test-automation/playwright]])
4. No programmatic interface exists? → Computer Use
```

**Why tool calling is better when available:**

- Deterministic — no coordinate guessing, no screenshot parsing
- Cheaper — tool calls cost a fraction of a screenshot loop
- Faster — no round-trip through image encoding/decoding
- Testable — structured outputs are mockable; screenshots are not

Computer Use earns its place for legacy desktop apps, admin UIs with no API, and cross-app workflows that span applications with no common interface.

---

## OpenAI CUA Comparison

OpenAI ships a Computer Using Agent (CUA) built on GPT-4o (and latterly GPT-5):

| Dimension | Anthropic Computer Use | OpenAI CUA |
|---|---|---|
| Scope | Full desktop (any OS GUI) | Browser-focused (Operator) |
| Interface | screenshot + action tools via Messages API | Integrated into Responses API + Operator product |
| Benchmark | OSWorld-Verified 78% (Opus 4.7) | OSWorld-Verified 78.7% (GPT-5.5) |
| Deployment | Self-hosted container required | Operator is a hosted product; API available separately |
| Sandboxing | User-managed Docker | OpenAI manages isolation for Operator |
| Zoom action | Yes (`computer_20251124`) | No equivalent published |

On CUB (Computer Use Benchmark — complex multi-step workflows), both systems score in single digits (below 10.4%), illustrating that multi-step GUI automation at production scale is still an unsolved problem for all current models.

---

## Connections

- [[agents/react-pattern]] — Computer Use is a direct instantiation of the ReAct loop with screenshots as observations
- [[protocols/tool-design]] — structured tool calling is the preferred alternative before falling back to Computer Use
- [[security/prompt-injection]] — on-screen content is the primary indirect injection surface for Computer Use agents
- [[test-automation/playwright]] — lower-cost browser automation to prefer over Computer Use when possible
- [[multimodal/vision]] — the vision capability that Computer Use depends on for perceiving state
- [[infra/deployment]] — Docker containerisation patterns required for safe agent hosting

## Open Questions

- At what point does the OSWorld benchmark score translate to reliable production use — and what task types remain out of reach for current models?
- What is the most practical strategy for handling multi-monitor or high-DPI displays without coordinate drift?
- How should teams scope the blast radius when a Computer Use agent encounters a prompt injection mid-task?

## Integration Points

- [[apis/anthropic-api]] — Messages API, beta headers, streaming tool use
- [[agents/react-pattern]] — foundational Thought/Action/Observation loop that Computer Use instantiates
- [[agents/practical-agent-design]] — when to use Computer Use vs single-agent vs multi-agent patterns
- [[protocols/tool-design]] — design structured tools before falling back to Computer Use
- [[security/owasp-llm-top10]] — excessive agency (A09), prompt injection via rendered content
- [[security/prompt-injection]] — indirect injection through on-screen content is the primary attack surface
- [[test-automation/playwright]] — prefer Playwright for browser automation; lower cost, more reliable
- [[multimodal/vision]] — the vision capability Computer Use depends on
- [[infra/deployment]] — Docker containerisation patterns for agent hosting
