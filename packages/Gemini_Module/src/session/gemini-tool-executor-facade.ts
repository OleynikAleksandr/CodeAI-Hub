import type { Config } from "@google/gemini-cli-core/dist/src/config/config";
import type { GeminiCliModules } from "../runtime/cli-types";
import type {
  CompletedToolCall,
  ToolCallRequestInfo,
} from "../runtime/gemini-cli-compat";
import type { ModuleReporter } from "../types";

// AgentLoopContext shape expected by CoreToolScheduler@0.35.0.
// We assemble it from Config deprecated getters (the only way in bridge mode).
interface AgentLoopContextLike {
  readonly config: Config;
  readonly geminiClient: unknown;
  readonly messageBus: unknown;
  readonly promptId: string;
  readonly sandboxManager: unknown;
  readonly toolRegistry: unknown;
}

// CoreToolScheduler constructor options as of @google/gemini-cli-core@0.35.0.
interface SchedulerOptions {
  readonly context: AgentLoopContextLike;
  readonly getPreferredEditor: () => undefined;
  readonly onAllToolCallsComplete?: (
    completedToolCalls: readonly CompletedToolCall[]
  ) => void | Promise<void>;
}

interface SchedulerInstance {
  schedule(
    request: ToolCallRequestInfo | readonly ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<void>;
}

type SchedulerConstructor035 = new (
  options: SchedulerOptions
) => SchedulerInstance;

export class GeminiToolExecutorFacade {
  private readonly modules: GeminiCliModules;

  constructor(modules: GeminiCliModules, _reporter?: ModuleReporter) {
    this.modules = modules;
  }

  async execute(
    config: Config,
    request: ToolCallRequestInfo,
    signal: AbortSignal
  ): Promise<CompletedToolCall> {
    return await this.executeWithScheduler(config, request, signal);
  }

  private buildAgentLoopContext(
    config: Config,
    request: ToolCallRequestInfo
  ): AgentLoopContextLike {
    // Config@0.35.0 exposes deprecated getters for these fields.
    // In bridge mode this is the only way to assemble AgentLoopContext.
    const configAny = config as unknown as Record<string, unknown>;
    return {
      config,
      promptId:
        request.prompt_id ??
        (configAny.promptId as string | undefined) ??
        "unknown",
      toolRegistry: configAny.toolRegistry,
      messageBus: configAny.messageBus,
      geminiClient: configAny.geminiClient,
      sandboxManager: configAny.sandboxManager,
    };
  }

  private async executeWithScheduler(
    config: Config,
    request: ToolCallRequestInfo,
    signal: AbortSignal
  ): Promise<CompletedToolCall> {
    const Scheduler = this.modules.toolScheduler
      .CoreToolScheduler as unknown as SchedulerConstructor035;
    const context = this.buildAgentLoopContext(config, request);

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
        context,
        getPreferredEditor: () => {
          // Bridge does not provide a preferred editor
          return;
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
                "Gemini scheduler completed without a tool-call result."
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
