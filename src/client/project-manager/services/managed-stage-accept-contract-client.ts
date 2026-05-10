// PM-side client for the Application Skeleton accept-contract command.
// Pure transport: posts a JSON body to the Core HTTP endpoint and returns
// the decision verbatim. All gating lives in Core.

const ENDPOINT = "/api/v1/orchestrator/managed-stage-accept-contract";

export interface AcceptApplicationSkeletonContractParams {
  readonly sessionId: string;
  readonly source?: "ui-button" | "typed-fallback";
}

export type AcceptApplicationSkeletonContractDecision =
  | { readonly kind: "accepted"; readonly stage: "application_skeleton" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly string[];
      readonly stage: "application_skeleton";
    };

export const acceptApplicationSkeletonContract = async (
  params: AcceptApplicationSkeletonContractParams,
  fetchImpl: typeof fetch = fetch
): Promise<AcceptApplicationSkeletonContractDecision> => {
  const response = await fetchImpl(ENDPOINT, {
    body: JSON.stringify({
      sessionId: params.sessionId,
      source: params.source ?? "ui-button",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (response.ok && payload.status === "accepted") {
    return { kind: "accepted", stage: "application_skeleton" };
  }
  const reasons = Array.isArray(payload.reasons)
    ? (payload.reasons.filter((entry) => typeof entry === "string") as string[])
    : ["Acceptance command rejected by Core."];
  return { kind: "rejected", reasons, stage: "application_skeleton" };
};
