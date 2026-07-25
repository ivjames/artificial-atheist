import type {
  CompletionRequest,
  CompletionResult,
  ModelProvider,
} from "./types";
import { ModelProviderError } from "./types";

// Mistral-backed provider (the documented EU-jurisdiction alternative to Haiku
// for Slot A, §3/§6). Called over the OpenAI-compatible chat/completions REST
// endpoint to avoid an extra SDK dependency. Selected per slot via env
// (MODEL_STANDARD_PROVIDER=mistral, MODEL_STANDARD=mistral-large-latest).
const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

export const mistralProvider: ModelProvider = {
  name: "mistral",
  async complete(
    model: string,
    req: CompletionRequest,
  ): Promise<CompletionResult> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new ModelProviderError("MISTRAL_API_KEY is not set", "mistral");
    }

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens,
          temperature: req.temperature ?? 0.7,
          messages: [
            { role: "system", content: req.system },
            ...req.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
    } catch (err) {
      throw new ModelProviderError(
        `Mistral request failed: ${(err as Error).message}`,
        "mistral",
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ModelProviderError(
        `Mistral returned ${res.status}: ${body.slice(0, 300)}`,
        "mistral",
        res.status,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      text: (data.choices?.[0]?.message?.content ?? "").trim(),
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      model,
      provider: "mistral",
    };
  },
};
