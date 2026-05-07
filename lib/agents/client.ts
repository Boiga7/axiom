import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.");
}

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function chat(opts: {
  model: string;
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    system: [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: opts.userMessage }],
  });

  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
