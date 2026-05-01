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

interface SessionRequestHandlerCodexModelSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CODEX_PROVIDER_ID = "codexCli";

const isSupportedReasoningEffort = (
  options: readonly string[],
  value: string | undefined
): value is CodexModelSwitchReasoningEffort =>
  typeof value === "string" && options.includes(value);

export class SessionRequestHandlerCodexModelSwitch {
  readonly #deps: SessionRequestHandlerCodexModelSwitchOptions;

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

    const capabilities = findCodexModelCapabilities(payload.targetModelId);
    if (!capabilities) {
      this.#deps.logger.warn("Codex model switch: invalid target", {
        reason: "unknown_codex_model",
        sessionId: session.id,
        targetModelId: payload.targetModelId,
      });
      return;
    }

    const previousBinding = session.modelBinding;
    const previousEffort = previousBinding?.reasoningEffort;
    const reasoningEffort = isSupportedReasoningEffort(
      capabilities.reasoningEffortOptions,
      previousEffort
    )
      ? previousEffort
      : capabilities.reasoningEffortOptions[0];

    const now = new Date().toISOString();
    const modelBinding: SessionModelBinding = {
      key:
        previousBinding?.key ??
        buildSessionModelBindingKey({
          providerId: CODEX_PROVIDER_ID,
          sessionId: session.id,
          workspacePath: session.workspacePath,
        }),
      providerId: CODEX_PROVIDER_ID,
      baseModelId: payload.targetModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CODEX_PROVIDER_ID,
          baseModelId: payload.targetModelId,
          reasoningEffort,
        }) ?? payload.targetModelId,
      reasoningEffort,
      source: "switch_request",
      boundAt: previousBinding?.boundAt ?? now,
      updatedAt: now,
    };
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
