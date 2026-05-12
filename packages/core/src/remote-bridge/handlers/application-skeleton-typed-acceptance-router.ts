import type { Logger } from "../../telemetry/logger";

const MANAGED_TYPED_ACCEPTANCE_STAGES = new Set([
  "application_skeleton",
  "quality_gates",
]);

export interface ManagedTypedAcceptanceRouterParams {
  readonly acceptancePhrase: string;
  readonly handleManagedAcceptContractCommand?: (params: {
    readonly sessionId: string;
    readonly source: "typed-fallback";
  }) => Promise<unknown>;
  readonly logger: Logger;
  readonly sessionId: string;
  readonly stage: string | null;
}

export const routeManagedTypedAcceptance = async (
  params: ManagedTypedAcceptanceRouterParams
): Promise<void> => {
  params.logger.info("Routing managed contract acceptance phrase", {
    phrase: params.acceptancePhrase,
    sessionId: params.sessionId,
    stage: params.stage,
  });
  if (!(params.stage && MANAGED_TYPED_ACCEPTANCE_STAGES.has(params.stage))) {
    return;
  }
  await params.handleManagedAcceptContractCommand?.({
    sessionId: params.sessionId,
    source: "typed-fallback",
  });
};
