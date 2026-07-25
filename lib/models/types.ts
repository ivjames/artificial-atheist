// Provider abstraction for every model slot (§3, §7). The rest of the app
// talks to this interface only, so any slot can be swapped to any vendor
// without touching chat, pipeline, or scrub code.

export type ChatRole = "user" | "assistant";

export type ChatTurn = { role: ChatRole; content: string };

export type CompletionRequest = {
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  temperature?: number;
  // Optional per-turn context (e.g. an article reference library). Sent as a
  // separate, NON-cached system segment so it doesn't invalidate the cached
  // static persona prefix.
  context?: string;
};

export type CompletionResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
};

export interface ModelProvider {
  readonly name: string;
  complete(model: string, req: CompletionRequest): Promise<CompletionResult>;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ModelProviderError";
  }
}
