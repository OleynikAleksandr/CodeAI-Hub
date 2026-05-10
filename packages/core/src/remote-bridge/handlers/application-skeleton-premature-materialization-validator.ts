import { readFile } from "node:fs/promises";
import path from "node:path";
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

// Reads the Application Skeleton `map.json` for the given workspace and runs
// the pure premature-materialization decision against the supplied owned
// dirty files. Returns `permitted` when the map is missing or unparseable so
// callers can continue with their normal flow without spurious blocks.
export const readAndEvaluateApplicationSkeletonPrematureMaterialization =
  async (params: {
    readonly accepted: boolean;
    readonly ownedDirtyFiles: readonly string[];
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ApplicationSkeletonPrematureDecision> => {
    const mapPath = path.join(
      params.workspaceRoot,
      `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`
    );
    const text = await readFile(mapPath, "utf8").catch(() => null);
    let mapJson: Record<string, unknown> | null = null;
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          mapJson = parsed as Record<string, unknown>;
        }
      } catch {
        mapJson = null;
      }
    }
    return evaluateApplicationSkeletonPrematureMaterialization({
      accepted: params.accepted,
      mapJson,
      ownedDirtyFiles: params.ownedDirtyFiles,
    });
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
