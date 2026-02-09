import type { Config } from "@google/gemini-cli-core/dist/src/config/config";
import type { CompletedToolCall } from "@google/gemini-cli-core/dist/src/core/coreToolScheduler";
import type { ToolCallRequestInfo } from "@google/gemini-cli-core/dist/src/core/turn";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { ModuleReporter } from "../types";

type SchedulerConstructor = new (options: {
  readonly config: Config;
  readonly getPreferredEditor: () => void;
  readonly onEditorClose: () => void;
  readonly onAllToolCallsComplete: (
    completedToolCalls: readonly CompletedToolCall[]
  ) => void | Promise<void>;
}) => {
  schedule(
    request: ToolCallRequestInfo | readonly ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<void>;
};

export class GeminiToolExecutorFacade {
  private readonly modules: GeminiCliModules;
  private readonly reporter?: ModuleReporter;

  constructor(modules: GeminiCliModules, reporter?: ModuleReporter) {
    this.modules = modules;
    this.reporter = reporter;
  }

  async execute(
    config: Config,
    request: ToolCallRequestInfo,
    signal: AbortSignal
  ): Promise<CompletedToolCall> {
    const legacyExecutor = this.modules.toolExecutor;
    if (legacyExecutor?.executeToolCall) {
      return await legacyExecutor.executeToolCall(config, request, signal);
    }
    this.reporter?.warn?.(
      "Gemini tool executor switched to scheduler fallback backend",
      { callId: request.callId, tool: request.name }
    );
    return await this.executeWithSchedulerFallback(config, request, signal);
  }

  private async executeWithSchedulerFallback(
    config: Config,
    request: ToolCallRequestInfo,
    signal: AbortSignal
  ): Promise<CompletedToolCall> {
    const Scheduler = this.modules.toolScheduler
      .CoreToolScheduler as unknown as SchedulerConstructor;
    return await new Promise<CompletedToolCall>((resolve, reject) => {
      let settled = false;
      const settleError = (error: unknown): void => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const scheduler = new Scheduler({
        config,
        getPreferredEditor: () => {
          /* Gemini bridge does not provide a preferred editor */
        },
        onEditorClose: () => {
          /* noop */
        },
        onAllToolCallsComplete: (
          completedToolCalls: readonly CompletedToolCall[]
        ) => {
          if (settled) {
            return;
          }
          const first = completedToolCalls.at(0);
          if (!first) {
            settleError(
              new Error(
                "Gemini scheduler fallback completed without a tool-call result."
              )
            );
            return;
          }
          settled = true;
          resolve(first);
        },
      });

      scheduler.schedule(request, signal).catch(settleError);
    });
  }
}
