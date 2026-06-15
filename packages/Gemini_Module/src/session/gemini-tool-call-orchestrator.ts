import type { Part } from "@google/genai";
import type {
  CompletedToolCall,
  ToolCallRequestInfo,
} from "../runtime/gemini-cli-compat";
import type { GeminiSessionEvent } from "../types";
import type { GeminiToolExecutorFacade } from "./gemini-tool-executor-facade";
import type { ActiveSession } from "./types";

export interface ToolExecutionOutcome {
  readonly completedCalls: CompletedToolCall[];
  readonly events: GeminiSessionEvent[];
  readonly parts: Part[];
}

export class GeminiToolCallOrchestrator {
  private readonly toolExecutorFacade: GeminiToolExecutorFacade;

  constructor(toolExecutorFacade: GeminiToolExecutorFacade) {
    this.toolExecutorFacade = toolExecutorFacade;
  }

  async execute(
    session: ActiveSession,
    requests: readonly ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<ToolExecutionOutcome> {
    const events: GeminiSessionEvent[] = [];
    const responseParts: Part[] = [];
    const completedCalls: CompletedToolCall[] = [];

    for (const request of requests) {
      events.push({
        type: "system",
        provider: "gemini",
        content: `Executing tool "${request.name}" (call ${request.callId}).`,
        data: {
          callId: request.callId,
          tool: request.name,
          args: request.args,
        },
      });

      try {
        const completedCall = await this.toolExecutorFacade.execute(
          session.config,
          request,
          signal
        );
        completedCalls.push(completedCall);

        const toolResponse = completedCall.response;
        if (Array.isArray(toolResponse?.responseParts)) {
          responseParts.push(...toolResponse.responseParts);
        } else if (typeof toolResponse?.resultDisplay === "string") {
          responseParts.push({ text: toolResponse.resultDisplay });
        }

        events.push({
          type: "system",
          provider: "gemini",
          content: toolResponse?.error
            ? `Tool "${request.name}" returned an error.`
            : `Tool "${request.name}" completed successfully.`,
          data: {
            callId: request.callId,
            status: completedCall.status,
            error: toolResponse?.error,
          },
        });
      } catch (error) {
        events.push({
          type: "error",
          provider: "gemini",
          content: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      parts: responseParts,
      events,
      completedCalls,
    };
  }
}
