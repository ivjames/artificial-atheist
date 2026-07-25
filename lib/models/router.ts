import { models, type SlotName } from "@/lib/config";
import { anthropicProvider } from "./anthropic";
import { mistralProvider } from "./mistral";
import type {
  CompletionRequest,
  CompletionResult,
  ModelProvider,
} from "./types";
import { ModelProviderError } from "./types";

// The registry of available providers. Add a vendor here (implementing
// ModelProvider) and it becomes selectable by any slot via env — no other
// code changes (§7).
const providers: Record<string, ModelProvider> = {
  anthropic: anthropicProvider,
  mistral: mistralProvider,
};

export function providerFor(name: string): ModelProvider {
  const p = providers[name];
  if (!p) {
    throw new ModelProviderError(`Unknown model provider "${name}"`, name);
  }
  return p;
}

// Resolve a slot to its configured (provider, model) and run the completion.
// Callers pass a logical slot ("standard" | "premium" | "writer" | "scrub");
// the concrete model is a deployment/config concern, kept out of app code.
export async function callSlot(
  slot: SlotName,
  req: CompletionRequest,
): Promise<CompletionResult> {
  const cfg = models[slot];
  return providerFor(cfg.provider).complete(cfg.model, req);
}

export function modelForSlot(slot: SlotName): { provider: string; model: string } {
  return { ...models[slot] };
}

export type { CompletionRequest, CompletionResult };
