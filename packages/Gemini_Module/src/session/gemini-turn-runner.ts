import type {
  ServerGeminiStreamEvent,
  ToolCallRequestInfo,
} from "@google/gemini-cli-core/dist/src/core/turn";
import type { Part, UsageMetadata } from "@google/genai";
import { GeminiMessageProcessor } from "../messaging/message-processor";
import type { ThoughtTranslatorService } from "../messaging/thought-translator-service";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { GeminiSessionEvent, ModuleReporter } from "../types";
import { GeminiSessionLifecycle } from "./gemini-session-lifecycle";
import type {
  GeminiToolCallOrchestrator,
  ToolExecutionOutcome,
} from "./gemini-tool-call-orchestrator";
import type { ActiveSession } from "./types";

const MAX_TOOL_CALL_CHAIN_DEPTH = 8;
const TOOL_RESPONSE_FALLBACK =
  "Gemini tool execution completed without response parts.";

interface GeminiTurnResult {
  readonly assistantSegmentsEmitted: number;
  readonly citations: readonly string[];
  readonly responseText: string;
  readonly toolRequests: readonly ToolCallRequestInfo[];
  readonly usage?: UsageMetadata;
}

export interface ConversationResult {
  readonly assistantSegmentsEmitted: number;
  readonly citations: readonly string[];
  readonly depthExceeded: boolean;
  readonly text: string;
  readonly usage?: UsageMetadata;
}

export interface ProcessTurnContext {
  readonly depth: number;
  readonly parts: Part[];
  readonly promptId: string;
  readonly session: ActiveSession;
  readonly signal: AbortSignal;
}

interface GeminiTurnRunnerOptions {
  readonly emitEvents: (
    session: ActiveSession,
    events: readonly GeminiSessionEvent[]
  ) => void;
  readonly modules: GeminiCliModules;
  readonly reporter?: ModuleReporter;
  readonly thoughtTranslator: ThoughtTranslatorService;
  readonly toolCallOrchestrator: GeminiToolCallOrchestrator;
}

export class GeminiTurnRunner {
  private readonly emitEventsCallback: GeminiTurnRunnerOptions["emitEvents"];
  private readonly modules: GeminiCliModules;
  private readonly reporter?: ModuleReporter;
  private readonly sessionLifecycle = new GeminiSessionLifecycle();
  private readonly thoughtTranslator: ThoughtTranslatorService;
  private readonly toolCallOrchestrator: GeminiToolCallOrchestrator;

  constructor(options: GeminiTurnRunnerOptions) {
    this.emitEventsCallback = options.emitEvents;
    this.modules = options.modules;
    this.reporter = options.reporter;
    this.thoughtTranslator = options.thoughtTranslator;
    this.toolCallOrchestrator = options.toolCallOrchestrator;
  }

  async processTurns(context: ProcessTurnContext): Promise<ConversationResult> {
    const { session, parts, promptId, signal, depth } = context;
    if (depth >= MAX_TOOL_CALL_CHAIN_DEPTH) {
      return {
        text: "",
        citations: [],
        usage: undefined,
        depthExceeded: true,
        assistantSegmentsEmitted: 0,
      };
    }

    const turnResult = await this.runTurn(session, parts, promptId, signal);
    let responseText = turnResult.responseText;
    let citations = [...turnResult.citations];
    let usage = turnResult.usage;
    let depthExceeded = false;
    let assistantSegmentsEmitted = turnResult.assistantSegmentsEmitted;

    if (turnResult.toolRequests.length === 0) {
      return {
        text: responseText,
        citations,
        usage,
        depthExceeded,
        assistantSegmentsEmitted,
      };
    }

    const outcome = await this.toolCallOrchestrator.execute(
      session,
      turnResult.toolRequests,
      signal
    );
    this.emitEventsCallback(session, outcome.events);
    this.recordCompletedToolCalls(session, outcome);

    const nextParts =
      outcome.parts.length > 0
        ? outcome.parts
        : [
            {
              text: TOOL_RESPONSE_FALLBACK,
            },
          ];

    const nested = await this.processTurns({
      session,
      parts: nextParts,
      promptId,
      signal,
      depth: depth + 1,
    });

    responseText += nested.text;
    citations = citations.concat(nested.citations);
    usage = nested.usage ?? usage;
    depthExceeded = nested.depthExceeded;
    assistantSegmentsEmitted += nested.assistantSegmentsEmitted;

    return {
      text: responseText,
      citations,
      usage,
      depthExceeded,
      assistantSegmentsEmitted,
    };
  }

  private recordCompletedToolCalls(
    session: ActiveSession,
    outcome: ToolExecutionOutcome
  ): void {
    try {
      const model =
        session.client.getCurrentSequenceModel() ?? session.config.getModel();
      session.client
        .getChat()
        .recordCompletedToolCalls(model, outcome.completedCalls);
    } catch (error) {
      session.reporter?.warn?.("Failed to record Gemini tool calls", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async runTurn(
    session: ActiveSession,
    parts: readonly Part[],
    promptId: string,
    signal: AbortSignal
  ): Promise<GeminiTurnResult> {
    const messageProcessor = new GeminiMessageProcessor({
      reporter: this.reporter ?? session.reporter,
      modules: this.modules,
      thoughtTranslator: this.thoughtTranslator,
    });
    const accumulator = messageProcessor.createAccumulator(promptId);
    let assistantSegmentsEmitted = 0;
    const countAssistantSegment = (payload: unknown): void => {
      if (
        payload &&
        typeof payload === "object" &&
        (payload as { type?: string }).type === "dialog_message" &&
        (payload as { role?: string }).role === "assistant" &&
        (payload as { tag?: string }).tag !== "thinking"
      ) {
        assistantSegmentsEmitted += 1;
      }
    };
    session.eventEmitter.on("message", countAssistantSegment);

    const stream = session.client.sendMessageStream(
      Array.from(parts) as Part[],
      signal,
      promptId
    );
    const stalledTurnWatchdog = this.sessionLifecycle.createStalledTurnWatchdog(
      session,
      promptId
    );
    const iterator = (stream as AsyncIterable<ServerGeminiStreamEvent>)[
      Symbol.asyncIterator
    ]();

    try {
      while (true) {
        const next = await stalledTurnWatchdog.waitForNext(iterator.next());
        if (next.done) {
          break;
        }
        const resetFn = (session as unknown as Record<string, unknown>)
          .resetWatchdog as (() => void) | undefined;
        resetFn?.();
        const outcome = messageProcessor.handleEvent(
          session,
          next.value,
          accumulator
        );
        this.emitEventsCallback(session, outcome.events);
      }
    } finally {
      stalledTurnWatchdog.clear();
      session.eventEmitter.off("message", countAssistantSegment);
    }

    return {
      ...messageProcessor.finalize(accumulator),
      assistantSegmentsEmitted,
    };
  }
}
