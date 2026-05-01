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

interface SessionRequestHandlerClaudeModelSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CLAUDE_PROVIDER_ID = "claudeCodeCli";

const isSupportedThinkingEffort = (
  options: readonly string[],
  value: string | undefined
): value is ClaudeModelSwitchThinkingEffort =>
  typeof value === "string" && options.includes(value);

export class SessionRequestHandlerClaudeModelSwitch {
  readonly #deps: SessionRequestHandlerClaudeModelSwitchOptions;

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

    const capabilities = findClaudeModelCapabilities(payload.targetModelId);
    if (!capabilities) {
      this.#deps.logger.warn("Claude model switch: invalid target", {
        reason: "unknown_claude_model",
        sessionId: session.id,
        targetModelId: payload.targetModelId,
      });
      return;
    }

    const previousBinding = session.modelBinding;
    const thinkingEnabled = previousBinding?.thinkingEnabled === true;
    const previousEffort = previousBinding?.reasoningEffort;
    const carriedEffort = isSupportedThinkingEffort(
      capabilities.thinkingEffortOptions,
      previousEffort
    )
      ? previousEffort
      : capabilities.defaultThinkingEffort;
    const reasoningEffort = thinkingEnabled ? carriedEffort : undefined;

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
      baseModelId: payload.targetModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CLAUDE_PROVIDER_ID,
          baseModelId: payload.targetModelId,
          reasoningEffort,
          thinkingEnabled,
        }) ?? payload.targetModelId,
      reasoningEffort,
      thinkingEnabled,
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
