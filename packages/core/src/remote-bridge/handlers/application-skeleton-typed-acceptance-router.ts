import type { Logger } from "../../telemetry/logger";

// Routes a recognized typed acceptance phrase for the Application Skeleton
// stage to the same Core command handler as the UI button. Other Type B
// acceptance-eligible stages (e.g. Quality Gates) currently rely on the
// upstream skip-provider path only — a pluggable callback keeps them future
// compatible without bloating the dispatch class.

export interface ApplicationSkeletonTypedAcceptanceRouterParams {
  readonly acceptancePhrase: string;
  readonly handleManagedAcceptContractCommand?: (params: {
    readonly sessionId: string;
    readonly source: "typed-fallback";
  }) => Promise<unknown>;
  readonly logger: Logger;
  readonly sessionId: string;
  readonly stage: string | null;
}

export const routeApplicationSkeletonTypedAcceptance = async (
  params: ApplicationSkeletonTypedAcceptanceRouterParams
): Promise<void> => {
  params.logger.info("Skipping managed contract acceptance phrase", {
    phrase: params.acceptancePhrase,
    sessionId: params.sessionId,
    stage: params.stage,
  });
  if (params.stage !== "application_skeleton") {
    return;
  }
  await params.handleManagedAcceptContractCommand?.({
    sessionId: params.sessionId,
    source: "typed-fallback",
  });
};
