import { chat } from "./client.js";
import { MODELS } from "./models.js";
import { getRole } from "./roles.js";
import type { SubTask, WorkerResult } from "./types.js";

export async function runWorker(task: SubTask): Promise<WorkerResult> {
  const role = getRole(task.roleId);
  const output = await chat({
    model: MODELS.worker,
    system: role.system,
    userMessage: `Sub-task: ${task.title}\n\n${task.brief}`,
    maxTokens: 1024,
  });

  return { task, output };
}
