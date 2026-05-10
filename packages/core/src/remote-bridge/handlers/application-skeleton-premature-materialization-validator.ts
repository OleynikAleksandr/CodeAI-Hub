import { extractApplicationSkeletonMaterializedPaths } from "./application-skeleton-materialization-validator";

// Premature-materialization validator for Phase 1A and Phase 1B.
//
// Derives the blocked path set from the Application Skeleton map (declared
// `materializedPaths` plus the `codePath` projections of every productPart /
// cluster / module). Any owned dirty file matching a declared materialization
// path before T3 acceptance is a premature materialization touch and must be
// rejected at the post-turn readiness + terminal boundary. The decision is
// derived from the skeleton map, not from a hardcoded `product-parts/**` glob.

export type ApplicationSkeletonPrematureDecision =
  | { readonly kind: "permitted" }
  | {
      readonly blockedPaths: readonly string[];
      readonly kind: "blocked";
      readonly reasons: readonly string[];
    };

export interface ApplicationSkeletonPrematureValidatorInput {
  readonly accepted: boolean;
  readonly mapJson: Record<string, unknown> | null;
  readonly ownedDirtyFiles: readonly string[];
}

const TRAILING_SLASH_RE = /\/+$/u;

const isInsidePath = (file: string, pathPrefix: string): boolean => {
  const normalizedPrefix = pathPrefix.replace(TRAILING_SLASH_RE, "");
  return (
    file === normalizedPrefix ||
    file.startsWith(`${normalizedPrefix}/`) ||
    file.includes(`/${normalizedPrefix}/`)
  );
};

export const evaluateApplicationSkeletonPrematureMaterialization = (
  input: ApplicationSkeletonPrematureValidatorInput
): ApplicationSkeletonPrematureDecision => {
  if (input.accepted) {
    return { kind: "permitted" };
  }
  if (input.ownedDirtyFiles.length === 0) {
    return { kind: "permitted" };
  }
  const declared = extractApplicationSkeletonMaterializedPaths(input.mapJson);
  if (declared.length === 0) {
    return { kind: "permitted" };
  }
  const blockedPaths = input.ownedDirtyFiles.filter((file) =>
    declared.some((prefix) => isInsidePath(file, prefix))
  );
  if (blockedPaths.length === 0) {
    return { kind: "permitted" };
  }
  return {
    blockedPaths,
    kind: "blocked",
    reasons: [
      `Application Skeleton must be accepted before touching materialization-owned paths (${blockedPaths.length} path${blockedPaths.length === 1 ? "" : "s"} blocked).`,
    ],
  };
};
