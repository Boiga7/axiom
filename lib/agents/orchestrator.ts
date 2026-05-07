import { chat } from "./client.js";
import { MODELS } from "./models.js";
import { rolesMenu } from "./roles.js";
import type { Plan, SubTask } from "./types.js";

const SYSTEM = `You are the Orchestrator agent in a multi-agent system.

Your job: take the user's request and break it into 2-4 focused sub-tasks
that independent worker agents can execute in parallel. Each sub-task should be
self-contained — workers do not see each other's output.

For each sub-task you must pick a role from this menu:
${rolesMenu()}

Return ONLY a JSON object matching this shape, no prose, no markdown fence:
{
  "subTasks": [
    {
      "id": "kebab-case-id",
      "title": "Short title",
      "brief": "One paragraph telling the worker exactly what to do and what to return.",
      "roleId": "researcher" | "critic" | "writer" | "coder"
    }
  ]
}

Rules:
- Sub-tasks must be genuinely independent. If task B needs task A's answer, merge them.
- Briefs are written TO the worker. Be directive ("Investigate X. Return Y.").
- Pick the role that fits each sub-task. Mix roles freely if the request calls for it.
- Prefer 3 sub-tasks. Use 2 only for narrow requests, 4 only for broad ones.`;

export async function plan(topic: string): Promise<Plan> {
  const raw = await chat({
    model: MODELS.orchestrator,
    system: SYSTEM,
    userMessage: `Request: ${topic}`,
    maxTokens: 1024,
  });

  const parsed = JSON.parse(stripFence(raw)) as { subTasks: SubTask[] };
  return { topic, subTasks: parsed.subTasks };
}

function stripFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
}
