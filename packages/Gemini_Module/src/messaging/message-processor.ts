import type {
  ServerGeminiStreamEvent,
  ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn";
import type { UsageMetadata } from "@google/genai";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ActiveSession } from "../session/types";
import type { GeminiSessionEvent, ModuleReporter } from "../types";
import {
  GeminiAssistantEventNormalizer,
  type TurnAccumulator,
} from "./gemini-assistant-event-normalizer";
import { GeminiStreamEventRouter } from "./gemini-stream-event-router";
import { GeminiSystemEventNormalizer } from "./gemini-system-event-normalizer";
import type { ThoughtTranslatorService } from "./thought-translator-service";

interface HandleEventOutcome {
  readonly events: readonly GeminiSessionEvent[];
}

interface GeminiMessageProcessorOptions {
  readonly modules: GeminiCliModules;
  readonly reporter?: ModuleReporter;
  readonly thoughtTranslator?: ThoughtTranslatorService;
}

export { formatGeminiStreamErrorMessage } from "./gemini-stream-error";

export class GeminiMessageProcessor {
  private readonly assistantNormalizer: GeminiAssistantEventNormalizer;
  private readonly router: GeminiStreamEventRouter;

  constructor(options: GeminiMessageProcessorOptions) {
    this.assistantNormalizer = new GeminiAssistantEventNormalizer(
      options.thoughtTranslator
    );
    this.router = new GeminiStreamEventRouter({
      modules: options.modules,
      reporter: options.reporter,
      assistantNormalizer: this.assistantNormalizer,
      systemNormalizer: new GeminiSystemEventNormalizer(),
    });
  }

  createAccumulator(promptId: string): TurnAccumulator {
    return this.assistantNormalizer.createAccumulator(promptId);
  }

  handleEvent(
    session: ActiveSession,
    event: ServerGeminiStreamEvent,
    accumulator: TurnAccumulator
  ): HandleEventOutcome {
    session.logger?.logRawEvent(event);
    return {
      events: this.router.handleEvent(session, event, accumulator),
    };
  }

  finalize(accumulator: TurnAccumulator): {
    readonly responseText: string;
    readonly citations: readonly string[];
    readonly usage?: UsageMetadata;
    readonly toolRequests: readonly ToolCallRequestInfo[];
  } {
    return this.assistantNormalizer.finalize(accumulator);
  }
}
