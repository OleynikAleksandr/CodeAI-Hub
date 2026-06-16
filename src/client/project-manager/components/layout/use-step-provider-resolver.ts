import { useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type {
  WorkflowStageId,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

export type SidebarProviderId = "claude" | "codex" | "gemini" | "kimi";

export const PROVIDER_STACK_TO_DESIGN_ID: Record<
  ProviderStackId,
  SidebarProviderId
> = {
  claudeCodeCli: "claude",
  codexCli: "codex",
  geminiCli: "gemini",
  kimiCode: "kimi",
  glmOpenCode: "kimi",
};

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" ||
  value === "codexCli" ||
  value === "geminiCli" ||
  value === "kimiCode" ||
  value === "glmOpenCode";

const mapStackToDesignId = (
  providerId: ProviderStackId | null
): SidebarProviderId | null =>
  providerId ? PROVIDER_STACK_TO_DESIGN_ID[providerId] : null;

export const resolveSidebarProviderIdForStage = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId,
  fallbackProviderId: SidebarProviderId | null = null
): SidebarProviderId | null =>
  mapStackToDesignId(resolveStageProviderId(snapshot, stage)) ??
  fallbackProviderId;

const resolveLatestChainProviderId = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId
): ProviderStackId | null => {
  const chains = snapshot?.continuity?.chains ?? [];
  let best:
    | { readonly updatedAt: string; readonly providerId: ProviderStackId }
    | null = null;
  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    const providerId = chain.segments.at(-1)?.providerId;
    if (!isProviderStackId(providerId)) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: chain.updatedAt, providerId };
    }
  }
  return best?.providerId ?? null;
};

const resolveDescriptionProviderId = (
  snapshot: WorkflowStateSnapshot | null
): ProviderStackId | null => {
  const fromDescription = snapshot?.description?.primarySession?.providerId;
  return isProviderStackId(fromDescription) ? fromDescription : null;
};

// Strict per-step own-chain attribution. Sidebar tint reflects ONLY who
// actually worked on this step. Upstream inheritance (e.g., VS adopting
// Description's provider) is intentionally NOT done here — the
// StageConfirmationCard preselect is a hint the user can change, not a
// binding. An idle step with no chain stays neutral until its own session
// attaches.
const resolveStageProviderId = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId
): ProviderStackId | null => {
  const own = resolveLatestChainProviderId(snapshot, stage);
  if (own) {
    return own;
  }
  // description.primarySession is description's OWN session (not upstream),
  // so it is a legitimate fallback when the chain hasn't materialized yet.
  if (stage === "description") {
    return resolveDescriptionProviderId(snapshot);
  }
  return null;
};

export interface UseStepProviderResolverParams {
  readonly snapshot: WorkflowStateSnapshot | null;
  readonly fallbackProviderId?: SidebarProviderId | null;
}

export interface StepProviderResolver {
  readonly forStage: (stage: WorkflowStageId) => SidebarProviderId | null;
  readonly forBranchPart: (partId: string) => SidebarProviderId | null;
  readonly forBranchCluster: (clusterId: string) => SidebarProviderId | null;
  readonly forBranchModule: (moduleId: string) => SidebarProviderId | null;
}

export const useStepProviderResolver = ({
  snapshot,
  fallbackProviderId = null,
}: UseStepProviderResolverParams): StepProviderResolver =>
  useMemo(() => {
    const stageCache = new Map<WorkflowStageId, SidebarProviderId | null>();
    const resolveStage = (
      stage: WorkflowStageId
    ): SidebarProviderId | null => {
      if (stageCache.has(stage)) {
        return stageCache.get(stage) ?? null;
      }
      const resolved = resolveSidebarProviderIdForStage(
        snapshot,
        stage,
        fallbackProviderId
      );
      stageCache.set(stage, resolved);
      return resolved;
    };
    // Branch nodes (P/C/M) stay neutral until a per-branch session
    // (Cluster Design / Module Design) materializes. Inheriting the
    // diagram_modules trunk provider would lie about attribution: the
    // tree skeleton is generated from that artifact, but the individual
    // P/C/M items have no provider of their own yet.
    return {
      forStage: resolveStage,
      forBranchPart: () => null,
      forBranchCluster: () => null,
      forBranchModule: () => null,
    };
  }, [snapshot, fallbackProviderId]);
