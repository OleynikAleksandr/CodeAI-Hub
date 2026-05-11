import { readFile, writeFile } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

// Single owner of the `accepted: true` write on `application-skeleton-map.json`.
// Stream 16D moved the Phase 3 continuation dispatcher onto an `accepted` flag
// read from the file (Option C), but Phase 22 retest showed no path actually
// wrote that flag — every existing acceptance entry point (PM Accept Contract
// button, typed-fallback recognizer, Core handler, in-memory marker) only set
// the volatile `recentlyAcceptedSessions` Set. This writer closes that hole:
// the Core accept-contract runner calls it on `kind: "accepted"`, the patched
// file becomes a dirty Application Skeleton-owned artifact, the managed
// commit gate auto-commits `docs: accept application skeleton contract`, and
// the next read-model snapshot reports `progress.accepted === true` so the
// Phase 3 materialization continuation dispatcher fires.
//
// The writer is idempotent: if the map already reports `accepted: true` and a
// non-draft `reviewState`, it returns `noop` without touching the file.

export type ApplicationSkeletonAcceptanceWriteStatus =
  | "patched"
  | "noop"
  | "map_missing"
  | "invalid_json"
  | "path_unresolved";

export interface ApplicationSkeletonAcceptanceWriteResult {
  readonly mapPath?: string;
  readonly status: ApplicationSkeletonAcceptanceWriteStatus;
}

const isAcceptedTerminalState = (json: Record<string, unknown>): boolean => {
  if (json.accepted !== true) {
    return false;
  }
  const reviewState = json.reviewState;
  return reviewState === "accepted" || reviewState === "materialized";
};

export const writeApplicationSkeletonAcceptance = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ApplicationSkeletonAcceptanceWriteResult> => {
  const mapPathResult = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "application_skeleton",
    fileName: "application-skeleton-map.json",
  });
  if (!mapPathResult.ok) {
    return { status: "path_unresolved" };
  }
  const mapPath = mapPathResult.value.absolutePath;
  let raw: string;
  try {
    raw = await readFile(mapPath, "utf8");
  } catch {
    return { mapPath, status: "map_missing" };
  }
  let json: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { mapPath, status: "invalid_json" };
    }
    json = parsed as Record<string, unknown>;
  } catch {
    return { mapPath, status: "invalid_json" };
  }
  if (isAcceptedTerminalState(json)) {
    return { mapPath, status: "noop" };
  }
  const next: Record<string, unknown> = { ...json, accepted: true };
  if (json.reviewState !== "materialized") {
    next.reviewState = "accepted";
  }
  await writeFile(mapPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { mapPath, status: "patched" };
};
