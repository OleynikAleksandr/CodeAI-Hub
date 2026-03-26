/**
 * Failure Recovery Bridge — translates a classified provider failure
 * into a dialog:switch:offer payload using RecoveryTargetResolver.
 *
 * Returns null when no offer is appropriate (terminal failures,
 * no available recovery targets, or no session context).
 */

import type {
  DialogSwitchOfferPayload,
  DialogSwitchTarget,
} from "../remote-bridge/types";
import type { ProviderFailureClassification } from "./provider-failure-classifier";
import {
  type RecoveryContext,
  type RecoveryTarget,
  resolveRecoveryTargets,
} from "./recovery-target-resolver";

export type FailureRecoveryContext = {
  readonly sessionId: string;
  readonly dialogId: string | null;
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly stage: string | null;
  readonly adapterAvailable: boolean;
};

type ProviderHealthCheck = (providerId: string) => boolean;

function toDialogSwitchTarget(target: RecoveryTarget): DialogSwitchTarget {
  return {
    providerId: target.providerId,
    modelId: target.modelId,
    mode: target.mode,
  };
}

export function buildSwitchOfferPayload(
  classification: ProviderFailureClassification,
  context: FailureRecoveryContext,
  isProviderHealthy: ProviderHealthCheck
): DialogSwitchOfferPayload | null {
  // Terminal failures — no recovery offer makes sense
  if (classification.failureClass === "terminal_session_failure") {
    return null;
  }

  const recoveryContext: RecoveryContext = {
    currentProviderId: context.providerId,
    stage: context.stage,
    adapterAvailable: context.adapterAvailable,
    providerSessionIdKnown: Boolean(context.providerSessionId),
    canRetryInPlace: classification.retryable,
  };

  const targets = resolveRecoveryTargets(recoveryContext, isProviderHealthy);
  if (targets.length === 0) {
    return null;
  }

  const [recommended, ...alternatives] = targets;
  const canRetryInPlace = targets.some((t) => t.mode === "retry_in_place");

  return {
    dialogId: context.dialogId ?? context.sessionId,
    sessionId: context.sessionId,
    initiator: "core_recovery",
    reason: classification.reason,
    recommendedTarget: toDialogSwitchTarget(recommended),
    alternativeTargets: alternatives.map(toDialogSwitchTarget),
    canRetryInPlace,
  };
}
