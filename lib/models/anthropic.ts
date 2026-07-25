import Anthropic from "@anthropic-ai/sdk";
import type {
  CompletionRequest,
  CompletionResult,
  ModelProvider,
} from "./types";
import { ModelProviderError } from "./types";

// Anthropic-backed provider (Slot A standard/premium, Slot B writer, Slot C
// scrub — whichever slots are configured to it). The static system prompt is
// sent with a cache_control breakpoint so a cache HIT bills the persona at the
// discounted rate (§8/§10). The growing message history is not cached here —
// its short TTL makes it unreliable across a slow debate (§8).
//
// CAVEAT: the breakpoint only actually caches when the prefix exceeds the
// model's minimum cacheable length — 1024 tokens on Sonnet, 4096 on Haiku 4.5
// (the standard slot). Below that it's a no-op (no error; usage.cache_read_
// input_tokens stays 0). The current personas are ~700 tokens, so nothing
// caches today (see lib/agent/persona.ts). The marker is harmless and starts
// paying off automatically once a system prompt here grows past the minimum.
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ModelProviderError(
      "ANTHROPIC_API_KEY is not set",
      "anthropic",
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

export const anthropicProvider: ModelProvider = {
  name: "anthropic",
  async complete(
    model: string,
    req: CompletionRequest,
  ): Promise<CompletionResult> {
    try {
      const res = await getClient().messages.create({
        model,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0.7,
        system: [
          {
            type: "text",
            text: req.system,
            cache_control: { type: "ephemeral" },
          },
          // Per-turn context (e.g. article references) as a second, un-cached
          // block, so the static persona above still gets a cache hit.
          ...(req.context
            ? [{ type: "text" as const, text: req.context }]
            : []),
        ],
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      // Cached + uncached input both count as billable input for metering.
      const usage = res.usage;
      const inputTokens =
        usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0);

      return {
        text,
        inputTokens,
        outputTokens: usage.output_tokens,
        model,
        provider: "anthropic",
      };
    } catch (err) {
      if (err instanceof ModelProviderError) throw err;
      const status =
        err instanceof Anthropic.APIError ? err.status : undefined;
      throw new ModelProviderError(
        `Anthropic request failed: ${(err as Error).message}`,
        "anthropic",
        status,
      );
    }
  },
};
