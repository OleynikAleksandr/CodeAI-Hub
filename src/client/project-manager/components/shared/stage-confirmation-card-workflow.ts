import type { ProviderStackId } from "../../../../types/provider";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

export type ConfirmableStageId =
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

export const STAGE_LABELS: Record<ConfirmableStageId, string> = {
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates Baseline",
};

export const UPSTREAM_STAGE_LABELS: Record<ConfirmableStageId, string> = {
  virtual_simulation: "Description",
  diagram_modules: "Virtual Simulation",
  application_skeleton: "Diagram Modules",
  quality_gates: "materialized Application Skeleton",
};

const UPSTREAM_FILE_NAMES: Record<
  Exclude<ConfirmableStageId, "virtual_simulation">,
  string
> = {
  diagram_modules: "virtual-simulation.md",
  application_skeleton: "product-parts.index.md",
  quality_gates: "application-skeleton-map.json",
};

type UpstreamArtifactInfo = {
  readonly fileName: string;
  readonly available: boolean;
};

export const resolveDisplayedArtifactName = (
  artifact: UpstreamArtifactInfo,
  blockedByDirtyGit: boolean
): string => (blockedByDirtyGit ? "workspace changes" : artifact.fileName);

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" ||
  value === "codexCli" ||
  value === "geminiCli" ||
  value === "kimiCode" ||
  value === "glmNative" ||
  value === "glmOpenCode";

export const resolveUpstreamArtifactInfo = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): UpstreamArtifactInfo => {
  if (stage === "virtual_simulation") {
    const finalPath = snapshot.description?.finalPath;
    return {
      fileName: "Final_Description.md",
      available: typeof finalPath === "string" && finalPath.length > 0,
    };
  }
  const blockedStages = snapshot.gating.blocked as Readonly<Record<string, boolean>>;
  return {
    fileName: UPSTREAM_FILE_NAMES[stage],
    available: !(blockedStages[stage] ?? true),
  };
};

const resolveLatestChainSegment = (
  snapshot: WorkflowStateSnapshot,
  stage: string
): { readonly providerId: string; readonly providerSessionId: string } | null => {
  let best:
    | {
        readonly updatedAt: string;
        readonly providerId: string;
        readonly providerSessionId: string;
      }
    | null = null;
  for (const chain of snapshot.continuity?.chains ?? []) {
    if (chain.stage !== stage) continue;
    const last = chain.segments.at(-1);
    if (!last) continue;
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = {
        updatedAt: chain.updatedAt,
        providerId: last.providerId,
        providerSessionId: last.providerSessionId,
      };
    }
  }
  return best;
};

const resolveDescriptionChainSegment = (
  snapshot: WorkflowStateSnapshot
): { readonly providerId: string; readonly providerSessionId: string } | null =>
  resolveLatestChainSegment(snapshot, "description");

const resolveDescriptionProviderId = (
  snapshot: WorkflowStateSnapshot
): ProviderStackId | null => {
  const primaryProviderId = snapshot.description?.primarySession?.providerId;
  if (isProviderStackId(primaryProviderId)) {
    return primaryProviderId;
  }
  const continuityProviderId = resolveDescriptionChainSegment(snapshot)?.providerId;
  return isProviderStackId(continuityProviderId) ? continuityProviderId : null;
};

export const resolveInheritedStageProviderId = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): ProviderStackId | null => {
  const descriptionProviderId = resolveDescriptionProviderId(snapshot);
  if (stage === "virtual_simulation") {
    return descriptionProviderId;
  }
  const stagesByPriority: Record<
    Exclude<ConfirmableStageId, "virtual_simulation">,
    readonly string[]
  > = {
    diagram_modules: ["virtual_simulation"],
    application_skeleton: ["diagram_modules", "virtual_simulation"],
    quality_gates: ["application_skeleton", "diagram_modules", "virtual_simulation"],
  };
  for (const upstreamStage of stagesByPriority[stage]) {
    const providerId = resolveLatestChainSegment(snapshot, upstreamStage)?.providerId;
    if (isProviderStackId(providerId)) {
      return providerId;
    }
  }
  return descriptionProviderId;
};

export const hasExistingStageSession = (
  stage: ConfirmableStageId,
  snapshot: WorkflowStateSnapshot
): boolean => resolveLatestChainSegment(snapshot, stage) !== null;

export type StageSessionIntent = {
  readonly providerId: string;
  readonly providerSessionId: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly sessionKind: "collector" | null;
  readonly runSlug: string | null;
};

export const resolveStageSessionIntent = (
  stage: string,
  snapshot: WorkflowStateSnapshot,
  workspacePath: string,
  workspaceSlug: string
): StageSessionIntent | null => {
  if (stage === "description") {
    const session = snapshot.description?.primarySession;
    const continuitySegment = session ? null : resolveDescriptionChainSegment(snapshot);
    if (!(session || continuitySegment)) return null;
    return {
      providerId: session?.providerId ?? continuitySegment?.providerId ?? "",
      providerSessionId:
        session?.providerSessionId ?? continuitySegment?.providerSessionId ?? null,
      workspacePath,
      workspaceSlug,
      initiativeSlug: workspaceSlug,
      stage: "description",
      sessionKind: "collector",
      runSlug: null,
    };
  }
  const segment = resolveLatestChainSegment(snapshot, stage);
  if (!segment) return null;
  return {
    providerId: segment.providerId,
    providerSessionId: segment.providerSessionId,
    workspacePath,
    workspaceSlug,
    initiativeSlug: workspaceSlug,
    stage,
    sessionKind: "collector",
    runSlug: null,
  };
};
