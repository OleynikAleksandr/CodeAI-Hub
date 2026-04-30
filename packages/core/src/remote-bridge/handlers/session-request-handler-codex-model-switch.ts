import { findCodexModelCapabilities } from "@codeai-hub/codex-app-server-module";
import { buildProviderEffectiveModelId } from "../../config/provider-turn-config-resolver";
import type { SessionManager } from "../../session-manager";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import type {
  CodexModelSwitchReasoningEffort,
  CodexModelSwitchRequestPayload,
} from "../session-stream-contracts";
import type { BridgeEvent } from "../types";
import type {
  ProviderModelSwitchStrategy,
  SessionModelSwitchContext,
  SessionModelSwitchTarget,
  SessionModelSwitchValidationResult,
} from "./session-request-handler-types";

interface SessionRequestHandlerCodexModelSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CODEX_PROVIDER_ID = "codexCli";

const hasReasoningEffort = (
  options: readonly string[],
  value: string | undefined
): value is CodexModelSwitchReasoningEffort =>
  typeof value === "string" && options.includes(value);

const resolveTargetReasoningEffort = (
  context: SessionModelSwitchContext,
  target: SessionModelSwitchTarget
): string | undefined => {
  const capabilities = findCodexModelCapabilities(target.targetModelId);
  const options = capabilities?.reasoningEffortOptions ?? [];
  if (target.targetReasoningEffort) {
    return target.targetReasoningEffort;
  }
  if (hasReasoningEffort(options, context.previousBinding?.reasoningEffort)) {
    return context.previousBinding.reasoningEffort;
  }
  return options[0];
};

const buildSwitchBindingKey = (
  target: SessionModelSwitchTarget,
  context: SessionModelSwitchContext
): string =>
  context.previousBinding?.key ??
  buildSessionModelBindingKey({
    providerId: target.providerId,
    sessionId: context.sessionId,
    workspacePath: context.workspacePath,
  });

class CodexModelSwitchStrategy implements ProviderModelSwitchStrategy {
  readonly providerId = CODEX_PROVIDER_ID;

  buildModelBinding(
    target: SessionModelSwitchTarget,
    context: SessionModelSwitchContext
  ): SessionModelBinding {
    const reasoningEffort = resolveTargetReasoningEffort(context, target);
    const now = new Date().toISOString();
    return {
      key: buildSwitchBindingKey(target, context),
      providerId: CODEX_PROVIDER_ID,
      baseModelId: target.targetModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CODEX_PROVIDER_ID,
          baseModelId: target.targetModelId,
          reasoningEffort,
        }) ?? target.targetModelId,
      reasoningEffort,
      source: "switch_request",
      boundAt: context.previousBinding?.boundAt ?? now,
      updatedAt: now,
    };
  }

  validateTarget(
    target: SessionModelSwitchTarget
  ): SessionModelSwitchValidationResult {
    const capabilities = findCodexModelCapabilities(target.targetModelId);
    if (!capabilities) {
      return { ok: false, reason: "unknown_codex_model" };
    }
    if (
      target.targetReasoningEffort &&
      !capabilities.reasoningEffortOptions.includes(
        target.targetReasoningEffort
      )
    ) {
      return { ok: false, reason: "unsupported_codex_reasoning_effort" };
    }
    return { ok: true };
  }
}

export class SessionRequestHandlerCodexModelSwitch {
  readonly #deps: SessionRequestHandlerCodexModelSwitchOptions;
  readonly #strategy = new CodexModelSwitchStrategy();

  constructor(options: SessionRequestHandlerCodexModelSwitchOptions) {
    this.#deps = options;
  }

  handle(payload: CodexModelSwitchRequestPayload): void {
    const session = this.#deps.sessionManager.getSession(payload.sessionId);
    if (!session) {
      this.#deps.logger.warn("Codex model switch: session not found", {
        sessionId: payload.sessionId,
      });
      return;
    }
    if (session.providerId !== CODEX_PROVIDER_ID) {
      this.#deps.logger.warn("Codex model switch: non-Codex session ignored", {
        providerId: session.providerId,
        sessionId: session.id,
      });
      return;
    }

    const target: SessionModelSwitchTarget = {
      providerId: CODEX_PROVIDER_ID,
      targetModelId: payload.targetModelId,
      targetReasoningEffort: payload.targetReasoningEffort,
    };
    const validation = this.#strategy.validateTarget(target);
    if (!validation.ok) {
      this.#deps.logger.warn("Codex model switch: invalid target", {
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
    session.pendingModelSwitchInjection = true;
    this.#deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId: session.id,
        providerId: CODEX_PROVIDER_ID,
        baseModelId: modelBinding.baseModelId,
        modelId: modelBinding.modelId,
        modelBinding,
        source: "switch_request",
      },
    });
  }
}
