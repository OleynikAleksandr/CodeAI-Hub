import { findCodexModelCapabilities } from "@codeai-hub/codex-app-server-module";
import { buildProviderEffectiveModelId } from "../../config/provider-turn-config-resolver";
import type { SessionManager } from "../../session-manager";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import type { CodexReasoningSwitchRequestPayload } from "../session-stream-contracts";
import type { BridgeEvent } from "../types";

interface SessionRequestHandlerCodexReasoningSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const CODEX_PROVIDER_ID = "codexCli";

export class SessionRequestHandlerCodexReasoningSwitch {
  readonly #deps: SessionRequestHandlerCodexReasoningSwitchOptions;

  constructor(options: SessionRequestHandlerCodexReasoningSwitchOptions) {
    this.#deps = options;
  }

  handle(payload: CodexReasoningSwitchRequestPayload): void {
    const session = this.#deps.sessionManager.getSession(payload.sessionId);
    if (!session) {
      this.#deps.logger.warn("Codex reasoning switch: session not found", {
        sessionId: payload.sessionId,
      });
      return;
    }
    if (session.providerId !== CODEX_PROVIDER_ID) {
      this.#deps.logger.warn(
        "Codex reasoning switch: non-Codex session ignored",
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
        "Codex reasoning switch: missing previous base model",
        {
          sessionId: session.id,
        }
      );
      return;
    }
    const capabilities = findCodexModelCapabilities(baseModelId);
    if (!capabilities) {
      this.#deps.logger.warn(
        "Codex reasoning switch: unknown previous Codex model",
        {
          baseModelId,
          sessionId: session.id,
        }
      );
      return;
    }
    if (
      !capabilities.reasoningEffortOptions.includes(
        payload.targetReasoningEffort
      )
    ) {
      this.#deps.logger.warn("Codex reasoning switch: unsupported effort", {
        baseModelId,
        sessionId: session.id,
        targetReasoningEffort: payload.targetReasoningEffort,
      });
      return;
    }

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
      baseModelId,
      modelId:
        buildProviderEffectiveModelId({
          providerId: CODEX_PROVIDER_ID,
          baseModelId,
          reasoningEffort: payload.targetReasoningEffort,
        }) ?? baseModelId,
      reasoningEffort: payload.targetReasoningEffort,
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
