import { findClaudeModelCapabilities } from "@codeai-hub/claude-module";
import { buildProviderEffectiveModelId } from "../../config/provider-turn-config-resolver";
import type { SessionManager } from "../../session-manager";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import type {
  ClaudeModelSwitchRequestPayload,
  ClaudeModelSwitchThinkingEffort,
} from "../session-stream-contracts";
import type { BridgeEvent } from "../types";
import type {
  ProviderModelSwitchStrategy,
  SessionModelSwitchContext,
  SessionModelSwitchTarget,
  SessionModelSwitchValidationResult,
} from "./session-request-handler-types";

interface SessionRequestHandlerClaudeModelSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CLAUDE_PROVIDER_ID = "claudeCodeCli";

type ClaudeModelSwitchTarget =
  SessionModelSwitchTarget<ClaudeModelSwitchThinkingEffort>;

const hasThinkingEffort = (
  options: readonly string[],
  value: string | undefined
): value is ClaudeModelSwitchThinkingEffort =>
  typeof value === "string" && options.includes(value);

const resolveTargetThinkingEffort = (
  context: SessionModelSwitchContext,
  target: ClaudeModelSwitchTarget
): ClaudeModelSwitchThinkingEffort | undefined => {
  if (target.thinkingEnabled !== true) {
    return undefined;
  }
  const capabilities = findClaudeModelCapabilities(target.targetModelId);
  const options = capabilities?.thinkingEffortOptions ?? [];
  if (target.targetReasoningEffort) {
    return target.targetReasoningEffort;
  }
  if (hasThinkingEffort(options, context.previousBinding?.reasoningEffort)) {
    return context.previousBinding.reasoningEffort;
  }
  return capabilities?.defaultThinkingEffort;
};

const buildSwitchBindingKey = (
  target: ClaudeModelSwitchTarget,
  context: SessionModelSwitchContext
): string =>
  context.previousBinding?.key ??
  buildSessionModelBindingKey({
    providerId: target.providerId,
    sessionId: context.sessionId,
    workspacePath: context.workspacePath,
  });

class ClaudeModelSwitchStrategy
  implements ProviderModelSwitchStrategy<ClaudeModelSwitchThinkingEffort>
{
  readonly providerId = CLAUDE_PROVIDER_ID;

  buildModelBinding(
    target: ClaudeModelSwitchTarget,
    context: SessionModelSwitchContext
  ): SessionModelBinding {
    const reasoningEffort = resolveTargetThinkingEffort(context, target);
    const now = new Date().toISOString();
    return {
      key: buildSwitchBindingKey(target, context),
      providerId: CLAUDE_PROVIDER_ID,
      baseModelId: target.targetModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CLAUDE_PROVIDER_ID,
          baseModelId: target.targetModelId,
          reasoningEffort,
          thinkingEnabled: target.thinkingEnabled === true,
        }) ?? target.targetModelId,
      reasoningEffort,
      thinkingEnabled: target.thinkingEnabled === true,
      source: "switch_request",
      boundAt: context.previousBinding?.boundAt ?? now,
      updatedAt: now,
    };
  }

  validateTarget(
    target: ClaudeModelSwitchTarget
  ): SessionModelSwitchValidationResult {
    const capabilities = findClaudeModelCapabilities(target.targetModelId);
    if (!capabilities) {
      return { ok: false, reason: "unknown_claude_model" };
    }
    if (
      target.thinkingEnabled === true &&
      target.targetReasoningEffort &&
      !capabilities.thinkingEffortOptions.includes(target.targetReasoningEffort)
    ) {
      return { ok: false, reason: "unsupported_claude_thinking_effort" };
    }
    return { ok: true };
  }
}

export class SessionRequestHandlerClaudeModelSwitch {
  readonly #deps: SessionRequestHandlerClaudeModelSwitchOptions;
  readonly #strategy = new ClaudeModelSwitchStrategy();

  constructor(options: SessionRequestHandlerClaudeModelSwitchOptions) {
    this.#deps = options;
  }

  handle(payload: ClaudeModelSwitchRequestPayload): void {
    const session = this.#deps.sessionManager.getSession(payload.sessionId);
    if (!session) {
      this.#deps.logger.warn("Claude model switch: session not found", {
        sessionId: payload.sessionId,
      });
      return;
    }
    if (session.providerId !== CLAUDE_PROVIDER_ID) {
      this.#deps.logger.warn(
        "Claude model switch: non-Claude session ignored",
        {
          providerId: session.providerId,
          sessionId: session.id,
        }
      );
      return;
    }

    const target: ClaudeModelSwitchTarget = {
      providerId: CLAUDE_PROVIDER_ID,
      targetModelId: payload.targetModelId,
      targetReasoningEffort: payload.targetReasoningEffort,
      thinkingEnabled: payload.thinkingEnabled,
    };
    const validation = this.#strategy.validateTarget(target);
    if (!validation.ok) {
      this.#deps.logger.warn("Claude model switch: invalid target", {
        reason: validation.reason,
        sessionId: session.id,
        targetModelId: payload.targetModelId,
      });
      return;
    }

    const modelBinding = this.#strategy.buildModelBinding(target, {
      previousBinding: session.modelBinding,
      sessionId: session.id,
      workspacePath: session.workspacePath,
    });
    this.#deps.sessionManager.setModelBinding(session.id, modelBinding);
    this.#deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId: session.id,
        providerId: CLAUDE_PROVIDER_ID,
        baseModelId: modelBinding.baseModelId,
        modelId: modelBinding.modelId,
        modelBinding,
        source: "switch_request",
      },
    });
  }
}
