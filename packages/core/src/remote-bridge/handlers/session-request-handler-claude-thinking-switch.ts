import { findClaudeModelCapabilities } from "@codeai-hub/claude-module";
import { buildProviderEffectiveModelId } from "../../config/provider-turn-config-resolver";
import type { SessionManager } from "../../session-manager";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import type { ClaudeThinkingSwitchRequestPayload } from "../session-stream-contracts";
import type { BridgeEvent } from "../types";

interface SessionRequestHandlerClaudeThinkingSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CLAUDE_PROVIDER_ID = "claudeCodeCli";

export class SessionRequestHandlerClaudeThinkingSwitch {
  readonly #deps: SessionRequestHandlerClaudeThinkingSwitchOptions;

  constructor(options: SessionRequestHandlerClaudeThinkingSwitchOptions) {
    this.#deps = options;
  }

  handle(payload: ClaudeThinkingSwitchRequestPayload): void {
    const session = this.#deps.sessionManager.getSession(payload.sessionId);
    if (!session) {
      this.#deps.logger.warn("Claude thinking switch: session not found", {
        sessionId: payload.sessionId,
      });
      return;
    }
    if (session.providerId !== CLAUDE_PROVIDER_ID) {
      this.#deps.logger.warn(
        "Claude thinking switch: non-Claude session ignored",
        {
          providerId: session.providerId,
          sessionId: session.id,
        }
      );
      return;
    }

    const previousBinding = session.modelBinding;
    const baseModelId =
      previousBinding?.baseModelId ?? previousBinding?.modelId;
    if (!baseModelId) {
      this.#deps.logger.warn(
        "Claude thinking switch: missing previous base model",
        {
          sessionId: session.id,
        }
      );
      return;
    }
    const capabilities = findClaudeModelCapabilities(baseModelId);
    if (!capabilities) {
      this.#deps.logger.warn(
        "Claude thinking switch: unknown previous Claude model",
        {
          baseModelId,
          sessionId: session.id,
        }
      );
      return;
    }

    if (
      payload.thinkingEnabled &&
      payload.targetReasoningEffort &&
      !capabilities.thinkingEffortOptions.includes(
        payload.targetReasoningEffort
      )
    ) {
      this.#deps.logger.warn("Claude thinking switch: unsupported effort", {
        baseModelId,
        sessionId: session.id,
        targetReasoningEffort: payload.targetReasoningEffort,
      });
      return;
    }

    let reasoningEffort: string | undefined;
    if (payload.thinkingEnabled) {
      reasoningEffort =
        payload.targetReasoningEffort ?? capabilities.defaultThinkingEffort;
    }

    const now = new Date().toISOString();
    const modelBinding: SessionModelBinding = {
      key:
        previousBinding?.key ??
        buildSessionModelBindingKey({
          providerId: CLAUDE_PROVIDER_ID,
          sessionId: session.id,
          workspacePath: session.workspacePath,
        }),
      providerId: CLAUDE_PROVIDER_ID,
      baseModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CLAUDE_PROVIDER_ID,
          baseModelId,
          reasoningEffort,
          thinkingEnabled: payload.thinkingEnabled,
        }) ?? baseModelId,
      reasoningEffort,
      thinkingEnabled: payload.thinkingEnabled,
      source: "switch_request",
      boundAt: previousBinding?.boundAt ?? now,
      updatedAt: now,
    };
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
