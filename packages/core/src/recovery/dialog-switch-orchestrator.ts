/**
 * Dialog Switch Orchestrator — unified orchestration for provider/model
 * recovery and user-initiated switches.
 *
 * Supports three modes: retry_in_place, switch_model, switch_provider.
 * For MVP, handles same-provider auto-resume via saved providerSessionId.
 */

import type { Logger } from "../telemetry/logger";

export type SwitchMode = "retry_in_place" | "switch_model" | "switch_provider";

export type SwitchInitiator = "core_recovery" | "user_request";

export interface SwitchRequest {
  readonly currentProviderId: string;
  readonly currentProviderSessionId: string | null;
  readonly dialogId: string;
  readonly initiator: SwitchInitiator;
  readonly mode: SwitchMode;
  readonly pendingUserIntent: string | null;
  readonly sessionId: string;
  readonly targetModelId: string | null;
  readonly targetProviderId: string;
}

export interface SwitchResult {
  readonly error: string | null;
  readonly newProviderSessionId: string | null;
  readonly newSessionId: string | null;
  readonly success: boolean;
}

type AdapterResumeFunction = (
  providerSessionId: string,
  workspacePath?: string
) => Promise<string>;

type AdapterLookup = (providerId: string) =>
  | {
      resumeSession?: AdapterResumeFunction;
    }
  | undefined;

export interface OrchestratorDeps {
  readonly getAdapter: AdapterLookup;
  readonly logger: Logger;
  readonly rebindSession: (
    sessionId: string,
    providerSessionId: string,
    providerId: string
  ) => void;
  readonly resendPendingIntent: (
    sessionId: string,
    content: string
  ) => Promise<void>;
}

export class DialogSwitchOrchestrator {
  private readonly deps: OrchestratorDeps;

  constructor(deps: OrchestratorDeps) {
    this.deps = deps;
  }

  async executeRetryInPlace(request: SwitchRequest): Promise<SwitchResult> {
    const { sessionId, currentProviderId, currentProviderSessionId } = request;

    if (!currentProviderSessionId) {
      return {
        success: false,
        newProviderSessionId: null,
        newSessionId: null,
        error: "No provider session ID available for retry",
      };
    }

    const adapter = this.deps.getAdapter(currentProviderId);
    if (!adapter?.resumeSession) {
      return {
        success: false,
        newProviderSessionId: null,
        newSessionId: null,
        error: `Provider ${currentProviderId} does not support session resume`,
      };
    }

    try {
      this.deps.logger.info("Attempting same-provider retry in place", {
        sessionId,
        providerId: currentProviderId,
        providerSessionId: currentProviderSessionId,
      });

      const resumedId = await adapter.resumeSession(currentProviderSessionId);

      this.deps.rebindSession(sessionId, resumedId, currentProviderId);

      if (request.pendingUserIntent) {
        await this.deps.resendPendingIntent(
          sessionId,
          request.pendingUserIntent
        );
      }

      this.deps.logger.info("Same-provider retry succeeded", {
        sessionId,
        resumedProviderSessionId: resumedId,
      });

      return {
        success: true,
        newProviderSessionId: resumedId,
        newSessionId: sessionId,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.logger.warn("Same-provider retry failed", {
        sessionId,
        providerId: currentProviderId,
        error: message,
      });
      return {
        success: false,
        newProviderSessionId: null,
        newSessionId: null,
        error: message,
      };
    }
  }

  async executeSwitchModel(request: SwitchRequest): Promise<SwitchResult> {
    // For MVP, model switch within same provider creates a new session
    // with the updated model from settings defaults.
    // The actual model change happens at provider level via settings.
    this.deps.logger.info("Executing switch_model", {
      sessionId: request.sessionId,
      targetModelId: request.targetModelId,
      providerId: request.targetProviderId,
    });

    // Model switch reuses retry_in_place if adapter supports it,
    // since providers re-read defaults on resume
    return await this.executeRetryInPlace(request);
  }
}
