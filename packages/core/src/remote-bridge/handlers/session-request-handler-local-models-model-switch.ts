import type { SessionManager } from "../../session-manager";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import type { LocalModelsModelSwitchRequestPayload } from "../session-stream-contracts";
import type { BridgeEvent } from "../types";

interface SessionRequestHandlerLocalModelsModelSwitchOptions {
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly logger: Logger;
  readonly sessionManager: SessionManager;
}

const LOCAL_MODELS_PROVIDER_ID = "localModels";

export class SessionRequestHandlerLocalModelsModelSwitch {
  readonly #deps: SessionRequestHandlerLocalModelsModelSwitchOptions;

  constructor(options: SessionRequestHandlerLocalModelsModelSwitchOptions) {
    this.#deps = options;
  }

  handle(payload: LocalModelsModelSwitchRequestPayload): void {
    const session = this.#deps.sessionManager.getSession(payload.sessionId);
    if (!session) {
      this.#deps.logger.warn("Local Models switch: session not found", {
        sessionId: payload.sessionId,
      });
      return;
    }
    if (session.providerId !== LOCAL_MODELS_PROVIDER_ID) {
      this.#deps.logger.warn("Local Models switch: non-local session ignored", {
        providerId: session.providerId,
        sessionId: session.id,
      });
      return;
    }
    const targetModelId = payload.targetModelId.trim();
    if (!targetModelId) {
      this.#deps.logger.warn("Local Models switch: empty target ignored", {
        sessionId: session.id,
      });
      return;
    }

    const previousBinding = session.modelBinding;
    const now = new Date().toISOString();
    const modelBinding: SessionModelBinding = {
      key:
        previousBinding?.key ??
        buildSessionModelBindingKey({
          providerId: LOCAL_MODELS_PROVIDER_ID,
          sessionId: session.id,
          workspacePath: session.workspacePath,
        }),
      providerId: LOCAL_MODELS_PROVIDER_ID,
      baseModelId: targetModelId,
      modelId: targetModelId,
      source: "switch_request",
      boundAt: previousBinding?.boundAt ?? now,
      updatedAt: now,
    };
    this.#deps.sessionManager.setModelBinding(session.id, modelBinding);
    this.#deps.broadcaster({
      type: "session:model:update",
      payload: {
        sessionId: session.id,
        providerId: LOCAL_MODELS_PROVIDER_ID,
        baseModelId: targetModelId,
        modelId: targetModelId,
        modelBinding,
        source: "switch_request",
      },
    });
  }
}
