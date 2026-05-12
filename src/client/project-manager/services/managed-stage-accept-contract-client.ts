// PM-side client for the Application Skeleton and Quality Gates accept-contract
// commands. Pure transport: posts a JSON body to the Core HTTP endpoint and
// returns the decision verbatim. All gating lives in Core; PM panels surface
// reasons and never recompute the acceptance predicate locally.

const ENDPOINT = "/api/v1/orchestrator/managed-stage-accept-contract";
const QUALITY_GATES_ENDPOINT =
  "/api/v1/orchestrator/quality-gates-accept-contract";

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

export interface AcceptQualityGatesContractParams {
  readonly sessionId: string;
  readonly source?: "ui-button" | "typed-fallback";
}

export type AcceptQualityGatesContractDecision =
  | { readonly kind: "accepted"; readonly stage: "quality_gates" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly string[];
      readonly stage: "quality_gates";
    };

export const acceptQualityGatesContract = async (
  params: AcceptQualityGatesContractParams,
  fetchImpl: typeof fetch = fetch
): Promise<AcceptQualityGatesContractDecision> => {
  const response = await fetchImpl(QUALITY_GATES_ENDPOINT, {
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
    return { kind: "accepted", stage: "quality_gates" };
  }
  const reasons = Array.isArray(payload.reasons)
    ? (payload.reasons.filter((entry) => typeof entry === "string") as string[])
    : ["Acceptance command rejected by Core."];
  return { kind: "rejected", reasons, stage: "quality_gates" };
};
