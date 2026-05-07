import { chat } from "./client.js";
import { MODELS } from "./models.js";
import type { WorkerResult } from "./types.js";

const SYSTEM = `You are the Synthesiser agent in a multi-agent system.

You receive the original request plus the outputs of several Worker agents,
each of whom executed one sub-task in isolation. Compose a single coherent answer.

Rules:
- Address the original request directly. Don't restate sub-tasks.
- Reconcile contradictions between workers. If they disagree, say so and pick a side
  with reasoning, or note that the question is genuinely contested.
- Drop filler. If a worker's output didn't add anything, leave it out.
- Markdown output, ~400-700 words. Lead with a 2-3 sentence summary, then details.`;

export async function synthesise(topic: string, results: WorkerResult[]): Promise<string> {
  const workerSection = results
    .map((r, i) => `## Worker ${i + 1} (${r.task.roleId}): ${r.task.title}\n\n${r.output}`)
    .join("\n\n---\n\n");

  return chat({
    model: MODELS.synthesiser,
    system: SYSTEM,
    userMessage: `Original request: ${topic}\n\n# Worker outputs\n\n${workerSection}`,
    maxTokens: 2048,
  });
}
